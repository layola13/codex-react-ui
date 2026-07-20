# Progress

## 2026-07-20

- Command audit one-line preview slice:
  - Changed command execution rows so multiline command output defaults to a single-line preview.
  - Hidden all remaining terminal output behind the existing `Show full` expansion control.
  - Reduced command row virtualized height estimates so long command output no longer reserves oversized space while collapsed.
  - Added Playwright coverage confirming long command output hides the second line and tail marker until expanded.
  - Added assistant avatar heartbeat animation while an answer turn is live, with Playwright coverage that verifies the live marker stops after completion.
  - Added alternating assistant answer row backgrounds so consecutive model replies use plain/tinted shallow backgrounds for visual separation.
  - Added per-answer assistant start timestamps in `HH:mm` format, including repeated assistant rows where the avatar/header is hidden.
  - Added per-answer token usage metadata when Codex emits usage for a turn: input tokens, output tokens, and output token/s.
  - Added live first-token latency metadata measured from turn start to the first assistant message delta.
  - Added relay/channel model rate settings with multiplier defaulting to `1`.
  - Seeded OpenAI-style GPT-5.5 and GPT-5.4 input/cached/cache-write/output default rates for cost estimation.
  - Added per-answer usage details after the answer body: input/output tokens, cached/read cache tokens, cache write tokens, cache hit rate, speed, cost line items, and total cost.
  - Changed the bottom assistant usage detail row to be hidden by default behind a Settings -> Layout toggle, because the answer header already shows the compact summary.
  - Added total cost chips to conversation history rows, with hover details for cumulative token usage when available.
  - Added `Cmd/Ctrl+Shift+ArrowDown` and `Cmd/Ctrl+Shift+End` shortcuts for Jump to latest in the virtualized waterfall.
  - Simulated a real task with workspace `~/projects/` and prompt `详细评估sci工程`.
  - Captured screenshot evidence:
    - `snapshot/sci-evaluation-working-cost-ui.png`
    - `snapshot/sci-evaluation-completed-cost-ui.png`
    - `snapshot/sci-evaluation-rate-settings.png`
  - Verification passed:
    - `bun run typecheck`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "shows working status"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "shows working status|virtualizes long main chat"`
    - `bun run build`

- Resumed-thread cwd follow-up fix:
  - Fixed history/resume and follow-up turn requests to prefer the active thread's stored `cwd` over the current/default workspace field.
  - `thread/read` now syncs the workspace field from `thread.cwd`, so refreshed or reloaded conversations do not keep using the new-chat default `~/`.
  - Applied the same cwd resolution to `/resume` and sidechat follow-up turns.
  - Added Playwright coverage that resumes a history row with `cwd: /root/projects/indexed` and verifies both `thread/resume` and the next `turn/start` use that cwd.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "searches Codex history"`

