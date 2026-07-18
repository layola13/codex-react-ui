# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Immediate Slice

The Settings/right-workspace separation slice is implemented and verified.

1. The main right runtime workspace is hidden by default and opens only from the top-right split-view control:
   - runtime tabs are `Side chat`, `Browser`, and `Terminal`
   - Settings content no longer mounts in the main right sidebar
   - sidechat still supports multiple isolated `/goal` windows and raw slash-command forwarding
2. Settings now owns configuration and management surfaces:
   - Codex Engine, Appearance, Layout, Session, Relay, Skills, Codex Plugins, Pet Dock, and Privacy stay inside the Settings drawer
   - Codex Plugins includes marketplace, installed mentions, hooks, apps/auth, and MCP controls
   - Workspace Files contains the file explorer/editor formerly hosted in the right inspector
   - Privacy contains UI profile import/export and dangerous permission audit records
3. Verification passed:
   - `pnpm --filter @codex-ui/web typecheck`
   - `pnpm test:e2e` (17/17 Chromium tests)
   - `pnpm --filter @codex-ui/web build`
4. Remaining release hygiene:
   - commit and push this slice

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

## Latest Verification

- `pnpm --filter @codex-ui/web typecheck`
- `pnpm test:e2e` (17/17 Chromium tests)
- `pnpm --filter @codex-ui/web build`

Full-suite verification is complete for the Settings/right-workspace separation slice.

## Detailed Remaining Work

1. Commit and push this slice.
