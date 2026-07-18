# Progress

## 2026-07-18

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
- Desktop workbench panels stay resizable with localStorage layout persistence, including nested Files explorer/editor/terminal splits.
- Playwright e2e covers Settings config load/edit/re-read, custom theme plugin creation, theme/config independence, and resizable Files panes; screenshots `snapshot/codex-ui-settings-open.png`, `snapshot/codex-ui-settings-appearance.png`, `snapshot/codex-ui-settings-layout.png`, and `snapshot/codex-ui-files-resizable.png`.

## Known Gaps

- Codex currently uses the Responses wire API for custom providers here; chat-completions-only relays still need a compatible Responses endpoint or an upstream Codex capability change.
- Full nested Codex config.toml editor remains out of scope; Settings exposes a curated writable subset.