- Chat waterfall Working status slice:
  - Used the local `code-index` Rust engine to index `/root/projects/codex` and inspect the TUI status implementation.
  - Matched the Codex TUI pattern: an unfinished turn keeps a visible `Working` status indicator while the model is waiting, thinking, streaming, running tools, or running commands.
  - Added a sticky bottom Working marquee to the virtualized waterfall so users can tell a turn is still active even when the latest row has not produced visible output.
  - Updated the marquee to the Codex-style format: `Working (<elapsed> • esc to interrupt) · <n> background terminals running · /ps to view · /stop to interrupt`.
  - Added a masked marquee animation and automatic follow-to-bottom behavior while an unfinished turn is still producing output.
  - Kept the primary status label as `Working`; reasoning/tool/command/answer text is shown only as detail, not as a misleading terminal state.
  - Suppressed user-visible `completed` status chips across chat rows, agent headers/tooltips, request monitor, sidechat turns, history rows, tool payload chips, and terminal status chips.
  - Added Playwright coverage for a pending -> thinking -> answer -> turn-completed flow, including a no-visible-`completed` assertion.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "shows working status"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "shows working status|shows parallel agents rail|virtualizes long main chat"`

- Chat waterfall file audit details slice:
  - Added a dedicated `FileChangeRow` instead of rendering file changes through the generic audit row.
  - File changes now show compact path/status/change-count summaries by default.
  - Diff/details stay hidden behind a `Details` toggle and reuse `ChatWaterfall` expansion state across virtualized unmount/remount.
  - Added a copy-path action for file change rows when a primary path is available.
  - Extended the long transcript Playwright test with a file-change payload, Files-scope search, default collapsed-state checks, detail expansion, and persistence after jumping away and returning.
  - Hardened parallel-agent fallback naming so agent rail selection does not depend on child thread metadata arriving before collab tool rows.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "shows parallel agents rail"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall tool audit details slice:
  - Tool audit rows now default to a compact header plus server/tool/status/duration chips.
  - Arguments, results, row text, and payload-derived detail content are hidden behind a `Details` toggle.
  - Tool detail expansion reuses `ChatWaterfall` row expansion state, so expanded tool rows survive virtualized unmount/remount.
  - Extended the long transcript Playwright test with an MCP tool payload, Tools-scope data search, default collapsed-state checks, detail expansion, and persistence after jumping away and returning.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "supports uploaded background images|shows parallel agents rail"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall inline completed-thinking slice:
  - Completed assistant reasoning now expands inline from the Thinking control instead of being dialog-only.
  - Inline completed-thinking panels use the existing Markdown renderer and a lightweight surface above the assistant answer.
  - The same `ChatWaterfall` expansion state used by command audit rows preserves expanded Thinking panels across virtualized unmount/remount.
  - Row normalization now corrects live prepend item order when user messages appear after assistant messages, so reasoning buffers can attach to the following assistant row.
  - Extended the long transcript Playwright test with completed reasoning, inline expansion, and persistence after jumping away and returning through search.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|shows parallel agents rail"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall command audit expansion slice:
  - Long command execution output now collapses by default to a concise terminal preview.
  - Full command output can be expanded/collapsed from the audit row header while copy still targets the complete output.
  - Expanded row state is owned by `ChatWaterfall`, so it survives virtualized row unmount/remount.
  - Expansion toggles remeasure the virtualizer and realign the target row to avoid large-row scroll drift.
  - Extended the long transcript Playwright test with an 80-line command output, default collapsed-state checks, expansion/collapse checks, and persistence after jumping away and returning through search.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall prompt map slice:
  - Added a searchable prompt map on top of the virtualized waterfall using existing prompt floor metadata.
  - Cmd/Ctrl+Shift+P opens the prompt map; filtering matches prompt text and prompt number.
  - Prompt map jumps reuse the virtualizer and row flash behavior, so filtered prompts outside the mounted DOM window can be reached directly.
  - Extended the long transcript Playwright test to filter for prompt 220 and verify the target virtual row becomes visible.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall data-driven search slice:
  - Added `ChatSearchOverlay` for transcript search on top of the virtualized waterfall.
  - Search operates over normalized `ChatWaterfallRow.searchText`, so it can find rows outside the mounted DOM window.
  - Added keyboard access via Cmd/Ctrl+Shift+F, result count, previous/next navigation, and scope filters for All, User, Assistant, Tools, Files, and Commands.
  - Search result jumps use the virtualizer and reuse row flash highlighting for a clear landing target.
  - Extended the long transcript Playwright test to search for an unmounted final assistant row, verify command-scope search, and verify User scope excludes command output.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall floor navigation slice:
  - Added `ChatFloorRail` for desktop prompt-floor navigation on top of the virtualized waterfall.
  - Reused `ChatWaterfallRow.floor` metadata so user prompts become clickable floor markers without DOM scanning.
  - The rail stays compact by default, expands on hover/focus to show prompt previews, tracks the active prompt floor, and jumps through the virtualizer to the selected prompt.
  - Jumped prompt rows flash briefly so long-session navigation has a visible landing target.
  - Extended the long transcript Playwright test to prove floor rail visibility, prompt 150 jump behavior, virtualized row mounting, and Jump to latest.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun run build`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)

- Chat waterfall virtualization slice:
  - Added a dedicated `chat-waterfall` component folder with `ChatWaterfall`, `ChatRow`, `chatRows`, row types, and row size estimates.
  - Extracted transcript normalization into `buildChatRows()`, preserving reasoning attachment to the following assistant answer and active reasoning preview rows.
  - Added row-specific rendering: compact right-aligned user bubbles, lighter assistant prose, wide audit rows for tool/file/command output, terminal-style command rows, image attachment preservation, and Thinking dialog access.
  - Added `@tanstack/react-virtual` and made the main waterfall mount only the visible virtual window with overscan while force-including live rows.
  - Added bottom-follow behavior plus a Jump to latest control that respects user scroll-away and remains reliable on very long transcripts.
  - Added Playwright coverage that injects 653 logical chat rows, verifies the mounted DOM row count stays below 80, and proves Jump to latest reaches the final assistant answer.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun run typecheck`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "virtualizes long main chat"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "renders the workbench|virtualizes long main chat|routes main slash commands|matches desktop and mobile"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (26/26 Chromium tests)
    - `bun run build`

- Codex history management slice:
  - Reworked the history rail around Codex `thread/list` semantics instead of filename-derived labels, including non-state-only scan/repair, archived and active pagination, all source kinds, recency sorting, and app-server `searchTerm` where available.
  - Extended `ThreadEntry` parsing for app-server thread metadata: `name`, `title`, `sessionId`, `cwd`, `source`, `threadSource`, `path`, `recencyAt`, `forkedFromId`, and agent fields.
  - History titles now prefer app-server `name`/title metadata, then rollout `preview`, then timestamp plus short thread id.
  - Added a History search box that combines app-server title search with local matching over title, preview, cwd, provider, source, model, and id.
  - Opening a history row or task tab now calls `thread/resume` before `thread/read`, using the current model and permission context.
  - Added history row operations for inline rename, archive, and delete through `thread/name/set`, `thread/archive`, and `thread/delete`, keeping cached history, visible rows, and task tabs synchronized.
  - Added local notification handling for `thread/archived`, `thread/deleted`, and `thread/unarchived` so backend-pushed changes do not leave stale rows visible.
  - Updated thread start/read/name notification parsing so renamed or resumed threads keep title metadata synchronized.
  - Expanded Playwright coverage for history search, metadata title precedence, `thread/resume` on selection, and row rename/archive/delete operations.
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "searches Codex history"`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "routes main slash commands|routes /new danger through the danger confirmation flow"`
    - `bun test:e2e tests/e2e/workbench.spec.ts` (25/25 Chromium tests)
    - `bun run typecheck`
    - `bun run build`

- Theme portability ZIP slice:
  - Added Settings -> Appearance theme ZIP export alongside the existing JSON export. ZIP packages contain root `theme.json` plus extracted local media files under `assets/`.
  - Added theme ZIP import that reads `theme.json`, resolves relative image/video asset paths back into safe data URLs, preserves remote URLs as-is, and keeps existing `.theme.json` import compatibility.
  - Added browser-side ZIP read/write helpers for stored ZIP entries, including manifest validation, relative path safety checks, per-asset size limits, and support for deflated imports when the browser provides `DecompressionStream`.
  - Extended English and Chinese Settings theme labels for ZIP export and generic theme import.
  - Expanded the existing uploaded background/theme switching Playwright test to verify ZIP downloads contain `theme.json` plus media assets and that ZIP imports restore image/video asset fields before saving.
  - Refreshed screenshot evidence:
    - `snapshot/user-theme-background-switching.png`
  - Verification passed:
    - `bun --filter @codex-ui/web typecheck`
    - `bun test:e2e tests/e2e/workbench.spec.ts -g "supports uploaded background images and user theme switching"`
    - `bun run typecheck`
    - `bun run build`

## 2026-07-19

- Playwright verification stability follow-up:
  - Changed Playwright's managed web server from `vite dev` to `pnpm --filter @codex-ui/web build && pnpm --filter @codex-ui/web preview` so the long e2e suite runs against the production bundle instead of a hot-reload dev server.
  - This resolved the prior full-suite `ERR_CONNECTION_REFUSED` failure mode on later tests that appeared after the dev server exited mid-run.
  - Verification passed:
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts` (23/23 Chromium tests)

