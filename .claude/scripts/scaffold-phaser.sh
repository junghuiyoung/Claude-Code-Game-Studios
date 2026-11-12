#!/usr/bin/env bash
# Copy a Phaser starter into the current project. Compatible with Bash 3.2.
set -euo pipefail

usage() {
  printf '%s\n' 'Usage: bash .claude/scripts/scaffold-phaser.sh [--target standalone|crazygames] [--list|--check]'
}

target=standalone
target_given=0
mode=write
while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      if [ "$#" -lt 2 ] || [ "$target_given" -eq 1 ]; then usage >&2; exit 2; fi
      target=$2
      target_given=1
      shift
      ;;
    --list|--check)
      if [ "$mode" != write ]; then usage >&2; exit 2; fi
      mode=${1#--}
      ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
  shift
done

case "$target" in
  standalone|crazygames) ;;
  *) usage >&2; exit 2 ;;
esac

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
project_dir=$(cd -- "$script_dir/../.." && pwd -P)
if [ "$(pwd -P)" != "$project_dir" ]; then
  printf '%s\n' 'Run this script from its project root.' >&2
  exit 2
fi

starter_dir="$script_dir/../scaffolds/phaser"
if [ ! -d "$starter_dir/common" ] || [ ! -d "$starter_dir/$target" ]; then
  printf '%s\n' 'Phaser starter files are missing.' >&2
  exit 2
fi

sources=()
destinations=()
for variant in common "$target"; do
  while IFS= read -r file; do
    relative=${file#./}
    sources+=("$starter_dir/$variant/$relative")
    destinations+=("$relative")
  done < <(cd -- "$starter_dir/$variant" && find . -type f | LC_ALL=C sort)
done

if [ "$mode" = list ]; then
  printf '%s\n' "${destinations[@]}" | LC_ALL=C sort
  exit 0
fi

# Reject links (including dangling links) and non-directories before traversing
# ancestors. A linked src or public directory must never redirect a write.
parents_are_safe() {
  local rest=$1 part parent=
  while [[ "$rest" == */* ]]; do
    part=${rest%%/*}
    rest=${rest#*/}
    parent=${parent:+$parent/}$part
    if [ -L "$parent" ] || { [ -e "$parent" ] && [ ! -d "$parent" ]; }; then
      return 1
    fi
  done
}

file_action() {
  local source=$1 relative=$2
  if ! parents_are_safe "$relative" || [ -L "$relative" ]; then
    printf '%s' CONFLICT
  elif [ ! -e "$relative" ]; then
    printf '%s' CREATE
  elif [ -f "$relative" ] && cmp -s "$source" "$relative"; then
    printf '%s' KEEP
  else
    printf '%s' CONFLICT
  fi
}

conflicts=0
for ((i = 0; i < ${#destinations[@]}; i++)); do
  action=$(file_action "${sources[i]}" "${destinations[i]}")
  printf '%-8s %s\n' "$action" "${destinations[i]}"
  if [ "$action" = CONFLICT ]; then conflicts=1; fi
done
if [ "$conflicts" -eq 1 ]; then
  printf '%s\n' 'Resolve the reported conflicts before installing the starter.' >&2
  exit 1
fi
if [ "$mode" = check ]; then exit 0; fi

for ((i = 0; i < ${#destinations[@]}; i++)); do
  source=${sources[i]}
  relative=${destinations[i]}
  case "$(file_action "$source" "$relative")" in
    KEEP) continue ;;
    CONFLICT)
      printf 'Destination changed during setup: %s\n' "$relative" >&2
      exit 1
      ;;
  esac
  mkdir -p -- "$(dirname -- "$relative")"
  if ! parents_are_safe "$relative" || [ -e "$relative" ] || [ -L "$relative" ]; then
    printf 'Destination changed during setup: %s\n' "$relative" >&2
    exit 1
  fi
  # noclobber also protects against a regular file created after preflight.
  (set -o noclobber; cat -- "$source" > "$relative")
done
