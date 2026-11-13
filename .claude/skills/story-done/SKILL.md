---
name: story-done
description: "Closes a finished story: verifies each acceptance criterion, checks for design or ADR deviations and updates its status. Use when the user says a story is done, finished or ready to close."
argument-hint: "[story-file-path] [--review full|lean|solo]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Agent, Bash(bash "*/.claude/skills/story-done/../../hooks/yaml-helper.sh" resolve_config *), Bash(bash .claude/scripts/story-facts.sh *), Bash(bash .claude/scripts/story-status.sh*), Bash(bash .claude/scripts/adr-status.sh *), Bash(bash .claude/scripts/md-section.sh *), Bash(bash .claude/scripts/review-receipts.sh check *), Bash(bash .claude/scripts/session-state.sh *), Bash(git status --porcelain*)
model: opus
---

!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys review_mode,review_gate,automation,automation_always_ask,workflow,qa.level,gate_level,system_overrides`

Resolved above — use as-is; `--review` overrides `review_mode`. No block →
defaults in `.claude/docs/config-resolution.md`.

Ask with the question tool. Without one, list the options numbered and end your turn
to wait. A skipped or dismissed question is not an answer: ask again in plain text.

# Story Done

Closes a finished story. Every acceptance criterion is checked against evidence,
deviations from the GDD, the ADRs and the story's own scope are reported as facts,
and the story is marked Complete only on the user's yes.

**Writes, after the user's yes:** the story file (`Status`, `Last Updated`, a
`## Completion Notes` section) and its `production/sprint-status.yaml` entry;
`docs/tech-debt-register.md` only when the user picks that option. The session
checkpoint is written at the end of every run, whatever the verdict.
**Next:** the next story (Phase 8).

Asks follow `.claude/docs/automation-modes.md` (collaborative always asks, guided
asks on major choices, autonomous logs and goes on; `automation_always_ask`
categories always ask).

Checklist (copy it and tick as you go):

```
- [ ] Phase 1: story found, facts and settings read
- [ ] Phase 2: what the story is checked against, loaded for its tier
- [ ] Phase 3: each criterion verified, traceability table built
- [ ] Phase 4: test evidence, quality rows and run result checked
- [ ] Phase 5: deviations and scope checked
- [ ] Phase 6: review gates run, or their skip noted
- [ ] Phase 7: report and verdict shown; close asked
- [ ] Phase 8: next story named, checkpoint written, closing block printed
```

## Phase 1: The story and its settings

**Which story.** The text typed after the skill name, with any `--review <mode>`
pair removed, is the story path. With nothing typed:

1. The checkpoint in `production/session-state/active.md`: its **Current task**
   line, when it names a story.
2. Else the stories in progress: `bash .claude/scripts/story-facts.sh --all`, rows
   whose state is `IN_REVIEW` or `IN_PROGRESS`. Several: ask "Which story are we
   closing?" with one option per story.
3. None: ask for the path. When `production/epics/` holds no story file at all,
   stop:
   "No stories found in `production/epics/` — run `/create-stories [epic-slug]` to make them (at `standard` and `full`, run `/create-epics` first if there is no epic yet)."

**Its facts.** `bash .claude/scripts/story-facts.sh <story-path>` gives the status,
type, layer, TR-IDs, ADRs, criteria count, test-evidence status and dependencies.
Then read the story in full: the criteria text, the Test Evidence path, `## Files`,
Out of Scope.

**Tier.** `workflow` for the story's system, keyed on the GDD filename stem of its
`GDD:` path (`design/gdd/<stem>.md` → `<stem>`; the `[system]` of its TR-ID only
when there is no GDD path): that system's `system_overrides` row if there is one,
else the project value.

**What `qa.level` requires** (the evidence rows of `.claude/docs/coding-standards.md`).
Take the value from the `qa.level` line above, never from `workflow` or `rigor`: the
two are set apart, so `workflow: minimal` with `qa.level: standard` still requires a
Logic story's unit test.