## 2026-07-19

- Schema and verification follow-up:
  - Re-synced `apps/web/src/state/codexConfigSchema.json` from `/root/projects/codex/codex-rs/core/config.schema.json` after `pnpm check:codex-config-schema` reported the bundled schema was stale.
  - Re-ran the schema gate and confirmed the bundled schema is current: 93 top-level settings.
  - Re-ran the full Playwright suite after the sync; the suite's first pass hit a transient `ERR_CONNECTION_REFUSED` on several later tests, but the affected tests passed when re-run individually, so the code change itself was not the failure source.
  - Verification passed:
    - `pnpm sync:codex-config-schema`
    - `pnpm check:codex-config-schema`
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "shows dangerous permission audit records|saves skill extra roots|uses installed-only plugin mentions|browses and edits files|keeps workspace files explorer|runs terminal commands|matches desktop and mobile workbench screenshots"`
    - `pnpm --filter @codex-ui/web build`

## 2026-07-19

- Slash Command parity follow-up:
  - Tightened the `/new danger` tab-selection behavior so opening the Danger Bypass confirmation from an existing thread presents the pending `New task` tab as selected and does not keep the previous thread tab visually active.
  - Updated the focused Playwright regression to assert the tab state while the confirmation dialog is open, before any `thread/start` or `turn/start` message is emitted.
  - Verification passed:
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "routes /new danger through the danger confirmation flow"`
    - `pnpm --filter @codex-ui/web typecheck`

## 2026-07-18

- Slash Command parity follow-up:
  - Added a focused Playwright regression for `/new danger` through the main composer slash router.
  - The test proves `/new danger` opens the existing Danger Bypass confirmation dialog, does not immediately create a new thread or turn before acknowledgement, and only sends `thread/start` plus `turn/start` with `approvalPolicy: "never"` and `dangerFullAccess` after confirmation.
  - Verification passed:
    - `npx pnpm@10.33.0 --filter @codex-ui/web typecheck`
    - `npx pnpm@10.33.0 exec playwright test tests/e2e/workbench.spec.ts -g "new danger|routes main slash commands" --list`
  - Browser execution of the focused Playwright tests is currently blocked by the host image missing Chromium system library `libatk-1.0.so.0`; `npx playwright install-deps chromium` cannot complete because sudo requires a password.

- Slash Command parity implementation:
  - Added composer-adjacent shortcut buttons for `/fast`, `/status`, `/goal`, `/plan`, `/review`, and `/rename`; command buttons route through the same parser as typed slash commands.
  - Added a sticky slash command result panel in the chat top status surface for Web-native command outcomes.
  - Implemented `/review` through `review/start`, with support for uncommitted changes, detached reviews, `branch <name>`, `commit <sha>`, and custom review instructions.
  - Implemented `/rename <name>` through `thread/name/set`, including local task-tab/history updates and `thread/name/updated` notification handling.
  - Implemented `/diff` through `gitDiffToRemote`, showing a bounded in-workbench diff preview instead of forwarding `/diff` as prompt text.
  - Implemented `/compact` through `thread/compact/start`.
  - Implemented `/resume <thread-id>` through `thread/resume`, reloading the selected thread after resume.
  - Implemented `/new` permission presets for fresh chats; `/new danger` still uses the existing Danger Bypass confirmation flow.
  - Kept sidechat slash-shaped text unparsed and isolated from browser-owned main-composer commands.
  - Extended Playwright mock app-server responses and coverage for shortcut buttons plus `/review`, `/rename`, `/diff`, `/compact`, `/resume`, and `/new`.
  - Verification passed:
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "routes main slash commands"`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts` (22/22 Chromium tests)
    - `pnpm --filter @codex-ui/web build`
  - Refreshed screenshot evidence:
    - `snapshot/slash-command-status-goal-plan.png`

