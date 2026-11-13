---
name: release-checklist
description: "Pre-release checklist — build verification, certification requirements, store metadata, launch readiness."
argument-hint: "[pc|console|mobile|all] | --target crazygames (no argument: platform.distribution_targets decides)"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Bash(bash "*/.claude/skills/release-checklist/../../hooks/yaml-helper.sh" resolve_config *), Bash(node .claude/scripts/check-crazygames-build.mjs *), Bash(node .claude/scripts/rights-scan.mjs *), Bash(bash .claude/scripts/review-receipts.sh check *)
model: opus
---
!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys rigor,workflow,project.stage,cert_tier,automation,input_methods,distribution_targets`

**Automation mode**: Resolve `modes.automation` (`project.local.yaml` →
`project.yaml` → default `collaborative`). Every `AskUserQuestion` call and
every file write follows `.claude/docs/automation-modes.md`
(collaborative asks always · guided major-only · autonomous logs and proceeds;
`automation_always_ask` categories always prompt).

Resolved above — use as-is. No block → defaults in `.claude/docs/config-resolution.md`.

# Release Checklist

**Scope this checklist to the project.** Emitting every item for every platform
trains the reader to skip the list, which defeats the gate:

- **`project.stage`** — items for phases this project has not reached are out of
  scope; say so rather than listing them unchecked.
- **`modes.rigor`** — at `minimal`, drop items whose only justification is process
  weight this project has opted out of. The **Quality Standard** section is never
  one of them: it is emitted at every rigor, for both argument forms.
- **`platform.cert_tier`** — in the device form only (Phase 1; the CrazyGames
  report never reads it, however that report was selected),
  emit certification items **only** for the tier the project targets. If it is
  **unset**, **ask which platforms are in scope**
  rather than emitting all of them — an unset value is a question, not a licence
  to emit every certification track. If it cannot be determined, mark the section
  **`NOT ASSESSED — cert tier unknown`**. **Unset is not `none`:** `none` is a
  decision, unset is a missing one, and they must not produce the same output.
  Branch on the **four values this key takes** — `none | itch | steam | console` —
  and not on platform names. The full requirement table is the `## platform.cert_tier`
  section of `.claude/docs/effects-map.md` — read **only that section** (Grep its
  heading, then a bounded Read); the file as a whole is not a runtime input.
  - `none` — **emit no certification section at all.** Internal release, alpha or
    jam game. Say the section was omitted and why; do not leave it blank.
  - `itch` — itch.io upload requirements only: build size, page setup, age tags.
    **No console and no Steamworks items.**
  - `steam` — Steamworks: store page, depot build, achievements, system
    requirements, common content rules. **No console certification items.**
  - `console` — full platform certification (TRC / XR / Lotcheck), save-data
    rules, controller-mapping rules, age-rating boards. The heaviest tier.

  > **Branch on the `cert_tier` values above, not on platform names.** A test on
  > target platforms treats an `itch` project and a `steam` project identically,
  > conflates `none` with unset, and keys on `mobile`, which is not a `cert_tier`
  > value at all. Use the vocabulary the config defines.

If an item cannot be scoped because the config is absent, mark it
**`NOT ASSESSED — platform/stage unknown`**. Do not silently include it: a
`rigor: standard`, single-platform project would otherwise receive a ~150-item
checklist demanding PC **and** console **and** mobile certification plus age
ratings, of which ~140 are unassessable.

---


## Phase 1: Parse Arguments

Accept exactly one of these forms:

- One positional device (`pc`, `console`, `mobile`, or `all`): the device form.
- `--target crazygames` scopes this report to the CrazyGames HTML5 build on
  desktop and mobile browsers and in the CrazyGames apps. Read
  [CrazyGames web release](../../../docs/CRAZYGAMES.md) for the target checks.
  For an initial submission, assess Basic Launch. Use Full Launch requirements
  when the user confirms that is the stage being assessed.
