# Codex React UI

Local React + MUI workbench for Codex CLI, backed by `codex app-server`.

## What Works

- React + MUI three-column workbench: history, chat, composer, config/tools/files inspector.
- Local Bun HTTP/WebSocket bridge on `127.0.0.1` only; the browser never talks to `codex app-server` directly.
- Codex app-server over stdio, including `initialize`, `thread/start`, `turn/start`, `model/list`, `thread/list`, and account read.
- New conversation permission presets, including the explicit `Dangerously bypass approvals and sandbox` option gated by typing `BYPASS`.
- Third-party provider metadata: base URL, native models, model aliases, API key preview, save, and activate.
- Provider activation writes Codex config via `config/batchWrite` and restarts app-server so temporary API-key env vars are available.
- Settings -> Codex Plugins manages real Codex plugin marketplaces, installed plugin mentions, hooks, plugin app auth state, and MCP server inventory without placeholder content.
- Main composer UI commands `/fast`, `/status`, `/stats`, `/usage`, `/goal`, and `/plan` are handled by the browser before `turn/start`; Settings-oriented commands open Settings instead of the right workspace.
- App-server-backed main composer commands `/review`, `/rename`, `/diff`, `/compact`, `/resume`, and `/new` use native workbench actions instead of being sent as prompt text.
- Codex history rail lists app-server threads by Codex metadata semantics, searches title/preview/cwd/provider/source fields, resumes selected rows through `thread/resume`, and supports row rename/archive/delete through Codex thread RPCs.
- Main chat uses a dedicated virtualized waterfall row model with lighter assistant prose, compact user bubbles, distinct tool/file/command audit rows with persistent long-output expansion, desktop prompt-floor navigation, a searchable prompt map, data-driven transcript search, bottom-follow behavior, and a Jump to latest control for long transcripts.
- Sidechat workbench panel with multiple isolated tabs; each tab owns its Codex thread and slash-command-shaped text such as `/goal ...` is forwarded unchanged.
- User theme plugins with editable preview colors, image/GIF/video backgrounds, optional dynamic Canvas/Three.js scenes, background tuning controls, and JSON plus ZIP import/export.

## Development

```bash
bun install
bun run dev
```

`bun run dev` builds the web UI once with Bun, then starts the Bun server on `127.0.0.1:43110`.

By default the server tries these Codex binaries:

1. `CODEX_BIN`
2. `/root/projects/codex/codex-rs/target/debug/codex`
3. `codex` on `PATH`

## Production-Style Local Run

```bash
bun run launch
```

`bun run launch` builds missing production assets, then starts the local Bun server that serves both the API and the built web UI. Use `bun run launch -- --build` to force a rebuild, or `bun run launch -- --skip-build` to start from existing `dist` files.

The server prints a URL like:

```text
http://127.0.0.1:43110/?token=<session-token>
```

`/api/session` is intentionally the only unauthenticated API. Other API and websocket calls require the token.

## README Patrol

To keep this repository's `README.md` checkpointed every 120 seconds without staging unrelated files:

```bash
bun run readme:autopush:start
```

Useful controls:

```bash
bun run readme:autopush:status
bun run readme:autopush:run-once
bun run readme:autopush:stop
```

The watcher only stages `README.md`, writes its pid/log files under `.codex-maintenance/`, and uses `origin` plus the current branch by default. Override the polling interval or remote with `README_AUTOPUSH_INTERVAL` and `README_AUTOPUSH_REMOTE`.

## Provider Switching

Saved provider metadata is stored in `~/.codex-react-ui/codex-ui.sqlite3` with SQLite tables and file mode `0600`. API keys are kept only in the current Bun process memory and exposed to Codex through generated env vars such as `CODEX_UI_PROVIDER_RESPONSES_RELAY_API_KEY`; keys are not written to `config.toml`.

Activating a provider writes:

- `model_providers.<provider-id>` for non-official providers
- `model_provider`
- `model`

Then the bridge restarts `codex app-server` so the selected provider and any in-memory API key are active.

## UI Profiles

The Config tab can export and import UI profiles as JSON. Profiles include provider metadata and env-key references, but never include API keys or key previews. Importing a profile merges providers by id and preserves any matching local keyring or in-memory credential state already present on this machine.

## User Theme Plugins

User-defined themes are managed from Settings, not from the right workspace panel. Open Settings -> Appearance -> Theme plugins, then create a custom theme or edit an existing user theme.

To replace the workbench background:

