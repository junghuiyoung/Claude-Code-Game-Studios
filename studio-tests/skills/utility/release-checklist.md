# Skill Test Spec: /release-checklist

## Skill Summary

`/release-checklist [platform: pc|console|mobile|all]` builds a pre-release
checklist scoped to the project. It resolves `modes.rigor`, `modes.workflow`,
`project.stage` and `platform.cert_tier`, reads `CLAUDE.md` and the current
milestone in `production/milestones/`, and reads open bugs from
`production/qa/bugs/` (Severity and Status lines). The bug items use the release
gate's thresholds for the resolved `workflow` — an open S1, S2 or S3 fails at
`full`, only an open S1 at `standard`/`minimal` (an open S2/S3 is a listed risk)
— and with no bug files they read `NOT ASSESSED — no bug records`, never zero.
It scans the code root for TODO / FIXME / HACK,
always stating the denominator (`scanned [N] source files: …`), or
`NOT ASSESSED — code root unresolved` when no root resolves, or
`NOT ASSESSED — no source files found to scan` when the root is absent or empty.
Missing test output is reported as
`Test results: NOT ASSESSED — no test output or CI logs found`.

The checklist has Codebase Health, Build Verification, Quality Gates and Content
Complete sections, device blocks chosen by the argument (default `all`), then a
certification block chosen **only** by `platform.cert_tier`: `none` → a single
"Certification: omitted — cert_tier is 'none' …" line; `itch` → itch.io rows;
`steam` → Steamworks rows; `console` → TRC/XR/Lotcheck rows. Unset `cert_tier`
means asking which platforms are in scope, or
`### Certification: NOT ASSESSED — cert tier unknown`; unset is never treated as
`none`. It ends with Store / Distribution, Launch Readiness and
`### Go / No-Go: [READY / NOT ASSESSED / NOT READY]` — first match NOT READY (a
blocking item fails), then NOT ASSESSED (any section or item NOT ASSESSED), then READY —
then asks "May I write this to
`production/releases/release-checklist-[version].md`?". No director gates apply.

`/release-checklist --target crazygames` uses the same report and verdict but
uses the CrazyGames guide for the target checks. The native device,
certification and general store rows apply to the original argument form.

---

## Static Assertions (Structural)

Checked against the SKILL.md by `/skill-test spec` — no fixture needed.

