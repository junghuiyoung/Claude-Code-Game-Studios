---
name: playtest-report
description: "Structured playtest report template, or turn existing playtest notes into structured feedback."
argument-hint: "[new|analyze path-to-notes] [--review full|lean|solo]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Agent, AskUserQuestion, Bash(bash "*/.claude/skills/playtest-report/../../hooks/yaml-helper.sh" resolve_config *)
model: opus
---

!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys review_mode,automation`

Resolved above — use as-is; `--review` overrides `review_mode` for this run. No
block → defaults in `.claude/docs/config-resolution.md`.

# Playtest Report



## Phase 1: Parse Arguments


See `.claude/docs/director-gates.md` for the full check pattern. Individual gate definitions live in `.claude/docs/director-gates/[gate-id].md` — the spawned agent reads its own gate file; do not read it in the parent session.


Every `AskUserQuestion` call follows `.claude/docs/automation-modes.md`
(collaborative asks always · guided major-only · autonomous logs and proceeds;
`automation_always_ask` categories always prompt).

Determine the mode:

- `new` → generate a blank playtest report template. This mode ends after
  Phase 2A: a blank template has nothing to route, review or save.
- `analyze [path]` → read raw notes and fill in the template with structured findings
- No argument → ask via `AskUserQuestion`: `[A] New blank template` /
  `[B] Analyze notes — I'll give you the path`

---

## Phase 2A: New Template Mode

Generate this template and output it to the user:

```markdown
# Playtest Report

## Session Info
- **Date**: [Date]
- **Build**: [Version/Commit]
- **Duration**: [Time played]
- **Tester**: [Name/ID]
- **Platform**: [PC/Console/Mobile]
- **Input Method**: [KB+M / Gamepad / Touch]
- **Session Type**: [First time / Returning / Targeted test]

## Test Focus
[What specific features or flows were being tested]

## First Impressions (First 5 minutes)
- **Seconds from launch to the first core-gameplay action**: [N, or "not timed". Clicking through a menu or dismissing a prompt is not that action]
- **Did the core action without help?** [Yes/No/After a hint from the observer]
- **Understood the goal?** [Yes/No/Partially]
- **Understood the controls?** [Yes/No/Partially — and from what: the on-screen hint, trial and error, the observer]
- **Onboarding**: [Followed it / Skipped it, and play went on / Tried to skip and could not / There is none]
- **Emotional response**: [Engaged/Confused/Bored/Frustrated/Excited]
- **Notes**: [Observations]

## Gameplay Flow
### What worked well
- [Observation 1]

### Pain points
- [Issue 1 -- Severity: High/Medium/Low]

### Confusion points
- [Where the player was confused and why]

### Moments of delight
- [What surprised or pleased the player]

## Bugs Encountered
| # | Description | Severity | Reproducible |
|---|-------------|----------|-------------|

## Feature-Specific Feedback
### [Feature 1]
- **Understood purpose?** [Yes/No]
- **Found engaging?** [Yes/No]
- **Suggestions**: [Tester suggestions]

## Quantitative Data (if available)
- **Deaths**: [Count and locations]
- **Time per area**: [Breakdown]
- **Items used**: [What and when]
- **Features discovered vs missed**: [List]

## Overall Assessment
- **Would play again?** [Yes/No/Maybe]
- **Difficulty**: [Too Easy / Just Right / Too Hard]
- **Pacing**: [Too Slow / Good / Too Fast]
- **Session length preference**: [Shorter / Good / Longer]

## Quality Standard rows observed
[One line per row of `.claude/docs/game-quality-standard.md` whose Checked at column names `playtest` and that applies to this game: `Q-ID: what the tester did or said`, or `Q-ID: not observed in this session`. An observation, not a score.]

## Quality floor blockers
[Only when the session showed a floor row of the standard failing. Otherwise the one line: `None observed in this session` — which is not a statement that the floor is met.]
| Row | What the tester did or said | Story that carries the row | Fix needed, and how it is re-checked |
|-----|-----------------------------|----------------------------|--------------------------------------|

## Top 3 Priorities from this session
1. [Most important finding]
2. [Second priority]
3. [Third priority]
```

**The Quality Standard rows section, in both modes.** Read
`.claude/docs/game-quality-standard.md` and list every row whose Checked at column
names `playtest`, by ID, taken from the file on this run and never from memory.
In `new` mode each line is left for the observer to fill. A row whose Applies
condition is false for this game reads `Q-ID: N/A — why`; one whose condition
cannot be read reads `Q-ID: condition unknown — which`. The file is not found:
the section reads `NOT ASSESSED — .claude/docs/game-quality-standard.md not
found`, and it is never left out.

In `new` mode, stop here with: Verdict: **COMPLETE** — blank template output; nothing saved.

---

## Phase 2B: Analyze Mode

Read the raw notes at the provided path. Cross-reference with existing design documents, reading each by section: find the headings you need with the Grep tool (pattern `^#`, content mode) and Read those ranges with offset and limit. Fill in the template above with structured findings. Flag any playtest observations that conflict with design intent.

