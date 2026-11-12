let context: AudioContext | undefined;

/** Plays a short cue from a trusted gesture, including after an iOS interruption. */
export function playCue(): void {
  if (!window.AudioContext) return;

  try {
    context ??= new AudioContext();
    const audio = context;
    const play = () => {
      if (audio.state !== 'running') return;
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      const start = audio.currentTime;
      tone.frequency.value = 520;
      volume.gain.setValueAtTime(0.045, start);
      volume.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      tone.connect(volume).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.12);
    };
    if (audio.state === 'running') play();
    else void audio.resume().then(play).catch(() => {});
  } catch {
    // Audio may be unavailable in this browser. Input still works.
  }
}
