# Multi-engine CLI chat history — implementation plan

## Goal

Surface **chat history from every `*-launch` product CLI** inside Codex React UI’s left history rail:

- Distinct **icon per CLI**
- Prefer **tabs** (All / Codex / Claude / AGY / …)
- Phase 1: **list + open read-only transcript** for non-Codex engines
- Codex tab: keep existing `thread/list` + resume/rename/archive/delete

## Ground-truth storage (researched on this host)

| Launch adapter | Product CLI | History source (verified) | List quality | Open transcript | Resume in UI |
| --- | --- | --- | --- | --- | --- |
| **code-launch** | Codex | Already via app-server `thread/list` + `~/.codex/sessions/**/rollout-*.jsonl` + `session_index.jsonl` | Excellent | Existing chat | **Yes** (current) |
| **claude-launch** | Claude Code | `~/.claude/history.jsonl` (display, project, sessionId, ts) + transcripts `~/.claude/projects/<slug>/<sessionId>.jsonl` | Good | Parse jsonl user/assistant | No (read-only v1) |
| **agy-launch** | agy / Antigravity | `~/.gemini/antigravity-cli/cache/conversation_metadata.json` (+ `brain/<id>/`, `conversations/<id>.db`) | Excellent | Preview + brain artifacts | No (read-only v1) |
| **gemini-launch** | Gemini CLI | `~/.gemini/tmp/**/chats/session-*.jsonl` (sessionId, startTime, messages) | Good | Parse jsonl | No |
| **crush-launch** | Crush | Per-project `.crush/crush.db` (indexed by `~/.local/share/crush/projects.json`) | Medium–Good | SQL messages if schema allows | No |
| **auggie-launch** | auggie | `~/.augment/sessions/<uuid>.json` + `prompt-history.jsonl` | Good | JSON conversation | No |
| **grok-launch** / **agent-launch** | grok / agent | `~/.grok/sessions/<urlencoded-cwd>/<sessionId>/summary.json` + `chat_history.jsonl` | Good | summary + chat_history | No |
| **freebuff-launch** | freebuff | `~/.config/manicode/projects/**/chats/<ts>/chat-meta.json` + `chat-messages.json` | Good | messages JSON | No |
| **coderabbit-launch** | coderabbit | `~/.coderabbit/logs/*.log` only — **no real chat sessions** | List runs as “logs” | Log tail only | N/A |

## Architecture

```
HistorySidebar
  Tabs: All | Codex | Claude | AGY | Gemini | Crush | Auggie | Grok | Freebuff | CodeRabbit
  List rows: [icon] title · preview · cwd · relative time
       │
       ├─ engine=codex  → existing client.rpc("thread/list") + mutations
       └─ engine=other  → GET /api/engine-history?engine=…
                              GET /api/engine-history/:engine/:id  (transcript)
```

### Server (`apps/server/src/engineHistory.ts`)

- `ENGINE_CATALOG[]`: id, label, launchId, iconKey, color, roots, scanner
- `listEngineHistory(engine | "all", { q?, limit? }) → EngineHistoryItem[]`
- `getEngineTranscript(engine, id) → { messages: EngineMessage[] }`
- Best-effort scanners; missing dirs → empty list (no throw)
- Never log secrets; redact `sk-` patterns in previews

### API

- `GET /api/engine-history?engine=all|codex|claude|…&q=&limit=`
- `GET /api/engine-history/:engine/:id` — transcript for read-only panel
- Auth: same as other host-local reads (session token / membership user)

### Client types

```ts
type EngineId = "codex" | "claude" | "agy" | "gemini" | "crush" | "auggie" | "grok" | "freebuff" | "coderabbit";

type EngineHistoryItem = {
  engine: EngineId;
  id: string;           // stable within engine
  title: string;
  preview?: string;
  cwd?: string;
  updatedAt?: number;   // ms
  createdAt?: number;
  sourcePath?: string;  // host path for debug
  canResume: boolean;   // true only for codex today
};
```

### UI (`HistorySidebar.tsx`)

- Top **scrollable Tabs** with small brand chips (color + letter/icon)
- Merge: when tab=All, show combined list sorted by `updatedAt` with engine badge
- Codex rows: existing select/rename/archive/delete
- Other engines: select → open **read-only transcript drawer/panel** (new lightweight `EngineTranscriptPanel`)
- i18n en/cn for tab labels + empty states

### Icons

Use MUI-friendly simple marks (no trademark assets required):

| Engine | Chip color | Mark |
| --- | --- | --- |
| Codex | teal | `C` / Terminal |
| Claude | amber | `Cl` |
| AGY | violet | `A` |
| Gemini | blue | `G` |
| Crush | pink | `Cr` |
| Auggie | cyan | `Au` |
| Grok | slate | `X` |
| Freebuff | green | `Fb` |
| CodeRabbit | orange | `Rb` |

## Implementation phases

### P0 — this delivery (must ship)

1. Plan doc + commit
2. `engineHistory.ts` scanners for: **codex (optional mirror), claude, agy, gemini, auggie, grok, freebuff**; crush if SQLite readable; coderabbit as log index
3. Wire API routes
4. Client fetch helpers
5. HistorySidebar tabs + badges + read-only open
6. Smoke: list counts > 0 for engines with local data
7. Commit + push

### P1 — follow-up

- Resume non-Codex by spawning corresponding `*-launch` subprocess (multi-engine chat runtime)
- Crush rich message parse
- Live watch / file mtime refresh
- Arena cross-engine compare

## Non-goals (P0)

- Full multi-engine **chat runtime** (sending prompts to Claude/AGY from this UI)
- Mutating remote CLI session stores (delete Claude sessions, etc.)
- Inventing history paths without evidence (coderabbit stays logs-only)

## Risks

- Large jsonl scans → cap files read (mtime sort, limit 200)
- SQLite locks → open read-only + ignore busy
- Path privacy → admin-only optional later; for now same as launch-adapters detect

## Success criteria

- [ ] Tabs visible for all launch-backed engines
- [ ] Claude / AGY / Gemini / Auggie / Grok / Freebuff show real local sessions when present
- [ ] Icons/colors distinguish engines in All tab
- [ ] Codex tab behavior unchanged
- [ ] Read-only transcript opens without crashing
- [ ] Pushed to origin
