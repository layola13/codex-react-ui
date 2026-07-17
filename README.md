# Codex React UI

Local React + MUI workbench for Codex CLI, backed by `codex app-server`.

## What Works

- React + MUI three-column workbench: history, chat, composer, config/tools/files inspector.
- Local Node/Fastify bridge on `127.0.0.1` only; the browser never talks to `codex app-server` directly.
- Codex app-server over stdio, including `initialize`, `thread/start`, `turn/start`, `model/list`, `thread/list`, and account read.
- New conversation permission presets, including the explicit `Dangerously bypass approvals and sandbox` option gated by typing `BYPASS`.
- Third-party provider metadata: base URL, native models, model aliases, API key preview, save, and activate.
- Provider activation writes Codex config via `config/batchWrite` and restarts app-server so temporary API-key env vars are available.

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

## Current Gaps

- Import/export for UI profiles is not implemented yet.
- Stronger audit logging for dangerous permission sessions is not implemented yet.
- Codex currently uses the Responses wire API for custom providers here; chat-completions-only relays still need a compatible Responses endpoint or an upstream Codex capability change.