- [ ] Has required frontmatter fields: `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains verdict keywords: READY, NOT READY, NOT ASSESSED
- [ ] Contains "May I write" language before writing the checklist
- [ ] Has a next-step handoff (`/gate-check` for the formal verdict, `/team-release` for sign-offs)

---

## Director Gate Checks

None. `/release-checklist` spawns no agents (`Agent` is not in its allowed
tools). The Sign-offs Required list (QA Lead, Technical Director, Producer,
Creative Director) is a checklist for humans, not spawned gates. Formal phase
advancement is `/gate-check`.

---

## Fixture Defaults

Every case's `project.yaml` sets `modes.rigor: minimal` and
`modes.automation: collaborative`, with no `project.local.yaml`, unless its own
Fixture says otherwise. Rules: `studio-tests/CLAUDE.md` §
Fixture defaults.

`.claude/docs/game-quality-standard.md` exists. Every case's `project.yaml` lists
its `platform.targets`, the design names the game's controls, and
`production/qa/evidence/first-run/` holds a complete first-run record for the
candidate with the screenshots the floor rows need and a stamp for which
`review-receipts.sh check` prints `UNCHANGED:` for every file under the code
root, so every floor row can be assessed. Advisory rows may read `not observed` or `condition unknown`: they
never reach Go / No-Go. Case 12 is the exception.

`platform.distribution_targets` is unset in every case unless its Fixture sets
it, so a run with no argument takes the device form.

---

## Test Cases

### Case 1: Happy Path — PC Build on the Steam Tier

**Fixture:**
- `platform.cert_tier: steam`; `project.stage: Polish`; `engine.name: Godot`
- `src/` has 40 source files containing 3 TODO, 1 FIXME and 0 HACK comments
- `production/milestones/` holds the current milestone
- `production/qa/bugs/` holds `BUG-0003.md` (S1, `**Status**: Closed`) and
  `BUG-0004.md` (S4, `**Status**: Open`); `modes.rigor` is unset (`workflow: minimal`)
- CI test output exists

**Input:** `/release-checklist pc`

**Expected behavior:**
1. Skill reads `CLAUDE.md` and the current milestone
2. Codebase Health states the denominator: `scanned 40 source files: 3 TODO, 1
   FIXME, 0 HACK`, listing the FIXME
3. The PC device block is emitted; no Console or Mobile device block
4. Certification is the Steamworks block only
5. Store / Distribution, Launch Readiness and the Go / No-Go line follow
6. Skill presents total items and known blockers, then asks "May I write this
   to `production/releases/release-checklist-[version].md`?"; next steps name
   `/gate-check` and `/team-release`

**Assertions:**
- [ ] TODO/FIXME/HACK counts are reported with the number of files scanned
- [ ] Only the PC device block appears
- [ ] Certification contains Steamworks rows and no itch.io or console certification rows
- [ ] Go / No-Go is READY or NOT READY — never NOT ASSESSED, since every section in this fixture could be assessed
- [ ] The Quality Gates bug line is counted from `production/qa/bugs/` (0 open S1, S2 or S3); the closed S1 and the open S4 fail nothing
- [ ] Nothing is written before the "May I write" ask naming `production/releases/release-checklist-[version].md`

---

### Case 2: Device Argument and Certification Tier Are Separate Axes

**Fixture:**
- `platform.cert_tier: itch`
- Source files exist in the code root

**Input:** `/release-checklist console`

**Expected behavior:**
1. The `console` argument selects the Console device block (suspend/resume, user
   switching, controller prompts)
2. Certification follows `cert_tier`, not the argument: only the itch.io block
3. No Steamworks rows and no TRC/XR/Lotcheck rows appear

**Assertions:**
- [ ] The Console device block is present
- [ ] The only certification block is itch.io
- [ ] No console certification rows (TRC/Lotcheck, first-party submission) appear
- [ ] No Steamworks rows appear

---

### Case 3: cert_tier none vs Unset — Different Output

**Fixture:**
- Run A: `platform.cert_tier: none`
- Run B: `platform.cert_tier` absent (resolved block shows it as unset) and the
  user cannot say which platforms are in scope

**Input:** `/release-checklist` (no argument → device blocks for `all`)

**Expected behavior:**
1. Run A emits no certification block, only the line "Certification: omitted —
   cert_tier is 'none' (internal build, alpha or jam release)."
2. Run B asks which platforms are in scope instead of emitting every track;
   with no answer it emits `### Certification: NOT ASSESSED — cert tier unknown`
   and says why
3. In neither run does the `all` argument cause every certification track to
   be emitted

**Assertions:**
- [ ] Run A shows the "omitted — cert_tier is 'none'" line and no certification rows
- [ ] Run B asks which platforms are in scope
- [ ] Run B's certification section is `NOT ASSESSED — cert tier unknown`, not the `none` line
- [ ] Neither run emits itch.io, Steamworks and console certification together

---

### Case 4: Edge Case — Nothing to Scan, No Test Output

**Fixture:**
- `platform.cert_tier: steam`
- No `engine.name`, no legacy engine value, and none of `src/`, `Assets/`,
  `Source/` exists (code root unresolved)
- No test output directories or CI logs
- `production/qa/bugs/` holds one bug, `BUG-0002.md` (S2, `**Status**: Closed`)

**Input:** `/release-checklist pc`

**Expected behavior:**
1. The code root is unresolved, so no scan runs
2. Codebase Health reads `NOT ASSESSED — code root unresolved`
   (`.claude/docs/code-root-resolution.md`), not `0` TODO/FIXME/HACK
3. The test line reads `Test results: NOT ASSESSED — no test output or CI logs
   found` rather than being omitted
