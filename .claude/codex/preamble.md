# Working inside Claude Code Game Studios (a Codex job)

Claude Code started you through `.claude/scripts/codex-run.sh` to do one job for
an agent or a skill of this project. Claude passes your final message, word for
word, to whoever asked. Nobody reads your intermediate steps.

## Before you start

1. Read `CLAUDE.md` and every file it imports with a line that starts with `@`
   (`.claude/docs/directory-structure.md`, the engine `VERSION.md`,
   `.claude/docs/coordination-rules.md`, `.claude/docs/coding-standards.md`).
   They are this project's rules and they apply to you. Skip only what is about
   Claude Code's own machinery: hooks, the Agent tool, the question tool, model
   tiers.
2. Settings: where a skill would read a block from
   `yaml-helper.sh resolve_config`, run
   `bash .claude/hooks/yaml-helper.sh resolve_config --keys <keys>` yourself.
3. Before writing a file, read each `.claude/rules/*.md` whose `paths:` cover it.
4. Read design documents by section, not whole (coordination rule 6).
5. Engine APIs: check `docs/engine-reference/<engine>/` before using one; your
   training data may predate the pinned engine version.

## You cannot talk to the user

- Nothing can reach the user while you run. When the job needs a decision the
  brief does not give you (an ambiguity, a choice between designs, approval to
  write a file the brief does not name), stop. End your final message with a
  block that starts with `QUESTION:` on its own line, then the question and its
  options, each with what it would produce. The caller puts it to the user and
  resumes you with the answer.
- Your role text says "ask" or "May I write this to [path]?" in many places.
  Read each of those as: put it in the QUESTION block and stop.

## What you may write

- A new file under `production/`, `docs/` or `tests/` at a path the brief names:
  no question needed (the orchestrated-run exception).
- Any other file the brief names or says is approved.
- Your own notes under `.claude/agent-memory/<your role>/`
  (`.claude/rules/agent-memory.md`).
- Appends to `production/session-state/active.md`, the session checkpoint your
  role text asks you to update. Append only, never rewrite what is there.
- Anything else (an existing file the brief does not name, a path you chose,
  anything under the code root, `design/` or `assets/`) needs the brief's
  approval or a QUESTION.
- Never commit, push, tag, merge, deploy or publish. Never delete a file you did
  not create in this job. Leave `.claude/`, `CLAUDE.md` and `project.yaml` alone
  unless the brief says to change them.
- Claude Code's write hooks do not see your writes. `codex-run.sh report` runs
  `.claude/scripts/write-guard.sh` on every file you change, so keep to the rules
  it checks: prototype headers, the boundary between `prototypes/` and the code
  root, append-only registries, allowed config values, the string freeze.

## Your final message

- It is your whole answer to the caller. Use the format the brief asks for
  (verdict words, return contract, file list). Use the verdict vocabulary the
  brief or the gate file gives, and never a new one.
- If you could not check something you were asked to check, say NOT ASSESSED
  and why (`.claude/rules/skill-authoring.md`). Never report a skipped step as
  done.
- List every file you wrote or changed, one per line.
- If you stopped for a decision, end with the QUESTION block.
