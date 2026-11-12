#!/usr/bin/env bash
# codex-run.sh — hand one job to OpenAI Codex CLI (`codex exec`) and read back
# what it did: its final message, its session id for a follow-up, its exit
# code, and every file under the project that changed while it ran, each put
# through write-guard.sh, because Claude Code's hooks never see a write Codex
# makes. Used by the Codex proxy agents, by the code-writing agents' handoff,
# and by the skills that write code in the main session
# (.claude/docs/codex-handoff.md).
#
# EMITS OBSERVATIONS, NOT A VERDICT (CLAUDE.md, "Helpers in .claude/scripts/").
# Whether a changed path, a nonzero exit or a QUESTION stops the work is the
# caller's call.
#
# Usage: bash .claude/scripts/codex-run.sh [--root DIR] COMMAND [ARGS]
#   new NAME         make a job folder production/session-state/codex/
#                    NAME-<date>-<time>-<pid>/ and print it; NAME is the
#                    agent, or a skill name for a main-session job
#   start JOB --effort E [--agent NAME] [--network] [--model M]
#                    build JOB/prompt.md from .claude/codex/preamble.md, the
#                    agent's file (frontmatter and claude-only sections taken
#                    out, its memory and preloaded skills named) and
#                    JOB/brief.md, then run Codex detached and return at once.
#                    E: low, medium, high, xhigh, max or ultra. --network lets
#                    the sandbox reach the network
#   resume JOB --answer FILE
#                    send FILE to the same Codex session, detached
#   wait JOB [--max-seconds N]
#                    block until the job ends or N seconds pass (default 540,
#                    under the 10-minute limit of one shell call); call again
#                    while it prints `status running`
#   report JOB       the final message and what changed
#   --root DIR       the project; defaults to the repo this script is in
#   -h, --help       this text
# The model is gpt-6.1-sol unless --model or CODEX_MODEL says otherwise.
# New and resumed jobs use the standard service tier.
# Codex runs with the user's ~/.codex/config.toml ignored, in the workspace-write
# sandbox rooted at the project, and writes nothing outside it but its own
# session files under ~/.codex.
#
# Output: TSV rows.
#   new:    job <dir>
#   start, resume: job <dir> / agent <name|-> / model <m> / effort <e> /
#           network <on|off> / started <pid>
#   wait:   status <running|done|lost> <elapsed seconds> <exit code|->
#           (lost: the worker is gone and wrote no exit code)
#   report: job, agent, model, effort, session <id|->, exit <code|->,
#           question <yes|no> (a line of the final message starts QUESTION:),
#           then the final message between `---- final message ----` and
#           `---- end ----` lines, then `changed <path>` for every file
#           written since start (by anyone: a parallel writer shows up too),
#           and the write-guard.sh check rows for each
#   NOT RUN <why>    a start or resume that could not run
#
# Exit codes: 0 ran (what it found is rows); 1 the root cannot be read;
# 2 usage error; 3 not run (no codex on PATH, no job folder, no brief, no
# session to resume).
#
# bash 3.2 and BWK awk safe, no Python.

set -u
LC_ALL=C
export LC_ALL

usage() { echo "codex-run: $1 (try --help)" >&2; exit 2; }
notrun() { printf 'NOT RUN\t%s\n' "$1"; exit 3; }
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT_ARG=""; CMD=""; JOB=""; EFFORT=""; AGENT="-"; NETWORK=off; MODEL_ARG=""
ANSWER=""; MAXS=540; NPOS=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --root|--effort|--agent|--model|--answer|--max-seconds)
      [ $# -ge 2 ] || usage "$1 needs a value"
      case "$1" in
        --root) ROOT_ARG="$2" ;; --effort) EFFORT="$2" ;; --agent) AGENT="$2" ;;
        --model) MODEL_ARG="$2" ;; --answer) ANSWER="$2" ;; --max-seconds) MAXS="$2" ;;
      esac
      shift 2 ;;
    --network) NETWORK=on; shift ;;
    -?*) usage "unknown option: $1" ;;
    *) NPOS=$((NPOS + 1))
       case $NPOS in 1) CMD="$1" ;; 2) JOB="$1" ;; *) usage "too many arguments" ;; esac
       shift ;;
  esac
