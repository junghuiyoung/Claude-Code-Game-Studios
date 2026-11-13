# Game Quality Standard

The quality bar every game made from this studio is held to. It is the one
place the rows live: skills, templates and agents cite a row by its ID and never
restate its text, so there is one version to keep right.

Read it on demand, by section. It is not session context.

**Source.** CrazyGames quality guidelines,
<https://docs.crazygames.com/requirements/quality/>, read 2026-11-12. The page
calls them guidelines, used alongside its separate mandatory requirements
(`docs/CRAZYGAMES.md`), and says the list is not exhaustive. A change to that
page does not change this file: re-read the page before a CrazyGames submission,
and edit the rows here in a reviewed change.

**Source of the Rights and data rows.** Not that page. They come from the
licences of the files and packages a game ships, and from the CrazyGames
Developer Terms of 2025-08-18,
<https://files.crazygames.com/documents/developer_terms_20250818.pdf>, read
2026-11-12: art. 3.8 (no GPL or LGPL software without a written agreement), 7.1
(the developer owns the game's rights or has acquired them), 7.4 (the developer
pays for an infringement claim, and it can be withheld from revenue) and 10
(personal data). Whether that is the version in force was not checked: re-read
the terms before a submission.

## How a row applies

Every row has an **Applies** condition. Decide it from facts about the game,
never from which platform the guideline was written for.

| Applies | True when | Where to read it |
|---|---|---|
| `always` | every game | — |
| `keyboard` | the game binds at least one key | the controls in the brief, GDD or UX spec, or the key bindings in the code root |
| `web` | the game runs in a browser | `platform.targets` in `project.yaml` lists `Web` |
| `audio` | the game plays sound | the brief or GDD names audio, or the build has audio files |
| `ads` | the game shows ads or offers rewards for watching them | the brief, GDD or SDK integration |
| `multiplayer` | the game offers play with other people, online or on one device | the brief, GDD or the modes the build offers. `platform.multiplayer: true` settles it as true; `false` only rules out real-time online play |
| `released` | the game is public | `project.stage`, or the release it is being checked for |
| `crazygames` | the game is released on CrazyGames | `platform.distribution_targets` in `project.yaml` lists `crazygames` (the `distribution_targets` line of `resolve_config`), or the run was started with `--target crazygames`. An empty list settles it as false; an unset key is unknown |

**The supported input methods** (`Q-ONB-5` is checked once per method) come from
the same places as `keyboard`: the controls the design names and the inputs the
build takes. The `input_methods` line of `yaml-helper.sh resolve_config --keys
input_methods` is a hint, not the answer: it adds `keyboard/mouse` for every PC
or Web target, so a touch-only web game still lists it, and it reads `none` when
the `platform` block is incomplete.

**A condition that cannot be read is unknown, not false.** An unset value, a
`project.yaml` with no `platform` block or a design that names no controls does
not make a row inapplicable. Ask the user, or report it: a floor row as
`NOT ASSESSED — [condition] unknown`, an advisory row as `condition unknown —
[condition]`. Neither is `N/A`, and an advisory row's unknown condition never
changes a verdict. A row that is left out because its condition was unknown and
a row that does not apply must never look the same in a report.

A row that does not apply is reported as `N/A — [why]`, once, by ID. The reason
is a fact someone checked ("touch only: the build binds no key"), not a guess.

## When a story touches a row

Decide it from what the story changes, never from its Type. A story touches a
row when it changes the thing the row is about: what a new player sees or does
first, a screen or HUD layout, a control or the hint for it, player-facing text,
art, or audio. It touches a `Q-RGT` row when it adds or replaces a font, image,
audio, video or model file, adds a package, or copies in code from another
project, whoever or whatever made it: a file a tool generated counts.

- A story that changes none of those reads `None — [reason]`. A Logic story that
  changes a rule and nothing on screen is the usual case.