- User theme background tuning implementation:
  - Added explicit theme visual tuning defaults so user-supplied background media uses a vivid low-mask presentation instead of a washed-out overlay.
  - Added a transparent-by-default effects/glass layer between background media and the UI shell for future glass effects without dimming the current background.
  - Extended theme plugin data with `assets.appBackgroundVideo`, surface opacity controls, blur strength, tone color/opacity, and declaration-based `layout.backgroundScene` support.
  - Added Settings -> Appearance controls for image/GIF backgrounds, MP4/WebM video backgrounds, background media strength, overlay opacity, effects layer opacity, workspace opacity, hero overlay opacity, panel opacity, glass blur, tone color, tone opacity, and Canvas/Three.js dynamic background presets.
  - Implemented background rendering for CSS image/GIF media, muted looping video media, declaration-based Canvas loops, and declaration-based Three.js loops without executing imported theme JavaScript.
  - Applied theme tuning to the shell background, workspace surfaces, empty-state hero, cards, and composer while keeping Settings out of the right runtime workspace.
  - Preserved theme portability: JSON export/import includes media assets, tuning fields, tone fields, and dynamic scene declarations so themes can be shared and installed by other users.
  - Refreshed screenshot evidence:
    - `snapshot/theme-plugin-applied.png`
    - `snapshot/user-theme-background-switching.png`
  - Verification passed:
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "uploaded background images and user theme switching"`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "user theme|uploaded background"`
    - `pnpm --filter @codex-ui/web build`

- Slash command status/goal/fast/plan implementation:
  - Added a main composer slash-command router for browser-owned commands while keeping sidechat slash-shaped input unparsed and isolated.
  - Implemented `/fast` with lightning badges in the top bar, chat status strip, and composer; fast mode lowers new main-chat turns to the lowest available reasoning effort.
  - Implemented `/status`, `/stats`, and `/usage` with a token/session/project stats panel showing thread/project token totals, model/provider, reasoning effort, permission mode, active modes, goal status, thread counts, and turn/item counts.
  - Implemented `/goal` backed by `thread/goal/set`, `thread/goal/get`, and `thread/goal/clear`, with a sticky top-of-chat goal bar supporting edit, pause/resume, complete, and clear controls.
  - Implemented `/plan` with a visible plan marker; `/plan <text>` sends only `<text>` as the Codex turn text.
  - Routed Settings-heavy commands into Settings instead of the right runtime workspace: `/plugins`, `/mcp`, `/hooks`, `/apps`, `/skills`, `/theme`, `/pet`, `/pets`, `/statusline`, `/title`, `/model`, `/permissions`, and `/debug-config`.
  - Added Playwright coverage for the slash-command flow and captured `snapshot/slash-command-status-goal-plan.png`.
  - Verification passed:
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "fast status goal and plan"`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts`
    - `pnpm --filter @codex-ui/web build`

- Slash command planning update:
  - Audited current Web support against the local Codex TUI command list.
  - Confirmed the main composer only intercepts exact `/plugins`, `/mcp`, and `/hooks`; other slash-shaped input currently falls through as normal Codex prompt text.
  - Confirmed sidechat intentionally preserves slash-shaped text and sends it to isolated threads without browser-side parsing.
  - Planned the next Web-owned command slice:
    - `/fast` toggles fast mode and shows a lightning marker near the top bar/composer
    - `/status` and `/stats` expose token/session/project stats, model/provider, reasoning effort, permission mode, goal, and mode flags
    - `/goal` owns a sticky top-of-chat goal bar that stays visible above the transcript while supporting set/edit/pause/resume/clear
    - `/plan` enables plan mode and shows a plan marker; `/plan <text>` sends the request in plan mode
    - heavyweight commands such as `/theme`, `/pets`, `/statusline`, `/plugins`, `/mcp`, and `/hooks` route into Settings, not the right runtime workspace
  - Updated `tasks.md` and `current_plan.md` to make the slash command status/goal/fast/plan slice the active plan.

- Current status snapshot:
  - The long-running settings/theme/tooling/files/terminal/profile/audit/image-input scope remains green after separating Settings from the right runtime workspace.
  - The main right runtime workspace is hidden by default; the top-right split-view control opens Side chat, Browser, and Terminal only.
  - Settings now owns Codex Plugins, MCP, hooks, Skills, Workspace Files, UI profile import/export, and dangerous permission audit records.
  - Settings -> Codex Plugins now uses real Codex tooling data instead of placeholder chips: marketplace plugins, installed mentions, hooks, plugin app auth, MCP inventory, MCP resource/tool actions, and `/plugins` plus `/mcp` plus `/hooks` composer entry points are wired.
  - The sidechat slice is implemented and verified: top-right entry point, right-side panel, fixed `+` affordance, multiple independent tabs, stable main-chat focus, raw slash-command forwarding, Playwright coverage, and screenshot evidence.
  - Sidechat reference assets remain under `snapshot/sidechat/`; the fresh implementation screenshot is `snapshot/sidechat-workbench.png`.
  - `/root/projects/material-kit-react/README.md` was rechecked during the slice; the sidechat UI stays on the existing Minimal UI / MUI surface language rather than introducing a separate visual system.
