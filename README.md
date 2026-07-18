# Codex React UI

Local React + MUI workbench for Codex CLI, backed by `codex app-server`.

## What Works

- React + MUI three-column workbench: history, chat, composer, config/tools/files inspector.
- Local Node/Fastify bridge on `127.0.0.1` only; the browser never talks to `codex app-server` directly.
- Codex app-server over stdio, including `initialize`, `thread/start`, `turn/start`, `model/list`, `thread/list`, and account read.
- New conversation permission presets, including the explicit `Dangerously bypass approvals and sandbox` option gated by typing `BYPASS`.
- Third-party provider metadata: base URL, native models, model aliases, API key preview, save, and activate.
- Provider activation writes Codex config via `config/batchWrite` and restarts app-server so temporary API-key env vars are available.
- Settings -> Codex Plugins manages real Codex plugin marketplaces, installed plugin mentions, plugin app auth state, and MCP server inventory without placeholder content.
- Main composer UI commands `/plugins` and `/mcp` open the corresponding Settings plugin views instead of starting a Codex turn.
- Sidechat workbench panel with multiple isolated tabs; each tab owns its Codex thread and slash-command-shaped text such as `/goal ...` is forwarded unchanged.

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

## Provider Switching

Saved provider metadata is stored at `~/.codex-react-ui/providers.json` with file mode `0600`. API keys are kept only in the current Node process memory and exposed to Codex through generated env vars such as `CODEX_UI_PROVIDER_RESPONSES_RELAY_API_KEY`; keys are not written to `config.toml`.

Activating a provider writes:

- `model_providers.<provider-id>` for non-official providers
- `model_provider`
- `model`

Then the bridge restarts `codex app-server` so the selected provider and any in-memory API key are active.

## UI Profiles

The Config tab can export and import UI profiles as JSON. Profiles include provider metadata and env-key references, but never include API keys or key previews. Importing a profile merges providers by id and preserves any matching local keyring or in-memory credential state already present on this machine.

## Dangerous Permission Audit

Dangerous `thread/start` and `turn/start` calls are appended to `~/.codex-react-ui/audit-log.jsonl` with file mode `0600`. Records include method, timestamp, cwd, thread/model identifiers, permission reasons, and input counts, but not prompt text or API keys. The Config tab shows the most recent local audit records.

## Sidechat Isolation

Sidechat tabs remain separate from the main workbench focus. Opening a sidechat tab starts a separate Codex thread on first send, keeps that thread out of the main task tabs/history view, and does not change the selected main conversation while sidechat notifications stream over the shared websocket.

Slash-command-shaped sidechat input is not parsed, blocked, or rewritten by the browser UI. Text such as `/goal ...` is sent as normal Codex text input exactly as typed; commands that only exist in the terminal TUI still need app-server support before they can perform TUI-specific behavior here.

## Current Gaps

- Codex currently uses the Responses wire API for custom providers here; chat-completions-only relays still need a compatible Responses endpoint or an upstream Codex capability change.