done
case "$CMD" in
  new|start|resume|wait|report|_run) ;;
  "") usage "no command" ;;
  *) usage "unknown command: $CMD" ;;
esac
[ -n "$JOB" ] || usage "$CMD needs a job (or a name, for new)"
case "$MAXS" in ''|*[!0-9]*) usage "--max-seconds is whole seconds" ;; esac

if [ -n "$ROOT_ARG" ]; then
  cd "$ROOT_ARG" 2>/dev/null || { echo "codex-run: cannot read root $ROOT_ARG" >&2; exit 1; }
else
  cd "$HERE/../.." 2>/dev/null || { echo "codex-run: cannot reach the repo root" >&2; exit 1; }
fi
ROOT="$(pwd)"

# ------------------------------------------------------------------ new
if [ "$CMD" = new ]; then
  case "$JOB" in *[!A-Za-z0-9_.-]*) usage "new NAME takes letters, digits, . _ - only" ;; esac
  DIR="production/session-state/codex/$JOB-$(date +%Y%m%d-%H%M%S)-$$"
  mkdir -p "$DIR" || { echo "codex-run: cannot make $DIR" >&2; exit 1; }
  printf 'job\t%s\n' "$DIR"
  exit 0
fi

JOB=$(printf '%s' "$JOB" | sed 's|\\|/|g; s|^\./||; s|/$||')
case "$JOB" in /*) JOB="${JOB#"$ROOT"/}" ;; esac

meta() { [ -f "$JOB/meta" ] && awk -F'\t' -v k="$1" '$1 == k { print $2; exit }' "$JOB/meta"; }

# ------------------------------------------------------------------ _run (the detached worker)
if [ "$CMD" = _run ]; then
  MODE="${CODEX_RUN_MODE:-new}"   # new | resume, set by start and resume
  MODEL=$(meta model); EFF=$(meta effort); NET=$(meta network)
  CODEX_ARGS=(--ignore-user-config --json -m "$MODEL" -c "model_reasoning_effort=\"$EFF\""
              -c 'service_tier="default"' -c 'features.fast_mode=false')
  if [ "$NET" = on ]; then
    CODEX_ARGS+=(-c 'sandbox_workspace_write.network_access=true')
  fi
  echo $$ > "$JOB/pid"; rm -f "$JOB/exit_code"; echo running > "$JOB/status"
  if [ "$MODE" = resume ]; then
    n=$(ls "$JOB" | grep -c '^report-[0-9]*\.md$')
    [ -f "$JOB/report.md" ] && mv "$JOB/report.md" "$JOB/report-$((n + 1)).md"
    SID=$(cat "$JOB/session_id" 2>/dev/null)
    codex exec resume "$SID" "${CODEX_ARGS[@]}" -c 'sandbox_mode="workspace-write"' \
      -o "$JOB/report.md" - < "$ANSWER" >> "$JOB/events.jsonl" 2>> "$JOB/stderr.log"
  else
    codex exec "${CODEX_ARGS[@]}" -s workspace-write -C "$ROOT" -o "$JOB/report.md" - \
      < "$JOB/prompt.md" > "$JOB/events.jsonl" 2> "$JOB/stderr.log"
  fi
  rc=$?
  if [ ! -s "$JOB/session_id" ]; then
    sed -n 's/.*"thread_id":"\([^"]*\)".*/\1/p' "$JOB/events.jsonl" | head -1 > "$JOB/session_id"
  fi
  echo "$rc" > "$JOB/exit_code"; echo done > "$JOB/status"
  exit 0
fi