- Current repository/verification facts:
  - The sidechat implementation has passed verification and is pushed to `origin/main`.
  - `pnpm test:e2e` now runs 17 Chromium tests, including the focused sidechat and Codex plugin Settings regressions.
  - The Codex code index was rebuilt at `/root/projects/codex/.code_index` with the Rust engine: 3448 modules, 23596 functions, and 336100 edges.
- Completed feature areas that should not be regressed:
  - schema-driven Settings -> All config with 93 top-level Codex settings and nested/runtime key support
  - relay/channel management in Settings -> Relay with secret-free provider metadata and keyring-backed credentials
  - Settings-hosted Codex plugin management with hooks, MCP server inventory, installed plugin mentions, plugin app auth state, and UI slash entry points
  - System/Light/Dark theme cards plus built-in/custom theme plugin switching
  - draggable/resizable workbench panels, task tabs, right runtime workspace, pet dock settings, and Markdown chat rendering
  - MCP, Skills, Plugins, plugin mentions, MCP OAuth/resources, direct MCP tool calls, files/editor, terminal/process controls, profile import/export, and dangerous-permission audits
  - main-composer image attachments, including drag-and-drop, mixed text/image input, data URL submission, and practical byte limits instead of an arbitrary five-image count cap
- Codex plugin Settings implementation status:
  - Added a real `CodexPluginSettingsPanel` for Settings -> Codex Plugins.
  - Reused the live `plugin/list`, `plugin/installed`, `plugin/read`, `plugin/install`, `plugin/uninstall`, `plugin/skill/read`, `hooks/list`, `app/list`, `mcpServerStatus/list`, `config/mcpServer/reload`, `mcpServer/resource/read`, and `mcpServer/tool/call` flows already backed by app-server.
  - Added marketplace, installed, MCP, hooks, and apps tabs with search, install/uninstall, detail, mention insertion, hook metadata, app auth, MCP reload, OAuth, resource read, and direct tool-call controls.
  - Removed the previous Settings Plugins placeholder content and kept theme-plugin customization in Appearance.
  - Added main composer UI slash routing so exact `/plugins` opens Settings -> Codex Plugins marketplace, exact `/mcp` opens the MCP tab, and exact `/hooks` opens the Hooks tab; these commands do not send `turn/start`.
  - Verification passed:
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm --filter @codex-ui/web build`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "Codex plugins and MCP|uses installed-only plugin mentions|supports direct MCP tool calls"`
    - `pnpm test:e2e` (17/17 Chromium tests)
- Settings/right-workspace separation status:
  - Removed the default right inspector from the main workbench layout.
  - Added a hidden-by-default right runtime workspace with Side chat, Browser, and Terminal tabs, opened by the top-right split-view control.
  - Moved Skills, Workspace Files, UI profile import/export, and dangerous permission audit records into Settings.
  - Kept file browsing/editing through `fs/readDirectory`, `fs/readFile`, and `fs/writeFile` in Settings -> Workspace.
  - Kept PTY command execution, stdin, resize, and terminate controls in the right runtime workspace Terminal tab.
  - Refreshed Playwright screenshots for the default Settings drawer, right runtime workspace, themes, and Settings-hosted workspace files.
  - Verification passed:
    - `pnpm --filter @codex-ui/web typecheck`
    - `pnpm test:e2e` (17/17 Chromium tests)
    - `pnpm --filter @codex-ui/web build`
- Sidechat implementation status:
  - Sidechat now opens inside the right runtime workspace instead of a standalone inspector-adjacent panel.
  - Mounted `SideChatPanel` in the desktop right workspace and mobile stacked right workspace layout.
  - Kept each sidechat tab/window isolated with its own draft, optimistic local transcript, in-flight state, and Codex `threadId`; sidechat threads are filtered out of main task tabs/history and main-chat `ChatPanel` turns.
  - Preserved main-thread focus while `thread/started`, `turn/started`, deltas, and completions stream over the shared websocket.
  - Added a `preserveText` mode to `composerInputToUserInput` and used it only for sidechat so `/goal ...`, `/status ...`, and other command-shaped input are forwarded as exact text without a browser allow-list or rewrite.
  - Documented that sidechat is fully isolated from the main thread and that TUI-only commands still require app-server support for TUI-specific behavior.
  - Extended the Playwright mock websocket to generate unique thread IDs and emit turn notifications for separate sidechat threads.
  - Added Playwright coverage for opening sidechat, creating extra tabs/windows, sending multiple `/goal` messages plus another slash-shaped command, proving unique `threadId`s and transcript isolation.
  - Captured and inspected `snapshot/sidechat-workbench.png` against `snapshot/sidechat/屏幕截图 2026-07-18 153125.png` and the other sidechat references; the tab strip, fixed `+`, close controls, right-panel surface, and bottom composer now match the intended structure.
  - Verification passed:
    - `pnpm typecheck`
    - `pnpm --filter @codex-ui/web build`
    - `pnpm check:codex-config-schema`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "sidechat"`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting|supports drag and drop image attachments|sidechat"`
    - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "sidechat|matches desktop and mobile workbench screenshots"`
    - `pnpm test:e2e` (16/16 Chromium tests)

- Audited the "complete all settings" goal against the current Settings implementation.
- Added Playwright coverage that reads `apps/web/src/state/codexConfigSchema.json`, asserts the bundled Codex schema still has 93 top-level settings, recursively expands schema properties, opens Settings -> All config, and searches every generated keyPath to prove each setting is visible in the UI.
- Verified the new coverage directly:
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "exposes every bundled Codex schema setting"`
- Rebuilt the Codex source index at `/root/projects/codex/.code_index` with the Rust engine: 3448 modules, 23596 functions, and 336100 edges.
- Audited Codex image input handling:
  - app-server `turn/start` supports `image` data URLs and `localImage` paths; remote HTTP(S) image URLs are rejected.
  - Codex does not enforce a 5-image count cap in the input model.
  - data URL image processing uses per-image sanity and resize limits, including a 1GiB prompt-image input guard, default `auto/high` resize to 2048px and 2500 patches, and `original` resize limits of 6000px and 10000 patches.
