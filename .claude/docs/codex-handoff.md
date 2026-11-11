# Codex Handoff — Who Writes the Code

In this project Claude does not write game code or test code itself. Claude asks,
plans and gets approval. OpenAI Codex (`gpt-6.1-sol`, effort `xhigh`) then writes
the files, through `.claude/scripts/codex-run.sh`. This page is the procedure.

It applies to:

- **The code-writing agents**, when their approved work reaches writing files:
  `engine-programmer`, `gameplay-programmer`, `ai-programmer`, `ui-programmer`,
  `network-programmer`, `tools-programmer`, `prototyper`, `technical-artist`,
  `qa-tester` and `security-engineer`.
- **Skills that write code in the main session:** `/hotfix` Phase 4b,
  `/prototype` Phase 5, `/vertical-slice` Phase 4 and `/test-helpers`, plus
  `/day-one-patch` Phase 4 through `lead-programmer`.
  - `/test-setup` stays with Claude. It writes only templates the skill gives
    word for word (README, `.gitkeep`, asmdef, CI workflow), so no code is
    authored there.
- **Any other Claude agent asked to implement**, for example `lead-programmer` in
  `/day-one-patch`.

**What counts as code:**

- Files under the code root and the test root
  (`.claude/docs/code-root-resolution.md`)
- Prototype and vertical-slice source under `prototypes/`
- Shaders, test helpers and runners, and the CI scripts a skill writes

**What stays with Claude:** documents (specs, test cases, bug reports, reports),
and data or config edits a skill shows as from → to.

The agents that neither write code nor talk to the user are Codex proxies.
Codex does their whole job at effort `xhigh`; see the proxy section at the top of
each of their files and `.claude/docs/model-tiers.md`.

## Before the handoff (unchanged)

Claude still does everything the Collaboration Protocol asks first: read the
design, ask the questions, propose the structure, get the "yes".

Show the **plan** (files, classes, signatures, what each test checks), not the
code. Codex writes the code, so a drafted listing would be written twice.

## The handoff

1. **Make a job folder.** Run
   `bash .claude/scripts/codex-run.sh new <your agent or skill name>`. It prints
   `job <dir>`.
2. **Write `<dir>/brief.md`.** It is a new file under the job folder, so it needs
   no ask (`.claude/rules/agent-memory.md`). It holds:
   - the objective and the plan, as approved;
   - every path Codex may create or change, and a line saying nothing else may
     change;
   - the sources to read (story, TR-IDs, ADR guidance, manifest rules,
     `naming.*`, performance budgets, engine reference), as paths, not pasted
     documents;
   - the tests to write, or "write no test file: waived at `qa.level: minimal`";
   - checks to run after writing, if any (`commands.test`, the parse check);
   - the output you need back. If your caller gave you a return contract, use
     that one.
3. **Start Codex.** Run
   `bash .claude/scripts/codex-run.sh start <dir> --agent <name> --effort xhigh`.
   A skill with no agent passes `--agent -`.
4. **Wait in the foreground.** Run `bash .claude/scripts/codex-run.sh wait <dir>`
   with the shell timeout at its maximum (600000 ms). Run it again each time it
   prints `status running`. Do not end your turn to wait: a subagent that ends
   its turn hands its caller an unfinished answer.
5. **Read the report.** Run `bash .claude/scripts/codex-run.sh report <dir>`.
   Always read it through the script: `validate-read.sh` blocks reading large
   files under `production/session-state/` whole.
6. **Check what came back:**
   - **`exit` is not 0, or `status lost`:** the step failed. Say so and name the
     job folder.
   - **`changed` paths outside the approved list:** name each one. Do not revert
     them on your own.
   - **write-guard rows** (`PROTOTYPE_HEADER`, `PROTOTYPE_IMPORT`, `ENUM`,
     `FREEZE`, `OVERWRITE`, `AGENT_WRITE`): report them as the hooks would have.
   - **`question yes`:** the QUESTION block is for the user. Put it to them (a
     subagent ends its turn with it). Write the answer word for word to
     `<dir>/answer-<n>.md`, run
     `bash .claude/scripts/codex-run.sh resume <dir> --answer <dir>/answer-<n>.md`,
     then wait and report again.
7. **Run the step's own checks**, exactly as before: the parse check,
   run-and-observe, tests. Codex writing the file waives none of them.

## When Codex cannot run

If `start` prints `NOT RUN — <why>` (no codex on PATH, no brief), or a job ends
`status lost`, report **BLOCKED** with that line and the job folder.

**Never write the code yourself instead.** The user chose Codex for this work,
and a silent fallback hides that it did not run.