- A story that changes any of them lists the rows by ID. `None` there is wrong.
- A row the story touches but that does not apply to the game is listed as
  `Q-ID: N/A — [reason]`. It needs no criterion and no evidence. Before the
  build exists the reason is what the design says ("the brief specifies no
  onboarding step"); at story close and at release it is confirmed against the
  build, and a reason nobody could confirm is `NOT ASSESSED`.

What is checked when: before implementation, `/story-readiness` checks the
section's form, and any `None` that the story's changes contradict is NEEDS
WORK. At close, `/story-done` blocks only on a floor row: one that applies, that
the story's criteria or the changes in its `## Files` touch, and that is not
listed, or is listed without evidence. An advisory row left out is reported as
`not observed`.

## The floor

Seven rows are the **floor**: `Q-ONB-1`, `Q-ONB-3`, `Q-ONB-5`, `Q-KEY-2`,
`Q-RGT-1`, `Q-RGT-2` and `Q-RGT-3`.

- A floor row that applies is carried by a story as an acceptance criterion,
  and that story does not close without the row's evidence. `/story-done`'s
  "close anyway" does not reach a floor row that failed or has no evidence.
- A `Q-RGT` floor row is carried by every story that touches it, not by one:
  each story that brings a file or package in answers for what it brought.
- A release is not READY while a floor row that applies has failed, and is
  `NOT ASSESSED` while its evidence is missing.
- The floor holds at every `modes.rigor`, `modes.workflow` and `qa.level`.
  `minimal` waives tests and documents. It does not waive whether a new player
  can start the game, or whether the game may be shipped.

Every other row is **advisory**: it is checked, and what was seen is reported
with the row's ID. It never blocks, and it is never left out of a report in
silence: an advisory row nobody looked at reads `not observed`.

The floor is short on purpose. A row moves into it only when its evidence can
be seen in a build without a judgement call.

## The first-run record

`Q-ONB-1` and the other onboarding rows are checked against a record of one
real first run, not against a description of what the code does.

**Who writes it.** `/dev-story`, in its run-and-look step, for a story that
lists a row whose evidence is the first-run record. The programmer agents write
code and tests only; the skill running them writes this. The screenshot
`/dev-story` takes of the scene the story touched does not stand in for it: that
one is launched straight into the scene, and this one starts where a new player
starts.

**Where it lives.** Always `production/qa/evidence/first-run/`. A story names
that folder as its evidence path, never one file in it, so a re-capture needs no
edit to the story: the evidence is the newest record in the folder.

1. Launch the current build as a new player: no save data, no debug flags, from
   the game's real entry point (`.claude/docs/run-and-observe.md` gives the
   launch per engine).
2. Write `production/qa/evidence/first-run/first-run-[YYYY-MM-DD]-[HHMM].md`.
   Never overwrite a record: when that name exists, add `-2`, `-3`. It holds:
   - the build (commit or version), the date, the device and browser or OS;
   - **seconds from launch to the first core-gameplay action the player
     controls**. Clicking through a menu or dismissing a prompt is not that
     action;
   - everything shown before that action, in order (screens, text, prompts);
   - how the goal is shown, and how the controls are shown, for each supported
     input method;
   - whether there is an onboarding step, whether it can be skipped, and what
     happens after the skip.
3. Retain the screenshots beside it, each named after the record:
   `[record name]-start.png` for the onboarding step, or the first playable
   state when the game has no separate onboarding step, and
   `[record name]-hint-[method].png` for each supported input method, showing
   that method's control hint.
4. Stamp the build the record saw, so any later edit shows. The record is
   shared by every story, so the stamp covers **every file under the code root**
   (`.claude/docs/code-root-resolution.md`), not only the files one story
   changed. List them with Glob and pass each path:
   `bash .claude/scripts/review-receipts.sh hash <every file under the code root> > production/qa/evidence/first-run/[record name].stamp.txt`.

**Is the record still current?** Never judge it by a date. List the files under
the code root again and run
`bash .claude/scripts/review-receipts.sh check production/qa/evidence/first-run/[record name].stamp.txt <every file under the code root>`.
First match wins, in this order:

1. **The stamp itself is no good:** the check prints `RECEIPT: NONE` (missing or
   empty), or the stamp file holds no `Reviewed-Content-Hash:` line. Whether the
   record is current cannot be told: the rows that need it are `NOT ASSESSED`.
   The check prints `NEW:` for every file in this case too; that says the stamp
   is empty, not that the code changed.
2. **The code changed after the capture:** a `CHANGED:`, `GONE:` or `NEW:` line
   (an edit, a deletion, a file added since). The record no longer counts;
   capture a new one and keep the old.
3. **The check could not finish:** an `UNRESOLVED:` line, a failed check, or no
   `UNCHANGED:` line at all: `NOT ASSESSED`. The absence of a `CHANGED:` line is
   not success.
4. **Every file under the code root reads `UNCHANGED:`:** the record is
   current.

The stamp covers the code root only. A change to an asset or a data file
outside it that alters the first run is caught by the story that makes it,
which touches the row and captures a new record.

A record that exists but cannot be read, or that leaves out one of the fields or
screenshots above, has not shown anything: the rows that need it are
`NOT ASSESSED`.

