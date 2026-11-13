> Gate definition, loaded by `/gate-check` for the TARGET PHASE ONLY.
> Never load the other five — one gate applies per invocation.


# Gate: Polish → Release


**Required Artifacts:**
- [ ] All features from milestone plan are implemented
- [ ] Content is complete (all levels, assets, dialogue referenced in design docs exist)
- [ ] Localization strings are externalized (no hardcoded player-facing text in the code root)
- [ ] QA test plan exists (`/qa-plan` output in `production/qa/`)
- [ ] QA sign-off report exists (`/team-qa` output — APPROVED or APPROVED WITH CONDITIONS)
- [ ] All Must Have story test evidence is present (Logic/Integration: test files pass; UI: retained screenshots of each screen touched; Visual/Feel: retained screenshots plus lead sign-off — both in `production/qa/evidence/`, and no `qa.level` waives either)
- [ ] Smoke check passes cleanly (PASS verdict) on the release candidate build — a full run, not a `quick` one labelled `(quick — …)`
- [ ] No test regressions from previous sprint (test suite passes fully)
- [ ] Balance data has been reviewed (`/balance-check` run)
- [ ] Release checklist completed (`/release-checklist` run)
- [ ] **Quality floor, every tier:** the newest release checklist in `production/releases/` has a `### Quality Standard` section, written for this candidate, in which every floor row that applies is ticked. A floor row it reports as failed: a Blocker. A floor row it reports as `NOT ASSESSED`, a checklist with no such section (written before the standard), or no checklist at all: this item is NOT ASSESSED — run `/release-checklist` — never passed. **This item reads the Floor rows of that section and nothing else in the checklist.** Its advisory rows, its other sections and its overall Go / No-Go never reach this item: a checklist whose Go / No-Go is NOT ASSESSED only because of a section this tier dropped (certification, store, launch) still passes this item when every floor row is ticked. One more source, at every tier:
  - No unresolved playtest blocker. Read the `## Quality floor blockers` table of every report in `production/qa/playtests/` (no reports, or tables that read `None observed in this session`: nothing to resolve, and no report is required for this part). Each row is a floor row seen failing in play after the fact, so a story's earlier close record does not answer it. A row is resolved only when some `Complete` story's Completion Notes answer it by name: its `**Quality rows**` line gives that Q-ID an evidence path and `resolves: [that report's path]`, which `/story-done` writes when it closes a story over a playtest blocker. Any story may be the one, so a row saved as `no story carries this row` is resolved the same way once a story takes the row. No date is compared. No such line: a Blocker naming the report and the row, and the story the report named if any
- [ ] **CrazyGames requirements, every tier, for a CrazyGames game only.** Read the `platform.distribution_targets` line of the resolved block, whole. The line reads `none (project.yaml sets an empty list)`: this item is `N/A — not a CrazyGames game`. The line is unset, or lists only items named `unknown:`: ask "Is this game released on CrazyGames?" and go by the answer; never take unset as no. It lists `crazygames`:
  - Ask which stage this release is for, Basic Launch or Full Launch, unless the user has said.
  - Read the two `CG-` tables in `docs/CRAZYGAMES.md` on this run: each row's ID, Force and stage (`CG-B` or `CG-F`). That is the set to expect; it is never taken from the report or from memory.
  - Read the `### CrazyGames requirements` section of the newest release checklist in `production/releases/`, and compare it with that set. The item passes only when the report is for this candidate, its heading names the stage being released, it has a line for every row of the set, and no `required` row that is due at that stage is broken or `NOT ASSESSED`.
  - A due `required` row the report shows broken: a Blocker naming the row.
  - Any of these makes the item NOT ASSESSED — run `/release-checklist` — never passed: no checklist; a device-form checklist or one with no such section; a report for another build or for the other stage (a Basic Launch report cannot stand for a Full Launch release); a row of the set with no line; a `CG-B` row marked `not due`; a `CG-F` row marked `not due` in a Full Launch report; a due `required` row that reads `NOT ASSESSED`; a line whose result cannot be told. Name each.
  - `recommended` rows never affect the gate, and neither do `CG-F` rows that read `not due` in a Basic Launch report for a Basic Launch release.
  - `docs/CRAZYGAMES.md` missing or without `CG-` tables: NOT ASSESSED — the set to expect cannot be read
- [ ] Store metadata prepared (if applicable)
- [ ] Changelog / patch notes drafted

**Quality Checks:**
- [ ] Full QA pass signed off by `qa-lead`
- [ ] All tests passing
- [ ] Performance targets met across all target platforms
- [ ] No known open S1 Critical, S2 High or S3 Medium bugs
- [ ] No open CRITICAL or HIGH findings in the newest `production/security/security-audit-*.md` whose **Scope** is `full`, as updated by any later `quick` report (the re-run `/security-audit` prescribes after remediation). A later `network`, `save` or `input` report adds its open findings but never clears a category it did not scan — any open CRITICAL or HIGH finding means not ready (a blocker). No `full`-scope audit report means the check could not run: this item is NOT ASSESSED, never passed. A report whose release recommendation is itself NOT ASSESSED makes this item NOT ASSESSED too
- [ ] Accessibility basics covered (remapping, text scaling if applicable)
- [ ] Localization verified for all target languages — every translated locale being shipped has a `/localize qa` verdict of PASS or PASS WITH CONDITIONS (`production/localization/loc-qa-[locale]-[date].md`). A FAIL blocks that locale; the others may still ship. A locale with no QA report, or whose QA reported NOT ASSESSED (nobody has played it), has not been verified: this item is NOT ASSESSED, never passed. The source locale (`en`, per `/localize`) is not a target language and needs no `/localize qa` report; a game that ships only its source locale marks this item N/A and says so
- [ ] Legal requirements met (EULA, privacy policy, age ratings if applicable)
- [ ] Build compiles and packages cleanly

## Workflow tier reductions

**The quality floor item is outside every reduction below.** It is required at
`full`, `standard` and `minimal`, and at every `qa.level`: the floor of
`.claude/docs/game-quality-standard.md` holds at every rigor, and "everything
else drops" never reaches it. At `minimal` the "Release checklist completed"
item itself drops, so the floor item is what makes `/release-checklist` run
before a release.

**So is the CrazyGames requirements item**, for a game released there: the
platform's review does not vary with this project's rigor. For any other game
the item is `N/A` and takes no part in the gate.

The checklist above is the **`full` baseline**. At lower tiers apply the
reduction for the resolved tier; items not named keep their status above.
Reductions only ever *relax* a requirement — `workflow_overrides` is the
only thing that adds one.

- **`full`** — all features + content complete + localization + QA sign-off + smoke (PASS) + no open S1–S3 bugs all required
- **`standard`** — content-complete audit + QA sign-off + localization → recommended; **all features + smoke + no open S1 Critical bugs** required; open S2 High and S3 Medium bugs → recommended
- **`minimal`** — only **smoke + no open S1 Critical bugs + the quality floor item** required; everything else **drops**
