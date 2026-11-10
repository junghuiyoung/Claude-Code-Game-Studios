---
name: asset-generate
description: "Generates files from approved asset specs: images with Higgsfield (Codex fallback), 3D with a Higgsfield GLB cleaned in Blender, audio with ElevenLabs (Higgsfield fallback). Asks before every paid call. After /asset-spec."
argument-hint: "[ASSET-NNN ... | design/assets/specs/<file>.md | --next]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(bash "*/.claude/skills/asset-generate/../../hooks/yaml-helper.sh" resolve_config *), Bash(higgsfield account status*), Bash(higgsfield generate cost *), Bash(bash .claude/scripts/codex-run.sh *), Bash(mkdir -p assets/*), Bash(mkdir -p production/session-state/asset-gen*), Bash(sips -g *), Bash(afinfo *)
model: opus
---

!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys automation`

Resolved above. Use it as-is. No block → defaults in
`.claude/docs/config-resolution.md`.

Ask with the question tool. Without one, list the options numbered and end your
turn to wait. A skipped or dismissed question is not an answer: ask again in
plain text.

# Asset Generate

Turns approved `ASSET-NNN` specs from `/asset-spec` into files under `assets/`.

**Writes:**
- the asset files;
- each spec block's `Status` and a `Generated:` line;
- the manifest row and its counts.

Each write comes after an ask that names it.

**Every paid call asks first, whatever `modes.automation` says.** This is the
guard `/asset-spec` states for any live generator: it is an irreversible
external action that spends credits. One ask per asset names the tool, the
model, the estimated credits and the file it will save.

**Next:** `/asset-audit` checks the delivered files against their specs.

## Phase 1: Pick the assets

- **Argument:** `ASSET-NNN` IDs, a spec file (every `Needed` block in it), or
  `--next` (the first `Needed` row of `design/assets/asset-manifest.md`).
- **No argument:** ask which one, with the manifest's `Needed` rows as options.
- **No manifest:** stop with "No asset specs yet — run `/asset-spec` first."

Read each block's fields: Category, Dimensions, Format, Naming, Polycount,
Texture Res, Visual Description, Generation Prompt, Status. A block that is not
`Needed` is generated only when the user confirms regenerating it.

**Where each file goes:**

| Category | Path |
|---|---|
| Sprite | `assets/art/sprites/<Naming>` |
| UI | `assets/art/ui/<Naming>` |
| Environment | `assets/art/environment/<Naming>` |
| VFX | `assets/vfx/<Naming>` |
| 3D | `assets/art/models/<Naming>` |
| Audio | `assets/audio/sfx/`, `assets/audio/music/` or `assets/audio/voice/` + `<Naming>` |

A file already at the path is never replaced without its own ask.

## Phase 2: Check what is available

Each check prints one line, and an unavailable tool is named in the output. A
check that silently fails looks the same as a tool that works.

- **Higgsfield:** run `higgsfield account status`. It prints the account and
  credits. Not installed or not signed in: `Higgsfield NOT AVAILABLE — <why>`.
- **ElevenLabs:** look for the ElevenLabs connector's `creative_*` tools in this
  session. Absent: `ElevenLabs NOT AVAILABLE — connector not in this session`.
- **Codex:** run `command -v codex`. Absent: `Codex NOT AVAILABLE — not on PATH`.
- **Blender:** use `$BLENDER_BIN`, else `blender` on PATH, else
  `/Applications/Blender.app/Contents/MacOS/Blender`. None found:
  `Blender NOT AVAILABLE — not installed`.
- **Forced fallback:** when `ASSET_GEN_FORCE_FALLBACK=1` is set (for testing the
  fallbacks), skip every first choice and say so.

## Phase 3: Route

| Kind | First choice | When it cannot be used |
|---|---|---|
| Image (sprite, UI, environment, VFX) | Higgsfield | Codex image generation |
| 3D | Higgsfield reference image, then Higgsfield `multi_image_to_3d` GLB, then Blender cleanup | Reference image only: Codex image. GLB: no fallback, so print `3D NOT GENERATED — <why>`. Blender missing: save the raw GLB and record it as not cleaned |
| Sound effect, voice | ElevenLabs connector | Higgsfield `seed_audio` |
| Music | Higgsfield `seed_audio`, or `sonilo_music` for a track with a set length (the ElevenLabs connector has no music) | — |

"Cannot be used" means any of these:
- the tool is not available (Phase 2);
- its estimate is above the credits left;
- the call fails with a credit, quota or payment error.

Name the reason in the output, e.g.
`Higgsfield NOT USED — 12 credits left, 40 needed; Codex fallback`.

**Estimates:**
- Higgsfield: `higgsfield generate cost <model> --prompt "<prompt>" ...`
- ElevenLabs: the generation tool with `estimate_only: true`
- Codex: none (billed to the user's OpenAI account); say so.
- Some Higgsfield jobs cannot be estimated (`multi_image_to_3d` answers "does not
  support alpha v2 cost estimation"). Say "estimate not available" in the ask;
  never guess a number.

## Phase 4: Ask, per asset

One question per asset, with the route, model, estimate and destination in it:
"May I write `<path>` by generating `<ASSET-NNN>` with `<tool>` (`<model>`,
~`<credits>`)?"

Options:
- `[A] Generate with <tool> (<model>, ~<credits>) → <path>`
- `[B] Use <fallback> instead`
- `[C] Skip this asset`

For a batch, ask asset by asset. Never take one answer as approval for the
rest. An answer of skip writes nothing for that asset.

## Phase 5: Generate

### Image: Higgsfield

1. **Pick the model:**
   - `nano_banana_flash` for character or cartoon sprites;
   - otherwise `gpt_image_2_5`;
   - `higgsfield model list` lists the rest.
2. **Run** `higgsfield generate create <model> --prompt "<Generation Prompt>" --wait`.
   Add `--aspect_ratio` from Dimensions when the model takes one. It prints the
   result URL.
   - **Never put "transparent background" in the prompt.** The models paint a
     grey-and-white checkerboard into the pixels instead of an alpha channel
     (seen with `gpt_image_2_5`). Ask for a flat solid background.
   - When the spec needs alpha, say the file has none. This skill has no
     background-removal step.
3. **Save** it with `curl -fsSL -o <path> <url>`, after `mkdir -p` on the folder.

### Image: Codex fallback

1. `bash .claude/scripts/codex-run.sh new asset-generate`
2. Write `<job>/brief.md`: "Use your image generation tool to create:
   <Generation Prompt>. Save the image as <path>. Write no other file. Final
   message: the saved path."
3. `start <job> --agent - --effort xhigh`, then `wait` (again while it prints
   `status running`), then `report`.
4. The `changed` rows must be that one path. Name any other.

### 3D

1. **Reference image.** Generate it as an image (above) with the spec's prompt
   plus "single object, centred, plain neutral background, three-quarter view,
   even lighting". Save it to `production/session-state/asset-gen/<name>-ref.png`.
2. **GLB.** Run
   `higgsfield generate create multi_image_to_3d --image <ref.png> --should_texture true --wait`.
   Save the GLB to `production/session-state/asset-gen/<name>-raw.glb`.
3. **Cleanup.** Run
   `"<blender>" --background --python .claude/scripts/blender-cleanup.py -- <raw.glb> <final path> --tris <Polycount> --origin bottom`.
   - Add `--height <m>` when the spec gives a size.
   - Report its `CLEANUP` rows (tris before and after, height, exported).
4. **Blender not available:** copy the raw GLB to the final path and record it
   as `raw, not cleaned (Blender not installed)`.

### Sound effect or voice: ElevenLabs

- **Sound effect:** run `creative_generate_in_flow` with an `sfx` node, model
  `eleven_text_to_sound_v2`.
  - Duration comes from the spec (0.5–30 s).
  - Set `loop` when the spec says it loops.
  - Run once with `estimate_only` first.
- **Voice line:** run `creative_generate_speech`, with a voice picked from
  `creative_list_voices` to fit the spec.
- **Save:** take the output URL from `creative_get_flow_run_status` (or
  `creative_get_flow`) and save it with `curl -fsSL -o <path> <url>`.
- **Format:** if the spec's format differs from what came back (e.g. WAV
  wanted, MP3 returned), convert it on macOS with
  `afconvert -f WAVE -d LEI16 <in> <out>` and say so.

### Audio: Higgsfield (fallback, and music)

Run `higgsfield generate create seed_audio --prompt "<prompt>" --wait`. For a
music track with a set length, use
`higgsfield generate create sonilo_music --prompt "<prompt>" --duration <s> --wait`.
Save it as above.

## Phase 6: Check and record

1. **Check each file** and report every mismatch without fixing it silently:
   - it exists and is not empty;
   - **image:** run `sips -g pixelWidth -g pixelHeight -g hasAlpha <path>` and
     compare with Dimensions. A sprite or UI element with no alpha is flagged.
   - **3D:** compare `tris_after` with Polycount;
   - **audio:** run `afinfo <path>` for the duration and format.
2. **Ask:** "May I update the spec block(s) in `<spec file>` and
   `design/assets/asset-manifest.md`?"
3. **On yes:**
   - each generated block's `Status` becomes `In Progress`, the manifest's word
     for an asset that exists but is not reviewed;
   - add the line
     `**Generated:** <date> — <tool> <model> — <credits or "OpenAI account"> — <path> — <checks and fallback reason>`;
   - update the manifest row and its Progress Summary counts.
4. **Close with a table:**

   | Asset | Tool used | Why not the first choice | File | Checks |
   |---|---|---|---|---|

   Then list every `NOT AVAILABLE`, `NOT USED` and `NOT GENERATED` line.
   Generated files are `In Progress` until a person approves them; `Done` is
   theirs to set.
