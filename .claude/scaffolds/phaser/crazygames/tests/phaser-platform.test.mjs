import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectPlatform } from '../src/phaser/platform.ts';

function fixture(overrides = {}) {
  const calls = [];
  const sdk = {
    async init() { calls.push('init'); },
    environment: 'crazygames',
    user: { systemInfo: { applicationType: 'apple_store' } },
    game: {
      isOfflineMode: true,
      gameplayStart() { calls.push('start'); },
      gameplayStop() { calls.push('stop'); },
    },
    ...overrides,
  };
  return { sdk, calls };
}

test('initializes before exposing the app and offline context, then reports state transitions once', async () => {
  const { sdk, calls } = fixture();
  const platform = await connectPlatform(async () => sdk);

  assert.equal(platform.applicationType, 'apple_store');
  assert.equal(platform.offline, true);
  assert.deepEqual(calls, ['init']);
  for (const state of [false, true, true, false, false, true, false]) {
    platform.setPlaying(state);
  }
  assert.deepEqual(calls, ['init', 'start', 'stop', 'start', 'stop']);
});

test('the local SDK can report the same lifecycle during development', async () => {
  const { sdk, calls } = fixture({ environment: 'local' });
  const platform = await connectPlatform(async () => sdk);
  platform.setPlaying(true);
  platform.setPlaying(false);
  assert.deepEqual(calls, ['init', 'start', 'stop']);
});

test('missing, disabled, and rejected SDKs allow a standalone session', async () => {
  const { sdk, calls } = fixture({ environment: 'disabled' });
  const loadRejected = async () => { throw new Error('Load failed'); };
  const initRejected = async () => ({ ...sdk, async init() { throw new Error('Init failed'); } });
  for (const load of [async () => undefined, async () => sdk, loadRejected, initRejected]) {
    const platform = await connectPlatform(load);
    assert.equal(platform.applicationType, 'web');
    assert.equal(platform.offline, false);
    platform.setPlaying(true);
    platform.setPlaying(false);
  }
  assert.deepEqual(calls, ['init']);
});

test('a late script load does not initialize the SDK after falling back', async () => {
  const { sdk, calls } = fixture();
  let finishLoad;
  const scriptLoad = new Promise((resolve) => { finishLoad = resolve; });
  const platform = await connectPlatform(() => scriptLoad, 1);
  finishLoad(sdk);
  await new Promise((resolve) => setImmediate(resolve));
  platform.setPlaying(true);
  assert.equal(platform.applicationType, 'web');
  assert.deepEqual(calls, []);
});

test('a late init rejection does not affect an active standalone session', async () => {
  let failInit;
  const init = new Promise((_, reject) => { failInit = reject; });
  const { sdk, calls } = fixture({ init: () => init });
  const platform = await connectPlatform(async () => sdk, 1);
  failInit(new Error('Late init failure'));
  await new Promise((resolve) => setImmediate(resolve));
  platform.setPlaying(true);
  platform.setPlaying(false);
  assert.equal(platform.applicationType, 'web');
  assert.deepEqual(calls, []);
});

test('a late init success does not start reporting an already playable session', async () => {
  let finishInit;
  const init = new Promise((resolve) => { finishInit = resolve; });
  const { sdk, calls } = fixture({ init: () => init });
  const platform = await connectPlatform(async () => sdk, 1);
  platform.setPlaying(true);
  finishInit();
  await new Promise((resolve) => setImmediate(resolve));
  platform.setPlaying(false);
  platform.setPlaying(true);
  assert.equal(platform.applicationType, 'web');
  assert.deepEqual(calls, []);
});