4. The rest of the checklist is still generated and offered for writing

**Assertions:**
- [ ] No bare `0` count is reported for TODO/FIXME/HACK
- [ ] Codebase Health is `NOT ASSESSED — code root unresolved`
- [ ] The test-results NOT ASSESSED line is present
- [ ] Go / No-Go is never READY: it is NOT ASSESSED naming both unassessed sections,
      or NOT READY if a blocking item failed
- [ ] The write still waits for the "May I write" ask

---

### Case 5: Director Gate Check — None; Sign-Offs Are Listed, Not Spawned

**Fixture:**
- `platform.cert_tier: console`; source files present
- Any review mode

**Input:** `/release-checklist all`

**Expected behavior:**
1. Skill generates the checklist with all device blocks and the console
   certification block
2. The Sign-offs Required list appears as unchecked items
3. No director or other agent is spawned; no gate IDs appear
4. Next steps point to `/gate-check` and `/team-release`

**Assertions:**
- [ ] No director gate is invoked and no gate skip message appears
- [ ] No subagent is spawned, although sign-offs are listed
- [ ] The console certification block is the only certification block
- [ ] Next steps name `/gate-check` and `/team-release`

---

### Case 6: A Known Blocker Outranks an Unassessed Section

**Fixture:**
- `platform.cert_tier: steam`; `project.stage: Polish`
- No `engine.name`, no legacy engine value, and none of `src/`, `Assets/`,
  `Source/` exists (code root unresolved)
- CI test output exists
- `production/qa/bugs/BUG-0007.md` is an S1 (Critical) bug with `**Status**: Open`

**Input:** `/release-checklist pc`

**Expected behavior:**
1. Codebase Health reads `NOT ASSESSED — code root unresolved`
2. Quality Gates' "Zero open S1 (Critical) bugs" fails — a blocking item, at every tier
3. Go / No-Go is NOT READY: first match wins, and NOT READY ranks above
   NOT ASSESSED
4. The Rationale lists the S1 bug as a blocking item; the unassessed Codebase
   Health section still reads NOT ASSESSED rather than being dropped

**Assertions:**
- [ ] Go / No-Go is NOT READY — not NOT ASSESSED
- [ ] The S1 bug is listed in the Rationale as a blocking item
- [ ] Codebase Health still shows `NOT ASSESSED — code root unresolved`

---

### Case 7: Bug Thresholds Follow the Workflow Tier

**Fixture:**
- `platform.cert_tier: steam`; source files present; CI test output exists
- Run A: `modes.rigor: standard` (`workflow: standard`); `production/qa/bugs/BUG-0012.md`
  is an S2 (High) bug with `**Status**: Open`, and no other bug is open
- Run B: `modes.rigor: full` (`workflow: full`); `production/qa/bugs/BUG-0013.md`
  is an S3 (Medium) bug with `**Status**: Open`, and no other bug is open

**Input:** `/release-checklist pc`

**Expected behavior:**
1. Both runs read the bugs from `production/qa/bugs/`, not from the milestone
2. Run A: the open S2 fails no item — at `standard` only an open S1 blocks — and
   is listed in the Rationale as a risk; the S2/S3 row is not emitted
3. Run B: the "Zero open S2 (High) and S3 (Medium) bugs" row fails on the open
   S3, which is named in the Rationale as a blocking item; Go / No-Go is NOT READY

**Assertions:**
- [ ] Run A's Go / No-Go is not NOT READY because of the S2, and the S2 appears in the Rationale as a risk
- [ ] Run B's Go / No-Go is NOT READY, naming BUG-0013 as a blocking item
- [ ] Neither run offers a "documented exception" for the S3 at `workflow: full`

---

### Case 8: No Bug Records — NOT ASSESSED, Not Zero

**Fixture:**
- `platform.cert_tier: steam`; source files present; CI test output exists
- `production/qa/bugs/` does not exist

**Input:** `/release-checklist pc`