- Added composer drag-and-drop image attachment support while preserving click-to-attach; the browser UI now guards by practical per-image/selected-total byte limits rather than a small count cap.
- Added Playwright coverage for dropping a PNG into the composer and verifying `turn/start.input` carries an `image` data URL with `detail: "auto"`.
- Re-ran the full Settings verification gate after adding the coverage:
  - `pnpm check:codex-config-schema`
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm --filter @codex-ui/web build`
  - `pnpm test:e2e` (14/14 Chromium tests)

- Moved third-party relay setup into Settings -> Relay:
  - Added a reference-style `Model Channels` page with a left service-provider list and a right `Add Channel` form.
  - Added saved-channel cards for provider kind, active/saved state, health, weight, supported model chips, model selection, and activation.
  - Kept relay API keys out of Codex config; provider credentials still flow through provider save/keyring handling.
- Added Settings -> Appearance theme mode cards for `System`, `Light`, and `Dark`, including real system-mode resolution through `prefers-color-scheme`.
- Reworked the right inspector Config tab into a companion/status surface with `Codex buddy`, contacts, profile import/export, dangerous permission audit, and account state after moving relay settings into Settings.
- Updated Playwright coverage for the new Settings relay flow, appearance cards, provider activation from Settings, and the right companion sidebar.
- Captured and inspected the requested verification screenshots in `/root/projects/snapshot`:
  - `07-right-companion-sidebar.png`
  - `08-settings-appearance-theme-cards.png`
  - `09-settings-relay-model-channels.png`
  - `10-settings-relay-saved-channels.png`
- Re-ran verification during the slice:
  - `pnpm check:codex-config-schema`
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm --filter @codex-ui/web build`
  - `pnpm exec playwright test tests/e2e/workbench.spec.ts -g "captures relay settings saved channel cards"`
  - `pnpm test:e2e` (13/13 Chromium tests)