## The key list

`Q-KEY-2` is checked against a list of every key the game binds, not against a
sentence saying none is reserved. `/dev-story` writes it for the story that
carries the row, at `production/qa/evidence/[story-slug]/keys.md`, from every
binding in the code root and its input settings, in files the story did not
change too: one line per bound key with its action, whether play needs it, and
the other input that does the same thing. `/release-checklist` builds the same
list from the code root.

## The rights ledger

The `Q-RGT` rows are checked against one record of where each file and package
the game ships came from, not against a sentence saying everything is licensed.

**Where it lives.** Always `production/qa/evidence/rights-ledger.md`, one file
for the whole game. A story names that file as its evidence path.

**What it holds.** One table. A row covers a file, a folder and everything under
it (`assets/art/enemies/`), a pattern (`assets/audio/*.ogg`), or a package
(`npm:howler`). Three rows as an example of the form:

| Path | Made by | Source | Licence | Allows this use | Notice | Proof |
|---|---|---|---|---|---|---|
| `assets/fonts/Pretendard.woff2` | someone else | github.com/orioncactus/pretendard | OFL-1.1 | yes: commercial, embedded in a web build | OFL.txt beside the file | `assets/fonts/OFL.txt` |
| `assets/art/enemies/` | a tool; outlines redrawn by hand | Higgsfield, `gpt_image_2`, paid plan | the plan's terms, read 2026-11-12 | yes: commercial | none | `design/concept/concept-art.md` |
| `assets/audio/` | the developer | recorded for this game | own work | yes | none | git history |

- **Made by**: `the developer`, `someone else`, or `a tool` with what a person
  then selected or changed (`Q-RGT-8`).
- **Source**: where it can be found again. A URL, the tool and model, or "made
  for this game".
- **Licence**: the licence's name, or the terms that were read and the date for
  terms that can change. `free`, `royalty-free` and `found online` are not
  licences.
- **Allows this use**: whether those terms cover a commercial game and, for a
  font, shipping the font file inside the build. A desktop font licence does not.
- **Notice**: what the licence requires to be shipped or shown, or `none`.
- **Proof**: something a person can open: the licence file beside the asset, a
  receipt, the saved terms.

