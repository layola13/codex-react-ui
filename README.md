# Codex React UI

Local React + MUI workbench for Codex CLI, backed by `codex app-server`.

## What Works

- React + MUI three-column workbench: history, chat, composer, config/tools/files inspector.
- Local Node/Fastify bridge on `127.0.0.1` only; the browser never talks to `codex app-server` directly.
- Codex app-server over stdio, including `initialize`, `thread/start`, `turn/start`, `model/list`, `thread/list`, and account read.
- New conversation permission presets, including the explicit `Dangerously bypass approvals and sandbox` option gated by typing `BYPASS`.
- Third-party provider metadata: base URL, native models, model aliases, API key preview, save, and activate.
- Provider activation writes Codex config via `config/batchWrite` and restarts app-server so temporary API-key env vars are available.
- Settings -> Codex Plugins manages real Codex plugin marketplaces, installed plugin mentions, hooks, plugin app auth state, and MCP server inventory without placeholder content.
- Main composer UI commands `/fast`, `/status`, `/stats`, `/usage`, `/goal`, and `/plan` are handled by the browser before `turn/start`; Settings-oriented commands open Settings instead of the right workspace.
- Sidechat workbench panel with multiple isolated tabs; each tab owns its Codex thread and slash-command-shaped text such as `/goal ...` is forwarded unchanged.
- User theme plugins with editable preview colors, uploaded background images, optional hero reuse, and JSON import/export.

## Development

```bash
pnpm install
pnpm dev
```

The server listens on `127.0.0.1:43110`; Vite proxies `/api` and `/ws` to it.

By default the server tries these Codex binaries:

1. `CODEX_BIN`
2. `/root/projects/codex/codex-rs/target/debug/codex`
3. `codex` on `PATH`

## Production-Style Local Run

```bash
pnpm launch
```

`pnpm launch` builds missing production assets, then starts the local Node server that serves both the API and the built web UI. Use `pnpm launch -- --build` to force a rebuild, or `pnpm launch -- --skip-build` to start from existing `dist` files.

The server prints a URL like:

```text
http://127.0.0.1:43110/?token=<session-token>
```

`/api/session` is intentionally the only unauthenticated API. Other API and websocket calls require the token.

## README Patrol

To keep this repository's `README.md` checkpointed every 120 seconds without staging unrelated files:

```bash
pnpm readme:autopush:start
```

Useful controls:

```bash
pnpm readme:autopush:status
pnpm readme:autopush:run-once
pnpm readme:autopush:stop
```

The watcher only stages `README.md`, writes its pid/log files under `.codex-maintenance/`, and uses `origin` plus the current branch by default. Override the polling interval or remote with `README_AUTOPUSH_INTERVAL` and `README_AUTOPUSH_REMOTE`.

## Provider Switching

Saved provider metadata is stored at `~/.codex-react-ui/providers.json` with file mode `0600`. API keys are kept only in the current Node process memory and exposed to Codex through generated env vars such as `CODEX_UI_PROVIDER_RESPONSES_RELAY_API_KEY`; keys are not written to `config.toml`.

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
2. Select a `png`, `jpg`, `webp`, or `gif` image up to 6 MiB.
3. Enable `Use background as hero` if the main empty-state hero should reuse the same image.
4. Save the theme, then select it from the theme plugin list.

The uploaded image is stored in the user theme as `assets.appBackgroundImage`. When hero reuse is enabled, the same image is also written to `assets.heroImage`. Custom theme plugins can be exported as JSON and imported on another machine from the same Theme plugins view.

## Main Slash Commands

The main composer intercepts lightweight UI commands before they become Codex turns:

- `/fast`, `/fast on`, and `/fast off` toggle fast mode. When active, new main-chat turns use the lowest available reasoning effort and show lightning badges in the top bar and composer.
- `/status` opens the session status panel. `/stats` and `/usage` open the project stats panel. These panels show token usage, model/provider, reasoning effort, permission mode, active goal, active modes, thread count, and turn/item counts.
- `/goal <objective>` sets the active thread goal. `/goal`, `/goal edit`, `/goal pause`, `/goal resume`, `/goal complete`, and `/goal clear` manage the sticky goal bar shown above the scrolling transcript.
- `/plan` turns on plan mode. `/plan off` disables it. `/plan <prompt>` turns on plan mode and sends `<prompt>` as the Codex turn text, without sending the `/plan` prefix.

Settings-oriented commands stay out of the right runtime workspace. `/plugins`, `/mcp`, `/hooks`, `/apps`, `/skills`, `/theme`, `/pet`, `/pets`, `/statusline`, `/title`, `/model`, `/permissions`, and `/debug-config` open the relevant Settings section. Sidechat inputs are intentionally not parsed by the browser, so slash-shaped sidechat text is sent to that sidechat thread exactly as typed.

## Dangerous Permission Audit

Dangerous `thread/start` and `turn/start` calls are appended to `~/.codex-react-ui/audit-log.jsonl` with file mode `0600`. Records include method, timestamp, cwd, thread/model identifiers, permission reasons, and input counts, but not prompt text or API keys. The Config tab shows the most recent local audit records.

## Sidechat Isolation

Sidechat tabs remain separate from the main workbench focus. Opening a sidechat tab starts a separate Codex thread on first send, keeps that thread out of the main task tabs/history view, and does not change the selected main conversation while sidechat notifications stream over the shared websocket.

Slash-command-shaped sidechat input is not parsed, blocked, or rewritten by the browser UI. Text such as `/goal ...` is sent as normal Codex text input exactly as typed; commands that only exist in the terminal TUI still need app-server support before they can perform TUI-specific behavior here.

## Current Gaps

- Codex currently uses the Responses wire API for custom providers here; chat-completions-only relays still need a compatible Responses endpoint or an upstream Codex capability change.