- Added full Codex config coverage in Settings by vendoring `/root/projects/codex/codex-rs/core/config.schema.json` into the web app as the dynamic field source.
- Added `scripts/sync-codex-config-schema.mjs` with `pnpm check:codex-config-schema` and `pnpm sync:codex-config-schema` so the bundled UI schema can be verified or refreshed from the local Codex repo.
- Verified the bundled UI schema matches `/root/projects/codex/codex-rs/core/config.schema.json`: 93 top-level settings, 0 missing keys, 0 extra keys.
- Preserved the existing Quick settings section for common engine fields while adding a searchable All config mode generated from the Codex JSON schema.
- Added dynamic controls for booleans, numbers, strings, enums, text areas, object/array JSON editors, nested schema properties, and runtime keys returned by `config/read` but absent from the bundled schema.
- Extended config state to retain the raw `config/read` object and apply optimistic writes to arbitrary nested key paths.
- Extended Codex config writes so schema/runtime fields persist through `config/batchWrite` with `reloadUserConfig`, including nested paths such as `history.max_bytes`.
- Expanded Playwright coverage to verify All config rendering, schema source labeling, top-level JSON object edits, nested numeric edits, and runtime key display.
- Re-ran and passed verification:
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm --filter @codex-ui/web build`
  - `pnpm check:codex-config-schema`
  - `pnpm exec playwright install chromium`
  - `pnpm test:e2e` (13/13 Chromium tests)
- Inspected the updated Settings screenshot `snapshot/codex-ui-settings-open.png`; the dynamic All config panel fits the existing dark theme layout without visible overlap.

- Started the Stitch/Material Kit visual alignment slice.
- Reviewed the referenced Stitch HTML/screenshots under `snapshot/参考/stitch_react_mui_interface_design`, with `codex_1` as the primary layout reference and the rest used for shared tokens.
- Confirmed recurring reference traits: `surface-container` color layering, translucent panels, compact left navigation, rounded-lg/xl/full controls, Plus Jakarta Sans/Manrope/JetBrains Mono typography, and low-contrast outlines.
- Confirmed Playwright is available through `pnpm exec playwright --version`; browser runtime validation and screenshot comparison are still pending.
- Began migrating the workbench shell toward a centered translucent MUI workbench container with safer viewport padding, atmospheric surface background, and theme-aware panel layers.
- Completed a Material Kit-style theme architecture under `apps/web/src/theme/`, including provider, create-theme entry point, core palette/typography/components/shadows, and MUI `customShadows` type augmentation.
- Reworked the main Codex workbench into a translucent rounded shell with a compact top bar, horizontal task strip, left conversation rail, fluid chat panel, right inspector, and theme-aware composer surface.
- Restyled the major panels to match the Stitch references: compact sidebar list items, subtle surface-container layering, low-contrast outlines, 8px component radius, and Plus Jakarta Sans/Manrope/JetBrains Mono typography.
- Added Playwright screenshot coverage for `Atmospheric Codex` and `Official Black` theme switching in addition to desktop and mobile workbench baselines.
- Ran `pnpm exec playwright install chromium`; Chromium runtime is installed.
- Verified the visual/theme slice:
  - `pnpm --filter @codex-ui/web typecheck`
  - `pnpm --filter @codex-ui/web build`
  - `pnpm test:e2e` (13/13 Chromium tests)
- Visually inspected generated screenshots against `snapshot/参考/stitch_react_mui_interface_design/codex_1/screen.png`; the Atmospheric Codex theme now matches the reference direction with deep green primary controls, pale green surfaces, translucent rounded panels, compact navigation, and low-contrast outlines while preserving the existing Codex workbench feature set.
- Created local commit `Align workbench theme with Stitch references`.
- Confirmed the local SSH key authenticates to GitHub as `layola13`; pushed `main` through the SSH remote URL after HTTPS push lacked username/token credentials.

## 2026-07-16

- Created an independent monorepo at `/root/projects/codex-react-ui`.
- Added packages:
  - `packages/shared` for JSON-RPC, permission, provider, and UI state contracts.
  - `packages/codex-protocol` with generated Codex app-server TypeScript protocol and JSON schema.
  - `apps/server` for the localhost-only Fastify/WebSocket bridge.
  - `apps/web` for the React + MUI workbench.
- Implemented Codex bridge startup over `codex app-server --stdio`.
- Added token-protected local HTTP/WebSocket API.
- Added account/model/thread bootstrap RPC calls.
- Added permission presets, including explicit high-risk bypass confirmation.
- Added provider save/activate flow for official and third-party Responses-compatible providers.
- Added history loading through `thread/read(includeTurns=true)`.
- Added composer image attachment support using Codex `UserInput` image blocks.
- Verified `pnpm typecheck` after the history/image implementation.
- Initialized Git repository on branch `main`.
- Added right-side MCP tooling backed by `mcpServerStatus/list` and `config/mcpServer/reload`.
- Added right-side Skills tooling backed by `skills/list`, `skills/config/write`, and `skills/changed` refresh handling.
- Added right-side Plugins tooling backed by `plugin/list`, `plugin/install`, and `plugin/uninstall` across local, workspace, and remote marketplace kinds.
- Preserved pending approval handling at the top of the Tools panel while adding MCP, Skills, and Plugins sub-tabs.
- Added plugin detail loading through `plugin/read`, remote plugin skill preview through `plugin/skill/read`, and composer mention insertion using `mention` input blocks.
- Added MCP OAuth launch through `mcpServer/oauth/login` and MCP resource preview through `mcpServer/resource/read`.
- Installed `@playwright/test` and added a mocked WebSocket workbench/tooling smoke test that does not require a live Codex engine.
- Installed the Playwright Chromium runtime and system dependencies; the workbench/tooling E2E smoke test passes in Chromium.
- Added system keyring persistence for provider API keys with process-memory fallback when the native keyring is unavailable.
- Kept provider metadata secret-free by storing only env-key refs, key previews, and storage status in `~/.codex-react-ui/providers.json`.
- Added provider model aliases to the active model picker and resolve chained aliases before `provider.activate`, `thread/start`, and `turn/start`.
- Added Playwright coverage for a chained `codex -> gpt-5.5 -> grok-4.5` relay alias before starting a turn.
- Tested the three requested hubproxy env files without printing secrets:
  - `/root/projects/hubproxy/.env_jz`: `/models`, `/responses`, and `/chat/completions` all returned HTTP 200 using `gpt-5.5`.
  - `/root/projects/hubproxy/.env_grok`: alias resolution maps `codex` through `gpt-5.5` to `grok-4.5`; `/models`, `/responses`, and `/chat/completions` all returned HTTP 200.
  - `/root/projects/hubproxy/.env_nvidia`: `/models` returned HTTP 200 for `z-ai/glm-5.2`, but `/responses` returned HTTP 404 and `/chat/completions` returned HTTP 401, so this relay is saved/configurable but not currently usable through Codex's Responses wire path.

## 2026-07-17

- Re-ran workspace verification after installing the local deps, Playwright Chromium, and missing host browser libraries.
- Verified the current slice is green:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test:e2e` (11/11 Chromium tests)
- Added MCP direct tool-call forms in the MCP inspector, including per-tool JSON argument editing, schema preview, call status, error rendering, and result rendering.
- Preserved MCP tool schema metadata in the web client state and expanded chat item rendering for MCP tool call payloads.
- Added focused Playwright coverage for a mocked MCP tool call flow.
- Installed the Playwright Chromium runtime and verified the Chromium project passes.
- Verified `/root/projects/hubproxy/.env` against the relay endpoints:
  - `RESPONSES_BASE_URL/models` returned HTTP 200.
  - `RESPONSES_BASE_URL/responses` returned HTTP 200 with a POST body using `DEFAULT_MODEL`.
  - `CHAT_BASE_URL/models` returned HTTP 200.
  - `CHAT_BASE_URL/chat/completions` returned HTTP 200 with a POST body using `DEFAULT_MODEL`.