A package needs a row only when the lockfile does not settle it: its licence is
missing, or it matches `gpl-family` and something else allows it (a dual licence
where the other one is taken, the publisher's written agreement).

**Who writes it.** Whoever brings the file or package in, in the same change.
`/dev-story` writes the rows for what its story added, in its run-and-look step.
A row is written from the licence or terms opened at the source, never from what
a licence of that name usually says. A source nobody could open leaves its cells
empty, and the scan reports them. When the file came from the user, ask the user.

**How it is checked.** Run
`node .claude/scripts/rights-scan.mjs --code-root <code root>`, adding
`--notices <file>` when the build has a notices file. It reads the files git
tracks or would track, so a scratch folder or a build copy that `.gitignore`
names is not read. It prints what it saw, and judges nothing:

| Line | What it says | Row |
|---|---|---|
| `FILE: font … — ledger: NO ROW` | a font file no row covers | `Q-RGT-1` fails |
| `FILES: [kind] N in [folder] — ledger: NO ROW` | N files in that folder no row covers | `Q-RGT-2` fails |
| `LEDGER: … — empty cell: Source` or `Licence` | a row that names no source or no licence | the row has shown nothing: the rows that need it are `NOT ASSESSED` |
| `PACKAGE: … — match: gpl-family` or `no-licence`, with `ledger: no row` | a package the game ships (`lock: prod`, or `reached: yes` or `unknown`) under a GPL-family licence or none | `Q-RGT-3` fails |
| `HOST: … [font]` | a font loaded from another host | `Q-RGT-4` |
| `NOTICE: … — not named in …` | a shipped package the notices file does not name | `Q-RGT-5` |
| `HOST: …` | every host a source file names | `Q-DAT-1` |
| `… — ledger: NO LEDGER` | there is no ledger file, and these files need rows | nothing is at the evidence location: a story that brought one of them in does not close, and a release reads `NOT ASSESSED` |
| `CHECK: … — NOT RUN: …`, or the script could not start | that part was not looked at | every row that needs it is `NOT ASSESSED`, never met |
| `UNLISTED: …` | file types the scan has no kind for | read the list; a type that carries rights is reported with `Q-RGT-2` |

A `PACKAGE:` line printed with `match: none` is information: the package ships
and its licence matched neither pattern.

**What the scan cannot see.** Whether a row is true: it reads that a licence is
named, not that the licence is the file's. Code copied into a source file
(`Q-RGT-6`). Whether an image or a tune imitates someone else's (`Q-RGT-7`).
Packages installed by anything but npm: it reads `package-lock.json` only, so
with another package manager `Q-RGT-3` is `NOT ASSESSED — the scan reads
package-lock.json only`, and `N/A` only when the game installs no package.

## The rows

`Checked at` names where a row is first decided and where it is verified.
`Evidence` is what a person can open afterwards.

### Onboarding

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-ONB-1 | puts a new player straight into a simple onboarding that happens inside play, not in screens before it | `always` | **floor** | brief, story, story close, release | first-run record: the seconds to the first core-gameplay action and what was shown before it |
| Q-ONB-2 | teaches only the core actions needed to start, not every feature | `always` | advisory | brief, UX spec, playtest | first-run record: the list of what is taught before the first action |
| Q-ONB-3 | lets the player skip onboarding, and plays normally after the skip | `always`; `N/A` only when the game has no onboarding step to skip: planned from the design, confirmed from the first-run record | **floor** | story, story close, release | first-run record: the skip was used and play went on |
| Q-ONB-4 | shows onboarding with pictures and motion first, text second | `always` | advisory | UX spec, story close | the onboarding screenshot |
| Q-ONB-5 | shows the player how to control it, for every supported input method (a keyboard overlay, a mouse gesture, a touch hint) | `always` | **floor** | UX spec, story, story close, release | first-run record: its `-hint-[method].png` screenshot for each supported input method |
| Q-UI-1 | labels buttons so the way forward is clear | `always` | advisory | UX spec, story close | the retained screenshot of each screen |
| Q-UI-2 | does not size a button to steer the player toward an ad or another choice, and does not delay a button to confuse or steer them | `always` | advisory | UX spec, story close, release | for each choice screen: the size of each option, any wait before one becomes active, and the reason for it |

### General principles

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-GEN-1 | gives the player a clear goal they can reach | `always` | advisory | brief, playtest | the brief's player goal; first-run record: how the goal is shown |
| Q-GEN-2 | is easy to learn | `always` | advisory | playtest | a playtest record: the player did the core action without help |
| Q-GEN-3 | is easy to understand: correct, clear language, good translations, or universal pictures | `always`; translations per shipped locale | advisory | story close, release | proofread text; a `/localize qa` report per shipped locale |
| Q-GEN-4 | keeps its controls consistent and intuitive throughout | `always` | advisory | UX spec, playtest | one table of action to input, the same on every screen |

### A fun experience

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-FUN-1 | responds quickly to the player's actions | `always` | advisory | story close, playtest | what was observed between input and feedback in the build |
| Q-FUN-2 | balances and paces its challenge, strategy and story | `always`, each where the game has it | advisory | design review, playtest | a playtest record: where the player stalled or lost interest |
| Q-FUN-3 | has a comfortable, intuitive screen layout | `always` | advisory | UX spec, story close | screenshots at the smallest and largest supported sizes |
| Q-FUN-4 | has audio that is comfortable and fits the game | `audio` | advisory | story close, playtest | a listen in the build, with the device named |
| Q-FUN-5 | has an interface designed for each device it supports | `always`, per supported device | advisory | UX spec, release | a screenshot or observation per supported device |
| Q-FUN-6 | can be enjoyed by more than one kind of player | `always` | advisory | brief, playtest | advice only: who played and how it went |
| Q-FUN-7 | has an interesting story or scenarios | only when the game has a story or scenarios | advisory | playtest | a playtest record |
| Q-FUN-8 | has no overly repetitive or boring tasks | `always` | advisory | design review, playtest | a playtest record: the stretch the player called tedious |
| Q-FUN-9 | processes quickly, so play feels smooth and continuous | `always` | advisory | story close, release | measured load time and frame rate against `performance.*` |
| Q-FUN-10 | shows solo play as prominently as play with friends when it offers both, and says clearly when solo play is not available | `multiplayer` | advisory | UX spec, release | the screenshot of the screen where the mode is chosen |

### Unique

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-UNQ-1 | is easy to extend with new levels, art and story | `always` | advisory | architecture, code review | content lives in data files (`.claude/docs/coding-standards.md`) |
| Q-UNQ-2 | has a name and icon that are not easily confused with another game, and uses no common identifier (plain "Chess", or "Scrabble") unless the developer owns that IP | `always` | advisory | brief, release | the record of the name search, and for a common identifier the proof of ownership |
| Q-UNQ-3 | is maintained and updated often | `released` | advisory | after launch | advice only |
| Q-UNQ-4 | keeps its major features, such as its genre, after it is submitted | `crazygames` | advisory | release | the submitted description against the current build |

### Aesthetics

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-AES-1 | has high-quality graphics: high resolution, the same resolution throughout, no defects such as compression artifacts | `always` | advisory | art bible, story close, release | screenshots at the target size |
| Q-AES-2 | has high-quality audio: consistent levels, nothing too loud or too quiet, music that fits what is on screen | `audio` | advisory | sound bible, story close, release | a listen in the build; measured levels where a tool gives them |
| Q-AES-3 | keeps one coherent, attractive style and does not switch looks or resolution | `always` | advisory | art bible, story close | screenshots of different scenes side by side |
| Q-AES-4 | is clear about what it is: its name, images and description match the genre and the play | `always` | advisory | brief, release | the store text and images against the build |
| Q-AES-5 | shows a name and images on CrazyGames that match the game, and changes them only when it must | `crazygames` | advisory | release | the Portal listing against the build |

### Keys

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-KEY-1 | adapts its key bindings to the player's keyboard layout instead of asking the player to rebind (WASD is ZQSD on AZERTY) | `keyboard` | advisory | UX spec, story close | the bindings are by physical key position; a run with an AZERTY layout |
| Q-KEY-2 | can be played without a key the browser already uses: Escape (closes fullscreen) and Ctrl/Cmd+W (closes the tab). One of them may be bound only when another input does the same thing | `web` and `keyboard` | **floor** | UX spec, story, story close, release | the key list (`keys.md`): each bound key, its action, whether play needs it, and the other input that does the same thing |

### Rights and data

| ID | The game… | Applies | Level | Checked at | Evidence |
|---|---|---|---|---|---|
| Q-RGT-1 | ships no font file without a ledger row naming its source and a licence that allows a commercial game to ship the file | `always`; met with nothing to check when the scan lists no font file | **floor** | story, story close, release | the rights ledger and the scan: no `FILE: font … NO ROW` line |
| Q-RGT-2 | ships no image, audio, video or model file without a ledger row saying who made it, where it came from and under what terms; for a generated file, the tool and the terms of the plan it was made on | `always` | **floor** | story, story close, release | the rights ledger and the scan: no `FILES: … NO ROW` line |
| Q-RGT-3 | ships no package under a GPL-family licence (GPL, LGPL, AGPL) or under no licence, unless a ledger row records what allows it | `always` when the game installs packages | **floor** | story, story close, release | the scan's `PACKAGE:` lines, and the ledger row for each one marked |
| Q-RGT-4 | loads no font from another host, or the ledger records that service's terms | `web` | advisory | story close, release | the scan's `HOST: … [font]` lines |
| Q-RGT-5 | ships the notices its licences require: a notices file in the build names each shipped package and each ledger row whose Notice cell asks for one | `always` | advisory | release | the scan's `NOTICE:` lines, run with `--notices` |
| Q-RGT-6 | records in the ledger any code copied in from another project, with its licence | `always` | advisory | code review, release | the ledger rows whose Path is a source file |
| Q-RGT-7 | copies no existing work: no character, art, music, level or text taken from one, and none generated by naming a game, a character or an artist as the thing to reproduce | `always` | advisory | brief, art bible, release | the references and prompts on record (`design/concept/concept-art.md`) |
| Q-RGT-8 | records what a person selected or changed in each generated asset | only when the game ships generated assets | advisory | story close, release | the ledger's Made by cell |
| Q-DAT-1 | sends nothing about the player to a host other than the platform's own SDK, or the brief names the host, what is sent and why | `always` | advisory | story close, release | the scan's `HOST:` lines against the hosts the brief names |

## Who reads it

| Skill | What it does with the rows |
|---|---|
| `/create-stories` | Lists the rows each story touches in the story's `## Quality Standard` section and turns each floor row into an acceptance criterion. |
| `/story-readiness` | Checks that section is filled and that each floor row names its criterion. |
| `/dev-story` | Writes the evidence a floor row names: the first-run record, the key list, the ledger rows for what the story added. |
| `/story-done` | Checks each listed row's evidence. A floor row without it blocks the close. |
| `/release-checklist` | Checks every row that applies against the release candidate. |
| `validate-commit.sh` | Warns when a commit takes a font, image, audio, video or model file no ledger row covers. It never blocks. |

A skill that reads this file and cannot find it reports
`NOT ASSESSED — .claude/docs/game-quality-standard.md not found`. It never
treats the standard as met.
