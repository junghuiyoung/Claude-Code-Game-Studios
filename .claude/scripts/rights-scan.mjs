// rights-scan.mjs — what the Rights rows of .claude/docs/game-quality-standard.md
// are checked against: every font, image, audio, video and model file with the
// rights-ledger row that covers it, every host a source file names, and every
// package in package-lock.json with its licence and whether the code reaches it.
//
// EMITS OBSERVATIONS, NOT A VERDICT (CLAUDE.md, "Helpers in .claude/scripts/").
// `NO ROW` says the ledger has no row for a file, not that the file is
// unlicensed; `match: gpl-family` says the licence text matched a pattern, not
// that the package may not ship. The skill that reads this decides. A check
// that did not run prints `CHECK: <name> — NOT RUN: <why>`, never a zero.
//
// Which files: in a git work tree, the files git tracks or would track, so a
// build copy or scratch folder that .gitignore names is not read. Anywhere
// else every file is walked, and the `CHECK: files` line says which it was.
//
// Usage: node .claude/scripts/rights-scan.mjs [--root DIR] [--ledger FILE]
//          [--code-root DIR] [--notices FILE] [--exclude DIR ...] [--files]
//          [--paths-from-stdin]
//   --root DIR          the project (default: the current directory)
//   --ledger FILE       default production/qa/evidence/rights-ledger.md
//   --code-root DIR     where imports are read from (default: src when it exists)
//   --notices FILE      a notices file to look each shipped package name up in
//   --exclude DIR       one more top-level folder to leave out; repeatable
//   --files             list every file; without it a font with no row is one
//                       line and other files with no row are counted by folder
//   --paths-from-stdin  check only the project-relative paths on stdin against
//                       the ledger (the commit hook's form); no other check runs
// Exit 0 when the scan ran, 1 when it could not (bad flag, unreadable root).