- No arguments: read the `platform.distribution_targets` line above, whole. Its
  three states are told apart by the exact text, never by one word in it:
  - `platform.distribution_targets: … crazygames … (project.yaml…)`, with
    `crazygames` among the listed items: the CrazyGames report, exactly as
    `--target crazygames`. Say why on the report's first line: `Target:
    crazygames (platform.distribution_targets in project.yaml)`.
  - `platform.distribution_targets: none (project.yaml sets an empty list)`: the
    empty list, a decision. The device form, defaulting to `all`.
  - `platform.distribution_targets: (unset -- ask where the game is released)`:
    no decision. The device form, defaulting to `all`; unset is not a decision
    against CrazyGames, and the Quality Standard section says so.
  - Items listed, none of them `crazygames`: the device form, defaulting to
    `all`.
  - An item the line names after `unknown:` (a typo, a target this skill does
    not know, even one spelled `none`): say so by name, on the report's first
    line, and go on. Never drop it in silence, and never read it as the empty
    list.

A device argument always selects the device form, and `--target crazygames`
always selects the CrazyGames report, whatever `platform.distribution_targets`
holds (an empty list included): the key picks the report only when nothing was
typed.

For an invalid or combined form, show
`/release-checklist [pc|console|mobile|all]` and
`/release-checklist --target crazygames`, then stop before generating or saving a report.

**A positional argument selects DEVICE requirements. It never selects the certification
track.** Certification is decided by `platform.cert_tier`, resolved in the resolved-config block at the top of this skill —
see the `platform.cert_tier` rule above. The two axes are different lists that
happen to share one word: `pc`/`console`/`mobile` are hardware shapes, while
`none|itch|steam|console` are certification regimes. They agree on `console` and
nowhere else — `itch` and `none` have no device block at all, and `mobile` is not
a `cert_tier` value. So emitting a device block says nothing about which
certification block to emit, and `all` is **not** a licence to emit every
certification track.

In the CrazyGames report, however it was selected, `platform.cert_tier` is
outside the scope of this report. It neither selects CrazyGames nor creates an unanswered certification
question. Keep the configured tier for other release targets.

---

## Phase 2: Load Project Context

- Read `CLAUDE.md` for project context, version information, and platform targets.
- Read the current milestone from `production/milestones/` to understand what features and content should be included in this release.
- Read the open bugs from `production/qa/bugs/`: grep the `**Severity**` and `**Status**` lines of `production/qa/bugs/*.md`, as `/bug-triage` does. A bug is open unless its Status is `Closed` or `Verified Fixed`. The bug items use the thresholds `/gate-check release` applies for the resolved `workflow`: at `full` an open S1, S2 or S3 bug fails its item; at `standard` and `minimal` only an open S1 does, and an open S2 or S3 is listed in the Rationale as a risk. Each failing bug is named in the Rationale as a blocking item. **No bug files in `production/qa/bugs/`** → the bug items read `NOT ASSESSED — no bug records` — never zero and never ticked, since an absent record and a clean one must not produce the same checklist; bugs are filed with `/bug-report`.
- Read `.claude/docs/game-quality-standard.md`: every row of its tables, with its Applies condition and Level. Decide each condition as its "How a row applies" section says — `web` from `platform.targets` in `project.yaml`; `keyboard` and the supported input methods from the controls the design names and the keys the code root binds (the `input_methods` line above is a hint only: it lists `keyboard/mouse` for every PC or Web target and `none` on an incomplete `platform` block); `crazygames` as the "A `crazygames` row" rule in Phase 4 says: true for a CrazyGames report or when the `platform.distribution_targets` line lists `crazygames`, false on the empty list, unknown when the key is unset or lists only unknown items. A condition that cannot be read is unknown, never false. **File not found** → the Quality Standard section reads `NOT ASSESSED — .claude/docs/game-quality-standard.md not found`.
- Find the newest first-run record, `production/qa/evidence/first-run/first-run-*.md`, and note its date and the build it names. None → say so; the rows that need it are `NOT ASSESSED`. Whether it is current is never judged by its date: list the files under the code root with Glob and run `bash .claude/scripts/review-receipts.sh check production/qa/evidence/first-run/[record name].stamp.txt <every file under the code root>` as its own Bash call. Read the result in the standard's order, first match wins: (1) `RECEIPT: NONE`, or a stamp file with no `Reviewed-Content-Hash:` line, means the record has no usable stamp — the `NEW:` lines printed beside it say the stamp is empty, not that the code changed; (2) a `CHANGED:`, `GONE:` or `NEW:` line means the code changed after the capture; (3) an `UNRESOLVED:` line, a failed check, no `UNCHANGED:` line at all, or an unresolved code root means the stamp could not be checked; (4) only every file reading `UNCHANGED:` makes the record evidence for this candidate. In cases 1 to 3 it is not, and the report says which case.
- Run the rights scan as its own Bash call: `node .claude/scripts/rights-scan.mjs --code-root <code root>`, adding `--notices <file>` when the build or the project has a third-party notices file (Glob for it; none → the `Q-RGT-5` line reads `not observed — no notices file`). Keep its output for the Quality Standard section and read it as the standard's "The rights ledger" table says. `node` absent, or the script not found → the `Q-RGT` rows read `NOT ASSESSED — rights scan did not run: [why]`.

---

## Phase 3: Scan Codebase

> **State the denominator with every count.** These scans look for something bad,
> so `0` means either "searched and found none" or "there was nothing to search",
> and on a release gate those are opposite findings. Report
> `scanned [N] source files: [M] TODO, [M] FIXME, [M] HACK` — or, when the code
> root (`src/`, `Assets/` or `Source/`; resolve per
> `.claude/docs/code-root-resolution.md`) is unresolved,
> **`NOT ASSESSED — code root unresolved`**, and when it is absent or holds no
> source files, **`NOT ASSESSED — no source files found to scan`**. A bare `0` is
> not a result.

Scan for outstanding issues:

- Count `TODO` comments
- Count `FIXME` comments
- Count `HACK` comments
- Note their locations and severity

Check for test results in any test output directories or CI logs if available.
**If none are found, say so** — `Test results: NOT ASSESSED — no test output or
CI logs found` — rather than omitting the line. An absent test result and a
passing one must not produce the same release checklist.

---

## Phase 4: Generate the Release Checklist

```markdown
## Release Checklist: [Version] -- [Platform]
Generated: [Date]

### Codebase Health
- Scanned: [N] source files (or `NOT ASSESSED — [reason]`, per Phase 3)
- TODO count: [N] ([list top 5 if many])
- FIXME count: [N] ([list all -- these are potential blockers])
- HACK count: [N] ([list all -- these need review])

### Build Verification
- [ ] Clean build succeeds on all target platforms
- [ ] No compiler warnings (zero-warning policy)
- [ ] All assets included and loading correctly
- [ ] Build size within budget ([target size])
- [ ] Build version number correctly set ([version])
- [ ] Build is reproducible from tagged commit

### Quality Gates
- Open bugs (`production/qa/bugs/`): [N] S1, [N] S2, [N] S3 -- or `NOT ASSESSED — no bug records`
- [ ] Zero open S1 (Critical) bugs
- [ ] Zero open S2 (High) and S3 (Medium) bugs, no exceptions -- this row at `workflow: full` only; at `standard`/`minimal` open S2/S3 bugs go in the Rationale as risks
- [ ] All critical path features tested and signed off by QA
- [ ] Performance within budgets:
  - [ ] Target FPS met on minimum spec hardware
  - [ ] Memory usage within budget
  - [ ] Load times within budget
  - [ ] No memory leaks over extended play sessions
- [ ] No regression from previous build
- [ ] Soak test passed (4+ hours continuous play)

### Content Complete
- [ ] All placeholder assets replaced with final versions
- [ ] All TODO/FIXME in content files resolved or documented
- [ ] All player-facing text proofread
- [ ] All text localization-ready (no hardcoded strings)
- [ ] Audio mix finalized and approved
- [ ] Credits complete and accurate

### Quality Standard
First-run record: [path, its date and build, stamp check: current — N files unchanged | changed: files | could not be checked: why] | [none found]
Rights scan: [its SUMMARY line, and each `NOT RUN` check] | [did not run: why]

Floor (part of Go / No-Go):
- [ ] [Q-ID] — [what the evidence shows, with its path | NOT ASSESSED — what is missing | N/A — why]

Advisory (reported, never part of Go / No-Go):
- [Q-ID] — [what was seen, with its path | not observed | condition unknown — which]

Not applicable: [Q-ID — why], ...
```

**Quality Standard — both argument forms, every `modes.rigor`.** Fill it from the
rows read in Phase 2. Take the rows, and which of them are floor, from the
standard's tables on this run; the IDs are never listed from memory, so a row
added to the standard is checked the next time this skill runs.

- **A floor row that applies:** tick it only when evidence for this candidate
  exists and shows what the row asks: the first-run record, the retained
  screenshots under `production/qa/evidence/`, and for a row about key bindings
  the keys the code root binds (Grep them and list them; code root unresolved →
  `NOT ASSESSED — code root unresolved`). Evidence that shows the row failing is
  a blocking item: name it in the Rationale. No evidence → `NOT ASSESSED — [what
  is missing]`, never ticked. A first-run record that names another build, lacks
  a field or screenshot the standard requires, or whose stamp check did not come
  out current is not evidence for this candidate: `NOT ASSESSED — first-run
  record [names build X | lacks Y | stamp could not be checked | predates a
  change to Z]`. For the key-binding row, list each bound key with its
  action, whether play needs it, and the other input that does the same thing.
  For a rights row the evidence is the scan from Phase 2 and the ledger. A `NO
  ROW` line anywhere, or a marked `PACKAGE:` line with `ledger: no row`, shows
  the row failing: a blocking item, naming each file, folder or package. No
  ledger while the scan lists files the row covers, a `NOT RUN` check the row
  needs, or an `empty cell` line: `NOT ASSESSED — [which]`. Ticked only when the scan ran and printed none of those;
  then add `rows not verified against their sources` unless the ledger's Proof
  cells were opened on this run.
- **An advisory row that applies:** one line, what was seen and where, or `not
  observed`. It never changes Go / No-Go.
- **A floor row whose condition is unknown:** `NOT ASSESSED — [condition]
  unknown`. Never move it to Not applicable.
- **An advisory row whose condition is unknown:** `condition unknown — [which]`
  under Advisory. Never Not applicable, and never part of Go / No-Go.
- **A `crazygames` row:** it applies when this run is a CrazyGames report
  (typed, or selected by the key) or the `platform.distribution_targets` line
  lists `crazygames`, in the device form too. Otherwise, by the line's exact
  state:
  - the empty list (`none (project.yaml sets an empty list)`): Not applicable,
    as `not a CrazyGames release (platform.distribution_targets is empty)`;
  - unset: `condition unknown — crazygames (platform.distribution_targets
    unset)`, under its level, never Not applicable;
  - only items named `unknown:`: `condition unknown — crazygames
    (platform.distribution_targets lists only unknown targets: [items])`. One of
    them may be a misspelling of it.

For the CrazyGames report (`--target crazygames`, or no argument with
`crazygames` in `platform.distribution_targets`), keep the shared sections above
(the `crazygames` rows of the Quality Standard then apply) and apply the
[CrazyGames checks](../../../docs/CRAZYGAMES.md) in place of the device,
certification, generic distribution, and generic launch rows. Group the target
checks under Local Build and Browser QA, Portal Preview, Android App, iOS App,
and Submission Materials. Record the launch stage in the report and include
the applicable SDK checks.
Evaluate the existing release build and evidence. A confirmed blocking failure
is `NOT READY`. Missing evidence for an applicable check is `NOT ASSESSED`;
give the reason and next verification step. Label optional or inapplicable
features accordingly. Report local, Portal Preview, and each real app result
separately, even if one is unavailable. Run the read-only package check from the
guide against the existing output when the candidate and Node are available.
Run it as its own Bash call so it matches the skill's grant. Use Read, Glob or
Grep separately for the other checks.
If the candidate is absent, report the package check as `NOT ASSESSED`; do not
run a build from this checklist. A local package check establishes only the
properties it measured. Do not infer actual app play or Portal eligibility from
local output. Leave the upload and submission steps to the developer.
If the candidate visibly still contains the starter's marker demo or other
confirmed placeholder gameplay, mark Content Complete as a blocking failure.
This does not stop a separate local template test from passing.

For a positional device or the default `all`, add **device** sections based on
the argument. These carry no certification or storefront-SDK items — those
are gated on `platform.cert_tier` in the next subsection, and repeating them
here would hand an `itch` project Steamworks rows.

**For `pc`:**
```markdown
### Platform Requirements: PC
- [ ] Minimum and recommended specs verified and documented
- [ ] Keyboard+mouse controls fully functional
- [ ] Controller support tested (Xbox, PlayStation, generic) -- or `N/A — gamepad not supported`
- [ ] Resolution scaling tested (1080p, 1440p, 4K, ultrawide)
- [ ] Windowed, borderless, and fullscreen modes working
- [ ] Graphics settings save and load correctly
```

**For `console`:**
```markdown
### Platform Requirements: Console
- [ ] Platform-specific controller prompts display correctly
- [ ] Suspend/resume works correctly
- [ ] User switching handled properly
- [ ] Network connectivity loss handled gracefully
- [ ] Storage full scenario handled
```

**For `mobile`:**
```markdown
### Platform Requirements: Mobile
- [ ] App store guidelines compliance verified
- [ ] All required device permissions justified and documented
- [ ] Privacy policy linked and accurate
- [ ] Data safety/nutrition labels completed
- [ ] Touch controls tested on multiple screen sizes
- [ ] Battery usage within acceptable range
- [ ] Background behavior correct (pause, resume, terminate)
- [ ] Push notification permissions handled correctly
- [ ] In-app purchase flow tested (if applicable)
- [ ] App size within store limits
```

> **Mobile storefront rows stay here on purpose.** `platform.cert_tier` models
> `none|itch|steam|console` and has no mobile regime, so App Store / Play Store
> compliance cannot be gated on it. Leaving these in the device block is a
> deliberate choice, not an oversight — do not "fix" it by inventing a `mobile`
> tier, which is the exact wrong vocabulary the `cert_tier` rule warns against.

**Certification — device form only; emit ONLY the block matching `platform.cert_tier`** (resolved in
the resolved-config block at the top of this skill). The CrazyGames report has no certification subsection and asks no certification question. Do not emit this subsection's other blocks, and do not fall back to
emitting all of them because the platform argument was `all`.

**At `none`** — emit no certification block at all. Emit exactly this one line in
its place, so the omission is visible rather than looking like a missing section:
```markdown
Certification: omitted — cert_tier is 'none' (internal build, alpha or jam release).
```

**At `itch`:**
```markdown
### Certification: itch.io
- [ ] Build size within itch.io upload limits
- [ ] itch.io page complete (cover art, screenshots, description)
- [ ] Age/content tags set honestly
- [ ] Downloadable vs browser build decided and tested
- [ ] Butler channel names correct for each platform uploaded
```

**At `steam`:**
```markdown
### Certification: Steamworks
- [ ] Steamworks SDK integrated and tested
- [ ] Depot build uploaded and installs cleanly from a fresh account
- [ ] Achievements functional
- [ ] Cloud saves functional
- [ ] Steam Deck compatibility verified (if targeting)
- [ ] Steam common content rules reviewed
```

**At `console`:**
```markdown
### Certification: Console
- [ ] TRC/TCR/Lotcheck requirements checklist complete
- [ ] First-party certification submission prepared
- [ ] Platform-specific achievement/trophy integration tested
- [ ] Parental controls respected
- [ ] Save-data rules compliant (corruption, full storage, user switching)
- [ ] Age ratings obtained (ESRB, PEGI, regional)
```

If `cert_tier` is **unset** in the device form, ask which platforms are in scope rather than
emitting every track; if it cannot be determined, emit
`### Certification: NOT ASSESSED — cert tier unknown` and say why. **Unset is not
`none`** — `none` is a decision and unset is a missing one.

> **Certification rows belong here, in one `cert_tier`-gated subsection.** Do not
> put them in the PC, Console and Mobile device blocks: those are selected by the
> command argument and default to `all`, so an `itch` project running
> `/release-checklist` with no argument would be handed the Steamworks SDK rows
> *and* the Lotcheck rows, which the `cert_tier` rule at the top of this skill
> forbids.
>
> **`console` means two different things in this file.** It is a device-block
> argument value *and* a `cert_tier` value, colliding on one word out of four. A
> `**For \`console\`:**` heading is argument-gating, not tier-gating — do not read
> it as evidence that certification is already scoped by tier.

**Store and launch sections (positional device and default `all`):**
```markdown
### Store / Distribution
- [ ] Store page metadata complete and proofread
  - [ ] Short description
  - [ ] Long description
  - [ ] Feature list
  - [ ] System requirements (PC)
- [ ] Screenshots up to date and per-platform resolution requirements met
- [ ] Trailers up to date
- [ ] Key art and capsule images current
- [ ] Age rating obtained and configured:
  - [ ] ESRB
  - [ ] PEGI
  - [ ] Other regional ratings as required
- [ ] Legal notices, EULA, and privacy policy in place
- [ ] Third-party license attributions complete (`Q-RGT-5` in the Quality Standard section says what the scan found)
- [ ] Pricing configured for all regions

### Launch Readiness
- [ ] Analytics / telemetry verified and receiving data
- [ ] Crash reporting configured and dashboard accessible
- [ ] Day-one patch prepared and tested (if needed)
- [ ] On-call team schedule set for first 72 hours
- [ ] Community launch announcements drafted
- [ ] Press/influencer keys prepared for distribution
- [ ] Support team briefed on known issues and FAQ
- [ ] Rollback plan documented (if critical issues found post-launch)
```

**Go / No-Go and sign-offs (both argument forms):**
```markdown
### Go / No-Go: [READY / NOT ASSESSED / NOT READY]

First match wins: **NOT READY** if any blocking item fails; else **NOT ASSESSED**
if any section or item came out `NOT ASSESSED` (name each one); else **READY**. NOT
ASSESSED outranks READY — an unassessed section is not a passed one — and ranks
below NOT READY, so a known blocker is never buried behind it. In the Quality
Standard section only the Floor rows and the standard file itself count here: an
advisory row that reads `not observed` or `condition unknown` never changes Go /
No-Go.

**Rationale:**
[Summary of readiness assessment. List any blocking items that must be
resolved before launch. If NOT READY, list the specific items that need
resolution and estimated time to address them.]

**Sign-offs Required:**
- [ ] QA Lead
- [ ] Technical Director
- [ ] Producer
- [ ] Creative Director
```

---

## Phase 5: Save Checklist

Present the checklist to the user with: total checklist items, number of known blockers (FIXME/HACK counts, known bugs).

Ask: "May I write this to `production/releases/release-checklist-[version].md`?"

If yes, write the file, creating the directory if needed.

---

## Phase 6: Next Steps

- Draft the changelog or patch notes (`/changelog`, `/patch-notes`) if not done — the release gate checks them.
- Run `/gate-check release` — the Polish → Release gate reads this checklist.
- After a PASS: `/launch-checklist`, then coordinate the release via `/team-release`.
