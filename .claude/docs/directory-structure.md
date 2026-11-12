# Directory Structure

```text
/
├── CLAUDE.md                    # Master configuration
├── project.yaml                 # Machine-readable project config — engine, modes, stage (source of truth)
├── .claude/                     # Agent definitions, skills, hooks, rules, docs
├── <code root>/                 # Game source code — THE PATH IS ENGINE-SPECIFIC, see below
├── assets/                      # Game assets (art, audio, vfx, shaders, data)
├── design/                      # Game design documents (gdd, narrative, levels, balance)
├── docs/                        # Technical documentation (architecture, api, postmortems)
│   └── engine-reference/        # Curated engine API snapshots (version-pinned)
├── tests/                       # Game test suites (unit, integration, performance, playtest)
├── tools/                       # Build and pipeline tools (ci, build, asset-pipeline)
├── prototypes/                  # Throwaway prototypes (outside the code root)
├── production/                  # Production management (sprints, milestones, releases)
│   ├── session-state/           # Ephemeral session state (active.md — gitignored)
│   └── session-logs/            # Session audit trail (gitignored)
└── studio-tests/                # QA for the skills/agents themselves — /skill-test, /skill-improve
```

## The code root is engine-specific

Unity and Unreal require their own project roots to discover game code:

| `engine.name` | Code root | Why it cannot be `src/` |
|---|---|---|
| **Godot** | `src/` | No constraint — Godot loads from `res://` anywhere under the project root. |
| **Phaser** | `src/` | The Vite starter imports TypeScript and CSS from `src/`. |
| **Unity** | `Assets/` | Unity compiles **only** `Assets/` and `Packages/`. Code outside them is invisible to the compiler. |
| **Unreal** | `Source/<Module>/` | UnrealBuildTool discovers modules under `Source/`; content lives in `Content/`. A module elsewhere is not built. |

**Resolve the code root from `engine.name` before writing any source file.** A
path shown as `src/…` in an engine-neutral skill means *the code root* from
the table above.

**Tests follow the same rule** — the same compilers decide what they see:

| `engine.name` | Test root | Anywhere else |
|---|---|---|
| **Godot** | `tests/unit/`, `tests/integration/` | — |
| **Phaser** | `tests/` | test discovery is set by the project's own runner |
| **Unity** | `Assets/Tests/EditMode/`, `Assets/Tests/PlayMode/` | not compiled: "0 tests, Passed" |
| **Unreal** | `Source/<Module>/Private/Tests/` | not built: "No automation tests matched" |

Read `tests/unit/[system]/` (or `integration/`) anywhere as the test root plus `[System]/`.
