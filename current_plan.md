# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Completed Slice

Implemented the main-composer slash command router and first-class status surfaces for the commands the web workbench owns directly.

1. Route lightweight slash commands in the browser before `turn/start`:
   - `/fast` toggles fast mode and shows a lightning status badge near the top bar and composer
   - `/status`, `/stats`, and `/usage` open primary status/stats surfaces with token usage, model/provider, reasoning effort, permission mode, active goal, and mode flags
   - `/goal` sets, edits, pauses/resumes, clears, and displays the current objective
   - `/plan` enables plan mode, shows a plan marker, and lets `/plan <text>` send a plan-mode prompt
2. Keep heavyweight settings commands in Settings:
   - `/plugins`, `/mcp`, and `/hooks` keep opening Settings -> Codex Plugins tabs
   - `/theme`, `/pets`, `/statusline`, `/title`, `/model`, `/permissions`, and `/debug-config` route to Settings sections instead of the right runtime workspace
3. Preserve layout ownership:
   - right runtime workspace stays hidden by default and remains for Side chat, Browser, and Terminal only
   - Settings content remains in Settings
   - `/goal` content is sticky at the top of the chat area and does not scroll away with the transcript
4. Add verification:
   - Playwright coverage and screenshot evidence for `/fast`, `/status` or `/stats`, sticky `/goal`, and `/plan`
   - typecheck, focused Playwright, full workbench e2e, build, and diff checks before commit/push

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

- Slash-command status/goal/fast/plan verification:
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "fast status goal and plan"`
  - `pnpm --filter @codex-ui/web build`
  - screenshot evidence: `snapshot/slash-command-status-goal-plan.png`

The slash-command status/goal/fast/plan slice is implemented and verified.

## Remaining Slash Command Work

1. Decide which remaining TUI-only commands should get Web-native equivalents.
2. Add app-server-backed behavior before claiming full parity for commands such as `/rename`, `/review`, `/diff`, `/compact`, `/resume`, and `/new`.
3. Keep sidechat slash-shaped input unparsed so sidechat remains an isolated Codex thread surface.