if [ ! -d "$JOB" ]; then
  case "$CMD" in start|resume) notrun "no job folder $JOB (make one with: new NAME)" ;; esac
  echo "codex-run: no job folder $JOB" >&2; exit 3
fi
# running: the worker's pid is alive (a worker that died leaves status running).
running() { [ "$(cat "$JOB/status" 2>/dev/null)" = running ] && kill -0 "$(cat "$JOB/pid" 2>/dev/null || echo 0)" 2>/dev/null; }

# ------------------------------------------------------------------ start
if [ "$CMD" = start ]; then
  command -v codex >/dev/null 2>&1 || notrun "codex CLI not on PATH"
  case "$EFFORT" in low|medium|high|xhigh|max|ultra) ;; "") usage "start needs --effort" ;; *) usage "--effort is low, medium, high, xhigh, max or ultra" ;; esac
  [ -s "$JOB/brief.md" ] || notrun "brief missing or empty: $JOB/brief.md"
  running && notrun "job already running: $JOB"
  MODEL="${MODEL_ARG:-${CODEX_MODEL:-gpt-6.1-sol}}"
  AFILE=""
  if [ "$AGENT" != "-" ]; then
    AFILE=".claude/agents/$AGENT.md"
    [ -f "$AFILE" ] || notrun "no agent file $AFILE"
  fi
  {
    if [ -f .claude/codex/preamble.md ]; then cat .claude/codex/preamble.md
    else printf '(.claude/codex/preamble.md is missing: follow CLAUDE.md.)\n'; fi
    if [ -n "$AFILE" ]; then
      printf '\n\n## Your role: %s\n\n' "$AGENT"
      # The body after the frontmatter, without the sections only Claude reads.
      awk 'NR == 1 && /^---[ \t]*$/ { fm = 1; next }
           fm && /^---[ \t]*$/ { fm = 0; next }
           fm { next }
           /<!-- claude-only:start -->/ { skip = 1; next }
           /<!-- claude-only:end -->/ { skip = 0; next }
           !skip' "$AFILE"
      if [ -f ".claude/agent-memory/$AGENT/MEMORY.md" ]; then
        printf '\n\n## Your notes from earlier runs (.claude/agent-memory/%s/MEMORY.md)\n\n' "$AGENT"
        cat ".claude/agent-memory/$AGENT/MEMORY.md"
      fi
      SK=$(awk 'NR == 1 && /^---/ { fm = 1; next } fm && /^---/ { exit }
                fm && /^skills:/ { sub(/^skills:[ \t]*/, ""); gsub(/[][ ]/, ""); print }' "$AFILE")
      if [ -n "$SK" ]; then
        printf '\n\n## Procedures this role follows\n\n'
        printf '%s\n' "$SK" | tr ',' '\n' | while read -r s; do
          [ -n "$s" ] && printf -- '- .claude/skills/%s/SKILL.md (skip lines that start with !`; they are filled in only inside Claude Code)\n' "$s"
        done
      fi
    fi
    printf '\n\n## Brief from the caller (job folder: %s)\n\n' "$JOB"
    cat "$JOB/brief.md"
  } > "$JOB/prompt.md"
  printf 'agent\t%s\nmodel\t%s\neffort\t%s\nnetwork\t%s\n' "$AGENT" "$MODEL" "$EFFORT" "$NETWORK" > "$JOB/meta"
  rm -f "$JOB/exit_code" "$JOB/session_id" "$JOB/pid"
  : > "$JOB/start.marker"
  echo running > "$JOB/status"
  CODEX_RUN_MODE=new nohup bash "$HERE/codex-run.sh" --root "$ROOT" _run "$JOB" >/dev/null 2>&1 &
  printf 'job\t%s\nagent\t%s\nmodel\t%s\neffort\t%s\nnetwork\t%s\nstarted\t%s\n' \
    "$JOB" "$AGENT" "$MODEL" "$EFFORT" "$NETWORK" "$!"
  exit 0
fi

# ------------------------------------------------------------------ resume
if [ "$CMD" = resume ]; then
  command -v codex >/dev/null 2>&1 || notrun "codex CLI not on PATH"
  [ -n "$ANSWER" ] || usage "resume needs --answer FILE"
  [ -s "$ANSWER" ] || notrun "answer missing or empty: $ANSWER"
  [ -s "$JOB/session_id" ] || notrun "no session id in $JOB (the first run did not start)"
  running && notrun "job still running: $JOB"
  case "$ANSWER" in /*) ;; *) ANSWER="$ROOT/$ANSWER" ;; esac
  rm -f "$JOB/exit_code" "$JOB/pid"
  echo running > "$JOB/status"
  CODEX_RUN_MODE=resume nohup bash "$HERE/codex-run.sh" --root "$ROOT" --answer "$ANSWER" _run "$JOB" >/dev/null 2>&1 &
  printf 'job\t%s\nagent\t%s\nmodel\t%s\neffort\t%s\nnetwork\t%s\nstarted\t%s\n' \
    "$JOB" "$(meta agent)" "$(meta model)" "$(meta effort)" "$(meta network)" "$!"
  exit 0
fi

# ------------------------------------------------------------------ wait
if [ "$CMD" = wait ]; then
  t0=$(date +%s)
  while :; do
    st=$(cat "$JOB/status" 2>/dev/null)
    el=$(( $(date +%s) - t0 ))
    if [ "$st" = done ]; then
      printf 'status\tdone\t%s\t%s\n' "$el" "$(cat "$JOB/exit_code" 2>/dev/null || echo -)"; exit 0
    fi
    pid=$(cat "$JOB/pid" 2>/dev/null)
    if [ "$st" = running ] && [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null && [ ! -f "$JOB/exit_code" ]; then
      sleep 2
      [ "$(cat "$JOB/status" 2>/dev/null)" = done ] && continue
      printf 'status\tlost\t%s\t-\n' "$el"; exit 0
    fi
    if [ "$el" -ge "$MAXS" ]; then printf 'status\trunning\t%s\t-\n' "$el"; exit 0; fi
    sleep 5
  done
fi

# ------------------------------------------------------------------ report
printf 'job\t%s\nagent\t%s\nmodel\t%s\neffort\t%s\n' "$JOB" "$(meta agent)" "$(meta model)" "$(meta effort)"
printf 'session\t%s\n' "$(cat "$JOB/session_id" 2>/dev/null | grep . || echo -)"
printf 'exit\t%s\n' "$(cat "$JOB/exit_code" 2>/dev/null || echo -)"
if [ -f "$JOB/report.md" ] && grep -q '^[[:space:]*>]*QUESTION:' "$JOB/report.md"; then Q=yes; else Q=no; fi
printf 'question\t%s\n' "$Q"
echo '---- final message ----'
if [ -s "$JOB/report.md" ]; then cat "$JOB/report.md"; echo
else echo '(no final message: see '"$JOB"'/stderr.log)'; fi
echo '---- end ----'
if [ -f "$JOB/start.marker" ]; then
  # session-logs: Claude Code's own hooks append there while the job runs.
  find . \( -path ./.git -o -path ./production/session-state/codex -o -path ./production/session-logs -o -path ./.godot \
       -o -path ./Library -o -path ./Temp -o -path ./Intermediate -o -path ./Saved \
       -o -path ./DerivedDataCache -o -path ./node_modules -o -path ./.claude/worktrees \) -prune \
       -o -type f -newer "$JOB/start.marker" -print 2>/dev/null | sed 's|^\./||' | sort > "$JOB/changed.txt"
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    printf 'changed\t%s\n' "$p"
    [ -f "$HERE/write-guard.sh" ] && bash "$HERE/write-guard.sh" --root "$ROOT" check "$p" 2>/dev/null | grep -v '^checked	'
  done < "$JOB/changed.txt"
fi
exit 0
