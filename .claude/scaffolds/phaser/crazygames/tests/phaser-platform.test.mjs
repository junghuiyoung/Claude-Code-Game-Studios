import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as adapter from '../src/phaser/platform.ts';

const { connectPlatform } = adapter;

function fixture(overrides = {}) {
  const calls = [];
  const settingsListeners = new Set();
  const addedSettingsListeners = [];
  const removedSettingsListeners = [];
  const sdk = {
    async init() { calls.push('init'); },
    environment: 'crazygames',
    user: { systemInfo: { applicationType: 'apple_store' } },
    game: {
      isOfflineMode: true,
      settings: { muteAudio: false },
      addSettingsChangeListener(listener) {
        addedSettingsListeners.push(listener);
        settingsListeners.add(listener);
      },
      removeSettingsChangeListener(listener) {
        removedSettingsListeners.push(listener);
        settingsListeners.delete(listener);
      },
      gameplayStart() { calls.push('start'); },
      gameplayStop() { calls.push('stop'); },
    },
    ...overrides,
  };
  const changeSettings = (settings) => {
    // Deliberately deliver a new object without mutating the startup snapshot.
    for (const listener of settingsListeners) listener(settings);
  };
  return { sdk, calls, changeSettings, settingsListeners, addedSettingsListeners, removedSettingsListeners };
}

test('dispose removes the exact SDK settings listener and disables mute subscriptions', async () => {
  // Arrange
  const { sdk, changeSettings, settingsListeners, addedSettingsListeners, removedSettingsListeners } = fixture();
  const platform = await connectPlatform(async () => sdk);
  const changes = [];
  const remove = platform.onMutedChange((muted) => changes.push(muted));
  changeSettings({ muteAudio: true });
  assert.deepEqual(changes, [true]);
  assert.equal(addedSettingsListeners.length, 1);
  const sdkListener = addedSettingsListeners[0];

  // Act
  platform.dispose();
  const removeAfterDisposal = platform.onMutedChange(() => assert.fail('disposed subscription fired'));
  changeSettings({ muteAudio: false });
  sdkListener({ muteAudio: false }); // A callback already queued by the SDK must also be inert.
  remove();
  removeAfterDisposal();
  platform.dispose();

  // Assert
  assert.equal(settingsListeners.size, 0);
  assert.equal(removedSettingsListeners.length, 1);
  assert.equal(removedSettingsListeners[0], sdkListener);
  assert.deepEqual(changes, [true]);
});

test('dispose removes every embedded-page listener once and restores browser defaults', async () => {
  // Arrange
  const registrations = [];
  const removals = [];
  class PageTarget extends EventTarget {
    addEventListener(...args) { registrations.push(args); super.addEventListener(...args); }
    removeEventListener(...args) { removals.push(args); super.removeEventListener(...args); }
  }
  const target = new PageTarget();
  const { sdk } = fixture();
  const platform = await connectPlatform(async () => sdk, undefined, target);
  for (const type of ['wheel', 'keydown', 'contextmenu']) {
    const event = pageEvent(type, { code: 'ArrowUp' });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true, type);
  }

  // Act
  platform.dispose();
  platform.dispose();

  // Assert
  assert.deepEqual(registrations.map(([type]) => type).sort(), ['contextmenu', 'keydown', 'wheel']);
  assert.equal(removals.length, registrations.length);
  for (const [type, listener] of registrations) {
    assert.equal(removals.find(([removedType]) => removedType === type)[1], listener);
    const event = pageEvent(type, { code: 'ArrowUp' });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, type);
  }
});

test('dispose while playing reports one stop and prevents any later gameplay reports', async () => {
  // Arrange
  const { sdk, calls } = fixture();
  const platform = await connectPlatform(async () => sdk);
  platform.setPlaying(true);

  // Act
  platform.dispose();
  platform.dispose();
  platform.setPlaying(true);
  platform.setPlaying(false);

  // Assert
  assert.deepEqual(calls, ['init', 'start', 'stop']);
});

test('dispose while idle does not report an extra stop', async () => {
  // Arrange
  const { sdk, calls } = fixture();
  const platform = await connectPlatform(async () => sdk);

  // Act
  platform.dispose();
  platform.dispose();

  // Assert
  assert.deepEqual(calls, ['init']);
});