import { spawnSync } from 'node:child_process';
import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const KINDS = {
  font: ['ttf', 'otf', 'woff', 'woff2', 'eot', 'ttc'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico'],
  audio: ['mp3', 'ogg', 'wav', 'm4a', 'flac', 'opus', 'aac'],
  video: ['mp4', 'webm', 'mov', 'ogv'],
  model: ['glb', 'gltf', 'fbx', 'obj'],
};
// The kinds are a list because "a file someone may hold rights in" cannot be
// derived from a file. Extend it when the `UNLISTED:` line shows a new type.
const KIND_OF = new Map(Object.entries(KINDS).flatMap(([kind, exts]) => exts.map((ext) => [ext, kind])));
const TEXT = new Set(['html', 'htm', 'css', 'scss', 'less', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'vue', 'svelte', 'json', 'gd', 'cs', 'tscn', 'tres', 'md', 'txt', 'yaml', 'yml', 'toml', 'xml', 'cfg', 'ini']);
const SOURCE = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'vue', 'svelte']);
// Hosts are read from files a build is made of, not from prose or manifests.
const HOSTED = new Set([...SOURCE, 'html', 'htm', 'css', 'scss', 'less', 'json', 'gd', 'cs', 'tscn', 'tres']);
const SKIP_ANYWHERE = new Set(['.git', 'node_modules', '.godot', 'Library', 'Temp', 'Binaries', 'Intermediate', 'Saved', 'DerivedDataCache']);
const SKIP_TOP = ['.claude', 'production', 'design', 'docs', 'prototypes', 'studio-tests', 'tests', 'tools', 'dist', 'build'];
const TEXT_LIMIT = 2_000_000;
const FONT_URL = /fonts\.(googleapis|gstatic|bunny)\.|typekit\.net|fast\.fonts\.net|cloud\.typography\.com|\.(woff2?|ttf|otf|eot)(\?|#|$)/i;

const slash = (value) => value.split(path.sep).join('/');
const extension = (file) => path.extname(file).slice(1).toLowerCase();

function parseArgs(args) {
  const options = { root: '.', ledger: 'production/qa/evidence/rights-ledger.md', exclude: [], files: false, stdin: false };
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === '--files') options.files = true;
    else if (flag === '--paths-from-stdin') options.stdin = true;
    else if (['--root', '--ledger', '--code-root', '--notices', '--exclude'].includes(flag)) {
      const value = args[i += 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value.`);
      if (flag === '--exclude') options.exclude.push(value.replace(/\/+$/, ''));
      else options[{ '--root': 'root', '--ledger': 'ledger', '--code-root': 'codeRoot', '--notices': 'notices' }[flag]] = value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  return options;
}

async function listFiles(root, skipTop) {
  const git = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (git.status !== 0 || git.error) return { ...(await walk(root, skipTop)), how: 'every file walked (not a git work tree, so ignored files are not known)' };
  const files = [];
  let symlinks = 0;
  for (const file of git.stdout.split('\0').filter(Boolean)) {
    const parts = file.split('/');
    if (skipTop.has(parts[0]) || parts.some((part) => SKIP_ANYWHERE.has(part))) continue;
    const info = await lstat(path.join(root, file)).catch(() => null);
    if (info?.isSymbolicLink()) symlinks += 1;
    else if (info?.isFile()) files.push(file);
  }
  return { files: files.sort(), symlinks, how: 'files git tracks or would track (ignored files left out)' };
}

async function walk(root, skipTop) {
  const files = [];
  let symlinks = 0;
  async function visit(directory, relative) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) symlinks += 1;
      else if (entry.isDirectory()) {
        if (SKIP_ANYWHERE.has(entry.name) || (!relative && skipTop.has(entry.name))) continue;
        await visit(path.join(directory, entry.name), rel);
      } else if (entry.isFile()) files.push(rel);
    }
  }
  await visit(root, '');
  return { files: files.sort(), symlinks };
}

// The ledger is a Markdown table. Only the Path, Source and Licence columns are
// read; every other column is for people.
function parseLedger(text) {
  const rows = [];
  let header = null;
  let readable = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) { header = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    if (!header) {
      const names = cells.map((cell) => cell.toLowerCase());
      header = { path: names.indexOf('path'), source: names.indexOf('source'), licence: names.findIndex((name) => /^licen[cs]e/.test(name)) };
      readable ||= header.path >= 0;
      continue;
    }
    if (header.path < 0) continue;
    const target = (cells[header.path] ?? '').replace(/`/g, '').replace(/^\.\//, '');
    if (!target) continue;
    const blank = (index) => index < 0 || /^(|-|\?|tbd|\[.*\])$/i.test(cells[index] ?? '');
    rows.push({
      target,
      licence: header.licence < 0 ? '' : cells[header.licence] ?? '',
      empty: [['Source', header.source], ['Licence', header.licence]].filter(([, index]) => blank(index)).map(([name]) => name),
      used: false,
    });
  }
  return { rows, readable };
}

function covers(target, file) {
  if (target.includes('*')) {
    const pattern = target.split('**').map((part) => part.split('*').map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
    return new RegExp(`^${pattern}$`).test(file);
  }
  return file === target || file.startsWith(`${target.replace(/\/+$/, '')}/`);
}

function rowFor(ledger, file) {
  const row = ledger.rows.find((candidate) => !candidate.target.startsWith('npm:') && covers(candidate.target, file));
  if (row) row.used = true;
  return row;
}

// A font with no row is always its own line. Other files with no row are
// counted by folder, so forty new sprites are one line and a folder row fixes it.
function reportFiles(assets, ledger, noRow, listAll, say) {
  const counted = { font: 0, image: 0, audio: 0, video: 0, model: 0 };
  const uncovered = { font: 0, image: 0, audio: 0, video: 0, model: 0 };
  const grouped = new Map();
  for (const file of assets) {
    const kind = KIND_OF.get(extension(file));
    const row = rowFor(ledger, file);
    counted[kind] += 1;
    if (!row) uncovered[kind] += 1;
    if (row && listAll) say(`FILE: ${kind} ${file} — ledger: ${row.target} (${row.licence || 'no licence cell'})`);
    else if (!row && (listAll || kind === 'font')) say(`FILE: ${kind} ${file} — ledger: ${noRow}`);
    else if (!row) {
      const folder = file.includes('/') ? `${file.slice(0, file.lastIndexOf('/'))}/` : './';
      grouped.set(`${kind} ${folder}`, (grouped.get(`${kind} ${folder}`) ?? 0) + 1);
    }
  }
  for (const [key, count] of [...grouped].sort()) {
    const [kind, folder] = key.split(' ');
    say(`FILES: ${kind} ${count} in ${folder} — ledger: ${noRow}`);
  }
  return { counted, uncovered };
}

async function readText(root, file) {
  const full = path.join(root, file);
  if ((await stat(full)).size > TEXT_LIMIT) return null;
  return readFile(full, 'utf8');
}

function packageName(specifier) {
  if (/^(\.|\/|[a-z][a-z0-9+.-]*:)/i.test(specifier)) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function resolvePackage(packages, name, from) {
  for (let base = from; ; base = base.slice(0, Math.max(0, base.lastIndexOf('node_modules/'))).replace(/\/$/, '')) {
    const key = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (packages[key]) return key;
    if (!base) return null;
  }
}

async function licenceOf(root, key, entry) {
  let value = entry.license;
  if (value === undefined) {
    try {
      const manifest = JSON.parse(await readFile(path.join(root, key, 'package.json'), 'utf8'));
      value = manifest.license ?? manifest.licenses;
    } catch {
      return { text: '(none in the lockfile; package not installed)', known: false };
    }
  }
  if (Array.isArray(value)) value = value.map((item) => item?.type ?? item).join(' OR ');
  else if (value && typeof value === 'object') value = value.type;
  const text = String(value ?? '').trim();
  return { text: text || '(none)', known: text !== '' && !/^(unlicensed|see licen[cs]e)/i.test(text) };
}

async function main(args) {
  const options = parseArgs(args);
  const root = path.resolve(options.root);
  if (!(await stat(root)).isDirectory()) throw new Error(`Not a directory: ${options.root}`);
  const out = [];
  const say = (line) => out.push(line);

  // --- the ledger ---------------------------------------------------------
  let ledger = { rows: [], readable: false };
  let ledgerState = 'found';
  try {
    ledger = parseLedger(await readFile(path.resolve(root, options.ledger), 'utf8'));
    if (!ledger.readable) ledgerState = 'unreadable';
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    ledgerState = 'missing';
  }
  say({
    found: `CHECK: ledger — ${options.ledger}, ${ledger.rows.length} rows`,
    unreadable: `CHECK: ledger — NOT RUN: ${options.ledger} has no table with a Path column`,
    missing: `CHECK: ledger — NOT RUN: ${options.ledger} not found`,
  }[ledgerState]);
  const noRow = ledgerState === 'found' ? 'NO ROW' : 'NO LEDGER';

  // --- the commit hook's form: only the paths it was given -----------------
  if (options.stdin) {
    const skipTop = new Set([...SKIP_TOP, ...options.exclude]);
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const given = [];
    for (const file of new Set(input.split(/\r?\n/).map((line) => slash(line.trim()).replace(/^\.\//, '')).filter(Boolean))) {
      if (!KIND_OF.has(extension(file)) || skipTop.has(file.split('/')[0]) || file.split('/').some((part) => SKIP_ANYWHERE.has(part))) continue;
      // A path the commit deletes is on the list too; only a file that is there needs a row.
      if ((await lstat(path.join(root, file)).catch(() => null))?.isFile()) given.push(file);
    }
    say(`CHECK: files — ${given.length} of the paths given are font, image, audio, video or model files that exist`);
    reportFiles(given.sort(), ledger, noRow, options.files, say);
    console.log(out.join('\n'));
    return;
  }

  // --- files --------------------------------------------------------------
  const skipTop = new Set([...SKIP_TOP, ...options.exclude]);
  const { files, symlinks, how } = await listFiles(root, skipTop);
  const assets = files.filter((file) => KIND_OF.has(extension(file)));
  say(`CHECK: files — ${assets.length} font, image, audio, video and model files of ${files.length} read, ${how}; left out: ${[...skipTop].join(', ')} at the top, ${[...SKIP_ANYWHERE].join(', ')} anywhere${symlinks ? `; ${symlinks} symbolic links not followed` : ''}`);
  const { counted, uncovered } = reportFiles(assets, ledger, noRow, options.files, say);
  const unlisted = new Map();
  for (const file of files) {
    const ext = extension(file);
    if (ext && !KIND_OF.has(ext) && !TEXT.has(ext)) unlisted.set(ext, (unlisted.get(ext) ?? 0) + 1);
  }
  if (unlisted.size) say(`UNLISTED: extensions this scan has no kind for: ${[...unlisted].sort().map(([ext, count]) => `.${ext} (${count})`).join(', ')}`);

  // --- hosts and embedded fonts in text files -------------------------------
  const hosts = new Map();
  let textRead = 0;
  let tooLarge = 0;
  for (const file of files.filter((candidate) => HOSTED.has(extension(candidate)) && !/(^|\/)package(-lock)?\.json$/.test(candidate))) {
    const text = await readText(root, file);
    if (text === null) { tooLarge += 1; continue; }
    textRead += 1;
    text.split(/\r?\n/).forEach((line, index) => {
      for (const match of line.matchAll(/(?:https?:)?\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d+)?([^\s'"`)<>]*)/gi)) {
        if (!match[0].startsWith('http') && !/['"(=]\s*$/.test(line.slice(0, match.index))) continue;
        const host = match[1].toLowerCase();
        const seen = hosts.get(host) ?? { count: 0, first: `${file}:${index + 1}`, font: false };
        seen.count += 1;
        seen.font ||= FONT_URL.test(match[0]);
        hosts.set(host, seen);
      }
      if (/data:(font\/|application\/(x-)?font)/i.test(line)) say(`EMBEDDED-FONT: ${file}:${index + 1} — a font inside a data: URL`);
    });
  }
  say(`CHECK: hosts — ${textRead} source, markup, style and data files read${tooLarge ? `, ${tooLarge} over ${TEXT_LIMIT} bytes NOT READ` : ''}; a host in a comment or a namespace is listed too`);
  for (const [host, seen] of [...hosts].sort()) say(`HOST: ${host} — ${seen.count} references, first ${seen.first}${seen.font ? ' [font]' : ''}`);

  // --- packages -------------------------------------------------------------
  let lock = null;
  try {
    lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  } catch (error) {
    say(`CHECK: packages — NOT RUN: ${error.code === 'ENOENT' ? 'no package-lock.json' : `package-lock.json could not be read (${error.message})`}`);
  }
  let shipped = 0;
  const totals = { packages: 0, gpl: 0, unknown: 0 };
  const shippedNames = new Set();
  if (lock && !lock.packages) say(`CHECK: packages — NOT RUN: package-lock.json is lockfileVersion ${lock.lockfileVersion ?? 1}, which has no packages map (npm 7 or later writes one)`);
  else if (lock) {
    const packages = lock.packages;
    const keys = Object.keys(packages).filter((key) => key.includes('node_modules/') && !packages[key].link);
    say(`CHECK: packages — package-lock.json lockfileVersion ${lock.lockfileVersion}, ${keys.length} packages`);

    const reached = new Set();
    let codeRoot = options.codeRoot;
    if (codeRoot === undefined && files.some((file) => file.startsWith('src/'))) codeRoot = 'src';
    if (codeRoot === undefined) say('CHECK: imports — NOT RUN: no --code-root given and no src folder; `reached` is unknown for every package');
    else {
      const prefix = `${slash(codeRoot).replace(/^\.\/|\/+$/g, '')}/`;
      const sources = files.filter((file) => file.startsWith(prefix) && SOURCE.has(extension(file)));
      const queue = [];
      for (const file of sources) {
        const text = await readText(root, file);
        for (const match of (text ?? '').matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g)) {
          const name = packageName(match[1]);
          const key = name && resolvePackage(packages, name, '');
          if (key && !reached.has(key)) { reached.add(key); queue.push(key); }
        }
      }
      while (queue.length) {
        const key = queue.pop();
        const entry = packages[key];
        for (const name of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies, ...entry.peerDependencies })) {
          const next = resolvePackage(packages, name, key);
          if (next && !reached.has(next)) { reached.add(next); queue.push(next); }
        }
      }
      say(`CHECK: imports — ${sources.length} source files read under ${prefix}, ${reached.size} packages reached`);
    }

    for (const key of keys.sort()) {
      const entry = packages[key];
      const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
      const licence = await licenceOf(root, key, entry);
      const scope = entry.dev ? 'dev' : entry.devOptional ? 'dev-optional' : entry.optional ? 'optional' : 'prod';
      const isReached = codeRoot === undefined ? 'unknown' : reached.has(key) ? 'yes' : 'no';
      const row = ledger.rows.find((candidate) => candidate.target === `npm:${name}`);
      if (row) row.used = true;
      const gpl = /(^|[^a-z])[al]?gpl/i.test(licence.text);
      const match = gpl ? 'gpl-family' : licence.known ? 'none' : 'no-licence';
      totals.packages += 1;
      const ships = scope === 'prod' || isReached !== 'no';
      if (ships) { shipped += 1; shippedNames.add(name); }
      if (ships && gpl) totals.gpl += 1;
      if (ships && !gpl && !licence.known) totals.unknown += 1;
      if (ships || match !== 'none' || options.files) {
        say(`PACKAGE: ${name}@${entry.version} — licence: ${licence.text} — lock: ${scope} — reached: ${isReached} — match: ${match} — ledger: ${row ? `npm:${name}` : 'no row'}`);
      }
    }
  }

  // --- notices ----------------------------------------------------------------
  if (!options.notices) say('CHECK: notices — NOT RUN: no --notices file given');
  else if (!lock?.packages) say('CHECK: notices — NOT RUN: no package list to look up');
  else {
    let notices = null;
    try { notices = await readFile(path.resolve(root, options.notices), 'utf8'); } catch { say(`CHECK: notices — NOT RUN: ${options.notices} could not be read`); }
    if (notices !== null) {
      say(`CHECK: notices — ${options.notices}, ${shippedNames.size} package names looked up (lock: prod, or reached)`);
      for (const name of [...shippedNames].sort()) if (!notices.includes(name)) say(`NOTICE: ${name} — not named in ${options.notices}`);
    }
  }

  // --- ledger rows that point at nothing ---------------------------------------
  for (const row of ledger.rows) {
    if (row.empty.length) say(`LEDGER: ${row.target} — empty cell: ${row.empty.join(', ')}`);
    if (row.used || row.target.includes('*')) {
      if (!row.used) say(`LEDGER: ${row.target} — matches no file`);
      continue;
    }
    if (row.target.startsWith('npm:')) say(`LEDGER: ${row.target} — no such package in package-lock.json`);
    else {
      try { await stat(path.join(root, row.target)); } catch { say(`LEDGER: ${row.target} — matches no file`); }
    }
  }

  say(`SUMMARY: files ${assets.length} (${Object.entries(counted).map(([kind, count]) => `${kind} ${count}`).join(', ')}); ${noRow.toLowerCase()}: ${Object.entries(uncovered).map(([kind, count]) => `${kind} ${count}`).join(', ')}; hosts ${hosts.size}, with a font reference ${[...hosts.values()].filter((seen) => seen.font).length}; packages ${lock?.packages ? `${totals.packages}, shipped (lock: prod, or reached) ${shipped}, of those gpl-family ${totals.gpl}, no-licence ${totals.unknown}` : 'not read'}`);
  console.log(out.join('\n'));
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Rights scan error: ${error.message}`);
  process.exitCode = 1;
});