**Expected behavior:**
1. The Quality Gates bug line reads `NOT ASSESSED — no bug records`, not `0`
2. The bug items are not ticked
3. Go / No-Go is NOT ASSESSED (naming the bug items), unless a blocking item
   failed elsewhere — never READY
4. The output says bugs are filed with `/bug-report`

**Assertions:**
- [ ] No bare `0` bug count and no ticked "Zero open S1 (Critical) bugs" item
- [ ] `NOT ASSESSED — no bug records` appears
- [ ] Go / No-Go is not READY

---

### Case 9: CrazyGames Is an Explicit Release Target

**Fixture:**
- Run A: `platform.cert_tier: steam`. Run B: omit `platform.cert_tier`.
- A Phaser HTML5 project has a locally verified release build and local
  desktop/mobile browser evidence. No Portal Preview or physical app evidence.
- This is the first submission. The game integrates the SDK, but no Portal
  initial download measurement exists. All shared checks have evidence.

**Input:** `/release-checklist --target crazygames`

**Assertions:**
- [ ] Shared checks remain and target-specific checks come from `docs/CRAZYGAMES.md`.
- [ ] No PC, Console, Mobile, Steamworks or other native rows are emitted.
- [ ] Neither run asks about `platform.cert_tier` or reports it as missing evidence.
- [ ] Basic Launch is assessed, SDK is optional, and monetization is disabled.
- [ ] Reports local package evidence and Portal initial download separately.
- [ ] Distinguishes the 20 MB mobile homepage threshold from app availability.
- [ ] Portal Preview, Android app and iOS app are separately `NOT ASSESSED`,
      and the shared Go / No-Go is `NOT ASSESSED`.
- [ ] Shows the draft before offering to save to
      `production/releases/release-checklist-[version].md`. Upload is a manual
      step for the developer. No project settings are changed.

### Case 10: Package Failure Outranks Unavailable App Evidence

**Fixture:** A real no-SDK candidate has 60 MB of files. Portal Preview and both
apps are unavailable. Other shared checks have evidence.

**Input:** `/release-checklist --target crazygames`

**Assertions:**
- [ ] The no-SDK total counts toward the 50 MB initial limit. The report names
      the verified size failure and gives a `NOT READY` verdict.
- [ ] The unavailable app checks are still named as `NOT ASSESSED`.
- [ ] If the candidate does not exist, the package check is `NOT ASSESSED`
      instead. The skill does not run a build.

### Case 11: The Original CLI Still Selects Native Device Checks

**Fixture:** A repo has `docs/CRAZYGAMES.md` and `platform.cert_tier: none`.

**Assertions:**
- [ ] `/release-checklist mobile` still selects the Mobile device rows and
      shows the ordinary `none` certification omission. It adds no CrazyGames checks.
- [ ] `/release-checklist mobile --target crazygames` and
      `/release-checklist --target unknown` show accepted forms and stop without
      generating or saving a report.

---

### Case 12: The Quality Standard Section Is Emitted at Every Rigor

**Fixture:**
- No `modes` keys (`rigor: minimal`); `platform.cert_tier: none`;
  `platform.targets: [Web]`; the brief's controls are "WASD to move, Space to jump"
- `.claude/docs/game-quality-standard.md` exists with its seven floor rows and its
  `crazygames` rows
- There is no `production/qa/evidence/rights-ledger.md`. The rights scan prints
  `CHECK: ledger — NOT RUN: … not found`, `FILES: image 39 in assets/art/ —
  ledger: NO LEDGER`, and three `PACKAGE:` lines, all `match: none`
- `production/qa/evidence/` holds story screenshots; **there is no
  `production/qa/evidence/first-run/` folder**
- The code root binds `W`, `A`, `S`, `D` and `Space`, and nothing else

**Input:** `/release-checklist`

**Expected behavior:**
1. Phase 2 reads every row of the standard and decides `keyboard` and `web` true
2. The checklist has a `### Quality Standard` section at `rigor: minimal`
3. The floor rows that need the first-run record read `NOT ASSESSED — no first-run
   record`; the key-binding floor row lists the five bound keys, each with its
   action and whether play needs it, and is ticked
