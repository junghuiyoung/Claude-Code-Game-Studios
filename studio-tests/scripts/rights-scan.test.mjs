import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const scanner = fileURLToPath(new URL('../../.claude/scripts/rights-scan.mjs', import.meta.url));
const LEDGER = 'production/qa/evidence/rights-ledger.md';
const HEADER = '| Path | Made by | Source | Licence | Allows this use | Notice | Proof |\n|---|---|---|---|---|---|---|\n';

async function project(t, files) {
  const root = await mkdtemp(path.join(tmpdir(), 'ccgs-rights-scan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), content);
  }
  return root;
}

function scan(root, args = [], input = undefined) {
  return spawnSync(process.execPath, [scanner, '--root', root, ...args], { encoding: 'utf8', input });
}

function lock(packages) {
  return JSON.stringify({ name: 'game', lockfileVersion: 3, packages: { '': { name: 'game' }, ...packages } });
}

test('a font with a ledger row is covered and one without reads NO ROW', async (t) => {
  const root = await project(t, {
    'public/fonts/Open.woff2': 'x',
    'public/fonts/Paid.woff2': 'x',
    [LEDGER]: `${HEADER}| \`public/fonts/Open.woff2\` | someone else | example.org/open | OFL-1.1 | yes | OFL.txt | public/fonts/OFL.txt |\n`,
  });
  const result = scan(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /FILE: font public\/fonts\/Paid\.woff2 — ledger: NO ROW/);
  assert.doesNotMatch(result.stdout, /Open\.woff2 — ledger: NO ROW/);
  assert.match(result.stdout, /no row: font 1, image 0/);
});

test('a folder row and a glob row each cover what is under them', async (t) => {
  const root = await project(t, {
    'public/art/enemies/a.png': 'x',
    'public/art/ui/b.png': 'x',
    'public/sfx/hit.ogg': 'x',
    'public/sfx/readme.txt': 'x',
    [LEDGER]: `${HEADER}| public/art/ | me | drawn for this game | own work | yes | none | git history |\n| public/sfx/*.ogg | someone else | example.org/pack | CC0-1.0 | yes | none | pack page |\n`,
  });
  const result = scan(root);
  assert.doesNotMatch(result.stdout, /^FILES?:/m);
  assert.match(result.stdout, /no row: font 0, image 0, audio 0/);
});

test('files with no row are counted by folder, and a font is always its own line', async (t) => {
  const root = await project(t, {
    'assets/art/a.png': 'x', 'assets/art/b.png': 'x', 'assets/art/gear/c.png': 'x', 'assets/audio/d.mp3': 'x', 'assets/fonts/e.ttf': 'x', 'logo.svg': 'x',
    [LEDGER]: HEADER,
  });
  const out = scan(root).stdout;
  assert.match(out, /FILES: image 2 in assets\/art\/ — ledger: NO ROW/);
  assert.match(out, /FILES: image 1 in assets\/art\/gear\/ — ledger: NO ROW/);
  assert.match(out, /FILES: audio 1 in assets\/audio\/ — ledger: NO ROW/);
  assert.match(out, /FILES: image 1 in \.\/ — ledger: NO ROW/);
  assert.match(out, /FILE: font assets\/fonts\/e\.ttf — ledger: NO ROW/);
});

test('in a git work tree an ignored folder is not read; outside one the line says so', async (t) => {
  const root = await project(t, { '.gitignore': '.scratch/\n', '.scratch/build/copy.png': 'x', 'assets/kept.png': 'x', [LEDGER]: HEADER });
  assert.match(scan(root).stdout, /CHECK: files — 2 font, image, audio, video and model files of \d+ read, every file walked \(not a git work tree/);
  if (spawnSync('git', ['init', '-q', root]).status !== 0) return t.skip('git is not available');
  const out = scan(root).stdout;
  assert.match(out, /CHECK: files — 1 font, image, audio, video and model files of \d+ read, files git tracks or would track/);
  assert.doesNotMatch(out, /\.scratch/);
});

test('a missing ledger is NOT RUN and every file reads NO LEDGER, never covered', async (t) => {
  const root = await project(t, { 'public/logo.png': 'x' });
  const result = scan(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CHECK: ledger — NOT RUN: .* not found/);
  assert.match(result.stdout, /FILES: image 1 in public\/ — ledger: NO LEDGER/);
  assert.match(scan(root, ['--files']).stdout, /FILE: image public\/logo\.png — ledger: NO LEDGER/);
});

test('a ledger with no Path column is NOT RUN, not an empty ledger', async (t) => {
  const root = await project(t, { 'public/logo.png': 'x', [LEDGER]: '| File | Licence |\n|---|---|\n| public/logo.png | MIT |\n' });
  assert.match(scan(root).stdout, /CHECK: ledger — NOT RUN: .* no table with a Path column/);
});

test('a row with an empty licence, and a row that matches nothing, are both reported', async (t) => {
  const root = await project(t, {
    'public/logo.png': 'x',
    [LEDGER]: `${HEADER}| public/logo.png | a tool | ImageGen | TBD | ? | none | - |\n| public/gone.png | me | drawn | own work | yes | none | - |\n`,
  });
  const result = scan(root);
  assert.match(result.stdout, /LEDGER: public\/logo\.png — empty cell: Licence/);
  assert.match(result.stdout, /LEDGER: public\/gone\.png — matches no file/);
});

test('evidence screenshots, concept art and installed packages are not scanned', async (t) => {
  const root = await project(t, {
    'production/qa/evidence/shot.png': 'x',
    'design/concept/idea.png': 'x',
    'node_modules/pkg/icon.png': 'x',
    'src/node_modules/pkg/icon.png': 'x',
    [LEDGER]: HEADER,
  });
  assert.match(scan(root).stdout, /CHECK: files — 0 font, image, audio, video and model files/);
});

test('a host in a source file is listed, and a font host is marked', async (t) => {
  const root = await project(t, {
    'index.html': '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">\n<script src="//cdn.example.com/lib.js"></script>',
    'src/main.ts': "// see docs.example.org for why\nfetch('https://api.example.net/score');\nconst style = \"src: url(data:font/woff2;base64,AAAA)\";",
    'README.md': 'https://not-scanned.example.com',
  });
  const out = scan(root).stdout;
  assert.match(out, /HOST: fonts\.googleapis\.com — 1 references, first index\.html:1 \[font\]/);
  assert.match(out, /HOST: cdn\.example\.com — 1 references, first index\.html:2$/m);
  assert.match(out, /HOST: api\.example\.net — 1 references, first src\/main\.ts:2$/m);
  assert.match(out, /EMBEDDED-FONT: src\/main\.ts:3/);
  assert.doesNotMatch(out, /not-scanned|docs\.example\.org/);
});

test('a GPL package the code reaches is marked, through a dev entry and a nested copy too', async (t) => {
  const root = await project(t, {
    'src/main.ts': "import Phaser from 'phaser';\nimport { tween } from '@fx/tween/easing';\n",
    'package-lock.json': lock({
      'node_modules/phaser': { version: '4.2.1', license: 'MIT' },
      'node_modules/@fx/tween': { version: '1.0.0', license: 'MIT', dev: true, dependencies: { curve: '^2.0.0' } },
      'node_modules/@fx/tween/node_modules/curve': { version: '2.0.0', license: 'GPL-3.0-only', dev: true },
      'node_modules/curve': { version: '1.0.0', license: 'ISC', dev: true },
      'node_modules/vite': { version: '8.3.7', license: 'MIT', dev: true },
    }),
  });
  const out = scan(root).stdout;
  assert.match(out, /PACKAGE: phaser@4\.2\.1 — licence: MIT — lock: prod — reached: yes — match: none/);
  assert.match(out, /PACKAGE: curve@2\.0\.0 — licence: GPL-3\.0-only — lock: dev — reached: yes — match: gpl-family/);
  assert.doesNotMatch(out, /PACKAGE: curve@1\.0\.0|PACKAGE: vite/);
  assert.match(out, /shipped \(lock: prod, or reached\) 3, of those gpl-family 1, no-licence 0/);
});

test('an LGPL build tool the code never reaches is listed but not counted as shipped', async (t) => {
  const root = await project(t, {
    'src/main.ts': "import Phaser from 'phaser';\n",
    'package-lock.json': lock({
      'node_modules/phaser': { version: '4.2.1', license: 'MIT' },
      'node_modules/packer': { version: '3.0.0', license: 'LGPL-2.1', dev: true },
    }),
  });
  const out = scan(root).stdout;
  assert.match(out, /PACKAGE: packer@3\.0\.0 — licence: LGPL-2\.1 — lock: dev — reached: no — match: gpl-family/);
  assert.match(out, /of those gpl-family 0/);
});

test('a package with no licence is no-licence until a ledger row names it', async (t) => {
  const files = {
    'src/main.ts': "import x from 'mystery';\n",
    'package-lock.json': lock({ 'node_modules/mystery': { version: '0.1.0' } }),
  };
  assert.match(scan(await project(t, files)).stdout, /PACKAGE: mystery@0\.1\.0 — licence: \(none in the lockfile; package not installed\) — lock: prod — reached: yes — match: no-licence — ledger: no row/);
  const withRow = await project(t, { ...files, [LEDGER]: `${HEADER}| npm:mystery | someone else | example.org/mystery | MIT per the author's README | yes | yes | link |\n| npm:absent | x | x | MIT | yes | no | - |\n` });
  const out = scan(withRow).stdout;
  assert.match(out, /mystery@0\.1\.0 .* ledger: npm:mystery/);
  assert.match(out, /LEDGER: npm:absent — no such package in package-lock\.json/);
});

test('with no lockfile, no code root and no notices file, each check says it did not run', async (t) => {
  const out = scan(await project(t, { 'public/logo.png': 'x', [LEDGER]: HEADER })).stdout;
  assert.match(out, /CHECK: packages — NOT RUN: no package-lock\.json/);
  assert.match(out, /CHECK: notices — NOT RUN: no --notices file given/);
  assert.match(out, /packages not read/);
  const noRoot = scan(await project(t, { 'package-lock.json': lock({ 'node_modules/a': { version: '1.0.0', license: 'MIT', dev: true } }) })).stdout;
  assert.match(noRoot, /CHECK: imports — NOT RUN/);
  assert.match(noRoot, /PACKAGE: a@1\.0\.0 .* reached: unknown/);
});

test('a shipped package the notices file does not name is reported', async (t) => {
  const root = await project(t, {
    'src/main.ts': "import 'phaser';\nimport 'howler';\n",
    'public/third-party-notices.txt': 'phaser — MIT — Copyright Phaser Studio',
    'package-lock.json': lock({ 'node_modules/phaser': { version: '4.2.1', license: 'MIT' }, 'node_modules/howler': { version: '2.2.4', license: 'MIT' } }),
  });
  const out = scan(root, ['--notices', 'public/third-party-notices.txt']).stdout;
  assert.match(out, /NOTICE: howler — not named in public\/third-party-notices\.txt/);
  assert.doesNotMatch(out, /NOTICE: phaser/);
});

test('the commit form checks only the asset paths it is given', async (t) => {
  const root = await project(t, {
    'public/old.png': 'x', 'public/fonts/A.woff2': 'x', 'public/new.png': 'x', 'public/new2.png': 'x', 'ui/B.ttf': 'x', 'src/main.ts': 'x', 'production/qa/evidence/shot.png': 'x',
    [LEDGER]: `${HEADER}| public/fonts/ | someone else | example.org | OFL-1.1 | yes | yes | - |\n`,
  });
  const result = scan(root, ['--paths-from-stdin'], 'public/fonts/A.woff2\npublic/new.png\npublic/new2.png\nui/B.ttf\nsrc/main.ts\nproduction/qa/evidence/shot.png\npublic/deleted.png\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CHECK: files — 4 of the paths given/);
  assert.match(result.stdout, /FILES: image 2 in public\/ — ledger: NO ROW/);
  assert.match(result.stdout, /FILE: font ui\/B\.ttf — ledger: NO ROW/);
  assert.doesNotMatch(result.stdout, /old\.png|deleted|A\.woff2 — ledger: NO ROW|PACKAGE|HOST/);
});

test('an unknown flag is an error, not a scan', async (t) => {
  const result = scan(await project(t, {}), ['--strict']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown argument: --strict/);
});
