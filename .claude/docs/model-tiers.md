# Model Tier Assignment

Two model families do this studio's work, split by the kind of work:

- **Claude `opus`** does everything that talks to the user, plans, gets approval
  or reviews code.
- **OpenAI Codex** (`gpt-6.1-sol`) runs at effort `xhigh` to write game code and
  tests and to do the whole job of agents that neither talk to the user nor
  write code.
- **Asset generation** goes to Higgsfield, ElevenLabs, Codex image generation
  and Blender (`/asset-generate`).

| Work | Runs on | Set in |
|---|---|---|
| 73 skills | Claude `opus` | the skill's `model:` |
| `/help`, `/scope-check`, `/sprint-status` | Claude `haiku` | the skill's `model:` |
| 16 reviewer agents | Claude `opus` | the agent's `model:` |
| 10 code-writing agents: asking, planning, approval | Claude `opus` | the agent's `model:` |
| Writing game code and tests | Codex `gpt-6.1-sol`, effort `xhigh` | `.claude/docs/codex-handoff.md` |
| 23 Codex proxy agents: the job | Codex `gpt-6.1-sol`, effort `xhigh` | the `--effort` in the proxy section |
| 23 Codex proxy agents: the relay shell | Claude `opus` | the agent's `model:` |
| Images, 3D, audio | Higgsfield → Codex image / Blender / ElevenLabs → Higgsfield | `/asset-generate` |
| Concept images | Higgsfield → Codex image | `/concept-art` |

A tier is written as the alias `model:` takes, never a model ID. Claude Code
resolves each alias to the current model in that family on your provider. The
Codex model is `gpt-6.1-sol` unless `CODEX_MODEL` names another. The runner
requests Fast mode for this model on new jobs and resumes. Fast availability
depends on the account. Set `CODEX_FAST_MODE=0` to omit the Fast request.

## When a skill's `model:` is used — skills only

A skill's `model:` overrides the session model for the rest of the turn the
skill runs in. Your next prompt returns to the session model, so a skill that
stops to ask you something finishes on the session model after you answer.

| How the skill starts | Is `model:` used? |
|---|---|
| You type `/skill-name` in Manual (`default`) mode | Yes |
| You type `/skill-name` in auto mode | Yes, for a model auto mode supports. `haiku` is supported where it resolves to Haiku 5.5 (the Anthropic API). It is not where it resolves to Haiku 4.5 (Bedrock, Google Cloud, Foundry, Claude Platform on AWS); there the session keeps its model |
| Claude starts the skill itself, through the Skill tool | Not documented by Claude Code. Observed in this repo: the session model ran it |

Two things follow:

- **An `opus` skill costs more in a Sonnet session**, for its first turn.
- **The session model matters most.** Most skills here ask questions, and every
  turn after your first answer runs on the session model. Run the session on
  Opus to keep those turns on Opus.

**This does not apply to agents.** An agent's `model:` is a separate mechanism:
the agent is spawned as its own session. Claude Code applies it second in the
subagent model order, after a `model` Claude passes for one invocation. No skill
here passes one.

## Agents

**Claude `opus`, reviewers (16).** These review code that Codex wrote, so the
same model does not grade its own work. The three primary engine specialists
also spawn their sub-specialists with the Agent tool, which a Codex job cannot
use.
- `lead-programmer`
- `godot-specialist`, `unity-specialist`, `unreal-specialist`
- the 12 engine sub-specialists: `godot-csharp-`, `godot-gdextension-`,
  `godot-gdscript-`, `godot-shader-`, `ue-blueprint-`, `ue-gas-`,
  `ue-replication-`, `ue-umg-`, `unity-addressables-`, `unity-dots-`,
  `unity-shader-` and `unity-ui-specialist`

`lead-programmer` hands any implementation (`/day-one-patch`) to Codex.

**Claude `opus`, code writers (10).** They ask, plan and get approval in Claude.
The files themselves are written by Codex at `xhigh`
(`.claude/docs/codex-handoff.md`, the "Code is written by Codex" section at the
top of each file).
- `engine-programmer`, `gameplay-programmer`, `ai-programmer`, `ui-programmer`,
  `network-programmer`, `tools-programmer`
- `prototyper`, `technical-artist`, `qa-tester`, `security-engineer`

**Codex proxies (23).** Codex does the whole job at `xhigh`, with the role text as
its brief. The Claude agent only relays the request and the answer, word for
word, through `.claude/scripts/codex-run.sh`. A question Codex needs answered
comes back as a `QUESTION:` block. The caller puts it to the user, and the proxy
resumes the same Codex session with the answer.
- **Design:** `creative-director`, `technical-director`, `producer`,
  `art-director`, `audio-director`, `narrative-director`, `game-designer`,
  `systems-designer`, `level-designer`, `economy-designer`, `ux-designer`,
  `world-builder`, `writer`, `sound-designer`
- **QA and accessibility:** `qa-lead`, `accessibility-specialist`
- **Operations:** `performance-analyst`, `analytics-engineer`,
  `localization-lead`, `live-ops-designer`, `community-manager`,
  `release-manager`, `devops-engineer`

`devops-engineer` and `release-manager` start Codex with `--network`. Every other
proxy runs with the sandbox's network off. Codex's own web search works either
way.

The text between `<!-- claude-only:start -->` and `<!-- claude-only:end -->` in
an agent file is for Claude only. `codex-run.sh` leaves it out of what it sends
to Codex.

## What a Codex job does and does not get

- **It gets:**
  - `.claude/codex/preamble.md`, which points it at `CLAUDE.md` and its imports;
  - the role text;
  - the agent's `.claude/agent-memory/<agent>/MEMORY.md`, if present;
  - the paths of the agent's preloaded skills;
  - the brief.
- **Its environment:** the user's `~/.codex/config.toml` is ignored. It runs in
  the `workspace-write` sandbox rooted at the project.
- **It does not get Claude Code's hooks, deny rules or path-scoped rules.**
  `codex-run.sh report` runs `.claude/scripts/write-guard.sh` on every file it
  changed instead, and lists those files.
- **It cannot spawn Claude agents or use Claude Code's connectors.** ElevenLabs
  is a Claude connector, so audio generation runs in the main session
  (`/asset-generate`).

## Authoring rule

- **New skill:** `model: opus`. Use `haiku` only if it only reads and formats,
  asks nothing and writes nothing.
- **New agent that writes game code or tests:** `model: opus`, plus the "Code is
  written by Codex" section.
- **New agent that reviews code:** `model: opus`.
- **Any other new agent:** a Codex proxy. Copy the proxy section from an
  existing proxy, change the name and keep `--effort xhigh`. Its frontmatter is
  `model: opus`, `tools: Read, Glob, Grep, Write, Bash`, `maxTurns: 40`.
- Every skill and agent declares a tier.

## Pins and context windows

A pin gets that model's context window, whatever the session runs. A subagent
starts from the brief it is given, not the parent's conversation, so this only
matters when a brief is very large. To run every Claude subagent on the
session's model instead, add one line to `.claude/settings.local.json` (Claude
Code v2.1.257 or later):

```json
{ "env": { "CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "1" } }
```

It applies to every agent pin. A Codex proxy then relays on the session's model,
and Codex still does its job. `CLAUDE_CODE_SUBAGENT_MODEL` alone does not do
this: it applies only to agents that set no model of their own.
