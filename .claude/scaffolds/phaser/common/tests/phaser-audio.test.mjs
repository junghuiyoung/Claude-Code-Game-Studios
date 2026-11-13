import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

async function audioFixture({ suspended = false } = {}) {
  const tones = [];
  const contexts = [];
  let finishResume;
  class AudioContext {
    state = suspended ? 'suspended' : 'running';
    currentTime = 0;
    destination = {};
    constructor() { contexts.push(this); }
    resume() {
      return new Promise((resolve) => {
        finishResume = () => { this.state = 'running'; resolve(); };
      });
    }
    createOscillator() {
      const tone = {
        frequency: { value: 0 },
        starts: [], stops: [], disconnected: false,
        connect(node) { return node; },
        disconnect() { this.disconnected = true; },
        start(time) { this.starts.push(time); },
        stop(time) { this.stops.push(time); },
      };
      tones.push(tone);
      return tone;
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect(node) { return node; }, disconnect() {},
      };
    }
  }
  const source = await readFile(new URL('../src/phaser/audio.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, window: { AudioContext }, AudioContext });
  return { audio: exports, tones, contexts, finishResume: () => finishResume() };
}

test('muted audio creates no context or tone, then plays after unmuting', async () => {
  // Arrange
  const { audio, contexts, tones } = await audioFixture();

  // Act / Assert
  audio.setMuted(true);
  audio.playCue();
  assert.equal(contexts.length, 0);
  assert.equal(tones.length, 0);
  audio.setMuted(false);
  audio.playCue();
  assert.equal(contexts.length, 1);
  assert.equal(tones.length, 1);
  assert.equal(tones[0].starts.length, 1);
});

test('muting immediately disconnects and stops all active cues', async () => {
  // Arrange
  const { audio, tones } = await audioFixture();
  audio.playCue();
  audio.playCue();

  // Act
  audio.setMuted(true);
  audio.playCue();

  // Assert
  assert.equal(tones.length, 2);
  for (const tone of tones) {
    assert.equal(tone.disconnected, true);
    assert.equal(tone.stops.length, 2, 'scheduled end plus immediate mute stop');
  }
});

for (const unmuteBeforeResume of [false, true]) {
  test(`a cue waiting for audio resume is cancelled by mute (unmute before resume: ${unmuteBeforeResume})`, async () => {
    // Arrange
    const { audio, tones, finishResume } = await audioFixture({ suspended: true });
    audio.playCue();

    // Act
    audio.setMuted(true);
    if (unmuteBeforeResume) audio.setMuted(false);
    finishResume();
    await Promise.resolve();

    // Assert
    assert.equal(tones.length, 0, 'a pending cue must not escape a mute change');
    audio.setMuted(false);
    audio.playCue();
    assert.equal(tones.length, 1, 'fresh gestures can play after unmuting');
  });
}

test('ended tones are removed before a later mute', async () => {
  // Arrange
  const { audio, tones } = await audioFixture();
  audio.playCue();
  tones[0].onended();

  // Act
  audio.setMuted(true);

  // Assert
  assert.equal(tones[0].stops.length, 1, 'the ended tone is not stopped again');
  assert.equal(tones[0].disconnected, true);
});
