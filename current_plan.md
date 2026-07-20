# Current Plan

## Direction

Build a local-first React + MUI facade for Codex CLI where Codex remains the execution engine and the browser UI manages configuration, conversation history, prompts, permissions, providers, tools, MCP, Skills, and Plugins.

## Completed Slice

Reduced command audit output to a one-line collapsed preview by default.

1. Command rows:
   - Multiline command output now collapses by default after the first line.
   - Remaining terminal output stays hidden until the user expands the row with `Show full`.
   - Collapsed output renders as a single visual line with overflow hidden.
   - Assistant avatars heartbeat while a response turn is live, then stop once the turn completes.
   - Assistant answer rows alternate plain and shallow gray/tinted backgrounds to separate consecutive replies.
   - Assistant answer rows show a per-answer start timestamp, including rows where repeated avatar/header chrome is hidden.
   - Assistant answer rows show per-turn usage when available: input tokens, output tokens, and output token/s.
   - Live assistant rows show first-token latency measured from turn start to the first answer delta.
   - Relay/channel settings now store model rates with input/cached/cache-write/output prices and multiplier defaulting to `1`.
   - Assistant answer headers show compact token/speed/cost summaries when token usage is available.
   - Assistant answer ending details are hidden by default and can be enabled from Settings -> Layout.
   - Conversation history rows show a total cost chip, with cumulative token details on hover when usage is available.
   - Jump to latest supports `Cmd/Ctrl+Shift+ArrowDown` and `Cmd/Ctrl+Shift+End` for PC keyboard navigation.
2. Virtualization:
   - Command row height estimates now assume compact collapsed output, so long terminal logs do not reserve large offscreen space.
3. Verification:
   - Playwright covers a long command row and verifies the second line and tail marker are hidden until expansion.
   - Playwright covers assistant avatar live-state heartbeat markers during and after an active answer.
   - Playwright verifies alternating assistant row tone markers in the long transcript.
   - Playwright verifies assistant start timestamps on live and virtualized transcript rows.
   - Playwright verifies live assistant token usage metadata after a token usage notification.
   - Playwright verifies live assistant first-token latency metadata.
   - Playwright verifies header usage summaries, default-hidden bottom detail rows, and history total cost chips.
   - Playwright verifies keyboard Jump to latest from a scrolled-away virtualized transcript.
   - Latest verification passed full typecheck, production build, and focused Working/virtualized transcript e2e.
   - Real-browser simulation used workspace `~/projects/` and prompt `详细评估sci工程`, with screenshots saved for working state, completed cost details, and relay rate settings.

## Previous Completed Slice

Fixed resumed/history thread follow-up turns using the wrong cwd after refresh.

1. Cwd resolution:
   - Added thread-aware cwd resolution in `App.tsx`.
   - Existing active threads now prefer their stored `thread.cwd` for `thread/resume`, `turn/start`, `/resume`, and sidechat follow-up turns.
   - New conversations still use the confirmed workspace cwd.
2. Reload behavior:
   - `thread/read` now syncs the workspace field from the loaded thread's cwd.
   - This prevents refreshed sessions from keeping the new-chat default `~/` when continuing an existing conversation.
3. Verification:
   - Playwright covers a history row with `cwd: /root/projects/indexed`, then verifies both resume and the next follow-up turn use that cwd.
   - Latest verification passed full typecheck, production build, and the focused history resume e2e.

## Previous Completed Slice

Implemented a Codex-style Working status indicator for unfinished chat turns.

1. Source alignment:
   - Indexed `/root/projects/codex` with the local `code-index` Rust engine.
   - Inspected Codex TUI `StatusIndicatorWidget` and chatwidget turn-runtime behavior.
   - Matched the core pattern: an unfinished task keeps showing `Working` even while individual messages, tools, or reasoning chunks change underneath.
2. Waterfall status:
   - Added a sticky bottom Working marquee to `ChatWaterfall`.
   - `ChatPanel` now derives working state from active in-progress/pending turns and live rows.
   - The primary visible label stays `Working`; reasoning, answer, command, tool, or file activity only appears as compact detail text.
   - The marquee matches the Codex-style status format with elapsed time, `esc`, background terminal count, `/ps`, and `/stop` hints.
   - Active unfinished turns keep the virtualized transcript scrolled to the latest row as new output arrives.
3. Status wording:
   - Suppressed user-visible `completed` status chips in chat rows, agent headers/tooltips, request monitor, sidechat, history, tool payloads, and terminal status chips.
   - Terminal completion now renders as `exit` / `exit <code>` instead of `completed`.