- Added Skills extra roots management backed by `skills/extraRoots/set`, with reloaded `skills/list` inventory across the workspace and saved extra roots.
- Added local skill Markdown preview using `fs/readFile` and client-side base64 decoding.
- Added focused Playwright coverage for saving extra skill roots and previewing local skill Markdown.
- Added installed-only plugin mention insertion backed by `plugin/installed`, while preserving full marketplace browsing through `plugin/list`.
- Added richer plugin auth/app handling, including auth policy/install policy metadata, `plugin/install` app-auth notices, plugin app/template summaries, and `app/list` connector state.
- Added focused Playwright coverage for installed-only plugin mentions, mention payloads, plugin app/template rendering, and install-time app authentication prompts.
- Added a Monaco-backed file explorer/editor in the Files tab using `fs/readDirectory`, `fs/readFile`, and `fs/writeFile`.
- Added focused Playwright coverage for browsing a mocked filesystem, opening a file in Monaco, editing it, and saving through `fs/writeFile`.
- Added terminal/process controls in the Files tab using PTY-backed `command/exec`, streamed `command/exec/outputDelta`, stdin writes, resize, and terminate RPCs.
- Added focused Playwright coverage for command execution, streamed terminal output, stdin write, resize, and terminate controls.
- Added desktop and mobile Playwright screenshot regression checks with committed baseline snapshots.
- Added `pnpm launch` one-command production-style launcher that builds missing assets and starts the local token-protected Node server serving the web UI.
- Added UI profile import/export for provider metadata without API keys, with merge import preserving existing local credential state.
- Added local JSONL audit logging for dangerous permission `thread/start` and `turn/start` calls, plus Config-tab visibility for recent audit records.

- Settings drawer now loads live Codex user config via `config/read` and persists curated fields through `config/batchWrite` with `reloadUserConfig` (model/review defaults, reasoning effort/summary, verbosity, service tier, approval policy, sandbox mode, web search, user instructions, developer instructions).
- Theme plugins remain local-only (install/switch/remove/create/delete); never written into Codex config.toml; provider API keys stay out of config writes.
- Desktop workbench panels stay resizable with localStorage layout persistence; Workspace Files keeps explorer/editor splits in Settings and Terminal lives in the right runtime workspace.
- Playwright e2e covers Settings config load/edit/re-read, custom theme plugin creation, theme/config independence, and resizable Files panes; screenshots `snapshot/codex-ui-settings-open.png`, `snapshot/codex-ui-settings-appearance.png`, `snapshot/codex-ui-settings-layout.png`, and `snapshot/codex-ui-files-resizable.png`.

## Known Gaps

- Codex currently uses the Responses wire API for custom providers here; chat-completions-only relays still need a compatible Responses endpoint or an upstream Codex capability change.

## 2026-07-20

### Membership / Sub2API admin security

- Implemented app-policy membership (not host SSH users): JWT auth, roles, workspace root jail, permission clamps, thread ownership filtering.
- Admin members UI: create/edit/delete, capability toggles, balance allocate (set/add/subtract with notes), allowed-relay multi-select.
- SecurityStore: system settings (registration, captcha, TOTP flags, default balance/concurrency), SVG math captcha, pending-login for 2FA, TOTP setup/enable/disable (crypto-only RFC6238), `user_allowed_providers`.
- Login flow: captcha → password → optional `requires_2fa` + `/api/login/2fa`; public `/api/register` when enabled.
- Providers list + `provider.activate` filtered by member allow-list (empty = no relays for members).
- Usage & billing (Sub2API-style): `GET /api/usage/summary`, `GET /api/usage/ledger`, settings **Usage & Billing** panel with daily bars, by-operation chart, top spenders (admin), ledger table, inline recharge.
- Build: shared + server + web green. Smoke: wrong captcha 401, register, TOTP enable/login/disable, assign relay, empty ACL returns [], recharge updates ledger.

### Defaults

- Admin: `admin@example.com` / `ChangeMe123!` (env `CODEX_UI_ADMIN_EMAIL` / `CODEX_UI_ADMIN_PASSWORD`)
- Member smoke: `member1@example.com` / `MemberPass1!`
- Launch: `CODEX_UI_JWT_SECRET=... bun run launch` on `:43110`

### Password change + concurrency enforcement (2026-07-20)

- Self-service password change on Settings → Security: current/new/confirm + **animated SVG captcha** (always required).
- API: `POST /api/me/password` verifies captcha then `changeOwnPassword`.
- Captcha SVG upgraded with SMIL animations (glow border, floating particles, gradient pulse).
- Concurrency: admin set per member (1–100); `turn/start` refreshes limit from DB, rejects when in-flight ≥ limit; slots released on turn terminal notifications / WS close.

