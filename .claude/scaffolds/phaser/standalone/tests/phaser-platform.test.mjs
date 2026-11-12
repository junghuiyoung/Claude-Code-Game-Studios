import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectPlatform } from '../src/phaser/platform.ts';

test('the standalone adapter starts without a browser or a network SDK', async () => {
  const platform = await connectPlatform();
  assert.equal(platform.applicationType, 'web');
  assert.equal(platform.offline, false);
  platform.setPlaying(true);
  platform.setPlaying(false);
});