4. Advisory rows each have one line: what was seen, or `not observed`
5. `platform.distribution_targets` is unset and no `--target crazygames` was typed,
   so the `crazygames` rows read `condition unknown — crazygames
   (platform.distribution_targets unset)` under Advisory, not under Not applicable
6. Phase 2 runs `node .claude/scripts/rights-scan.mjs --code-root src`. The
   section carries a `Rights scan:` line with its SUMMARY; `Q-RGT-2` reads
   `NOT ASSESSED — no rights ledger`, never ticked; `Q-RGT-1` is ticked as `the
   scan lists no font file`; `Q-RGT-3` is ticked, naming the three packages and
   their licences
7. Go / No-Go is NOT ASSESSED, naming the floor rows

**Assertions:**
- [ ] The section is present at `rigor: minimal` — it is not trimmed as process weight
- [ ] The floor rows listed are the ones the standard's Level column marks, read on this run
- [ ] No floor row is ticked without evidence; a missing first-run record is NOT ASSESSED, never a pass and never a failure
- [ ] An advisory row never changes Go / No-Go, whether it reads `not observed` or `condition unknown`
- [ ] Variant — the code root binds `Escape` to "open the shop", which play needs and no other input does: the key-binding floor row is a blocking item and Go / No-Go is NOT READY, which outranks the NOT ASSESSED rows
- [ ] Variant — `Escape` also closes the shop, and so does an on-screen button: the row is ticked, with the other input named
- [ ] Variant — `project.yaml` has no `platform` block and the design names no controls, but the code root's five bindings are readable: `keyboard` is true and `web` is unknown. The key-binding floor row reads `NOT ASSESSED — web unknown`; `Q-KEY-1` is assessed or `not observed`, never `condition unknown`; an advisory row that depends on `web` alone would read `condition unknown — web`. None is moved to Not applicable
- [ ] Variant — a first-run record exists but names an older build: the rows that need it read `NOT ASSESSED — first-run record names build X`, never ticked
- [ ] Variant — the record's stamp check prints a `CHANGED:` or `NEW:` line against a stamp that holds hashes, there is no `.stamp.txt` (`RECEIPT: NONE` beside a `NEW:` line per file), or the check prints no `UNCHANGED:` line: the same rows read NOT ASSESSED, and the report says which case it was; the record's date is not what decides it, and the absence of a `CHANGED:` line is not a pass
- [ ] Variant — the ledger exists and covers `assets/art/`, and the scan prints `FILE: font assets/fonts/Hud.woff2 — ledger: NO ROW`: `Q-RGT-1` is a blocking item naming the file and Go / No-Go is NOT READY
- [ ] Variant — the scan prints `PACKAGE: curve@2.0.0 — licence: GPL-3.0-only — lock: dev — reached: yes — match: gpl-family — ledger: no row`: `Q-RGT-3` is a blocking item; the same line with `reached: no` is listed as information and blocks nothing
- [ ] Variant — every file has a row and no package is marked: the three rows are ticked, each with `rows not verified against their sources` unless the Proof cells were opened on this run
- [ ] Variant — `node` is not on PATH: the `Rights scan:` line reads `did not run: node not found` and the three rows read `NOT ASSESSED — rights scan did not run`
- [ ] Variant — the scan prints `HOST: fonts.googleapis.com — 1 references, first index.html:7 [font]`: `Q-RGT-4` names it under Advisory; it never changes Go / No-Go
- [ ] Variant — `/release-checklist --target crazygames`: the `crazygames` rows are listed as advisory rows, not under Not applicable
- [ ] Variant — `platform.distribution_targets: []`: the `crazygames` rows are under Not applicable as `not a CrazyGames release (platform.distribution_targets is empty)`
- [ ] Variant — the standard file does not exist: the section reads `NOT ASSESSED — .claude/docs/game-quality-standard.md not found` and Go / No-Go is not READY

---

### Case 13: A Recorded CrazyGames Target Needs No Flag

