# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Completed Slice

Implemented the user theme background tuning slice so shared user themes can carry images, video, tuning, and dynamic background declarations without moving Settings into the right runtime workspace.

1. Keep user media vivid by default:
   - image/GIF and video themes default to full-strength background media
   - background overlay, tone overlay, and the future effects/glass layer default to transparent
   - workspace, hero, panel, and composer surfaces use tunable opacity/blur values instead of hard-coded heavy masks
2. Expand theme plugin portability:
   - `assets.appBackgroundVideo` stores MP4/WebM theme backgrounds
   - `layout.backgroundScene` stores declaration-based Canvas or Three.js loops
   - exported/imported JSON preserves media assets, opacity tuning, tone settings, and dynamic background declarations
3. Add Settings controls:
   - background image/GIF upload
   - MP4/WebM background video upload
   - background media strength, background overlay, effects layer, workspace surface, hero overlay, panel surface, glass blur, tone color, and tone opacity
   - Canvas/Three.js renderer, preset, color, speed, density, and opacity controls
4. Add verification:
   - Playwright covers user background switching, video persistence, import/export tuning, and dynamic scene rendering
   - screenshot evidence is refreshed for the applied theme and user background switching flows

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

- User theme background tuning verification:
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "uploaded background images and user theme switching"`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "user theme|uploaded background"`
  - `pnpm --filter @codex-ui/web build`
  - screenshot evidence: `snapshot/theme-plugin-applied.png`, `snapshot/user-theme-background-switching.png`

The user theme background tuning slice is implemented and verified.

## Remaining Slash Command Work

1. Decide which remaining TUI-only commands should get Web-native equivalents.
2. Add app-server-backed behavior before claiming full parity for commands such as `/rename`, `/review`, `/diff`, `/compact`, `/resume`, and `/new`.
3. Keep sidechat slash-shaped input unparsed so sidechat remains an isolated Codex thread surface.
