let context: AudioContext | undefined;
let muted = false;
let muteGeneration = 0;
const activeTones = new Set<OscillatorNode>();

/** Applies the platform's audio restriction immediately, including to active cues. */
export function setMuted(next: boolean): void {
  if (next === muted) return;
  muted = next;
  if (!muted) return;

  muteGeneration++;
  for (const tone of activeTones) {
    tone.disconnect();
    tone.stop();
  }
  activeTones.clear();
}

/** Plays a short cue from a trusted gesture, including after an iOS interruption. */
export function playCue(): void {
  if (muted || !window.AudioContext) return;
  const generation = muteGeneration;

  try {
    context ??= new AudioContext();
    const audio = context;
    const play = () => {
      if (muted || generation !== muteGeneration || audio.state !== 'running') return;
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      const start = audio.currentTime;
      tone.frequency.value = 520;
      volume.gain.setValueAtTime(0.045, start);
      volume.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      tone.connect(volume).connect(audio.destination);
      activeTones.add(tone);
      tone.onended = () => {
        activeTones.delete(tone);
        tone.disconnect();
        volume.disconnect();
      };
      tone.start(start);
      tone.stop(start + 0.12);
    };
    if (audio.state === 'running') play();
    else void audio.resume().then(play).catch(() => {});
  } catch {
    // Audio may be unavailable in this browser. Input still works.
  }
}
