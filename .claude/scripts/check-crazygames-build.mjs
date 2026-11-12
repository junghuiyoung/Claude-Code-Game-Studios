import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// https://docs.crazygames.com/requirements/technical/#file-size-count-limits
const PACKAGE_LIMIT = 250_000_000;
const FILE_LIMIT = 1500;
const INITIAL_LIMIT = 50_000_000;
const MOBILE_HOME_TARGET = 20_000_000;

async function inspectDirectory(directory, stats) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspectDirectory(file, stats);
    } else if (entry.isFile()) {
      stats.bytes += (await lstat(file)).size;
      stats.files += 1;
    } else {
      throw new Error(`Build contains a symbolic link or non-regular file: ${file}`);
    }
  }
}

async function main(args) {
  const withoutSdk = args.includes('--without-sdk');
  const paths = args.filter((arg) => arg !== '--without-sdk');
  if (paths.length > 1 || paths.some((arg) => arg.startsWith('-'))) {
    throw new Error('Usage: node .claude/scripts/check-crazygames-build.mjs [dist] [--without-sdk]');
  }

  const directory = path.resolve(paths[0] ?? 'dist');
  const entry = path.join(directory, 'index.html');
  if (!(await lstat(directory)).isDirectory() || !(await lstat(entry)).isFile()) {
    throw new Error('Expected a regular index.html in a build directory.');
  }

  const stats = { bytes: 0, files: 0 };
  await inspectDirectory(directory, stats);
  const html = (await readFile(entry, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
  const rootRelative = [];
  for (const tag of html.matchAll(/<(?:script|link|img|audio|video|source|track)\b[^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/\s(?:src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const value = (attribute[1] ?? attribute[2] ?? attribute[3]).trim();
      if (/^\/(?!\/)/.test(value)) rootRelative.push(value);
    }
  }

  console.log(`Package: ${stats.bytes} bytes, ${stats.files} files`);
  if (withoutSdk) {
    console.log(`Initial download without SDK: ${stats.bytes} bytes (entire package)`);
    console.log(`Mobile homepage size: ${stats.bytes <= MOBILE_HOME_TARGET ? 'at or below' : 'above'} ${MOBILE_HOME_TARGET} bytes`);
  } else {
    console.log('Initial download: NOT MEASURED — verify through the first gameplayStart in Portal Preview.');
  }

  const problems = [];
  if (stats.bytes > PACKAGE_LIMIT) problems.push(`Package exceeds ${PACKAGE_LIMIT} bytes.`);
  if (stats.files > FILE_LIMIT) problems.push(`Package exceeds ${FILE_LIMIT} files.`);
  if (withoutSdk && stats.bytes > INITIAL_LIMIT) {
    problems.push(`Package without SDK exceeds the ${INITIAL_LIMIT}-byte initial download limit.`);
  }
  if (rootRelative.length) {
    problems.push(`index.html references root-relative assets: ${rootRelative.join(', ')}.`);
  }
  if (problems.length) throw new Error(problems.join('\n'));
  console.log('Package check: no structural violations');
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Package check error: ${error.message}`);
  process.exitCode = 1;
});
