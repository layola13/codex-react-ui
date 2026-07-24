# Codex React UI

Local React + MUI workbench for Codex CLI, backed by `codex app-server`.

## What Works

- React + MUI three-column workbench: history, chat, composer, config/tools/files inspector.
- Local Bun HTTP/WebSocket bridge on `127.0.0.1` only; the browser never talks to `codex app-server` directly.
- Browser-to-Bun WebSocket heartbeat: application-level `ping/pong` runs every second, closes stale sockets after missed replies, and lets the existing reconnect loop recover from half-open connections after OS stalls or long installs.
- Codex app-server over stdio, including `initialize`, `thread/start`, `turn/start`, `model/list`, `thread/list`, and account read.
- New conversation permission presets, including the explicit `Dangerously bypass approvals and sandbox` option gated by typing `BYPASS`.
- Third-party relay channel metadata: API format, base URL, fetched/active models, model aliases, model rates, API key preview, remarks, save, test, and activate.
- Provider activation writes Codex config via `config/batchWrite` and restarts app-server so temporary API-key env vars are available.
- Settings -> Codex Plugins manages real Codex plugin marketplaces, installed plugin mentions, hooks, plugin app auth state, and MCP server inventory without placeholder content.
- Main composer keeps native Codex slash commands native: `/plan`, `/review`, `/diff`, `/compact`, `/resume`, `/new`, `/status`, `/usage`, `/model`, `/permissions`, plugin/settings commands, and other unknown slash commands are sent unchanged to `turn/start`.
- Only explicit Web-local composer commands are intercepted before `turn/start`: `/fast`, `/stats`, and the sticky-goal `/goal` controls.
- Main composer attachments now support images plus PDF/Office/text documents. Images render as previews without exposing raw base64 in chat, while documents upload to the local server and send as file mentions with compact file cards.
- New chat workspace selection supports local folders and SSH workspaces. SSH mode accepts commands such as `ssh user@192.168.11.1`, shows key setup help, lets users browse remote folders, and sends remote workspace metadata with new turns.
- Unified Web & Codex TUI history sidebar powered by Codex canonical thread store (`sessions/rollout-*.jsonl` + SQLite index). Lists resumable threads via `thread/list` (defaulting to `Cli` and `VSCode` sources, with an optional toggle for automation threads `Exec` and `AppServer`), searches title/preview/cwd/provider/source fields, restores full conversation and tool execution context through `thread/resume`, and supports row rename/archive/delete through Codex thread RPCs.
- Main chat uses a dedicated virtualized waterfall row model with lighter assistant prose, compact user bubbles, inline completed-thinking panels, compact clickable tool/file/command audit rows (`Bash`, `Read`, `Edit`, `New`, etc.) with status dots, folded old Bash runs, expandable file diffs rendered through `@git-diff-view`, desktop prompt-floor navigation, a searchable prompt map, data-driven transcript search, bottom-follow behavior, and a Jump to latest control for long transcripts.
- Sidechat workbench panel with multiple isolated tabs; each tab owns its Codex thread and slash-command-shaped text such as `/goal ...` is forwarded unchanged.
- User theme plugins with editable preview colors, image/GIF/video backgrounds, optional dynamic Canvas/Three.js scenes, background tuning controls, and JSON plus ZIP import/export.
- Sub2API-style **membership system** (admin Members UI): create members, capability matrix, per-member **relay whitelist**, concurrency limit, balance/credits, and private workspace jails.
- **Security**: login captcha, optional registration, Google Authenticator TOTP, self-service password change with **animated SVG captcha**.
- **Usage & billing**: turn-based debit, usage summary charts, balance ledger, admin recharge with notes.
- **Settings → Launch adapters**: catalog of [layola13 `*-launch`](https://github.com/layola13) bridges (`https://github.com/layola13/xxxxx-launch`), install/copy commands, and a multi-engine switcher UI (default **Codex** only today).

## One-click host install

On a fresh Linux machine (after cloning this repo):

```bash
git clone https://github.com/layola13/codex-react-ui.git
cd codex-react-ui
./install.sh
```

`./install.sh` installs Bun if needed, runs `bun install` + `bun run build`, writes `~/.config/codex-react-ui/.env` (JWT + admin), and installs a `codex-react-ui` launcher into `~/.local/bin`.

Useful flags: `./install.sh --help` · `./install.sh --start` · `./install.sh --skip-build` · `./install.sh --force-env`.

Then:

```bash
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
codex-react-ui
# open http://127.0.0.1:43110/
```

## Development

```bash
bun install
bun run dev
```

`bun run dev` builds the web UI once with Bun, then starts the Bun server on `127.0.0.1:43110`.

By default the server connects to the shared Codex app-server daemon over the default Unix socket so Web and TUI clients can share live thread state. The bridge starts the daemon if the socket is missing, then reports `transport: daemon-unix` and `realtimeSync: available` in engine status. Set `CODEX_UI_APP_SERVER_MODE=stdio` only for legacy private app-server debugging; stdio mode still shares persisted history but cannot provide live Web/TUI turn synchronization.

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

`/api/session` is intentionally the only unauthenticated API in local-token mode. Other API and websocket calls require the token.

## WebSocket Heartbeat

The browser connects only to the local Bun bridge at `/ws`; the bridge then talks to Codex. To avoid a frozen-looking UI after a laptop sleep, network blip, or long software install leaves a half-open WebSocket, both peers use lightweight JSON heartbeats:

- Every 1 second the browser sends `heartbeat.ping`; the server replies with `heartbeat.pong`.
- Every 1 second the server sends `heartbeat.ping`; the browser replies with `heartbeat.pong`.
- If either side misses replies for about 5 seconds, it closes the stale socket. The browser then uses the existing exponential reconnect loop and resubscribes through the normal app state flow.
- A true system freeze pauses JavaScript and server timers too, so heartbeat cannot run during the freeze itself. The benefit is faster detection and reconnection immediately after the machine or browser event loop resumes.

Optional server tuning:

```bash
CODEX_UI_WS_HEARTBEAT_INTERVAL_MS=1000
CODEX_UI_WS_HEARTBEAT_TIMEOUT_MS=5000
```

## Docker Compose Install

A Sub2API-style Compose deployment is available under `deploy/`. It starts PostgreSQL plus the Codex React UI server, enables the PostgreSQL user system, and creates the first `role='admin'` account from `.env` on first boot.

```bash
cd deploy
cp .env.example .env
nano .env
docker compose up -d --build
```

Open `http://127.0.0.1:43110` and sign in with `CODEX_UI_ADMIN_EMAIL` plus `CODEX_UI_ADMIN_PASSWORD` from `.env`. See `deploy/README.md` for secret generation, Codex binary mounting, logs, upgrades, and data-volume notes.

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

## Provider Switching (Relay channels)

Saved provider metadata is stored in `~/.codex-react-ui/codex-ui.sqlite3` with SQLite tables and file mode `0600`. Set `CODEX_UI_DATA_DIR=/path/to/persistent/data` to pin this database to a durable directory or Docker volume; recompiling the web UI and refreshing the PWA cache must not delete relay channels. API keys are kept only in the current Bun process memory / OS keyring and exposed to Codex through generated env vars such as `CODEX_UI_PROVIDER_RESPONSES_RELAY_API_KEY`; keys are not written to `config.toml`.

Admins manage channels under **Settings → Relay**. Members only see relays listed in their `allowedProviderIds` (configured under **Settings → Members** when creating or editing a user). The UI follows an AxonHub-style channel workflow:

1. Open **Settings → Relay → Add channel**.
2. Choose an API format / service template such as Responses relay, OpenAI Chat Completions, Ollama, LM Studio, or Bedrock.
3. Fill in channel name, Base URL, API Key, optional model aliases, model multipliers, and free-form **Remark** notes.
4. Pick **Fast Mode** for normal channel setup: every active model appears in a list with four multipliers — input, output, cache read, and cache write — all defaulting to `1`.
5. Switch to **Advanced Mode** only when you need raw per-model USD-per-million prices, relay groups, key pools, fallback groups, or tiered context ratios. The four model multipliers still default to `1`.
6. Click **Fetch models** to call the upstream model-list endpoint through the local server. The fetcher supports OpenAI-compatible `/v1/models`, Anthropic-like `/v1/models`, Gemini `/v1beta/models`, and common relay URL variants.
7. Select fetched models into the **Active models** list, or type comma-separated model IDs manually.
8. Save the channel, then choose a model in the channel list and click **Activate**.

Model multiplier logic is intentionally simple by default: `1` means normal pricing, and separate input/output/cache-read/cache-write multipliers are stored per active model. When tiered context ratios are enabled in Advanced Mode, the model multipliers still remain visible as base multipliers and are multiplied together with the group ratio and token-tier ratio; leave them at `1` unless you need a per-model override.

The channel list shows saved channel ID, provider/API format, active status, tags, model chips, remarks, key storage, timestamps, multiplier summary, and per-channel model selectors. Expanding a row shows Base URL, API format, update time, remark, key storage, tags, and the saved active models. Search matches channel name, ID, kind, Base URL, default model, active models, tags, and remarks.

Activating a provider writes:

- `model_providers.<provider-id>` for non-official providers
- `model_provider`
- `model`

Then the bridge restarts `codex app-server` so the selected provider and any in-memory API key are active.

Chat Completions-only relays still need a Responses-compatible adapter for Codex traffic. **Settings → Relay** shows code-launch hints for known Chat Completions endpoints, and **Settings → Launch adapters** provides install/copy commands for the `*-launch` helpers.

## UI Profiles

The Config tab can export and import UI profiles as JSON. Profiles include provider metadata and env-key references, but never include API keys or key previews. Importing a profile merges providers by id and preserves any matching local keyring or in-memory credential state already present on this machine.

## User Management

Codex React UI now ships a Sub2API-inspired membership system by default (SQLite under `~/.codex-react-ui/codex-ui.sqlite3`). Password login is enabled unless you set `CODEX_UI_AUTH=off` / `local-token`.

### Default admin

```bash
CODEX_UI_ADMIN_EMAIL=admin@example.com
CODEX_UI_ADMIN_PASSWORD=ChangeMe123!
CODEX_UI_JWT_SECRET=$(openssl rand -hex 32)
```

On first boot the server creates the admin if none exists. Change the password before any shared deployment.

### Member capabilities (server enforced)

Each member has:

- `role`: `admin` | `user`
- `status`: `active` | `disabled`
- `maxPermission`: `readonlyAsk` | `workspaceAsk` | `fullAsk` | `dangerBypass`
- `allowWrite`, `allowNetwork`, `allowDangerBypass`
- `concurrency` (1–100): max concurrent `turn/start` slots (enforced server-side)
- `balance` credits: non-admin turns debit a flat unit on `turn/start` when balance &gt; 0
- `allowedProviderIds`: which relay channels the member may list/activate (empty = none)
- private `workspaceRoot` under `~/.codex-react-ui/members/<userId>/workspace`

The bridge **clamps/rejects** client `thread/start` and `turn/start` params so members cannot smuggle `--dangerously-bypass-approvals-and-sandbox` or write modes they do not own. Thread ownership is stored so members only see their own chat history. Non-admins can **view/activate** allowed relays only; they cannot create, edit, or delete relay configs.

Admin APIs:

- `GET /api/members`
- `POST /api/members` (optional `allowedProviderIds` on create)
- `PATCH /api/members/:id` (permissions, concurrency, relay ACL, password reset)
- `DELETE /api/members/:id`
- `POST /api/members/:id/balance` (set / add / subtract with notes)
- `GET /api/usage/summary`, `GET /api/usage/ledger` (admin)
- `GET /api/me/ledger`, `POST /api/me/password` (self-service)

UI:

- **Settings → Members** (admin): create/edit members, capability switches, **allowed relays**, concurrency, recharge
- **Settings → Usage & Billing**: charts + ledger; members see own usage
- **Settings → Security**: admin registration/captcha/default concurrency toggles; everyone can enable TOTP and change password (animated captcha required)

### Demo accounts (local seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `ChangeMe123!` |
| Member | `member1@example.com` | `MemberPass1!` |

Set `CODEX_UI_JWT_SECRET` (min 32 chars) when membership login is on.

### Security recommendation (Linux users / SSH / Docker)

| Approach | Use when | Recommendation |
| --- | --- | --- |
| App caps + member workspace (default) | Trusted / internal members | **Ship this first** |
| Per-user Docker workers | Untrusted multi-tenant agents | Phase 2 for hard isolation |
| Host Linux users + SSH + sudo per member | Almost never | **Avoid as default** — expands SSH attack surface and privilege complexity |

Do **not** auto-provision OS SSH accounts or sudo for each web member. If you need stronger isolation later, prefer Docker/cgroup sandboxes over host accounts.

Disable membership login (legacy local token URL mode):

```bash
CODEX_UI_AUTH=off
```

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

The main composer sends native Codex slash commands through unchanged. This includes `/plan`, `/review`, `/diff`, `/compact`, `/resume`, `/new`, `/status`, `/usage`, `/model`, `/permissions`, `/plugins`, `/mcp`, `/hooks`, and unknown slash commands. The browser only intercepts explicit Web-local commands:

- Shortcut buttons beside the composer still insert/send their slash text, but native command text is forwarded to Codex instead of being rewritten into Web RPCs.
- `/fast`, `/fast on`, and `/fast off` toggle fast mode. When active, new main-chat turns use the lowest available reasoning effort and show lightning badges in the top bar and composer.
- `/stats` opens the Web project stats panel. It shows token usage, model/provider, reasoning effort, permission mode, active goal, active modes, thread count, and turn/item counts.
- `/goal <objective>` sets the active thread goal. `/goal`, `/goal edit`, `/goal pause`, `/goal resume`, `/goal complete`, and `/goal clear` manage the sticky goal bar shown above the scrolling transcript.

Sidechat inputs are intentionally not parsed by the browser, so slash-shaped sidechat text is sent to that sidechat thread exactly as typed.

## Dangerous Permission Audit

Dangerous `thread/start` and `turn/start` calls are appended to SQLite in `~/.codex-react-ui/codex-ui.sqlite3` with file mode `0600`. Records include method, timestamp, cwd, thread/model identifiers, permission reasons, and input counts, but not prompt text or API keys. The Config tab shows the most recent local audit records.

## Sidechat Isolation

Sidechat tabs remain separate from the main workbench focus. Opening a sidechat tab starts a separate Codex thread on first send, keeps that thread out of the main task tabs/history view, and does not change the selected main conversation while sidechat notifications stream over the shared websocket.

Slash-command-shaped sidechat input is not parsed, blocked, or rewritten by the browser UI. Text such as `/goal ...` is sent as normal Codex text input exactly as typed; commands that only exist in the terminal TUI still need app-server support before they can perform TUI-specific behavior here.

## Web & Codex TUI Resumable History

Codex React UI provides bidirectional, full-context session history sharing between the Web workbench and the official Codex TUI/CLI without modifying Codex upstream storage formats or spoofing fake TUI files.

### Session History vs. Prompt Recall

- **Canonical Thread Store (`sessions/rollout-*.jsonl` & SQLite index)**: Stores complete session state including user prompts, assistant responses, tool calls, execution outputs, and context. Both Web and authentic Codex TUI rely on this store to restore complete sessions.
- **TUI Prompt Recall (`~/.codex/history.jsonl`)**: Contains only raw input line prompt history for TUI input box recall (`Up`/`Down` arrows). It lacks responses, tool calls, or context, and cannot be used for session recovery.

### Unified Thread Source (`thread/list`)

The history sidebar uses `thread/list` as its single source of truth and deprecates legacy read-only prompt scanning routes (`/api/engine-history`):

- **Default Sources**: `Cli` (created by terminal TUI) and `VSCode` (created by Web app-server sessions). Web-created threads appear in TUI default resume lists (`codex resume`), and TUI-created threads appear in the Web history sidebar.
- **Automation History Toggle**: Enabling `includeAutomationHistory` (persisted setting, default `false`) includes `Exec` and `AppServer` automated sessions in the history list. Obsolete settings like `showLaunchHistory` are purged without semantic migration.
- **Strictly Filtered Out**: `subagent` and `unknown` sources are always excluded from the history list.

### Requirements & Permissions

- **Shared Environment**: History sharing requires the Web server and local TUI to operate under the same OS user, sharing `CODEX_HOME` and SQLite database locations.
- **Thread Ownership & Access Control**:
  - **Single-User / Admin Mode**: Accesses all canonical threads belonging to the current OS user.
  - **Web Member Mode**: Enforces `thread_owners` mapping; non-admin members only see canonical threads assigned to their account.
  - **Local TUI Access**: The terminal TUI operates directly on the host's canonical store without Web member ACL restrictions.

## Launch Adapters (`*-launch`)

Many third-party relays only speak **OpenAI Chat Completions**, while Codex (and this UI) use the **Responses** wire API. [code-launch](https://github.com/layola13/code-launch) runs a local translation proxy so Codex can talk to Chat Completions endpoints.

Open **Settings → Launch adapters** for:

1. **Chat engine switcher** — default / active: **Codex**. Other engines are shown as planned (UI chat not wired yet).
2. **Download catalog** — every [layola13 `*-launch`](https://github.com/layola13) helper using the pattern:

   `https://github.com/layola13/xxxxx-launch`

| Adapter | Product | Protocol notes |
| --- | --- | --- |
| [code-launch](https://github.com/layola13/code-launch) | Codex CLI / this UI | **Required** for Chat Completions-only relays |
| [agy-launch](https://github.com/layola13/agy-launch) | Antigravity (`agy`) CLI | Chat Completions bridge |
| [auggie-launch](https://github.com/layola13/auggie-launch) | Augment / auggie | Chat Completions bridge |
| [claude-launch](https://github.com/layola13/claude-launch) | Claude Code | Anthropic ↔ Chat Completions |
| [crush-launch](https://github.com/layola13/crush-launch) | Charm Crush | Env → OpenAI-compatible provider |
| [gemini-launch](https://github.com/layola13/gemini-launch) | Gemini CLI | Chat Completions bridge |
| [grok-launch](https://github.com/layola13/grok-launch) | Grok-oriented CLI | Chat Completions bridge |
| [coderabbit-launch](https://github.com/layola13/coderabbit-launch) | CodeRabbit CLI | Local MITM rewrite |
| [freebuff-launch](https://github.com/layola13/freebuff-launch) | Freebuff CLI | Local MITM rewrite |
| [agent-launch](https://github.com/layola13/agent-launch) | Generic agent CLIs | See repo README |

Quick install for Codex:

```bash
git clone https://github.com/layola13/code-launch.git
cd code-launch && ./install.sh
# Edit ~/.config/code-launch/.env
#   CODE_LAUNCH_BASE_URL=https://your-relay.example/v1
#   CODE_LAUNCH_MODEL=your-model
#   CODE_LAUNCH_API_KEY=sk-...
#   CODE_LAUNCH_WIRE_API=chat   # when upstream is Chat Completions only
export PATH="$HOME/.local/bin:$PATH"
code-launch
```

**Settings → Relay** also shows a banner and per-channel chips when a saved provider is likely Chat Completions-only and needs `code-launch`.

### Multi-engine roadmap (chat UI)

| Engine | Protocol | Status |
| --- | --- | --- |
| Codex | Responses (+ `code-launch` when needed) | **Active (default)** |
| agy | Chat Completions | Planned |
| auggie | Chat Completions | Planned |
| claude | Chat Completions | Planned |
| crush | Chat Completions | Planned |
| grok | Chat Completions | Planned |
| gemini | Chat Completions | Planned |

Planned work: switch the main chat surface between engines while reusing the same membership, relay ACL, and billing model.

### Arena mode (竞技场) — planned

After multi-engine chat lands, an optional **Arena** surface can send **one prompt to several engines (or several Codex configs) in parallel**, show side-by-side results, and promote a winner into the main thread.

| Idea | Notes |
| --- | --- |
| Multi-Codex first | Same engine, different model/relay — uses existing `thread` isolation |
| Cross-engine later | Codex + agy / claude / … via `*-launch` adapters |
| Billing / ACL | Each slot is a concurrent turn; respect membership concurrency, balance, and allowed relays |
| Inspiration | Parallel agent UX (e.g. [Orca](https://github.com/stablyai/orca) worktrees) — **reference only**, not an Electron dependency |

## Current Gaps

- Main chat still runs on **Codex** only; multi-engine UI switching for agy / auggie / claude / crush / grok / gemini is planned (download launchers already in Settings).
- Token-accurate billing is not implemented yet; non-admin turns use a flat debit unit on `turn/start`.
- Chat Completions-only relays still need **code-launch** (or a Responses-compatible upstream) for Codex traffic.
