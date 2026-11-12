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
  videos (1080p landscape 16:9 and portrait 2:3). Each video is silent and
  at most 20 seconds and 50 MB. Check the current media instructions before
  submission.
  [Cover and video requirements](https://docs.crazygames.com/requirements/game-covers/)

The checklist records readiness and missing evidence. The account owner
uploads, submits, and reviews publication status in the Developer Portal.
