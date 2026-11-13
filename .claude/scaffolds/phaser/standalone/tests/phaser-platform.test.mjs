import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectPlatform } from '../src/phaser/platform.ts';

test('the standalone adapter starts without a browser or a network SDK', async () => {
  const platform = await connectPlatform();
  assert.equal(platform.applicationType, 'web');
  assert.equal(platform.offline, false);
  assert.equal(platform.deviceType, undefined);
  assert.equal(platform.locale, undefined);
  assert.equal(platform.muted, false);
  const remove = platform.onMutedChange(() => assert.fail('standalone has no mute changes'));
  platform.setPlaying(true);
  platform.setPlaying(false);
  remove();
  remove();
  platform.dispose();
  platform.dispose();
});
