---
name: concept-art
description: "Generates concept images before the art bible: style candidates of one scene, then gameplay, lineup and UI targets in the chosen style (Higgsfield, Codex fallback). Asks before every paid call. After /brainstorm."
argument-hint: "[styles | targets]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(bash "*/.claude/skills/concept-art/../../hooks/yaml-helper.sh" resolve_config *), Bash(higgsfield account status*), Bash(higgsfield generate cost *), Bash(higgsfield model get *), Bash(bash .claude/scripts/codex-run.sh *), Bash(mkdir -p design/concept*), Bash(sips -g *)
model: opus
---

!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys automation`

Resolved above. Use it as-is. No block → defaults in
`.claude/docs/config-resolution.md`.

Ask with the question tool. Without one, list the options numbered and end your
turn to wait. A skipped or dismissed question is not an answer: ask again in
plain text.

# Concept Art

Turns the game concept into pictures before anyone writes the art bible. It
runs in two passes: the same scene in 3–4 styles so the user can pick one, then
a set of target images in that style.

**Writes:**
- the images, under `design/concept/images/`;
- `design/concept/concept-art.md`, the record of what each image is for, how it
  was made and what the user decided.

Each write comes after an ask that names it.

**Every paid call asks first, whatever `modes.automation` says.** Generating an
image is an irreversible external action that spends credits. One ask covers
one batch, and it lists every image in the batch with its tool, model, estimate
and file. An image that is not in an ask is not generated. The style choice in
Phase 3 is also asked in every mode: it is the output of this skill.

**These are targets, not specs.** A generated mockup invents numbers, labels and
layout. The concept, the GDDs and the UX specs stay the design; the record says
so at the top.

**Next:** `/art-bible` reads the chosen style from the record.

## Phase 1: Parse arguments and read the concept

- **`styles`:** run the style pass (Phase 3), also when a style is already
  chosen. Say that the earlier choice stays until the user picks a new one.
- **`targets`:** run the target pass (Phase 4). With no chosen style in the
  record, stop with "No style chosen yet — run `/concept-art styles` first."
- **No argument:** continue from the record. No chosen style → Phase 3, then
  Phase 4. Chosen style → Phase 4 for the set items not made yet.

**Read the concept.** Use `design/gdd/game-concept.md`, or `design/game-brief.md`
when that is the project's concept. Find the headings with Grep (`^#`, content
mode) and Read those ranges. Neither file exists → stop with "No game concept
found. Run `/brainstorm` first."

Take from it:
- the title and the pitch;
- the art direction: the **Visual Identity Anchor** section, or the brief's
  "Art & audio direction" line;
- the player's avatar and every enemy, creature or unit it names;
- every screen it names (gameplay, choices, results, upgrades, menus);
- how the look changes as the game goes on (zones, depth, levels), if it says;
- the screen orientation and the platforms. Not stated → ask the orientation
  once (`Portrait 9:16` / `Landscape 16:9` / `Both`).

A field the concept does not give is listed as `not in the concept`. Do not
invent enemies or screens to fill the set.

**Read what exists.** Glob `design/concept/concept-art.md` and
`design/concept/images/*`.
- The record exists: Read it. Its rows say which set items are made.
- Images exist that no record row names: list them as `unrecorded`. Never
  replace or delete them. Ask whether any of them already covers a set item;
  the ones the user names go into the record with tool `not recorded`.

## Phase 2: Check what is available

Each check prints one line, and an unavailable tool is named in the output.

- **Higgsfield:** run `higgsfield account status`. It prints the account and
  credits. Not installed or not signed in: `Higgsfield NOT AVAILABLE — <why>`.
- **Codex:** run `command -v codex`. Absent: `Codex NOT AVAILABLE — not on PATH`.

**Route:** Higgsfield first. Use Codex image generation when Higgsfield is not
available, when the batch estimate is above the credits left, or when a call
fails with a credit, quota or payment error. Name the reason, e.g.
`Higgsfield NOT USED — 12 credits left, 40 needed; Codex fallback`.

**Neither is available:** say `IMAGES NOT GENERATED — <why for each tool>`.
Offer to write the prompts alone to the record so the user can generate them
elsewhere. Rows written this way carry tool `prompt only` and verdict
`Not reviewed`.

