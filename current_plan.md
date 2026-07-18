# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Completed Slice

Implemented the Slash Command parity slice for the main Web composer while keeping sidechat slash-shaped text isolated and unparsed.

1. Keep the existing browser-owned commands:
   - `/fast` toggles fast mode and shows lightning badges near the top bar and composer
   - `/status`, `/stats`, and `/usage` show session/project token usage, model/provider, reasoning effort, permission mode, active goal, and mode flags
   - `/goal` owns the sticky top-of-chat goal bar with set/edit/pause/resume/complete/clear behavior
   - `/plan` toggles plan mode or sends `/plan <prompt>` as a plan-mode prompt without forwarding the slash prefix
2. Add app-server-backed Web-native commands:
   - `/review` calls `review/start` for uncommitted changes, branches, commits, custom instructions, inline reviews, and detached reviews
   - `/rename <name>` calls `thread/name/set` and keeps task tabs/history synchronized
   - `/diff` calls `gitDiffToRemote` and shows an in-workbench diff preview
   - `/compact` calls `thread/compact/start`
   - `/resume <thread-id>` calls `thread/resume` and reloads the selected thread
   - `/new`, `/new full`, and `/new danger` reuse the New Chat permission flow, with Danger Bypass still gated by confirmation
3. Add composer shortcuts and feedback:
   - command buttons for `/fast`, `/status`, `/goal`, `/plan`, `/review`, and `/rename` live next to the composer
   - a sticky slash command result panel reports review, rename, diff, compact, resume, and new-chat command outcomes
4. Add verification:
   - Playwright covers shortcut buttons and all Web-native slash RPC routes
   - screenshot evidence is refreshed at `snapshot/slash-command-status-goal-plan.png`

## Engineering Rules

- Browser talks only to the local Node service, never directly to Codex app-server.
- Local service binds to `127.0.0.1` and protects non-session APIs with a session token.
- Dangerous bypass mode is available but must require explicit confirmation and must not become a remembered default.
- Do not write API keys to Codex config; use keyring when available and process-memory env vars as fallback.
- Resolve provider model aliases before writing Codex config or starting turns, including short chained aliases such as `codex -> gpt-5.5 -> grok-4.5`.
- Generated Codex protocol files should be regenerated from the local Codex binary, not edited by hand.

## Current Baseline

The verified baseline for this landing target is:

- default workbench has no right runtime panel
- top-right split-view control opens the runtime workspace with Side chat, Browser, and Terminal
- all settings and management surfaces live in Settings, including plugins, MCP, hooks, skills, workspace files, profile import/export, and dangerous audit records
- `/plugins`, `/mcp`, and `/hooks` open Settings views and do not start a Codex turn
- remaining TUI-only slash commands are intentionally not claimed as full Web parity unless this repo has a Web-native affordance or app-server RPC for them

## Latest Verification

- Slash command parity verification:
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "routes main slash commands"`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts` (22/22 Chromium tests)
  - `pnpm --filter @codex-ui/web build`
  - screenshot evidence: `snapshot/slash-command-status-goal-plan.png`

The Slash Command parity slice is implemented and verified.

## Remaining Slash Command Work

1. Keep sidechat slash-shaped input unparsed so sidechat remains an isolated Codex thread surface.
2. Treat commands without app-server support as normal Codex prompt text until a real backend capability exists.
