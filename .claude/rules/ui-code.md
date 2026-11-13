---
paths:
  - "src/ui/**"
  - "Assets/**/{UI,Ui,ui}/**/*.cs"
  - "Source/**/{UI,Ui,ui}/**/*.{h,cpp}"
---

# UI Code Rules

- UI must NEVER own or directly modify game state — display only, use commands/events to request changes
- All UI text must go through the localization system — no hardcoded user-facing strings
- Every interactive element works with every input method the game supports, and with each of them alone: keyboard/mouse, touch, gamepad, whichever the design names. A method the game does not support needs no code: do not add gamepad handling to a touch and keyboard web game
- On a web game, no UI action needs Escape or Ctrl/Cmd+W: the browser uses them (`Q-KEY-2` in `.claude/docs/game-quality-standard.md`). Escape may back out of a screen only when another supported input does the same (an on-screen control, or a key the browser does not reserve)
- Bind keys by physical position (`KeyboardEvent.code` on the web), and show the hint the player's layout gives for it (`Q-KEY-1`)
- All animations must be skippable and respect user motion/accessibility preferences
- UI sounds trigger through the audio event system, not directly
- UI must never block the game thread
- Scalable text and colorblind modes are mandatory, not optional
- Test all screens at minimum and maximum supported resolutions