4. Verification:
   - Playwright covers a pending -> thinking -> answer -> turn-completed flow and asserts no visible `completed` label appears during the active chat.
   - Latest verification passed full typecheck, production build, and the focused Working/virtualized transcript/parallel agents e2e suite.

## Previous Completed Slice

Implemented dedicated compact file-change audit rows for the virtualized chat waterfall.

1. File audit rendering:
   - File changes now use `FileChangeRow` instead of the generic audit renderer.
   - Rows show primary file path, status, and multi-file count summaries by default.
   - Diff/details are hidden behind a `Details` toggle.
   - A copy-path action is available when a primary path exists.
2. Virtualized state:
   - File detail expansion reuses `ChatWaterfall` row expansion state.
   - Expanded file details persist after virtualized unmount/remount.
3. Verification:
   - Playwright injects a file-change payload into a long transcript, finds it through Files-scope search, verifies diff content is hidden by default, expands it, jumps away, returns, and confirms details remained expanded.
   - Latest verification passed web/full typecheck, build, focused waterfall/parallel-agent e2e, screenshot e2e, and full `workbench.spec.ts` e2e (26/26).

## Previous Completed Slice

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

## Membership & billing plan (active)

### Product model
- Prefer **application policy** over host Linux users / Docker-per-user (Phase 2 only if demanded).
- Admin vs member: config write, relay CRUD, member admin, system security — admin only.
- Members: own threads, workspace root only, use-only codex config, view masked relays, activate only `allowedProviderIds`.
- Credits: admin set/add/subtract; members blocked when balance ≤ 0 on turn gate; flat **0.01** debit per `turn/start` until token metering.

### Security (shipped)
1. Captcha on login/register (toggle)
2. Optional TOTP per user (system toggle)
3. Open registration toggle (always role=user)
4. Allowed relays per member

### Usage UI (shipped, Sub2API-inspired)
- Stats: balance, spent, topped-up, turns, today spend
- Charts: daily debit/credit bars, by-operation bars, admin top spenders
- Ledger table + admin recharge form

### Next
- Token-based cost from usage notifications
- Optional CSV export of ledger
- Optional force-admin-TOTP hard block

### Password & concurrency (shipped)
- Members change own password with animated captcha (Security settings).
- Admin configures per-user concurrency; server enforces concurrent `turn/start` slots.

### Member–relay assignment (shipped)
- Admin assigns which relays a member may use at create and edit time.

### Launch plugins (shipped)
- Remind users to install [code-launch](https://github.com/layola13/code-launch) for Chat Completions-only relays; list sibling `*-launch` adapters.

### Multi-engine roadmap (planned)
1. **Now**: Settings → **启动器适配** catalogs all `https://github.com/layola13/xxxxx-launch`; chat engine fixed to **Codex**.
2. **Next**: Switchable engines in UI — agy, auggie, claude, crush, grok, gemini (Chat Completions) using their *-launch proxies, same relay + membership.
3. **Default** remains Codex (Responses + code-launch when needed).

### Arena mode (竞技场) — planned, after multi-engine

Product intent: fan **one prompt** to **multiple engines / sessions in parallel**, compare answers side-by-side, then pick a winner (merge / continue). Inspired by desktop orchestrators like [Orca](https://github.com/stablyai/orca) (parallel agents + worktrees), but stays **Web + Bun bridge** — do **not** fork Electron.

| Phase | Goal | Depends on |
| --- | --- | --- |
| A. Shell | Arena layout: 2–N columns/cards, shared prompt bar, per-engine status | Multi-engine chat (or multi Codex threads first) |
| B. Multi-Codex arena | Same Codex engine, N isolated threads (different model/relay/permission) | Existing app-server threads + concurrency limits |
| C. Cross-engine arena | Codex + agy/claude/… each via `*-launch` | Multi-engine chat + launch adapters |
| D. Isolation (optional) | Per-arena git worktree or member workspace subdir | Git tooling / membership jail |
| E. Compare UX | Diff answers, “promote winner” into main chat, debit N× turns | Usage/billing |

Rules of engagement:
- **Membership**: each arena slot counts against user concurrency and balance (N slots = N concurrent turns when all run).
- **Relay ACL**: each slot only uses engines/relays the member is allowed to use.
- **Default engine** remains Codex; arena is opt-in from composer or a dedicated Arena entry.
- **Reference only** for Orca: UX patterns (parallel status, notify when done) — not runtime code.

Out of scope for v1 arena: full VS Code editor, mobile companion, SSH remote worktrees (Orca desktop features).

