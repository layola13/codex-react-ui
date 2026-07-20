# Multi-engine CLI chat history — implementation plan

## Goal

Prepare Codex React UI for **multiple agent CLIs** (every `*-launch` product).

**P0 (shipped):** host-local **history list + read-only transcript**, with **icons + tabs**.  
This is **not** the final multi-agent chat product — it is the **data + catalog foundation** so later `chatRuntime` / `resumeInUi` can plug in without reworking the rail.

**Codex:** keep existing live `thread/list` + resume/rename/archive/delete.  
**Other engines:** read-only today; capability flags mark the upgrade path.

## Intent (explicit)

| Mode | Status | Purpose |
| --- | --- | --- |
| History list + icons + tabs | **Done (P0)** | See every CLI’s past sessions in one UI |
| Read-only transcript | **Done (P0)** | Inspect messages without spawning that CLI |
| Multi-agent **chat runtime** | P1+ | Send prompts / resume via `*-launch` bridges |
| Arena | After multi-engine chat | Side-by-side agents |

> Read-only is **intentional staging**, not the end state.

## Ground-truth storage (researched on this host)

| Launch adapter | Product CLI | History source (verified) | List | Transcript | Resume in UI |
| --- | --- | --- | --- | --- | --- |
| **code-launch** | Codex | `thread/list` + `~/.codex/sessions/**/rollout-*.jsonl` + `session_index.jsonl` | Excellent | Live + disk | **Yes** |
| **claude-launch** | Claude Code | `~/.claude/history.jsonl` + `~/.claude/projects/<slug>/<sessionId>.jsonl` | Good | jsonl user/assistant | P1 |
| **agy-launch** | agy / Antigravity | `~/.gemini/antigravity-cli/cache/conversation_metadata.json` (+ brain / conversations.db) | Excellent | history + preview | P1 |
| **gemini-launch** | Gemini CLI | `~/.gemini/tmp/**/chats/session-*.jsonl` | Good | jsonl | P1 |
| **crush-launch** | Crush | `.crush/crush.db` via `~/.local/share/crush/projects.json` | Good | SQL messages | P1 |
| **auggie-launch** | auggie | `~/.augment/sessions/<uuid>.json` (`chatHistory[].exchange`) | Good | request/response | P1 |
| **grok-launch** / **agent-launch** | grok / agent | `~/.grok/sessions/**/summary.json` + `chat_history.jsonl` | Good | chat_history | P1 |
| **freebuff-launch** | freebuff | `~/.config/manicode/projects/**/chats/*/chat-meta.json` + `chat-messages.json` | Good | messages JSON | P1 |
| **coderabbit-launch** | coderabbit | `~/.coderabbit/logs/*.log` only | Logs | Log tail | N/A |

## Architecture

```
@codex-ui/shared  AGENT_ENGINE_CATALOG + capabilities + AGENT_RUNTIME_BRIDGE_PLAN
        │
        ▼
apps/server engineHistory.ts  scanners (list + transcript)
        │
        ▼
GET /api/engine-history[?engine=&q=&limit=]
GET /api/engine-history/:engine/:id
        │
        ▼
HistorySidebar  Tabs + brand chips + Codex threads + engine rows
                  └─ non-codex → read-only transcript dialog (P0)
                  └─ later → AgentRuntimeBridge (P1)
```

### Shared foundation (`packages/shared/src/agentEngines.ts`)

- Stable `AgentEngineId` for all launch-backed CLIs
- `AgentEngineCapabilities`: `listHistory`, `readTranscript`, `resumeInUi`, `chatRuntime`, `mutateSessions`
- `AGENT_RUNTIME_BRIDGE_PLAN`: binary candidates + launch env prefix + start mode  
  (Codex = `app_server_stdio`; others = `cli_subprocess` until implemented)

### Server (`apps/server/src/engineHistory.ts`)

- Catalog derived from shared `AGENT_ENGINE_CATALOG`
- Scanners best-effort; missing dirs → empty
- Redact `sk-` / Bearer in previews

### Client

- `fetchEngineHistory` / `fetchEngineTranscript`
- History rail tabs: All | each engine
- Codex mutations unchanged

## Implementation phases

### P0 — shipped

1. Plan doc
2. Shared agent catalog + capability matrix
3. Host scanners for all engines above
4. API routes
5. HistorySidebar tabs + icons + read-only transcript
6. Smoke on host data
7. Commit + push

### P1 — multi-agent chat runtime (next)

1. `AgentRuntime` server module: spawn `claude-launch` / `agy-launch` / … or raw CLI with launch env
2. Session map: `engine + foreignSessionId → ui tab`
3. Wire History row: if `capabilities.resumeInUi` → start/resume instead of dialog
4. Settings engine switcher: flip `chatRuntime` engines to `active` as bridges land
5. Optional: delete/archive foreign sessions only where CLI supports it

### P2

- Live mtime refresh / file watch
- Arena cross-engine compare
- Crush/Auggie richer tool-call rendering

## Non-goals (P0)

- Sending prompts to non-Codex engines (deferred to P1, **prepared** via bridge plan)
- Mutating Claude/AGY session files from UI
- Inventing history paths without host evidence

## Success criteria (P0)

- [x] Tabs for all launch-backed engines
- [x] Real sessions listed when present (Claude / AGY / Gemini / Auggie / Grok / Freebuff / Crush / …)
- [x] Icons/colors distinguish engines
- [x] Codex tab behavior unchanged
- [x] Read-only transcript opens
- [x] Shared capability matrix for future `chatRuntime`
- [x] Pushed to origin

## Related code

| Path | Role |
| --- | --- |
| `packages/shared/src/agentEngines.ts` | Canonical engine ids + capabilities + bridge plan |
| `apps/server/src/engineHistory.ts` | Host scanners |
| `apps/server/src/index.ts` | `/api/engine-history` |
| `apps/web/src/components/HistorySidebar.tsx` | Tabs + list + dialog |
| `apps/web/src/state/codexClient.ts` | Client types + fetch |
| `apps/web/src/components/LaunchAdaptersPanel.tsx` | Settings install + planned engines |
