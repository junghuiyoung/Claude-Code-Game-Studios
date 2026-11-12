#!/usr/bin/env bash
# Run from a checkout with Bash; no npm or browser required.
set -euo pipefail

test_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
scratch=$(mktemp -d "${TMPDIR:-/tmp}/ccgs-phaser-scaffold.XXXXXXXX")
trap 'rm -rf -- "$scratch"' EXIT
installer=.claude/scripts/scaffold-phaser.sh

prepare_project() {
  mkdir -p "$scratch/$1/.claude/scripts" "$scratch/$1/.claude/scaffolds"
  cp "$test_dir/../../scripts/scaffold-phaser.sh" "$scratch/$1/$installer"
  cp -R "$test_dir" "$scratch/$1/.claude/scaffolds/phaser"
}

prepare_project standalone
(
  cd "$scratch/standalone"
  bash "$installer" --list | grep -Fx 'src/phaser/platform.ts' > /dev/null
  bash "$installer" --check > /dev/null
  test ! -e package.json
  bash "$installer" > /dev/null
  bash "$installer" | grep -E '^KEEP +package.json$' > /dev/null
  if bash "$installer" --target crazygames > /dev/null 2>&1; then
    printf '%s\n' 'Unexpected variant replacement.' >&2
    exit 1
  fi
  cmp -s src/phaser/platform.ts .claude/scaffolds/phaser/standalone/src/phaser/platform.ts
)

prepare_project conflict
(
  cd "$scratch/conflict"
  printf '%s\n' '{"name":"existing-package"}' > package.json
  if bash "$installer" > /dev/null 2>&1; then
    printf '%s\n' 'Unexpected overwrite of an existing file.' >&2
    exit 1
  fi
  test "$(cat package.json)" = '{"name":"existing-package"}'
  test ! -e index.html
  test ! -e src
)

prepare_project links
(
  cd "$scratch/links"
  mkdir "$scratch/outside"
  ln -s "$scratch/outside" src
  if bash "$installer" --target crazygames > /dev/null 2>&1; then
    printf '%s\n' 'Unexpected write through a linked directory.' >&2
    exit 1
  fi
  test ! -e "$scratch/outside/phaser"
  test ! -e package.json
  rm src

  ln -s "$scratch/outside/index.html" index.html
  if bash "$installer" --target crazygames > /dev/null 2>&1; then
    printf '%s\n' 'Unexpected write through a dangling link.' >&2
    exit 1
  fi
  test -L index.html
  test ! -e "$scratch/outside/index.html"
  test ! -e package.json
)

prepare_project crazygames
(
  cd "$scratch/crazygames"
  if bash "$installer" --target crazygames --target standalone > /dev/null 2>&1; then
    printf '%s\n' 'Unexpected acceptance of duplicate targets.' >&2
    exit 1
  fi
  test ! -e package.json
  bash "$installer" --target crazygames > /dev/null
  cmp -s src/phaser/platform.ts .claude/scaffolds/phaser/crazygames/src/phaser/platform.ts
  test -s package-lock.json
)

printf '%s\n' 'Phaser scaffold checks passed.'