test('SDK muteAudio true at startup silences the platform', async () => {
  // Arrange
  const { sdk } = fixture();
  sdk.game.settings.muteAudio = true;

  // Act
  const platform = await connectPlatform(async () => sdk);

  // Assert
  assert.equal(platform.muted, true);
});

test('mute changes update the live getter, notify only on transitions, and unsubscribe independently', async () => {
  // Arrange
  const { sdk, changeSettings } = fixture();
  const platform = await connectPlatform(async () => sdk);
  const changes = [];
  const otherChanges = [];
  const remove = platform.onMutedChange((muted) => changes.push(muted));
  const removeOther = platform.onMutedChange((muted) => otherChanges.push(muted));
  assert.equal(platform.muted, false);
  assert.deepEqual(changes, [], 'registration does not emit an initial change');

  // Act / Assert
  changeSettings({ muteAudio: true });
  assert.equal(platform.muted, true);
  changeSettings({ muteAudio: true, disableChat: true });
  changeSettings({ muteAudio: false });
  assert.equal(platform.muted, false);
  assert.deepEqual(changes, [true, false]);
  remove();
  remove();
  changeSettings({ muteAudio: true });
  assert.deepEqual(changes, [true, false]);
  assert.deepEqual(otherChanges, [true, false, true]);
  removeOther();
  changeSettings({ muteAudio: false });
  assert.equal(platform.muted, false, 'the getter stays current without subscribers');
  assert.deepEqual(otherChanges, [true, false, true]);
});

for (const deviceType of ['desktop', 'tablet', 'mobile', 'console', '', undefined, null, 7]) {
  test(`SDK device type ${String(deviceType)} is accepted only when known`, async () => {
    // Arrange
    const { sdk } = fixture();
    sdk.user.systemInfo.device = { type: deviceType };

    // Act
    const platform = await connectPlatform(async () => sdk);

    // Assert
    const expected = ['desktop', 'tablet', 'mobile'].includes(deviceType) ? deviceType : undefined;
    assert.equal(platform.deviceType, expected);
  });
}

for (const locale of ['en-US', 'fr-CA', '', '   ', undefined, null, 7]) {
  test(`SDK locale ${JSON.stringify(locale)} is exposed only when a non-empty string`, async () => {
    // Arrange
    const { sdk } = fixture();
    sdk.user.systemInfo.locale = locale;

    // Act
    const platform = await connectPlatform(async () => sdk);

    // Assert
    const expected = typeof locale === 'string' && locale.trim() ? locale : undefined;
    assert.equal(platform.locale, expected);
  });
}

test('system info and settings populated by init are read after init', async () => {
  // Arrange
  const { sdk } = fixture();
  sdk.init = async () => {
    sdk.user.systemInfo = { device: { type: 'tablet' }, locale: 'de-DE' };
    sdk.game.settings = { muteAudio: true };
  };

  // Act
  const platform = await connectPlatform(async () => sdk);

  // Assert
  assert.equal(platform.deviceType, 'tablet');
  assert.equal(platform.locale, 'de-DE');
  assert.equal(platform.muted, true);
});

for (const user of [undefined, {}, { systemInfo: {} }]) {
  test(`missing system info members in ${JSON.stringify(user)} use standalone defaults`, async () => {
    // Arrange
    const { sdk } = fixture({ user });

    // Act
    const platform = await connectPlatform(async () => sdk);

    // Assert
    assert.equal(platform.deviceType, undefined);
    assert.equal(platform.locale, undefined);
    assert.equal(platform.applicationType, 'web');
  });
}

test('an SDK without settings starts unmuted and can receive later settings', async () => {
  // Arrange
  const { sdk, changeSettings } = fixture();
  delete sdk.game.settings;
  const platform = await connectPlatform(async () => sdk);
  const changes = [];
  const remove = platform.onMutedChange((muted) => changes.push(muted));

  // Act / Assert
  assert.equal(platform.muted, false);
  changeSettings({ muteAudio: true });
  assert.equal(platform.muted, true);
  changeSettings({});
  assert.equal(platform.muted, false);
  assert.deepEqual(changes, [true, false]);
  remove();
});