For the Quality Standard rows section, fill each listed row from what the notes
say the tester did or said, quoting or pointing at the note. A row the notes say
nothing about reads `not observed in this session`: never infer that it went
well. These rows are reported as observations.

**Quality floor blockers, separately.** The rows checked at `playtest` are not
the floor, so look for the floor on its own: take every row the standard's Level
column marks **floor**, on this run, and check the notes for an observation that
plainly contradicts one (the tester could not skip onboarding, found no hint for
the input they used, needed Escape to go on). Each one is a row in the Quality
floor blockers table: the row's ID, the note it rests on, the story that carries
the row (the story under `production/epics/` whose `## Quality Standard` section
lists it; none found: write `no story carries this row`, and it stays a
blocker), and the fix with how it is re-checked. No such observation: the table
is replaced by `None observed in this session`. A playtest shows a floor row
failing; it never shows one met, which stays with the row's own evidence.

An observation that describes a defect — a crash, a framerate drop, a softlock,
something that plainly breaks rather than plays badly — goes in the **Bugs
Encountered** table, not under Gameplay Flow → Pain points, and is routed as a
bug in Phase 3. Pain points are for how the game feels to play.

---

## Phase 3: Action Routing

**Quality floor blockers first.** Every row of the Quality floor blockers table
is routed before the buckets below, and is never folded into them as a pain
point or a polish item: "`[Q-ID]` fails in play: [the observation]. The story
that carries it, [path or `no story carries this row`], cannot stay closed over
it. Fix it, capture the row's evidence again, and re-run `/story-done [path]`,
which records `resolves: [this report's path]` beside the row; with no story,
add the row to one with `/create-stories` and close that." A blocker with no
story is still a blocker, and it is resolved only by a story's close record
that names this report.

Categorize all other findings into four buckets:

- **Design changes needed** — fun issues, player confusion, broken mechanics, observations that conflict with the GDD's intended experience
- **Balance adjustments** — numbers feel wrong, difficulty too spiked or too flat
- **Bug reports** — clear implementation defects that are reproducible
- **Polish items** — not blocking progress, but friction or feel issues for later

Present the categorized list, then route:

- **Design changes:** "Run `/propagate-design-change [path]` on the affected design document to find downstream impacts before making changes."
- **Balance adjustments:** "Run `/balance-check [system]` to verify the full balance picture before tuning values."
- **Bugs:** "Use `/bug-report` to formally track these."
- **Polish items:** "Add to the polish backlog in `production/` when the team reaches that phase."

---

## Phase 3b: Creative Director Player Experience Review

**Review mode check** — apply before spawning CD-PLAYTEST:
- `solo` → skip. Note: "CD-PLAYTEST skipped — Solo mode." Proceed to Phase 4 (save the report).
- `lean` → skip (not a PHASE-GATE). Note: "CD-PLAYTEST skipped — Lean mode." Proceed to Phase 4 (save the report).
- `full` → spawn as normal.

After categorising findings, spawn `creative-director` via `Agent` using gate **CD-PLAYTEST** (`.claude/docs/director-gates/cd-playtest.md`).

Pass: the structured report content, game pillars and core fantasy (from
`design/gdd/game-concept.md`), the specific hypothesis being tested. **If
`game-concept.md` does not exist** — expected at `minimal`, where
`design/game-brief.md` replaces it — the brief has no pillars: pass its
one-sentence pitch and its "Who it's for / what they feel" line instead, and say
they stand in for pillars. If neither document exists, say so in the prompt:
*"No pillars available — assess against the hypothesis alone."* A director gate
handed silence about pillars will invent them.

Present the creative director's assessment before saving the report. If CONCERNS or REJECT, add a `## Creative Director Assessment` section to the report capturing the verdict and feedback. If APPROVE, note the approval in the report. If NOT ASSESSED (the director lacked an input — `.claude/docs/director-gates.md`), add the same section naming what was missing; it is not an approval.

---

## Phase 4: Save Report

**A saved report is never overwritten.** Other records point at a report by its
path (`resolves: [report path]` in a story's close record), so a path names one
report for good. Glob `production/qa/playtests/` first: when
`playtest-[date]-[tester].md` exists, use `playtest-[date]-[tester]-2.md`, then
`-3`, and so on.

Ask, naming the path that will really be written: "May I write this playtest
report to `production/qa/playtests/[that file name]`?"

If yes, write the file, creating the directory if needed. The saved report keeps
the Quality Standard rows section and the Quality floor blockers table (or its
`None observed in this session` line) as shown. `/gate-check polish` and
`/gate-check release` read the blockers table from the file at every tier: a
row stays a Blocker until a story's close record gives the row an evidence path
and `resolves:` this report's path.

---

## Phase 5: Next Steps

Verdict: **COMPLETE** — playtest report generated.

- Act on the highest-priority finding category first.
- After addressing design changes: re-run `/design-review` on the updated GDD.
- After fixing bugs: re-run `/bug-triage` to update priorities.
