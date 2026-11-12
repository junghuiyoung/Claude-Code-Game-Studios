import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const checker = fileURLToPath(new URL('../../.claude/scripts/check-crazygames-build.mjs', import.meta.url));

async function bundle(t, html = '<script type="module" src="./game.js"></script>') {
  const directory = await mkdtemp(path.join(tmpdir(), 'ccgs-build-check-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'index.html'), html);
  await writeFile(path.join(directory, 'game.js'), 'console.log("ready");');
  return directory;
}

function check(directory, ...args) {
  return spawnSync(process.execPath, [checker, directory, ...args], { encoding: 'utf8' });
}

test('accepts relative assets and the external SDK URL without claiming an initial size', async (t) => {
  const directory = await bundle(t, '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script><script src="./game.js"></script>');
  const result = check(directory);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 files/);
  assert.match(result.stdout, /Initial download: NOT MEASURED/);
});

test('rejects an entry that would load assets from the host root', async (t) => {
  const result = check(await bundle(t, "<link rel='stylesheet' href='/game.css'><script src=/game.js></script>"));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /root-relative assets: \/game.css, \/game.js/);
});

test('applies the initial limit to the full package only when the SDK is absent', async (t) => {
  const directory = await bundle(t);
  await truncate(path.join(directory, 'game.js'), 50_000_001);
  assert.equal(check(directory).status, 0);
  const result = check(directory, '--without-sdk');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /initial download limit/);
});

test('enforces the total package limit and requires a real index.html', async (t) => {
  const directory = await bundle(t);
  await truncate(path.join(directory, 'game.js'), 250_000_001);
  assert.match(check(directory).stderr, /Package exceeds 250000000 bytes/);
  await rm(path.join(directory, 'index.html'));
  assert.equal(check(directory).status, 1);
});

test('rejects a linked asset rather than treating it as bundled', async (t) => {
  const directory = await bundle(t);
  try {
    await symlink('game.js', path.join(directory, 'link.js'));
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('Symbolic links are unavailable');
    throw error;
  }
  const result = check(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symbolic link/);
});