| Check | `qa.level: minimal` | `qa.level: standard` | `qa.level: full` |
|---|---|---|---|
| Logic, Integration test | waived | required | required |
| Config/Data smoke report | waived | required, advisory by default | required, **blocking** by default |
| Visual/Feel, UI retained screenshot | required | required | required |
| Quality floor rows (Phase 4) | required | required | required |
| Untested criteria (Phase 3) | never escalate | more than half block | **any** blocks |

The look is never waived: a Visual/Feel or UI story needs its screenshot at every
level. Neither is the quality floor: it is not a test, so `qa.level` and
`gate_level` do not reach it. **Gate level** per type is the `gate_level` line above. At `full`, a
Config/Data default (`config=advisory(default…)`) becomes blocking; an explicit
`testing.strict.config: false` still makes it advisory.

## Phase 2: What the story is checked against

By the tier. Read every document by section, never whole.

- **`full`:** the current requirement text of each TR-ID: in
  `docs/architecture/tr-registry.yaml`, the lines matching `id: <TR-ID>\s*$` and the
  entry's text below (the anchor keeps `TR-combat-001` from matching
  `TR-combat-0010`; `\s*` takes a Windows line ending). Never use text quoted in the
  story; the GDD's Acceptance Criteria and Detailed Design
  (`bash .claude/scripts/md-section.sh extract design/gdd/<file>.md "Acceptance Criteria"`,
  then the same for `"Detailed Design"`; exit 3: try `"Detailed Rules"`, the design
  standard's name for the same section);
  each ADR's status with `bash .claude/scripts/adr-status.sh <ADR ids>`, then its
  Decision and Consequences sections.
- **`standard`:** the same GDD sections; the ADR sections only for a critical ADR
  (`adr-status.sh`'s layer column reads Foundation, or has no layer).
- **`minimal`:** none. The story's criteria are the spec.

At every tier, when `docs/architecture/control-manifest.md` exists, note its
`Manifest Version` line.

## Phase 3: Verify each criterion

Take each acceptance criterion in turn:

- **Checked by looking:** a file the criterion names exists; a test file it names
  exists (report "test file present", never "test passes": nothing here runs it);
  numeric literals in gameplay code that belong in data files; player-facing
  strings in the code root that belong in localization files (resolve the root
  per `.claude/docs/code-root-resolution.md`; unresolved, report `NOT ASSESSED —
  code root unresolved`, never zero hits).
- **Asked:** behaviour ("the player takes damage when…"), feel, and performance
  criteria. Never mark one passed from reading the code: the code says what should
  happen, not what the build does. Up to four per ask: "Does [criterion]?" Options:
  Yes — passes / No — fails / Not tested yet. `Not tested yet` is UNTESTED, and
  keeps the verdict at best NOT ASSESSED until someone checks it.
- **Seen on screen:** a criterion about something visible is covered by a retained
  image under `production/qa/evidence/[story-slug]/` (`[story-slug]`: the story
  file's name without `.md`) that you opened and saw it in.
  Never describe an image you have not opened; a checkpoint's `Run result:
  OBSERVED — <text>` is `/dev-story`'s description, to quote as such.
- **Needs a full playtest:** `DEFERRED — requires playtest session`. It does not
  block.

Then map each criterion to what covers it: a test under the test root, a
"Yes — passes", or a retained image.

```
| Criterion | Covered by | Status |
|-----------|------------|--------|
| AC-1: [text] | tests/unit/[system]/[file]::[test] | COVERED |
| AC-2: [text] | production/qa/evidence/[slug]/01-[what].png | COVERED |
| AC-3: [text] | — | UNTESTED |
```

Untested criteria escalate by the Phase 1 table: blocking above the line; below it,
advisory, listed in the Completion Notes as "Untested criteria: [AC-N list]".

## Phase 4: Test evidence and the run result

By the story's type, at the Phase 1 gate level. Skip a check `qa.level` waives, and
say so: `Test evidence: waived at qa.level minimal`.

- **Logic:** the exact path in the story's Test Evidence section, else anywhere
  under `tests/unit/[system]/`.
- **Integration:** the same under `tests/integration/[system]/`, else a playtest
  record naming this story in `production/qa/playtests/` (`/playtest-report`
  writes them there).
- **UI:** a UI story is satisfied by the retained screenshot of each screen touched,
  under `production/qa/evidence/`. No evidence doc or sign-off needed.
- **Visual/Feel:** the screenshot, and a Visual/Feel story also needs the sign-off:
  `production/qa/evidence/[story-slug]-evidence.md` with every sign-off row
  `[x] Approved` (one person may sign every role).
- **Config/Data:** a `production/qa/smoke-*.md` report; none: "No smoke check
  report found. Run `/smoke-check`."
- **No Type:** advisory: "Story Type not declared. Add `Type:` to the story header."

A missing item is a gap at the gate level: BLOCKING stops COMPLETE, ADVISORY goes
in the notes. Name what is missing and where it goes. An evidence doc with no image
beside it is not evidence: a described check is an assertion.

**Quality rows, every type, every `qa.level`.** Read the story's `## Quality
Standard` section, and in `.claude/docs/game-quality-standard.md`: "How a row
applies", "When a story touches a row", "The first-run record", "The key list",
"The rights ledger", and the rows. Which rows are **floor** comes from that file's Level column, never
from memory.

First decide what the story touches, from its criteria and `## Files`, not from
its Type and not only from what its section lists. This skill is the last check
at `workflow: minimal`, where `/story-readiness` does not run.

- **A floor row the section leaves out.** A floor row that applies, that the
  story's criteria or the changes in its `## Files` touch, and that the section
  does not list (a `None` section included): a BLOCKING gap. Name the row.
- **An advisory row the section leaves out**, or a `None` that only advisory rows
  contradict: report each as `[Q-ID] (advisory): not observed`. Never a gap.
- **An ID the standard does not have:** a BLOCKING gap; the line checks nothing.
- **`None — [reason]`** on a story that changes no first-run flow, screen,
  control, player-facing text, art or audio, and whose `## Files` add no font,
  image, audio, video or model file and no package: accept it.
- **`Q-ID: N/A — [reason]`:** confirm the reason against the build (for
  `Q-ONB-3`, the current first-run record says there is no onboarding step).
  Confirmed: the row needs no other evidence. No current record to confirm it
  with: `[Q-ID]: NOT ASSESSED — N/A reason not confirmed`.
- **A floor row that applies.** Its evidence is at the location the standard
  fixes: for a first-run row, the newest `first-run-*.md` under
  `production/qa/evidence/first-run/` with its screenshots and stamp; for the key
  list, `production/qa/evidence/[story-slug]/keys.md`; for a rights row,
  `production/qa/evidence/rights-ledger.md` and a run of the rights scan. Open it
  and check it shows what the row asks.
  - Nothing there: a BLOCKING gap, whatever `qa.level` and `gate_level` say.
  - It exists but cannot be read, or lacks a field or a screenshot the standard
    requires: `[Q-ID]: NOT ASSESSED — [what is missing]`, which keeps the verdict
    at best NOT ASSESSED.
  - Is a first-run record current? Never judge by a date. List the files under
    the code root with Glob and run
    `bash .claude/scripts/review-receipts.sh check production/qa/evidence/first-run/[record name].stamp.txt <every file under the code root>`.
    Read the result in the standard's order, first match wins:
    1. `RECEIPT: NONE`, or a stamp file with no `Reviewed-Content-Hash:` line:
       `[Q-ID]: NOT ASSESSED — the record has no usable stamp`. The `NEW:` lines
       printed beside it mean the stamp is empty, not that the code changed.
    2. A `CHANGED:`, `GONE:` or `NEW:` line: the code changed after the capture,
       a BLOCKING gap, "re-capture the first run".
    3. An `UNRESOLVED:` line, a failed check, no `UNCHANGED:` line at all, or a
       code root that cannot be resolved: `[Q-ID]: NOT ASSESSED — the record's
       stamp could not be checked`.
    4. Every file reads `UNCHANGED:`: the record is current. No `CHANGED:` line
       is not enough.
  - `Q-ONB-5`: one `-hint-[method].png` beside the record for each supported
    input method, by the standard's "supported input methods". Methods that
    cannot be told, or a method with no screenshot: `Q-ONB-5: NOT ASSESSED —
    [which]`, since an incomplete record has shown nothing. A screenshot that
    shows no hint for its method: the criterion that carries the row FAILS.
  - It shows the row failing (onboarding with no way to skip, play that needs
    Escape with no other input): the criterion that carries the row FAILS.
  - A rights row: run `node .claude/scripts/rights-scan.mjs --code-root <code root>`
    as its own Bash call, and read its lines as the standard's "The rights
    ledger" table says. Judge this story by what it brought in:
    1. No ledger file, or a `NO ROW` line for a file the story's `## Files` add
       or replace, or a marked `PACKAGE:` line with `ledger: no row` for a
       package the story added: a BLOCKING gap. Name the file or package.
    2. A `LEDGER: … — empty cell` line for a row that covers one of the story's
       files, a `CHECK: … — NOT RUN` line for a part the row needs, or a scan
       that could not start (`node` absent): `[Q-ID]: NOT ASSESSED — [which]`.
    3. A `NO ROW` line for a file this story did not touch: report it as
       `[Q-ID]: [N] files outside this story have no ledger row`. It is not this
       story's gap; `/release-checklist` blocks on it.
    4. None of those: the row is met for this story. The scan reads that a
       licence is named, not that it is true: say so once, as `ledger rows not
       verified against their sources`, unless the story's summary shows the
       source was opened.
- **An advisory row:** report `[Q-ID]: [what the evidence shows]` or `[Q-ID]: not
  observed`. Never a gap.
- **A playtest blocker on a row this story lists.** Grep the `## Quality floor
  blockers` tables under `production/qa/playtests/` for each floor row the story
  lists. Every report row for that Q-ID that no `Complete` story's `**Quality
  rows**` line already `resolves:` is open against this close, whichever story
  the report named (this one, another, or none): a story that lists the row
  takes on what play showed about it. Say so, naming each report. The row's evidence must show
  what the report saw is fixed (a first-run record's stamp already forces a new
  capture after the fix); evidence that still shows it: the criterion FAILS. On
  close, write `resolves: [report path]` beside that row, once per report, with
  the path exactly as the file is named. No reports, or no such
  row: say `Playtest blockers: none open on this story's rows`.
- **No section** (a story written before the standard): `Quality rows: NOT
  ASSESSED — the story has no Quality Standard section`. When the story changes
  anything in the list above, this keeps the verdict at best NOT ASSESSED;
  otherwise it is an information line.
- **Standard not found:** `Quality rows: NOT ASSESSED —
  .claude/docs/game-quality-standard.md not found`. The verdict is at best NOT
  ASSESSED unless the story changes nothing in the list above.

**Is the evidence older than its code?** For a retained image, run
`bash .claude/scripts/review-receipts.sh check production/qa/evidence/[story-slug]/stamp.txt`.
Each `CHANGED:` or `GONE:` file: "[file] changed after the evidence was captured —
re-capture it." `RECEIPT: NONE`: "no stamp — whether the evidence is older than the
code cannot be told". Report these lines; they never change the verdict.

**Run result, every other type.** Take the `Run result:` line from the `/dev-story`
checkpoint (only when its **Current task** names this story) or the story's Completion Notes.
`OBSERVED` with a path: note it. `N/A — <reason>`: accept only a reason that says
why nothing is observable ("it's a Logic story" is not one). `NOT VERIFIED` on a
story whose criteria name something on screen: a gap at the gate level. No line:
advisory, "confirm the build was launched and looked at". A user's "Yes — passes"
to an on-screen criterion with no retained image is an assertion, not an
observation: a gap at the gate level.

## Phase 5: Deviations and scope

Run, by tier (`minimal` skips 1 and 3):

1. **GDD rules** (`full`; `standard` on its required sections): search the changed
   files for the names the current GDD text and TR requirement use.
2. **Manifest:** the story's `Manifest Version` older than the manifest's: ADVISORY,
   "written against manifest v[story]; current is v[current] — run
   `/story-readiness` to check". No manifest: skip. A `Manifest-Note:` line in the
   story is carried into the deviations as written.
3. **ADR constraints** (`full`; `standard` for a critical ADR): search for the
   patterns the ADR's Decision or the manifest forbids.
4. **Hardcoded values** in the changed files.
5. **Scope:** the files the story lists under `## Files` against the code and test
   files changed (`git status --porcelain`). A changed file the list does not name
   is OUT OF SCOPE. A story with no `## Files` section: use the checkpoint's
   **Files in progress** when its Current task names this story; else report
   `Scope: NOT ASSESSED — the story lists no files`. A clean working tree: report
   `Scope: not checked — no uncommitted changes to compare`.

Each deviation is **BLOCKING** (contradicts the GDD or ADR), **ADVISORY** (drifts
but works the same; the user decides) or **OUT OF SCOPE** (for awareness). State
them as facts; the user judges them.

## Phase 6: Review gates

Read the `review_gate` line above.

- **`skill-gates=skip`:** no agent. Note `QL-TEST-COVERAGE skipped — [Solo | Lean]
  mode` and `LP-CODE-REVIEW skipped — [Solo | Lean] mode`. In `lean` mode, ask: "Did
  you run `/code-review` on the implemented files?" Options: Yes — it passed or was
  approved with suggestions / No — skipping review for this story / No — I'll run
  it before the sprint close-out. The answer sets Reviewed by.
- **`skill-gates=run`:** read `references/review-gates.md` and
  `.claude/docs/director-gates.md`, and run both gates now. On a skip, do not load
  it.

**Reviewed by** is never blank: `lead-programmer` when LP-CODE-REVIEW ran;
`/code-review (you said you ran it; not verified here)` for the lean Yes; `self, no
independent review` in solo mode, for either No, and when no implementation file
exists yet.

## Phase 7: Report, verdict, and the close

```markdown
## Story Done: [title]
**Story**: [path] · **Type**: [type] · **Date**: [today]

### Acceptance Criteria: [X/Y passing]
- [x] [criterion] — [how verified]
- [ ] [criterion] — FAILS: [reason]
- [?] [criterion] — DEFERRED: requires playtest

### Traceability
[the Phase 3 table]

### Test Evidence
**Required**: [what the type needs at this qa.level, or "waived at qa.level minimal"]
**Found**: [YES — path | NO — BLOCKING | NO — ADVISORY]

### Quality Standard
[one line per row the story touches: `Q-ID (floor): evidence path — what it shows |
MISSING — BLOCKING | NOT ASSESSED — why`, `Q-ID (advisory): what it shows | not
observed`, `Q-ID: N/A — reason, confirmed by [what]`; a floor row that applies and
that the section left out: `Q-ID (floor): NOT LISTED — BLOCKING`; an advisory row
it left out: `Q-ID (advisory): not observed`; or `None — [the story's reason]`; or
the `NOT ASSESSED — …` line from Phase 4]

### Deviations
[NONE, or each: BLOCKING / ADVISORY / OUT OF SCOPE — description — reference]

### Review
**Reviewed by**: [value]

### Verdict: [COMPLETE | COMPLETE WITH NOTES | NOT ASSESSED | BLOCKED]
```

**Verdicts, the first that matches wins:**

1. **BLOCKED:** a criterion fails, or a BLOCKING gap or deviation stands.
2. **NOT ASSESSED:** a criterion could not be evaluated: it names no observable
   outcome, the user answered "Not tested yet", a review gate returned NOT ASSESSED
   and its input was not supplied, evidence exists but cannot be read, the GDD
   or ADR a deviation would be judged against is missing, or Phase 4's quality
   rows came out NOT ASSESSED in a way it says holds the verdict. Name each one and what
   would settle it. It outranks the two passes and never hides a failure.
3. **COMPLETE WITH NOTES:** every criterion passes or is DEFERRED, with advisory
   items listed. Information lines are not advisory items: the evidence-stamp
   lines, an absent sprint file and the run result never turn COMPLETE into COMPLETE
   WITH NOTES.
4. **COMPLETE:** every criterion passes, nothing advisory.

**Then ask, before writing anything:** "How do you want to proceed?" Options:
Close the story — mark it Complete and log notes (Recommended) / Close and log the
advisory deviations as tech debt / Don't close yet — I'll fix things first / Close
anyway, accepting the deviations. On BLOCKED or NOT ASSESSED, recommend "Don't close
yet" and list what must change. Closing such a story is a `scope_changes` decision:
when the `automation_always_ask` line lists it, ask in every automation mode, even
when the user's own request is what got here. Write only on an explicit choice to
close.

**The quality floor is not a deviation to accept.** When a floor row that applies
failed, has no evidence, or is NOT ASSESSED, offer only "Don't close yet — I'll
fix things first" and say why: "Close anyway" does not reach the floor
(`.claude/docs/game-quality-standard.md`, "The floor"). The story stays open until
the evidence exists.

**On close:**

1. `bash .claude/scripts/md-section.sh set-field <story> Status Complete`, then
   `set-field <story> "Last Updated" <YYYY-MM-DD> --after Status`.
2. Add at the end of the story, with a file edit, never a shell command (a shell
   write skips the project's write checks):
   ```markdown
   ## Completion Notes
   **Completed**: [date]
   **Criteria**: [X/Y passing] ([deferred items])
   **Deviations**: [None, or the advisory ones]
   **Test Evidence**: [path, or "waived at qa.level minimal", or "none required"]
   **Quality rows**: [each Q-ID with its evidence path or "not observed", or "None — reason", or the NOT ASSESSED line; a floor row closed over a playtest blocker adds `resolves: [report path]`, which is what `/gate-check` looks for]
   **Reviewed by**: [value]
   ```
3. "Close and log as tech debt": read `references/tech-debt-row.md` and add one
   row per advisory deviation.
4. `production/sprint-status.yaml`, when it exists: this story's entry gets
   `status: done` and `completed: [date]`, and the top-level `updated` gets today.
   The close answer covers it.
5. Print a suggested commit: `git add [the changed code and test files] [story path]`
   and `git commit -m "feat: [story title] ([TR-ID])"`.

**On "Don't close yet":** change no story file. List what the user flagged. Never
fix a failing criterion yourself: report it and ask what to do.

## Phase 8: Next story, checkpoint, close

**The next story.** With no sprint plan in `production/sprints/` (always at
`workflow: minimal`): Run `bash .claude/scripts/story-status.sh` after the close, so
this story's new status is in it. It prints the unfinished stories in route order;
do not re-rank them. The first `In Review` story is next (the first `IN_REVIEW`
line), else the first `In Progress` one, else the first `Ready` or `Not Started`
one (`TODO`):

```
### Next Up
**[Story NNN: title]** — [one line]
Run `/story-done [path]` to close it (In Review) — else `/dev-story [path]` to implement it.
```

When the `workflow` line above reads `minimal`, print no `/story-readiness` line at
all, not even as an option: it is not on that path. With no sprint plan at
`workflow: standard` or `full`, add "Run `/story-readiness [path]` first."

- Only `COMPLETE N of N`: every story is built. Offer: play the build and note what
  feels wrong; add stories from the brief with `/create-stories`; or `/settings` to
  raise `modes.rigor` if the game has outgrown its brief.
- Only `BLOCKED`, `OTHER` or `NO_STATUS` lines left: there is no Next Up, and the
  build order is **not** done. Name each story with its blocker, `Draft` or `no
  status`.
- Never print the Sprint Close-Out Sequence on this branch: there is no sprint.

With a sprint plan: read `references/sprint-next.md`.

**The checkpoint**, on every verdict, closed or not. Pipe the block to
`bash .claude/scripts/session-state.sh checkpoint`, which replaces the old block:

```
**Updated:** [date]
**Branch:** `[current git branch]`
**Current task:** /story-done — [story path]: [verdict], [closed | left open]
**Next step:** [the Next Up command, or the fix the verdict named]
**Blocked on:** [nothing, or what blocked the verdict]
**Files in progress:** none
**Open questions:** [tech debt logged: N items, or none]
```

**The run's last reply ends with this block** (repeat it if you showed it earlier):

```
Verdict: [COMPLETE | COMPLETE WITH NOTES | NOT ASSESSED | BLOCKED] — [story path]
Story: [closed — Status: Complete | left open — Status: [status]]
Review: [Reviewed by value; the gates' skip notes]
Next step: [/dev-story [path] | /story-done [path] | the fix | play the build]
```