for (const missing of [['addSettingsChangeListener'], ['removeSettingsChangeListener'],
  ['addSettingsChangeListener', 'removeSettingsChangeListener']]) {
  test(`missing ${missing.join(' and ')} does not disable the adapter`, async () => {
    // Arrange
    const { sdk, calls } = fixture();
    sdk.game.settings.muteAudio = true;
    for (const member of missing) delete sdk.game[member];

    // Act
    const platform = await connectPlatform(async () => sdk);
    const remove = platform.onMutedChange(() => assert.fail('no settings change was sent'));
    remove();
    platform.setPlaying(true);

    // Assert
    assert.equal(platform.muted, true);
    assert.deepEqual(calls, ['init', 'start']);
    platform.dispose();
    platform.dispose();
    assert.deepEqual(calls, ['init', 'start', 'stop']);
  });
}

function pageEvent(type, properties = {}) {
  return Object.assign(new Event(type, { cancelable: true }), properties);
}

for (const eventCase of [
  { type: 'wheel' },
  { type: 'contextmenu' },
  ...['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].map((code) =>
    ({ type: 'keydown', code })),
  ...['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].map((key) =>
    ({ type: 'keydown', key })),
]) {
  test(`embedded fix prevents ${JSON.stringify(eventCase)} without stopping propagation`, () => {
    // Arrange
    const target = new EventTarget();
    const remove = adapter.installEmbeddedPageFixes(target);
    const { type, ...properties } = eventCase;
    const event = pageEvent(type, properties);
    let received = 0;
    target.addEventListener(type, () => { received++; });

    // Act
    target.dispatchEvent(event);
    remove();
    const afterRemoval = pageEvent(type, properties);
    target.dispatchEvent(afterRemoval);

    // Assert
    assert.equal(event.defaultPrevented, true);
    assert.equal(received, 2);
    assert.equal(afterRemoval.defaultPrevented, false);
  });
}

test('the wheel listener explicitly opts out of passive handling', () => {
  // Arrange
  const registrations = [];
  const target = {
    addEventListener(...args) { registrations.push(args); },
    removeEventListener() {},
  };

  // Act
  adapter.installEmbeddedPageFixes(target)();

  // Assert
  assert.equal(registrations.find(([type]) => type === 'wheel')[2].passive, false);
});

for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
  test(`embedded fixes preserve scrolling keys pressed with ${modifier}`, () => {
    // Arrange
    const target = new EventTarget();
    const remove = adapter.installEmbeddedPageFixes(target);

    // Act / Assert
    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW']) {
      const event = pageEvent('keydown', { code, [modifier]: true });
      target.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false, code);
    }
    remove();
  });
}

for (const field of [
  { tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' },
  { isContentEditable: true },
  { closest: () => ({ contentEditable: 'true' }) },
]) {
  test(`embedded fixes preserve all defaults in a text field ${JSON.stringify(field)}`, () => {
    // Arrange
    const target = new EventTarget();
    const remove = adapter.installEmbeddedPageFixes(target);

    // Act / Assert
    for (const type of ['wheel', 'keydown', 'contextmenu']) {
      const event = pageEvent(type, { code: 'ArrowUp' });
      Object.defineProperty(event, 'target', { value: field });
      target.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false, type);
    }
    remove();
  });
}

test('embedded fixes leave movement letters and unrelated keys available', () => {
  // Arrange
  const target = new EventTarget();
  const remove = adapter.installEmbeddedPageFixes(target);

  // Act / Assert
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape', 'Enter']) {
    const event = pageEvent('keydown', { code });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, code);
  }
  remove();
});

for (const environment of ['crazygames', 'local', 'disabled']) {
  test(`the adapter installs page fixes only for a connected environment: ${environment}`, async () => {
    // Arrange
    const target = new EventTarget();
    const { sdk } = fixture({ environment });

    // Act
    await connectPlatform(async () => sdk, undefined, target);
    const event = pageEvent('wheel');
    target.dispatchEvent(event);

    // Assert
    assert.equal(event.defaultPrevented, environment !== 'disabled');
  });
}

test('a failed SDK connection leaves browser defaults alone', async () => {
  // Arrange
  const target = new EventTarget();

  // Act
  await connectPlatform(async () => undefined, undefined, target);
  const event = pageEvent('contextmenu');
  target.dispatchEvent(event);

  // Assert
  assert.equal(event.defaultPrevented, false);
});

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
