# Releasing an HTML5 game on CrazyGames

Use `/release-checklist --target crazygames` to review an existing release
candidate, or `/release-checklist` alone once the project is marked as below. CrazyGames serves the same web build on its site and inside its
Android and iOS apps when the title is available there. The apps load web
games, so this workflow prepares an HTML5 bundle. Treat approval for the site,
mobile homepage placement, and availability in the apps as separate results.
[CrazyGames App](https://docs.crazygames.com/resources/crazygames-app/)

## Marking a game as a CrazyGames game

`platform.distribution_targets: [crazygames]` in `project.yaml` records the
target. `/setup-engine phaser --target crazygames` writes it; for an existing
project, add that line under `platform:` in `project.yaml` by hand, as an
inline list. With it set, `/release-checklist` typed with no argument runs this
workflow, and no flag has to be remembered.

The quality bar for every game is `.claude/docs/game-quality-standard.md`. Most
of its rows apply to any game, and its browser and keyboard rows to any web
game, CrazyGames or not. Two rows wait for this target: `Q-UNQ-4` (the genre
and major features do not change after submission) and `Q-AES-5` (the name and
images on CrazyGames match the game). The release checklist reports them once
the target is set.

## What CrazyGames requires: the `CG-` rows

CrazyGames reviews every submission against its own requirements. They are
listed here once, by ID, so a story, a close record or a release report can cite
`CG-B-8` instead of restating it. They are rules of this one platform, so they
are not rows of the quality standard, and they apply only to a game whose
`platform.distribution_targets` lists `crazygames`.

Read from the CrazyGames documentation on 2026-11-12. That site changes: re-read
the linked page before a submission, and edit a row here in a reviewed change.

- **Stage.** `CG-B` rows bind from the first submission (Basic Launch). `CG-F`
  rows bind once the game is invited to Full Launch, on top of every `CG-B` row.
  Building a `CG-F` row early is allowed and usually cheaper than retrofitting
  it.
- **Force.** `required`: the page states it as a requirement, and QA can reject
  the game over it. `recommended`: the page advises it, or names a consequence
  short of rejection (the game is switched off on one browser). A `recommended`
  row never blocks a story, a release or a gate; it is still reported.
- **Applies.** A row whose condition is false for the game is `N/A — why`. A
  condition nobody could decide is unknown, never false.

### Basic Launch

| ID | The game… | Applies | Force | Decided at | Evidence |
|---|---|---|---|---|---|
| CG-B-1 | stays within the package limits: 250 MB and 1,500 files in total, 50 MB initial download, and refers to its own files by relative path only | always | required | architecture, release | the package check below; the Portal's initial-download figure |
| CG-B-2 | reaches play fast: loads quickly and plays without errors or crashes; with externally hosted files, 20 seconds at most to gameplay | always | required | architecture, release | seconds from load to play in the Portal Preview |
| CG-B-3 | works in Chrome and Edge | always | required | release | the browser record, one result per browser |
| CG-B-4 | supports mouse and keyboard, and touch when mobile is supported; is playable in landscape on desktop (a portrait game may show bars or a background at the sides) | always | required | brief, release | the brief's controls; a run per input method |
| CG-B-5 | chooses its device-specific controls from the SDK's system info (`device.type`), never from touch detection (`ontouchstart`, `navigator.maxTouchPoints`): many laptops have touchscreens | the game shows different controls per device | recommended | story, release | what decides the controls in the code root; a search for touch detection there |
| CG-B-6 | on mobile: sets `user-select: none` on the page so a long press or double tap selects nothing, keeps its UI inside the safe area in the app, and resumes audio from a user gesture after iOS interrupts it | mobile is supported | required | story, release | a run on a phone; the app checks below |
| CG-B-7 | is readable at `devicePixelRatio` 1 in the frame sizes CrazyGames uses most: 907×510, 1216×684, 1077×606, 821×462 (desktop, not fullscreen), 1366×768, 1920×1080, 1536×864, 1280×720 (fullscreen), 800×450 (mobile), 1080×607 (tablet) | always; the mobile and tablet sizes when those are supported | required | UX spec, release | screenshots at the smallest desktop size, at 800×450 when mobile is supported, and at one fullscreen size, with all text legible |
| CG-B-8 | has no fullscreen button of its own: CrazyGames provides fullscreen, and a custom button interferes with it | always | required | UX spec, story, release | a search of the code root for a fullscreen call; the screens |
| CG-B-9 | carries no cross-promotion for another game or platform, and no App Store or Play Store link anywhere in the game (those go in the Developer Portal's metadata fields). A privacy policy and terms are always allowed. Also allowed, as long as none is a main call to action on the menu: community links (Discord, the developer's site) on the game menu that do not lead straight to a playable web version; a game-store link (Steam, Epic) to this game, in a desktop game, on the main menu or at the end of a demo; a link back to the CrazyGames home or a category page, not promoted; links to other games of the same series | always | required | UX spec, story, release | every link and outbound URL in the code root, with where it shows and which allowance it falls under |
| CG-B-10 | behaves the same at any refresh rate: its physics do not change at 144 Hz or 165 Hz | always | required | story, release | movement driven by elapsed time; a run on a display above 60 Hz, or the frame-rate test that stands in for it |
| CG-B-11 | is in English. Any translation is accurate, is chosen from the locale in the SDK's system info, and falls back to English | always | required | brief, release | the shipped locales; what picks the language |
| CG-B-12 | suits players aged 13 and up (PEGI 12), and its name, assets and content are original | always | required | brief, release | the content review; `Q-UNQ-2` and the rights rows of the quality standard |
| CG-B-13 | shows no ad from outside the CrazyGames SDK. Ads are off during Basic Launch: a game that already integrates them still runs smoothly, with no freeze between levels and no rewarded button that does nothing | always | required | story, release | a run with ads disabled; a search of the code root for another ad network |
| CG-B-14 | if it integrates the SDK, sends the first `gameplayStart()` when the player can actually play, not on a menu or a loading step | the SDK is integrated | required | story, release | the SDK event log in the Portal Preview |
| CG-B-15 | lets guests play, and offers no external login (Facebook, Google, email) | the game saves profiles or progress on its own back-end | required | brief, release | the screens |
| CG-B-16 | shows new players a terms and conditions or privacy policy notice | the game collects personal data beyond the SDK's own events | required | brief, release | the notice; `Q-DAT-1` of the quality standard |
| CG-B-17 | if it is sitelocked, allows every CrazyGames origin, the two app origins included | a sitelock or a `frame-ancestors` policy is in place | required | release | the policy against the origins in the app documentation |
| CG-B-18 | keeps the mouse in the game. A first-person game locks the pointer during play and offers a key to release it. A game steered by mouse movement locks and confines the pointer, shows its position with its own cursor or another way such as a joystick, offers a key to release it, and makes any button shown during play clickable or shows its keyboard shortcut | first-person, or movement by mouse gesture. A game played by clicking its UI needs none of this | required | UX spec, release | a run outside fullscreen |
| CG-B-19 | makes that notice a simple one, not a pop-up that blocks the player | `CG-B-16` applies | recommended | UX spec, release | the notice |
| CG-B-20 | turns its chat off when the SDK's `disableChat` setting is true, and moderates it; a profanity filter is the simplest form | the game has chat | required | architecture, story, release | a run with `?disableChat=true`; the filter at work |
| CG-B-21 | moderates what players upload or draw | the game has user-generated content | required | architecture, release | the moderation at work |
| CG-B-22 | sells nothing in the game: in-game purchases are not available in Basic Launch | the game has, or plans, in-game purchases, and the release is for Basic Launch. At Full Launch this row is `N/A — purchases are allowed at Full Launch`, and `CG-F-11` governs them | required | brief, release | the screens with the shop off |
| CG-B-23 | is submitted with its description and control instructions, three covers and two preview videos, each made to the rules under Submission materials | always | required | release | see Submission materials |
| CG-B-25 | works well in Safari, and runs smoothly on a 4 GB RAM Chromebook. A game that does not is disabled on that browser or on ChromeOS, not rejected: the row decides where the game is offered | always | recommended | release | a result for Safari and for a 4 GB Chromebook, each reported as offered or not |
| CG-B-24 | hides the features that need a connection (multiplayer, leaderboards, purchases) when the SDK's `isOfflineMode` is true | the game is offered for offline play in the app and has such features | recommended | story, release | a run in the app with the device offline |

Sources: [launch stages](https://docs.crazygames.com/requirements/intro/) ·
[technical](https://docs.crazygames.com/requirements/technical/) ·
[gameplay](https://docs.crazygames.com/requirements/gameplay/) ·
[ads](https://docs.crazygames.com/requirements/ads/) ·
[accounts](https://docs.crazygames.com/requirements/account-integration/) ·
[chat and user-generated content](https://docs.crazygames.com/requirements/multiplayer/#chat-and-user-generated-content-ugc) ·
[covers](https://docs.crazygames.com/requirements/game-covers/) ·
[app](https://docs.crazygames.com/resources/crazygames-app/) ·
[sitelock](https://docs.crazygames.com/resources/html5/sitelock/) ·
[mouse control](https://docs.crazygames.com/resources/mouse-control/)

`CG-B-18` names Escape as a usual key to release a locked pointer. That is the
browser's own way out of pointer lock, so it does not contradict `Q-KEY-2`: the
game still needs no Escape press to play. `CG-B-24` is the app page's
instruction for offline play; the page does not list it among the requirements.

### Full Launch

| ID | The game… | Applies | Force | Decided at | Evidence |
|---|---|---|---|---|---|
| CG-F-1 | integrates the SDK and sends `gameplayStart()` when play starts or resumes and `gameplayStop()` at every break in it (pause, menu, end of a round) | always | required | story, release | the SDK event log in the Portal Preview |
| CG-F-2 | turns its audio off while the SDK's `muteAudio` setting is true, follows the setting when it changes, and never lets its own sound toggle turn audio back on over it | the game has audio | required | story, release | a run with `?muteAudio=true`, and a change while playing |
| CG-F-3 | lands a new player in gameplay at once; where the game cannot, after one click at most | always | required | brief, story, release | the first-run record of the quality standard: what is shown before the first action |
| CG-F-4 | saves progress in the cloud by one of three ways. The SDK's Data module, which CrazyGames prefers: 1 MB at most, and the keys a published game already keeps in `localStorage` are copied across. Or the game's own back-end, linked to the CrazyGames account through the User module (`CG-F-12`). Or Automatic Progress Save, which is not allowed for a game with in-game purchases | the game has progress worth keeping | required | architecture, story, release | which way was chosen; progress carried to a second device or browser signed in to the same account |
| CG-F-5 | uses the CrazyGames username and avatar from the User module wherever it shows a player's name or picture, with no in-game name or avatar of its own to set up, and goes on as a guest when the SDK returns no user | the game shows player names or pictures, whether or not it has a back-end of its own | required | architecture, release | the screens as a signed-in user and as a guest |
| CG-F-6 | requests video ads only through the SDK and at a natural break, never during play and never on a navigation button (menu, settings, shop); blocks its UI and pauses from the request until `adFinished` or `adError`; mutes only when the ad actually starts; and goes on when a request fails | the game shows video ads | required | UX spec, story, release | a run of each ad placement, with a filled and an unfilled request |
| CG-F-7 | offers rewarded ads as an occasional bonus. No level needs one. The request button sits in one consistent, easy-to-reach place, never on an active gameplay screen, and not every time the player dies; when offers are limited, a timer or a hidden button says so. One ad per reward, never a chain. The decline choice has the same size, font and colour and is there at once, never hidden or delayed. A mark shows that the reward costs an ad, and there is another way to get the reward. The reward is given, and shown as given, on `adFinished`, and never on `adError`. Never both a midgame ad and a rewarded "keep playing" between the same two levels | the game shows rewarded ads | required | UX spec, story, release | each offer screen; `Q-UI-2` of the quality standard |
| CG-F-8 | shows a banner only on a useful screen that stays open at least 5 seconds on average, never during play, never over game UI at any size, clearly apart from game content, and two at most on a screen | the game shows banners | required | UX spec, release | each screen with a banner, at the `CG-B-7` sizes |
| CG-F-9 | plays normally for a player with an ad blocker: no block, no penalty, no pop-up, and no rewarded button left clickable with no effect. A feature it does withhold says the ad blocker is why | the game shows ads | required | story, release | a run with an ad blocker on |
| CG-F-10 | meets the Online with Friends rules, which also make it eligible for the Multiplayer landing page: the player's room and whether it can be joined are shared through the SDK; launched as instant multiplayer, the game goes straight into multiplayer, with the first player in a new private room with default settings (a set-up screen for the mode or the player count in between is acceptable) or, in a game for 20 or more players, directly in public play, and in every case friends can join at once; CrazyGames usernames are shown in the game; lobby sizes are submitted with the build | the game has an online multiplayer mode | required | architecture, release | the [multiplayer page](https://docs.crazygames.com/requirements/multiplayer/), item by item |
| CG-F-11 | sells in-game items only by invitation, through CrazyGames' Xsolla account and the CrazyGames `userId`; inside the app, hides or disables every purchase control when `store.isAvailable` is false | the game sells in-game items | required | architecture, release | the shop on the web and inside each app |
| CG-F-12 | ties its own accounts to CrazyGames accounts. At every launch it gets the user token, verifies it on its server (its `gameId` included) and identifies the player by `userId`. A signed-in CrazyGames user is registered and signed in automatically, and any username or avatar the back-end stores is refreshed from the CrazyGames account at every launch; a guest plays as a guest; a guest who signs in while playing is picked up through the auth listener. No logout and no other login method in the game; a "Login with CrazyGames" button is allowed when it is not the main call to action and opens the SDK's prompt, which is never opened automatically | the game has accounts on its own back-end | required | architecture, release | the launch flow as a new user, a returning user and a guest; the token check on the server |
| CG-F-13 | lets a round-based match go on with the same group, in the same room or a new one, without a trip back through the CrazyGames UI | `CG-F-10` applies and the game is played in rounds | required | architecture, release | two rounds in a row with the same group |
| CG-F-14 | uses the SDK's invite link for any link to a room it lets players copy | `CG-F-10` applies and the game offers a link to copy | required | story, release | a copied link opened by a second player |

Sources: [SDK game module](https://docs.crazygames.com/sdk/game/) ·
[progress save](https://docs.crazygames.com/sdk/data/) ·
[ads](https://docs.crazygames.com/requirements/ads/) ·
[accounts](https://docs.crazygames.com/requirements/account-integration/) ·
[multiplayer](https://docs.crazygames.com/requirements/multiplayer/) ·
[app](https://docs.crazygames.com/resources/crazygames-app/)

A multiplayer game that needs a large audience may be sent straight to Full
Launch: CrazyGames' QA decides, and such a game meets the `CG-F` rows from its
first submission.

### Who reads the rows

| Skill | What it does with them |
|---|---|
| `/brainstorm` | Checks the concept against the design targets below, and against the rows decided at the brief. |
| `/create-stories` | Lists the rows a story touches beside its quality rows, so the rule is in front of whoever builds it. |
| `/story-readiness` | Checks that each `CG-` line names a row this guide has. |
| `/dev-story` | Has the builder read the rows the story lists. |
| `/story-done` | Reports each listed row from the build. A `required` `CG-B` row the build plainly breaks is a blocking deviation. |
| `/release-checklist` | In the CrazyGames report, gives every row a line: its evidence, `N/A`, or `NOT ASSESSED`. |
| `/gate-check release` | Compares that report with the rows of this guide, for the stage being released, at every tier: a row missing from the report is not assessed, and a due `required` row broken is a blocker. |

The Phaser starter's CrazyGames variant already answers some of them in code,
whenever its SDK connection succeeds: it reports `gameplayStart()` and
`gameplayStop()` (a stop on scene shutdown included), follows `muteAudio`, takes
the device type and the locale from the SDK's system info, has no fullscreen
button and no outbound link, and switches off page scroll and the context menu.
That is a starting point for `CG-B-5`, `CG-B-8`, `CG-B-14`, `CG-F-1` and
`CG-F-2`, not proof of them: the game built on it adds its own breaks in play,
its own audio and its own screens, and when the SDK does not load within the
starter's time-out it runs standalone and reports nothing. Each row is still
assessed on the release candidate.

## Design targets: what Basic Launch measures

Basic Launch lasts 7 to 21 days: it ends once the game has been live 7 days and
has 500 plays, or after 21 days. Three numbers decide whether the game is
invited to Full Launch, which is where monetization starts. They are worth
designing for from the brief, not discovering at submission.

| Measure | What it is | What CrazyGames calls strong | What it asks of the design |
|---|---|---|---|
| Average play time | time in one session | 10 minutes or more | a core loop that holds for a session; a clear next goal at every moment |
| Day 1 retention | players back the next day | 10 to 15% | progression that carries over, saved progress, a reason to return |
| Conversion | players who play at least one minute | 80% or more, with a load under 10 seconds and a build under 20 MB | play within seconds; the first level loaded first, the rest behind it |

These are the platform's descriptions of games that did well, not pass marks it
publishes. Updates during Basic Launch are approved automatically, and the
dashboard refreshes daily.
[Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/) ·
[Getting to the first frame](https://docs.crazygames.com/resources/getting-to-the-first-frame/)

## Local release candidate

For a Phaser project, install the locked dependencies with `npm ci` and run
`npm run build`. Preview the production output with `npm run preview`. Serve
the build at a nested path in an iframe as well, and watch for asset requests
that leave the bundle. Keep URLs to bundled files relative, including URLs
assembled by the game at runtime. The entry page is `dist/index.html` for the
Phaser starter. Use the selected engine's actual output directory if different.
[CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical/)

Inspect the existing HTML5 output with the read-only package check:

```bash
node .claude/scripts/check-crazygames-build.mjs dist
```

If the candidate does not integrate the SDK, append `--without-sdk` to include
the initial download limits in the check. Record the build identity, total
bytes, file count, and any check failures.

| What to measure | Limit |
| --- | --- |
| Total game bundle | 250 MB and 1,500 files maximum |
| Initial download | 50 MB maximum |
| Eligibility for the mobile homepage | 20 MB maximum initial download |

With the SDK, measure initial download through the first `gameplayStart()`
at actual play. Without the SDK, CrazyGames uses the total bundle size for
that measure. For an SDK build, a passing local package check leaves the
Portal's startup size unmeasured. The 20 MB threshold applies to mobile
homepage eligibility.
[Download limits and measurement](https://docs.crazygames.com/requirements/technical/#file-size-count-limits)

Play the candidate with keyboard and mouse in desktop Chrome and Edge, and
with touch in mobile Safari and Chrome. Check readability in a small responsive
iframe, supported orientations, load and restart, and input after resizing.
Verify touch controls don't depend on a hover state, long press doesn't open a
selection menu, and audio works after a tap and a background/foreground cycle.
Record browser and device details. A desktop viewport or mobile emulation is
useful for regression checks.
[Technical requirements](https://docs.crazygames.com/requirements/technical/) ·
[Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)

## SDK and launch stage

**Basic Launch.** The SDK is optional and CrazyGames disables monetization.
When an integration is present, await SDK v3 initialization before module calls
and send the first `gameplayStart()` when the player can actually play. Verify
the game keeps working if the SDK is unavailable or ads are disabled, including
any restart or progression action that offers a reward. CrazyGames prohibits
external ads.
[Launch requirements](https://docs.crazygames.com/requirements/intro/) ·
[SDK setup and local testing](https://docs.crazygames.com/sdk/intro/) ·
[Ads requirements](https://docs.crazygames.com/requirements/ads/)

**Full Launch.** The SDK is required. Send `gameplayStart()` when actual
play starts or resumes and `gameplayStop()` for in-game breaks such as pausing,
opening a menu, or ending a round. The platform handles browser focus changes.
Use the SDK's save and account modules where applicable. If the game uses ads,
verify that the game pauses and mutes while an ad runs, continues after errors,
and grants rewards only on completed rewarded ads. Local SDK overlays and
injected callbacks are local evidence.
[Game events](https://docs.crazygames.com/sdk/game/#gameplay-startstop) ·
[Full SDK integration](https://docs.crazygames.com/requirements/technical/#full-sdk-integration) ·
[Video ads](https://docs.crazygames.com/sdk/video-ads/)

## Portal Preview and real apps

1. The account owner can preview the candidate in the Developer Portal.
   Verify iframe boot and actual gameplay,
   record the initial download measurement when available, and exercise SDK
   behavior for the chosen launch stage. Record which build ran and keep the
   preview evidence with the report.
2. Check a physical Android device inside the CrazyGames Android app and a
   physical iPhone inside the CrazyGames iOS app when the title is accessible
   there. Verify tap controls, readable and reachable UI, rotation in supported
   orientations, the notch and home indicator, and audio after returning to
   the app. Record app/OS versions and results separately. With the SDK,
   use `--safe-area-inset-*` for HUD and controls in the iframe. Use
   `applicationType` for app-specific behavior only when needed. For a game
   available offline, check that features needing the network are gated. For
   a self-hosted iframe, check the site's CSP or sitelock against both app
   origins in the app documentation.
3. Mark any unavailable Portal, Android app, or iOS app check
   `NOT ASSESSED — [reason]`. A local pass or Portal Preview cannot establish
   that a title appears and plays in the apps. The account owner can submit
   for review even if app access is pending. In that case, keep the app
   assessment open.

[Developer Portal](https://developer.crazygames.com/) ·
[Testing in Preview](https://docs.crazygames.com/#testing-your-game) ·
[App-specific testing](https://docs.crazygames.com/resources/crazygames-app/)

## Submission materials

- Prepare the title, description, control instructions, and supported device
  and orientation settings. Verify the game supports English and meets the
  platform's originality and PEGI 12 content rules.
  [Launch requirements](https://docs.crazygames.com/requirements/intro/) ·
  [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- Prepare three covers (1920×1080, 800×1200, 800×800) and two gameplay preview
  videos (1080p landscape 16:9 and portrait 2:3, both mandatory). Each video is
  silent and at most 20 seconds and 50 MB. Check the current media instructions
  before submission.
  - **Covers** share one look across the three shapes, and carry: no border; no
    text other than the game's title ("New", "Updated", "Play now" are out); no
    icon or store logo; no visual the developer has no right to use; nothing
    blurry or pixelated. A cover need not be a screenshot, but `Q-AES-4` and
    `Q-AES-5` of the quality standard still hold: it must not promise a
    different game.
  - **Videos** show play, or animation that represents the play without
    misleading, for 15 to 20 seconds, with none of: a black screen or
    a logo transition, black bars top and bottom, the default mouse cursor,
    "Play now" or other promotional text, app or social-media icons,
    fast-forwarding (CrazyGames speeds the video up slightly itself). Open on
    the static cover so the thumbnail runs into the preview.
  - Once the game is in Full Launch, new covers and videos can be A/B tested
    against the current ones before replacing them.
  [Cover and video requirements](https://docs.crazygames.com/requirements/game-covers/) ·
  [Artwork experiments](https://docs.crazygames.com/resources/artwork-experiments/)

The checklist records readiness and missing evidence. The account owner
uploads, submits, and reviews publication status in the Developer Portal.

## Optional SDK features

None of these is required. Each is cheap once the SDK is in.

- `loadingStart()` and `loadingStop()` around the game's own loading, so
  CrazyGames can report load times and failures.
- `happytime()` on a rare achievement (a boss beaten, a high score). Not on
  every level: the celebration is meant to stay special.
- `reportGameCompletedPercentage()` as the player advances, and 100 at a
  meaningful end. An endless game defines its own 100 and keeps to it.
- `setGameContext()` with the level or state the player is in, so feedback sent
  from the site says where they were. Clear it when it stops being true.

[SDK game module](https://docs.crazygames.com/sdk/game/)

## Brand assets

The Developer Portal's Assets page offers the CrazyGames logo (horizontal and
stacked, black and white), the mascot Ziggy in five poses, and an animated logo
on four backgrounds, for use in a game or its marketing. Using them is optional.
They do not belong on a cover (no icon or store logo) or in a preview video (no
logo transition), so their place is inside the game or in marketing elsewhere.
[Assets](https://developer.crazygames.com/assets) (sign-in required)