**Estimates:**
- Higgsfield: `higgsfield generate cost <model> --prompt "<prompt>" ...`, once
  per image; the batch total is the sum.
- Codex: none (billed to the user's OpenAI account); say so.
- An estimate that cannot be had is written "estimate not available". Never
  guess a number.

## Phase 3: Style candidates

**Goal:** one chosen style, picked by looking at the same scene in each.

1. **Pick the test scene.** One moment of core gameplay from the concept, with
   the avatar and at least two enemy types in frame, at the game's orientation.
   Show the one-sentence scene and ask the user to accept or change it.
2. **Propose 3–4 styles.** Each has a short name, a one-line rule and what it
   costs or risks. Start from the concept's art direction: one candidate is its
   literal reading, the others pull it in different directions (flatter, more
   painterly, more graphic). Example for "glowing silhouettes on dark navy":

   | Style | Rule | Risk |
   |---|---|---|
   | Flat vector glow | Solid shapes, one glow colour per creature | Can look generic |
   | Painted bioluminescence | Soft brush edges, light bleeds into the water | Harder to keep sprites consistent |
   | Hard-edge neon | Black fills, thin bright outlines | Small enemies may vanish |

   Ask the user to accept the list, change a candidate or add their own.
3. **Write one prompt per style.** The scene sentence is identical in all of
   them; only the style clause changes. A difference between the images must be
   a difference of style, not of content.
4. **Ask for the batch** (Phase 5), generate, and print each saved path so the
   user can open the files side by side.
5. **Ask which style.** Options: one per candidate, `Mix two — I'll say what to
   take from each`, `None of these — new candidates`. Then ask in free text what
   they like about the pick and what to avoid.
   - A mix or a new round is another paid batch with its own ask.
   - No pick → the record says `Chosen style: NOT CHOSEN` and Phase 4 does not
     run. Say so.
6. **Record** (Phase 6): the chosen style, its rule, its reference image, the
   user's "take from it" and "avoid" words, and each other candidate as
   `Rejected` with the user's reason or "no reason given".

## Phase 4: Visual targets

**Goal:** the images that settle the questions the art bible and the first
build will otherwise guess at.

**The set.** Build each row from what Phase 1 took from the concept.

| # | Image | The question it answers | Needs from the concept |
|---|---|---|---|
| 1 | Gameplay mockup, early | Does the first minute read at a glance? | avatar, enemies, HUD values |
| 2 | Gameplay mockup, late | Does it still read when the screen is busy and the look has shifted? | how the look changes |
| 3 | Lineup sheet | Can each enemy be told apart by silhouette, at relative scale, on the game's background? | enemy list |
| 4 | UI mockup, one per key screen | Button size, information order, type style | screen list |
| 5 | Key art | The mood in one image; the seed of the store cover | pitch |
| 6 | Progression palette strip | How colour changes from start to end | how the look changes |
| 7 | Peak-chaos frame | With the most enemies and effects on screen, are the avatar and the threats still visible? | enemies, effects |
| 8 | Second orientation and thumbnail | The layout on the other aspect ratio; the cover at storefront size | platforms |

- Rows 1–4 are the core. Mark them `(Recommended)`.
- A row whose "needs" the concept does not give is offered with that named,
  e.g. "6 — the concept does not say how the look changes; I would have to
  invent zones". The user decides; it is never dropped silently.
- Row 4 is one image per screen. List the screens and let the user pick.
- Row 8's thumbnail is a crop or redraw of the key art at a small size; without
  row 5 it is drawn from the gameplay mockup.

**Ask which to make** (multi-select), with rows already in the record marked
`made`. Then:

1. **Write the prompts.** Every prompt carries the chosen style's rule line word
   for word, then the image's own content. Mockup prompts name the HUD and UI
   elements the concept names and nothing else.
2. **Attach the reference.** Pass the chosen style image with
   `--image-references <path>` (Higgsfield). The lineup sheet and the UI mockups
   also take the early gameplay mockup once it exists.
3. **Ask for the batch** (Phase 5) and generate.
4. **Show the paths and take verdicts.** For each image ask `Chosen` /
   `Rejected` / `Redo with a note`. A redo is another paid call with its own
   ask. An image the user did not answer for is `Not reviewed`, never `Chosen`.

## Phase 5: Ask, then generate

**The ask.** One question per batch:

"May I generate these and save them under `design/concept/images/`?" followed
by one line per image: `<file> — <tool> <model>, <aspect ratio>, ~<credits>`,
and the batch total.

Options:
- `[A] Generate all <N> (~<total>)`
- `[B] Let me choose which`
- `[C] Use <fallback> instead`
- `[D] Skip this batch`

`[B]` re-asks with the images as a multi-select. `[D]` writes nothing.

**File names:** `style-<letter>-<slug>.<ext>` for candidates,
`<NN>-<slug>.<ext>` for targets, numbered in the order of the set. A file
already at the path is never replaced without its own ask; a redo saves as
`<name>-v2`, `-v3`.

### Higgsfield

1. **Model:** `gpt_image_2_5`. `higgsfield model get <model>` prints the
   aspect ratios and whether it takes image references; check it when using
   another model.
2. **Run** `higgsfield generate create <model> --prompt "<prompt>"
   --aspect_ratio <ratio> --wait`, with `--image-references <path>` for
   targets. It prints the result URL.
3. **Save** with `curl -fsSL -o <path> <url>` after `mkdir -p
   design/concept/images`, keeping the extension the URL has.

### Codex fallback

1. `bash .claude/scripts/codex-run.sh new concept-art`
2. Write `<job>/brief.md`: "Use your image generation tool to create:
   <prompt>. Aspect ratio <ratio>. Style reference to look at first:
   <path, or 'none'>. Save the image as <path>. Write no other file. Final
   message: the saved path, and whether you opened the style reference."
3. `start <job> --agent - --effort xhigh`, then `wait` (again while it prints
   `status running`), then `report`.
4. The `changed` rows must be that one path. Name any other.
5. Codex answers that it did not open the reference, or does not say: record
   `style reference: NOT USED` on that row and tell the user.

### After each batch

Check each file and report every mismatch without fixing it silently:
- it exists and is not empty;
- `sips -g pixelWidth -g pixelHeight <path>` gives the aspect ratio asked for.

A call that failed is listed as `NOT GENERATED — <file> — <error>`. Do not
retry a paid call without a new ask.

## Phase 6: Record

Ask once per run, after the first batch: "May I write
`design/concept/concept-art.md`?" On yes, write it then and update it after
every later batch and verdict in the same run.

```markdown
# Concept Art: <title>

**Source:** <concept file> · **Updated:** <date>

> Targets, not specs. Numbers, labels and layout in these images were invented
> by the generator. The concept, the GDDs and the UX specs are the design.

## Chosen style

**<name>** — <one-line rule>
- Reference image: `images/<file>`
- Take from it: <the user's words>
- Avoid: <the user's words>

(or the single line `Chosen style: NOT CHOSEN`)

## Images

| File | Kind | Answers | Tool, model | Cost | Verdict |
|---|---|---|---|---|---|
| `images/style-a-flat-vector.png` | Style candidate | Which style | Higgsfield gpt_image_2_5 | 6 credits | Rejected — too generic |

## Prompts

### <file>
<the full prompt, and the reference image passed, or "none">

## Not made

| Set item | Why |
|---|---|
```

- **Verdict** is `Chosen`, `Rejected`, or `Not reviewed`. A missing answer is
  `Not reviewed`.
- **Not made** lists every set row with no image: not picked by the user, the
  concept lacks its input, no tool available, or the call failed. A set row
  appears either in Images or here.
- Keep the `## Chosen style` heading as written; `/art-bible` reads it.

## Phase 7: Close

Close with the table:

| File | Kind | Tool used | Why not the first choice | Verdict |
|---|---|---|---|---|

Then, in this order:
- the chosen style, or `Chosen style: NOT CHOSEN`;
- every `NOT AVAILABLE`, `NOT USED`, `NOT GENERATED` and `style reference: NOT
  USED` line from this run;
- the set rows not made, with the reason for each;
- the credits spent this run, or "OpenAI account" for Codex.

## Recommended Next Steps

- `/art-bible` — it reads the chosen style and its reference image, and writes
  the rules that image implies. With no chosen style it authors from text.
- `/concept-art targets` — make the set rows still listed under Not made.
- `/concept-art styles` — try a new round of style candidates.