**Fixture:**
- As Case 9's Run B (no `platform.cert_tier`), plus `platform.distribution_targets:
  [crazygames]` in `project.yaml` and `platform.targets: [Web]`

**Input:** `/release-checklist`

**Expected behavior:**
1. The resolved block carries `platform.distribution_targets: crazygames
   (project.yaml)`
2. With nothing typed, the skill runs the CrazyGames report, and its first line
   reads `Target: crazygames (platform.distribution_targets in project.yaml)`
3. The report is the one `--target crazygames` produces: shared sections, the
   Quality Standard section with its `crazygames` rows applied, and the checks
   from `docs/CRAZYGAMES.md` in place of the device, certification, store and
   launch rows

**Assertions:**
- [ ] No PC, Console, Mobile or certification rows are emitted, and `platform.cert_tier` is neither asked about nor reported as missing
- [ ] The report says the target came from the key, so a reader can tell it from a typed flag
- [ ] No project setting is changed
- [ ] Variant — `/release-checklist mobile` on the same project: the device form with the Mobile rows, no CrazyGames release checks, and the `crazygames` quality rows still applied, since the game is a CrazyGames game
- [ ] Variant — `platform.targets: [Web]` with `platform.distribution_targets` unset, no argument: the device form. A web game is not thereby a CrazyGames game, and the `crazygames` rows read `condition unknown`
- [ ] Variant — `platform.distribution_targets: []`, no argument: the device form, and the `crazygames` rows are Not applicable
- [ ] Variant — `platform.distribution_targets: [crazygames, itchio]`: the resolved line names `unknown: itchio`; the skill says `itchio` is not a target it knows and still runs the CrazyGames report
- [ ] Variant — `platform.distribution_targets: [itchio]`, no argument: the device form (`all`), `itchio` named as unknown on the first line, and the `crazygames` rows read `condition unknown — crazygames (platform.distribution_targets lists only unknown targets: itchio)`
- [ ] Variant — `platform.distribution_targets: [none]`: the resolved line is `none (project.yaml; unknown: none)`, which is not the empty list; the same result as `[itchio]`, never Not applicable
- [ ] Variant — `platform.distribution_targets: []` and `/release-checklist --target crazygames`: the typed flag wins; the CrazyGames report runs and its `crazygames` rows apply
- [ ] The no-argument CrazyGames report asks no `platform.cert_tier` question although the key is unset
- [ ] Variant — `project.local.yaml` sets `platform.distribution_targets: [crazygames]` and `project.yaml` does not: the key reads unset, and the device form runs

---

## Protocol Compliance

- [ ] For the original CLI, chooses device blocks from the argument and
      certification from `none | itch | steam | console` in `platform.cert_tier`
- [ ] In that form, treats unset `cert_tier` as a question (or NOT ASSESSED), never as `none`
- [ ] Selects the CrazyGames report with `--target crazygames`, or with no argument when `platform.distribution_targets` lists `crazygames`; never from `platform.targets`, `platform.cert_tier` or the presence of `docs/CRAZYGAMES.md`; and keeps native rows out of it
- [ ] States a denominator with every scan count, or reports NOT ASSESSED
- [ ] Reads open bugs from `production/qa/bugs/` and applies the release gate's thresholds for the resolved `workflow` (S1–S3 at `full`, S1 at `standard`/`minimal`); no bug files → `NOT ASSESSED — no bug records`
- [ ] Go / No-Go takes the first match: NOT READY, then NOT ASSESSED, then READY
- [ ] Presents totals and blockers before asking "May I write"
- [ ] Ends with `/gate-check` and `/team-release` as next steps

---

## Coverage Notes

- `project.stage` scoping (items for unreached phases marked out of scope) and
  `modes.rigor: minimal` trimming are not separately tested.
- How READY vs NOT READY is decided depends on the unchecked items and the
  user's inputs; a live run is needed to verify the rationale text.
- A resolved code root that is absent or empty reads
  `NOT ASSESSED — no source files found to scan`; not separately tested.
