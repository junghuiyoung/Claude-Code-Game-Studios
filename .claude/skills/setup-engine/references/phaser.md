# /setup-engine — Phaser browser profile

Use this route only after the user chooses Phaser. The default target is a
standalone browser build. `--target crazygames` adds the optional CrazyGames
starter files and records the target in `platform.distribution_targets`; it does
not set `platform.cert_tier` or submit a build.

## Preflight

1. The shipped starter pins Phaser **4.2.1**. Confirm that pin against the
   scaffold `package.json` and `docs/engine-reference/phaser/VERSION.md`. It is a
   verified starter version, not a promise to install whatever is currently
   latest. Stop on a version or flag the starter does not support.
2. In the repo root, check `node --version` and `npm --version`. The starter
   requires **Node.js 22.18.0 or newer** and npm. Vite and the optional
   adapter's TypeScript tests depend on a compatible Node version. If either
   check fails, state the missing prerequisite before making any writes.
3. Read `project.yaml`, `CLAUDE.md`, and `.claude/docs/technical-preferences.md`.
   If a different engine is already configured, stop and report that changing
   engines is a separate migration. Do not replace that configuration or its
   reference docs. With Phaser already configured, retain user settings and
   verify the pin before continuing.
4. Run one read-only preflight command, matching the selected target:

   ```bash
   bash .claude/scripts/scaffold-phaser.sh --check
   bash .claude/scripts/scaffold-phaser.sh --check --target crazygames
   ```

   Run the selected command by itself, without shell suffixes or a pipeline.
   A conflict or nonzero result means stop before editing anything. Show the
   affected paths and leave existing files in place. If the project already
   has a custom Phaser app, use `/adopt` rather than copying the starter over
   it. Re-run with the same target to keep an existing starter profile.

## Review the changes

Present the scaffold's `CREATE` and `KEEP` paths, the following config changes,
the version-reference update after a successful probe, and the commands
together. Ask: "May I scaffold this Phaser project, save these settings, and
run `npm ci`, `npm run typecheck`, `npm run build`, and `npm test`?" Explain
that `npm ci` may fetch packages and writes `node_modules/`, and the build
writes `dist/`. Stop if declined. The approval
covers this exact set of actions; a change to the selected target, version or
files requires a new preview.

In `CLAUDE.md`, update only the Technology Stack and engine reference import:
Phaser 4.2.1, TypeScript, Vite + npm, browser assets managed by Vite. Set the
line below `ENGINE-REFERENCE-IMPORT` to `@docs/engine-reference/phaser/VERSION.md`.

In `.claude/docs/technical-preferences.md`, mirror `Engine: Phaser 4.2.1` and
`Language: TypeScript`. Update naming and platform rows to reflect this profile.
Do not invent a physics library, rendering override, device support, or native
engine specialist. Mark dedicated specialists unset. If Claude Code requires
an additional permission to edit this legacy mirror and it cannot be obtained
in the session, report that edit as pending and continue with the primary
config and approved build checks. Do not bypass the restriction.

Merge the following into `project.yaml`, without replacing unrelated keys or
adding a second copy of a YAML block. Report and resolve any existing settings
that conflict with the chosen web profile before writing:

```yaml
engine:
  name: "Phaser"
  version: "4.2.1"
  language: "TypeScript"
specialists:
  code: null
  shader: null
  ui: null
  additional: []
naming:
  files: kebab-case
  classes: PascalCase
  variables: camelCase
  constants: SCREAMING_SNAKE
platform:
  targets: [Web]
commands:
  build: "npm run build"
  run: "npm run dev"
```

For `--target crazygames`, include `platform.touch_support: Full` as a design
requirement so the input workflow includes touch alongside keyboard/mouse.
This records the intended controls, not app test evidence. Resolve an existing
conflicting value in the setup preview before changing it.

For `--target crazygames`, also record where the game is published:

```yaml
platform:
  distribution_targets: [crazygames]
```

Add `crazygames` to a list that is already there and keep its other items;
never replace the list, and never write a second `platform` block. This is what
lets `/release-checklist`, typed with no argument, run the CrazyGames report and
apply the `crazygames` rows of `.claude/docs/game-quality-standard.md`. It shows
in the setup preview with the other config changes. Without `--target
crazygames`, leave the key as it is: a standalone build does not write `[]`,
because the game may still be published somewhere later.

`src/` is the Phaser code root. `npm run typecheck` verifies TypeScript and
`npm run preview` serves the production build. `npm test` runs the starter's
platform adapter and controls tests; it does not exercise gameplay or the
browser build.

The starter's `src/phaser/controls.ts` is the model for a new game's input: keys
are bound by physical position (`KeyboardEvent.code`), the on-screen hint takes
its key labels from the player's keyboard layout where the browser gives one,
nothing needs Escape or Ctrl/Cmd+W, and each supported input method has its own
picture hint (`Q-KEY-1`, `Q-KEY-2`, `Q-ONB-5` in
`.claude/docs/game-quality-standard.md`). Build the game's controls on it rather
than on `keyboard.addKey('W')`. It supports keyboard and pointer only: add a
method only when the design names it.
Leave `commands.test` and `commands.smoke` unset until the project has
gameplay tests and a dedicated smoke command, respectively.
Use the Phaser `/smoke-check` route separately for browser evidence. Never
change `modes.rigor` or `platform.cert_tier` here.

## Scaffold and verify

1. After approval, run `bash .claude/scripts/scaffold-phaser.sh` (add
   `--target crazygames` for that profile). If it reports a conflict, stop
   before writing config. When it succeeds, apply the reviewed config changes.
2. Run `npm ci` using the scaffold's checked-in lockfile, then
   `npm run typecheck`, `npm run build` and `npm test`. Run each approved command
   separately, without a pipe or extra command. If npm cannot install in this
   environment, report that dependency and build verification is pending.
   Do not mark it as passing or swap in different dependency versions.
3. Read `node_modules/phaser/package.json` to confirm the installed version.
   When this probe succeeds, record it in the `Installed at pin time` row in
   `docs/engine-reference/phaser/VERSION.md` as part of the reviewed setup. If it
   cannot run, retain `NOT DETERMINED`. Do not change the verified release pin.
4. Confirm `dist/index.html` exists and the import points at the Phaser
   reference. Run `bash .claude/scripts/project-coherence.sh`. Report and
   resolve `[DIFFERS]` observations before calling setup complete.
5. Report what ran and what remains unverified. `npm run dev` starts local
   iteration; `npm run preview` serves the production build. For CrazyGames,
   `/release-checklist --target crazygames` is a separate, explicit release
   action.
