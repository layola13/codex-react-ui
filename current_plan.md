# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Completed Slice

Implemented compact expandable tool audit details for the virtualized chat waterfall.

1. Tool audit rendering:
   - Tool rows now show a compact audit header and summary chips by default.
   - Arguments, results, text, and payload-derived details are hidden behind a `Details` toggle.
   - Expanded details continue to use the existing structured payload renderer.
2. Virtualized state:
   - Tool detail expansion reuses `ChatWaterfall` row expansion state.
   - Expanded tool details persist after virtualized unmount/remount.
3. Verification:
   - Playwright injects an MCP tool payload into a long transcript, finds it through Tools-scope search, verifies the payload detail is hidden by default, expands it, jumps away, returns, and confirms the details remained expanded.
   - Latest verification passed web/full typecheck, build, focused waterfall/theme/parallel-agent e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

Implemented inline completed-thinking expansion for the virtualized chat waterfall.

1. Completed reasoning rendering:
   - Assistant rows now expose completed reasoning through an inline Thinking panel.
   - The panel renders Markdown in a lightweight surface above the assistant answer.
   - The Thinking control toggles the inline panel directly.
2. Virtualized state:
   - Completed-thinking expansion reuses `ChatWaterfall` row expansion state.
   - Expanded Thinking panels persist after virtualized unmount/remount.
   - Row normalization now corrects live prepend item order before reasoning attachment.
3. Verification:
   - Playwright injects completed reasoning into a long transcript, expands the inline panel, jumps away, returns through search, and confirms the panel remained expanded.
   - Latest verification passed web/full typecheck, build, focused waterfall/parallel-agent e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

Implemented persistent command audit expansion for the virtualized chat waterfall.

1. Command audit rendering:
   - Long command execution output collapses by default to a terminal preview.
   - Command audit rows expose `Show full` and `Collapse` controls for long output.
   - Copy output continues to copy the full command output, not just the preview.
2. Virtualized expansion state:
   - Expanded row state is owned by `ChatWaterfall` instead of individual row components.
   - Expansion state is keyed by stable row key and pruned when rows disappear.
   - Expanding/collapsing remeasures the virtualizer and realigns the row to reduce large-row scroll drift.
3. Verification:
   - Playwright injects an 80-line command output, verifies it starts collapsed, expands/collapses it, jumps away, returns through command-scope search, and confirms expanded state persisted after virtual unmount/remount.
   - Latest verification passed web/full typecheck, build, focused waterfall e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

Implemented a searchable prompt map for the virtualized chat waterfall.

1. Prompt map:
   - Added `ChatPromptMap` as a sticky prompt navigation overlay driven by existing prompt floor metadata.
   - Cmd/Ctrl+Shift+P opens the prompt map.
   - Prompt filtering matches both prompt text and prompt number.
2. Virtualized navigation:
   - Prompt map jumps call through the existing virtualizer row jump path.
   - Target prompt rows flash after landing, including prompts that were previously outside the mounted DOM window.
3. Verification:
   - Playwright injects 653 logical chat rows, filters the prompt map to prompt 220, jumps to that row, and verifies the virtualized target row is visible.
   - Latest verification passed web/full typecheck, build, focused waterfall e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

Implemented data-driven transcript search for the virtualized chat waterfall.

1. Search overlay:
   - Added `ChatSearchOverlay` with transcript input, result counts, Previous/Next controls, and scope filters.
   - Cmd/Ctrl+Shift+F opens the overlay without relying on browser DOM search.
   - Scopes include All, User, Assistant, Tools, Files, and Commands.
2. Data model:
   - Search is driven by normalized `ChatWaterfallRow.searchText`, so unmounted virtual rows are searchable.
   - Results retain their source row index and jump through the virtualizer.
   - Result jumps reuse the existing row flash highlight.
3. Verification:
   - Playwright injects 653 logical chat rows, searches for an unmounted final assistant row, checks command-scope search, and verifies User scope excludes command output.
   - Latest verification passed web/full typecheck, build, focused waterfall search e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

Implemented desktop floor navigation for the virtualized chat waterfall.

1. Floor rail:
   - Added `ChatFloorRail` as a compact right-side desktop prompt rail inside the chat viewport.
   - User prompt rows provide floor metadata through `buildChatRows()`, so the rail is data-driven rather than DOM-driven.
   - Hover/focus expands the rail to show prompt previews while the collapsed state remains a narrow marker strip.
2. Navigation behavior:
   - The active floor follows the current visible prompt region.
   - Clicking a prompt floor jumps through the virtualizer to that row.
   - The target prompt flashes briefly after landing.
   - Jump to latest continues to work after prompt-floor navigation.
3. Verification:
   - Playwright injects 653 logical chat rows, verifies fewer than 80 DOM rows are mounted, checks floor rail visibility, jumps to prompt 150, and returns to the final answer with Jump to latest.
   - Latest verification passed web/full typecheck, build, focused waterfall navigation e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

Implemented the first chat waterfall redesign slice with row normalization, row-specific rendering, and virtual scrolling.

1. Architecture:
   - Added `apps/web/src/components/chat-waterfall/` with `ChatWaterfall`, `ChatRow`, `chatRows`, row types, and row size estimates.
   - `ChatPanel` remains the high-level container for goal, stats, slash notice, requests, empty state, and parallel agents.
   - Main and selected-agent transcripts now flow through `buildChatRows()` instead of a generic item stack.
2. Visual rows:
   - User prompts render as compact right-aligned bubbles.
   - Assistant prose is lighter and less card-heavy.
   - Tool, file, and command rows use dedicated wide audit surfaces; command rows keep terminal-style output and copy action.
   - Existing Markdown code-block behavior and Thinking dialog access are preserved.
3. Virtual scrolling:
   - Added `@tanstack/react-virtual` for the main waterfall.
   - The scroll viewport mounts only visible rows with overscan while force-including live/active reasoning rows.
   - Bottom-follow keeps live streams pinned when near the bottom, respects user scroll-away, and exposes Jump to latest for long transcripts.
4. Verification:
   - Playwright injects 653 logical chat rows, verifies fewer than 80 DOM rows are mounted, and confirms Jump to latest reaches the final answer.
   - Latest verification passed web/full typecheck, focused waterfall e2e, key workbench/slash/screenshot e2e, full `workbench.spec.ts` e2e (26/26), and `bun run build`.

## Previous Completed Slice

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
