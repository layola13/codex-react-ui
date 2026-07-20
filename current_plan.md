# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Completed Slice

Implemented Codex history management around app-server thread semantics.

1. History listing:
   - The history rail uses `thread/list` with active and archived pagination, all source kinds, recency sorting, and JSONL scan/repair enabled.
   - It no longer derives row identity from opaque rollout filenames.
2. Title and metadata handling:
   - Thread normalization preserves app-server metadata including `name`, `title`, `sessionId`, `cwd`, `source`, `threadSource`, `path`, `recencyAt`, and parent/fork fields.
   - Display titles prefer app-server `name`/title metadata, then rollout `preview`, then timestamp plus a short thread id.
3. Search and open:
   - History search sends app-server `searchTerm` and locally matches loaded rows by title, preview, cwd, provider, source, model, and id.
   - Selecting a history row or task tab calls `thread/resume` before `thread/read`.
   - History rows support inline rename plus archive/delete through app-server thread RPCs.
   - Archive/delete remove rows from cached and visible history immediately; delete notifications also clear cached turns.
4. Verification:
   - Playwright covers history metadata search, title precedence, resume on selection, and row rename/archive/delete operations.
   - Latest verification passed focused history e2e, slash/new-chat regression e2e, full `workbench.spec.ts` e2e (25/25), `bun run typecheck`, and `bun run build`.

## Previous Completed Slice

Implemented ZIP-based user theme portability while preserving existing JSON theme import/export compatibility.

1. Theme ZIP export:
   - Settings -> Appearance now offers `Export ZIP` next to the existing JSON export.
   - The ZIP contains a root `theme.json` manifest and local data URL media extracted into `assets/`.
   - Remote theme asset URLs remain as URLs in `theme.json`.
2. Theme ZIP import:
   - `.zip` imports read root `theme.json`, validate relative asset paths, restore packaged image/video assets as safe data URLs, and reuse the existing theme normalizer.
   - Existing `.json` imports still work through the original compatibility path.
3. Verification:
   - The uploaded-background/theme-switching Playwright test now checks ZIP download contents and ZIP import save behavior.
   - Latest verification passed `bun --filter @codex-ui/web typecheck`, the focused Playwright theme test, `bun run typecheck`, and `bun run build`.

## Previous Completed Slice

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
- `/new danger` follow-up verification:
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "routes /new danger through the danger confirmation flow"`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "routes main slash commands|routes /new danger through the danger confirmation flow"`
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm --filter @codex-ui/web build`
- Codex config schema follow-up verification:
  - `pnpm sync:codex-config-schema`
  - `pnpm check:codex-config-schema`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "shows dangerous permission audit records|saves skill extra roots|uses installed-only plugin mentions|browses and edits files|keeps workspace files explorer|runs terminal commands|matches desktop and mobile workbench screenshots"`
- Playwright stability verification:
  - Playwright now runs the managed web server through `pnpm --filter @codex-ui/web build && pnpm --filter @codex-ui/web preview`.
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts` (23/23 Chromium tests)

The Slash Command parity slice is implemented and verified.

## Remaining Slash Command Work

1. Keep sidechat slash-shaped input unparsed so sidechat remains an isolated Codex thread surface.
2. Treat commands without app-server support as normal Codex prompt text until a real backend capability exists.