1. Click the image picker in the custom theme editor.
2. Select a `png`, `jpg`, `webp`, or `gif` image up to 6 MiB. Animated GIFs are preserved as image backgrounds.
3. Optionally use the video picker for an `mp4` or `webm` background up to 6 MiB. Video backgrounds autoplay muted, loop, and are exported with the theme.
4. Enable `Use background as hero` if the main empty-state hero should reuse the same image.
5. Tune the background from the same editor, then save the theme and select it from the theme plugin list.

User media themes default to a low-mask presentation: the background layer is fully visible, background overlay is `0`, the future effects/glass layer is `0`, workspace surfaces are lightly translucent, and the hero overlay is kept low. The editor exposes background media strength, background overlay opacity, effects layer opacity, workspace surface opacity, hero overlay opacity, panel opacity, glass blur, tone color, and tone opacity so users can choose how visible or glassy the UI should be.

The uploaded image is stored as `assets.appBackgroundImage`. Uploaded videos are stored as `assets.appBackgroundVideo`. When hero reuse is enabled, the same image is also written to `assets.heroImage`.

Theme plugins can also include a declaration-based dynamic background scene in `layout.backgroundScene`. Supported renderers are `canvas` and `three`, with presets such as `aurora`, `particles`, and `orbit`. Imported themes do not execute arbitrary JavaScript; shared Canvas/Three.js backgrounds are rendered only from the stored declaration fields.

Custom theme plugins can be exported as JSON or as a ZIP package from the same Theme plugins view. ZIP packages contain a root `theme.json` plus local media files under `assets/`, while JSON import remains supported for compatibility. Export/import preserves media assets, background tuning, tone settings, and dynamic background declarations so themes can be exchanged intact.

## Main Slash Commands

The main composer intercepts lightweight UI commands before they become Codex turns:

- Shortcut buttons beside the composer trigger `/fast`, `/status`, `/goal`, `/plan`, `/review`, and `/rename` through the same router as typed commands.
- `/fast`, `/fast on`, and `/fast off` toggle fast mode. When active, new main-chat turns use the lowest available reasoning effort and show lightning badges in the top bar and composer.
- `/status` opens the session status panel. `/stats` and `/usage` open the project stats panel. These panels show token usage, model/provider, reasoning effort, permission mode, active goal, active modes, thread count, and turn/item counts.
- `/goal <objective>` sets the active thread goal. `/goal`, `/goal edit`, `/goal pause`, `/goal resume`, `/goal complete`, and `/goal clear` manage the sticky goal bar shown above the scrolling transcript.
- `/plan` turns on plan mode. `/plan off` disables it. `/plan <prompt>` turns on plan mode and sends `<prompt>` as the Codex turn text, without sending the `/plan` prefix.
- `/review` starts a review through `review/start`. Variants include `/review detached`, `/review branch <name>`, `/review detached branch <name>`, `/review commit <sha>`, and `/review <custom instructions>`.
- `/rename <name>` renames the active thread through `thread/name/set` and updates task tabs/history.
- `/diff` calls `gitDiffToRemote` and shows a bounded diff preview in the workbench.
- `/compact` calls `thread/compact/start` for the active thread.
- `/resume <thread-id>` calls `thread/resume` and reloads the selected thread.
- `/new`, `/new read-only`, `/new workspace`, `/new full`, and `/new danger` start a fresh chat with the matching permission preset. Danger Bypass still requires the explicit confirmation dialog.

Settings-oriented commands stay out of the right runtime workspace. `/plugins`, `/mcp`, `/hooks`, `/apps`, `/skills`, `/theme`, `/pet`, `/pets`, `/statusline`, `/title`, `/model`, `/permissions`, and `/debug-config` open the relevant Settings section. Sidechat inputs are intentionally not parsed by the browser, so slash-shaped sidechat text is sent to that sidechat thread exactly as typed.

## Dangerous Permission Audit

Dangerous `thread/start` and `turn/start` calls are appended to SQLite in `~/.codex-react-ui/codex-ui.sqlite3` with file mode `0600`. Records include method, timestamp, cwd, thread/model identifiers, permission reasons, and input counts, but not prompt text or API keys. The Config tab shows the most recent local audit records.

## Sidechat Isolation

Sidechat tabs remain separate from the main workbench focus. Opening a sidechat tab starts a separate Codex thread on first send, keeps that thread out of the main task tabs/history view, and does not change the selected main conversation while sidechat notifications stream over the shared websocket.

Slash-command-shaped sidechat input is not parsed, blocked, or rewritten by the browser UI. Text such as `/goal ...` is sent as normal Codex text input exactly as typed; commands that only exist in the terminal TUI still need app-server support before they can perform TUI-specific behavior here.

## Current Gaps

- Codex currently uses the Responses wire API for custom providers here; chat-completions-only relays still need a compatible Responses endpoint or an upstream Codex capability change.
