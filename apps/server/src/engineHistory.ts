/**
 * Host-local chat history scanners for every *-launch product CLI.
 * Phase 0: list + read-only transcript. Resume remains Codex-only via app-server.
 */
import {
  AGENT_ENGINE_CATALOG,
  type AgentEngineId
} from "@codex-ui/shared";
import { Database } from "bun:sqlite";
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

/** Alias of shared AgentEngineId — keep API stable for clients. */
export type EngineId = AgentEngineId;

export type EngineMeta = {
  id: EngineId;
  label: string;
  launchId: string;
  mark: string;
  color: string;
  /** Capability flags for future multi-agent runtime */
  canResume: boolean;
  canChat: boolean;
};

export const ENGINE_CATALOG: EngineMeta[] = AGENT_ENGINE_CATALOG.map((e) => ({
  id: e.id,
  label: e.label,
  launchId: e.launchId ?? e.id,
  mark: e.mark,
  color: e.color,
  // Phase 0: only Codex may resume into the main workbench.
  canResume: e.id === "codex" && e.capabilities.resumeInUi,
  canChat: e.capabilities.chatRuntime
}));

export type EngineHistoryItem = {
  engine: EngineId;
  id: string;
  title: string;
  preview?: string;
  cwd?: string;
  model?: string;
  updatedAt?: number;
  createdAt?: number;
  sourcePath?: string;
  canResume: boolean;
  messageCount?: number;
};

export type EngineMessage = {
  role: "user" | "assistant" | "system" | "tool" | "other";
  text: string;
  timestamp?: number;
};

export type EngineTranscript = {
  engine: EngineId;
  id: string;
  title: string;
  messages: EngineMessage[];
  sourcePath?: string;
};

function home(): string {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

function safeRead(path: string, maxBytes = 2_000_000): string | null {
  let fd: number | null = null;
  try {
    if (!existsSync(path)) return null;
    const st = statSync(path);
    if (!st.isFile()) return null;
    // Always bound reads so a multi-hundred-MB session dump cannot hang listing.
    if (st.size <= maxBytes) {
      return readFileSync(path, "utf8");
    }
    fd = openSync(path, "r");
    const buf = Buffer.alloc(maxBytes);
    const bytes = readSync(fd, buf, 0, maxBytes, 0);
    return buf.toString("utf8", 0, bytes);
  } catch {
    return null;
  } finally {
    if (fd != null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

function parseJson(path: string): unknown | null {
  const text = safeRead(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseJsonl(path: string, maxLines = 5000): unknown[] {
  const text = safeRead(path, 4_000_000);
  if (!text) return [];
  const out: unknown[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip */
    }
    if (out.length >= maxLines) break;
  }
  return out;
}

function toMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Heuristic: seconds vs ms
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Date.parse(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function clip(text: string | undefined, n = 160): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function redact(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_\-]{10,}/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer ***");
}

function walkFiles(root: string, filter: (name: string, full: string) => boolean, max = 400): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  let visitedCount = 0;
  const maxVisited = 2000;
  while (stack.length && out.length < max && visitedCount < maxVisited) {
    visitedCount++;
    const dir = stack.pop()!;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === ".git" || name === ".cache" || name === "tmp" || name === "temp") continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
      } else if (st.isFile() && filter(name, full)) {
        out.push(full);
        if (out.length >= max) break;
      }
    }
  }
  return out;
}

// --- scanners ---------------------------------------------------------------

function listCodexMirror(): EngineHistoryItem[] {
  // Lightweight mirror of on-disk sessions (UI still uses app-server for resume).
  const indexPath = join(home(), ".codex", "session_index.jsonl");
  const items: EngineHistoryItem[] = [];
  for (const row of parseJsonl(indexPath, 500)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    if (!id) continue;
    items.push({
      engine: "codex",
      id,
      title: typeof r.thread_name === "string" && r.thread_name ? r.thread_name : id.slice(0, 8),
      preview: typeof r.preview === "string" ? clip(r.preview) : undefined,
      updatedAt: toMs(r.updated_at),
      canResume: true,
      sourcePath: indexPath
    });
  }
  // Fallback: scan rollouts
  if (items.length === 0) {
    const sessions = join(home(), ".codex", "sessions");
    for (const file of walkFiles(sessions, (n) => n.startsWith("rollout-") && n.endsWith(".jsonl"), 100)) {
      const m = file.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      const id = m?.[1] ?? basename(file);
      let st;
      try {
        st = statSync(file);
      } catch {
        continue;
      }
      items.push({
        engine: "codex",
        id,
        title: id.slice(0, 8),
        updatedAt: st.mtimeMs,
        createdAt: st.birthtimeMs,
        canResume: true,
        sourcePath: file
      });
    }
  }
  return items;
}

function listClaude(): EngineHistoryItem[] {
  const hist = join(home(), ".claude", "history.jsonl");
  const bySession = new Map<string, EngineHistoryItem>();
  for (const row of parseJsonl(hist, 2000)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.sessionId === "string" ? r.sessionId : "";
    if (!id) continue;
    const display = typeof r.display === "string" ? r.display : "";
    const ts = toMs(r.timestamp);
    const prev = bySession.get(id);
    if (!prev) {
      bySession.set(id, {
        engine: "claude",
        id,
        title: clip(display, 80) || id.slice(0, 8),
        preview: clip(display),
        cwd: typeof r.project === "string" ? r.project : undefined,
        updatedAt: ts,
        createdAt: ts,
        canResume: false,
        sourcePath: hist
      });
    } else {
      if (ts && (!prev.updatedAt || ts >= prev.updatedAt)) {
        prev.updatedAt = ts;
        if (display) {
          prev.preview = clip(display);
          if (!prev.title || prev.title === id.slice(0, 8)) prev.title = clip(display, 80) || prev.title;
        }
      }
    }
  }
  // Also index project files missing from history
  const projects = join(home(), ".claude", "projects");
  for (const file of walkFiles(projects, (n) => n.endsWith(".jsonl"), 200)) {
    const id = basename(file, ".jsonl");
    if (bySession.has(id)) {
      const item = bySession.get(id)!;
      item.sourcePath = file;
      continue;
    }
    let st;
    try {
      st = statSync(file);
    } catch {
      continue;
    }
    bySession.set(id, {
      engine: "claude",
      id,
      title: id.slice(0, 8),
      updatedAt: st.mtimeMs,
      createdAt: st.birthtimeMs,
      canResume: false,
      sourcePath: file
    });
  }
  return [...bySession.values()];
}

function listAgy(): EngineHistoryItem[] {
  const metaPath = join(home(), ".gemini", "antigravity-cli", "cache", "conversation_metadata.json");
  const raw = parseJson(metaPath);
  const items: EngineHistoryItem[] = [];
  if (!raw || typeof raw !== "object") return items;
  const conversations = (raw as { conversations?: Record<string, unknown> }).conversations;
  if (!conversations || typeof conversations !== "object") return items;
  for (const [id, entry] of Object.entries(conversations)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const summary = (e.summary && typeof e.summary === "object" ? e.summary : {}) as Record<string, unknown>;
    const preview = typeof summary.Preview === "string" ? summary.Preview : typeof summary.Title === "string" ? summary.Title : "";
    const title = (typeof summary.Title === "string" && summary.Title.trim()) || preview || id.slice(0, 8);
    const cwd =
      Array.isArray(summary.WorkspaceURIs) && typeof summary.WorkspaceURIs[0] === "string"
        ? String(summary.WorkspaceURIs[0]).replace(/^file:\/\//, "")
        : undefined;
    items.push({
      engine: "agy",
      id,
      title: clip(title, 80) || id.slice(0, 8),
      preview: clip(preview),
      cwd,
      updatedAt: toMs(e.last_modified_time) ?? toMs(summary.UpdatedAt),
      messageCount: typeof summary.NumSteps === "number" ? summary.NumSteps : undefined,
      canResume: false,
      sourcePath: metaPath
    });
  }
  return items;
}

function listGemini(): EngineHistoryItem[] {
  const tmp = join(home(), ".gemini", "tmp");
  const items: EngineHistoryItem[] = [];
  for (const file of walkFiles(tmp, (n) => n.startsWith("session-") && n.endsWith(".jsonl"), 200)) {
    const lines = parseJsonl(file, 80);
    let id = "";
    let created: number | undefined;
    let updated: number | undefined;
    let preview = "";
    let title = "";
    for (const row of lines) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.sessionId === "string") {
        id = r.sessionId;
        created = toMs(r.startTime) ?? created;
        updated = toMs(r.lastUpdated) ?? updated;
      }
      if (r.type === "user") {
        const content = r.content;
        let text = "";
        if (typeof content === "string") text = content;
        else if (Array.isArray(content)) {
          text = content
            .map((c) => (c && typeof c === "object" && typeof (c as { text?: string }).text === "string" ? (c as { text: string }).text : ""))
            .join(" ");
        }
        text = text.replace(/<session_context>[\s\S]*?<\/session_context>/gi, "").trim();
        if (text && !preview) {
          preview = text;
          title = text;
        }
      }
      if (r.$set && typeof r.$set === "object") {
        const set = r.$set as Record<string, unknown>;
        updated = toMs(set.lastUpdated) ?? updated;
      }
    }
    if (!id) {
      const m = basename(file).match(/session-(.+)\.jsonl$/);
      id = m?.[1] ?? basename(file);
    }
    let st;
    try {
      st = statSync(file);
    } catch {
      continue;
    }
    items.push({
      engine: "gemini",
      id,
      title: clip(title, 80) || id.slice(0, 8),
      preview: clip(preview),
      updatedAt: updated ?? st.mtimeMs,
      createdAt: created ?? st.birthtimeMs,
      canResume: false,
      sourcePath: file
    });
  }
  return items;
}

function listCrush(): EngineHistoryItem[] {
  const items: EngineHistoryItem[] = [];
  const projectsPath = join(home(), ".local", "share", "crush", "projects.json");
  const raw = parseJson(projectsPath) as { projects?: Array<{ path?: string; data_dir?: string }> } | null;
  const dirs = new Set<string>();
  if (raw?.projects) {
    for (const p of raw.projects) {
      if (p.data_dir) dirs.add(p.data_dir);
    }
  }
  // Also discover nearby .crush
  for (const candidate of [join(home(), "projects", ".crush"), join(home(), ".crush")]) {
    if (existsSync(candidate)) dirs.add(candidate);
  }
  for (const dataDir of dirs) {
    const dbPath = join(dataDir, "crush.db");
    if (!existsSync(dbPath)) continue;
    try {
      const db = new Database(dbPath, { readonly: true });
      const rows = db
        .query(
          `SELECT id, title, message_count, updated_at, created_at FROM sessions ORDER BY updated_at DESC LIMIT 100`
        )
        .all() as Array<{
        id: string;
        title: string;
        message_count: number;
        updated_at: number;
        created_at: number;
      }>;
      for (const row of rows) {
        // Fetch first user message as preview
        let preview: string | undefined;
        try {
          const msg = db
            .query(
              `SELECT parts FROM messages WHERE session_id = ? AND role = 'user' ORDER BY created_at ASC LIMIT 1`
            )
            .get(row.id) as { parts?: string } | null;
          if (msg?.parts) {
            const parts = JSON.parse(msg.parts) as Array<{ type?: string; data?: { text?: string } }>;
            const text = parts
              .map((p) => (p?.data?.text ? p.data.text : ""))
              .join(" ")
              .trim();
            preview = clip(text);
          }
        } catch {
          /* ignore */
        }
        const cwd = dataDir.endsWith(".crush") ? dataDir.replace(/\/\.crush$/, "") : undefined;
        items.push({
          engine: "crush",
          id: row.id,
          title: row.title?.trim() || preview || row.id.slice(0, 8),
          preview,
          cwd,
          updatedAt: toMs(row.updated_at),
          createdAt: toMs(row.created_at),
          messageCount: row.message_count,
          canResume: false,
          sourcePath: dbPath
        });
      }
      db.close();
    } catch {
      /* busy or missing schema */
    }
  }
  return items;
}

function listAuggie(): EngineHistoryItem[] {
  const dir = join(home(), ".augment", "sessions");
  const items: EngineHistoryItem[] = [];
  if (!existsSync(dir)) return items;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const full = join(dir, name);
    const raw = parseJson(full) as Record<string, unknown> | null;
    if (!raw) continue;
    const id = typeof raw.sessionId === "string" ? raw.sessionId : basename(name, ".json");
    const title =
      (typeof raw.customTitle === "string" && raw.customTitle) ||
      (typeof raw.title === "string" && raw.title) ||
      id.slice(0, 8);
    let preview: string | undefined;
    if (Array.isArray(raw.chatHistory)) {
      for (const entry of raw.chatHistory) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        const exchange =
          e.exchange && typeof e.exchange === "object" ? (e.exchange as Record<string, unknown>) : null;
        const t =
          (exchange && typeof exchange.request_message === "string" && exchange.request_message) ||
          (typeof e.content === "string" ? e.content : "") ||
          (typeof e.text === "string" ? e.text : "");
        if (t.trim()) {
          preview = clip(t);
          break;
        }
      }
    }
    items.push({
      engine: "auggie",
      id,
      title: clip(title, 80) || id.slice(0, 8),
      preview,
      updatedAt: toMs(raw.modified) ?? toMs(raw.updatedAt),
      createdAt: toMs(raw.created) ?? toMs(raw.createdAt),
      messageCount: Array.isArray(raw.chatHistory) ? raw.chatHistory.length : undefined,
      canResume: false,
      sourcePath: full
    });
  }
  return items;
}

function listGrok(): EngineHistoryItem[] {
  const root = join(home(), ".grok", "sessions");
  const items: EngineHistoryItem[] = [];
  if (!existsSync(root)) return items;
  for (const proj of readdirSync(root)) {
    const projPath = join(root, proj);
    let st;
    try {
      st = statSync(projPath);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    for (const sid of readdirSync(projPath)) {
      const sess = join(projPath, sid);
      try {
        if (!statSync(sess).isDirectory()) continue;
      } catch {
        continue;
      }
      const summaryPath = join(sess, "summary.json");
      const summary = parseJson(summaryPath) as Record<string, unknown> | null;
      if (!summary) continue;
      const info = (summary.info && typeof summary.info === "object" ? summary.info : {}) as Record<string, unknown>;
      const id = typeof info.id === "string" ? info.id : sid;
      const title =
        (typeof summary.generated_title === "string" && summary.generated_title) ||
        (typeof summary.session_summary === "string" && summary.session_summary) ||
        id.slice(0, 8);
      items.push({
        engine: "grok",
        id,
        title: clip(title, 80) || id.slice(0, 8),
        preview: clip(typeof summary.session_summary === "string" ? summary.session_summary : title),
        cwd: typeof info.cwd === "string" ? info.cwd : undefined,
        model: typeof summary.current_model_id === "string" ? summary.current_model_id : undefined,
        updatedAt: toMs(summary.updated_at) ?? toMs(summary.last_active_at),
        createdAt: toMs(summary.created_at),
        messageCount: typeof summary.num_chat_messages === "number" ? summary.num_chat_messages : undefined,
        canResume: false,
        sourcePath: summaryPath
      });
    }
  }
  return items;
}

function listFreebuff(): EngineHistoryItem[] {
  const root = join(home(), ".config", "manicode", "projects");
  const items: EngineHistoryItem[] = [];
  if (!existsSync(root)) return items;
  for (const meta of walkFiles(root, (n) => n === "chat-meta.json", 300)) {
    const raw = parseJson(meta) as Record<string, unknown> | null;
    if (!raw) continue;
    const chatDir = meta.replace(/\/chat-meta\.json$/, "");
    const id = basename(chatDir);
    const title = typeof raw.firstPrompt === "string" ? raw.firstPrompt : id;
    let st;
    try {
      st = statSync(meta);
    } catch {
      continue;
    }
    // Infer cwd from path .../projects/<project>/chats/<id>
    const parts = chatDir.split("/");
    const chatsIdx = parts.lastIndexOf("chats");
    const projectName = chatsIdx >= 1 ? parts[chatsIdx - 1] : undefined;
    items.push({
      engine: "freebuff",
      id,
      title: clip(title, 80) || id,
      preview: clip(title),
      cwd: projectName ? `…/${projectName}` : undefined,
      updatedAt: typeof raw.messagesMtimeMs === "number" ? raw.messagesMtimeMs : st.mtimeMs,
      messageCount: typeof raw.messageCount === "number" ? raw.messageCount : undefined,
      canResume: false,
      sourcePath: meta
    });
  }
  return items;
}

function listCoderabbit(): EngineHistoryItem[] {
  const logs = join(home(), ".coderabbit", "logs");
  const items: EngineHistoryItem[] = [];
  if (!existsSync(logs)) return items;
  for (const name of readdirSync(logs)) {
    if (!name.endsWith(".log")) continue;
    const full = join(logs, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    const id = name.replace(/\.log$/, "");
    items.push({
      engine: "coderabbit",
      id,
      title: `CLI run ${id.slice(-12)}`,
      preview: "CodeRabbit CLI log (no chat sessions)",
      updatedAt: st.mtimeMs,
      createdAt: st.birthtimeMs,
      canResume: false,
      sourcePath: full
    });
  }
  return items;
}

const SCANNERS: Record<EngineId, () => EngineHistoryItem[]> = {
  codex: listCodexMirror,
  claude: listClaude,
  agy: listAgy,
  gemini: listGemini,
  crush: listCrush,
  auggie: listAuggie,
  grok: listGrok,
  freebuff: listFreebuff,
  coderabbit: listCoderabbit
};

export function listEngineHistory(
  engine: EngineId | "all",
  opts: { q?: string; limit?: number } = {}
): { engines: EngineMeta[]; items: EngineHistoryItem[] } {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const q = (opts.q ?? "").trim().toLowerCase();
  const ids: EngineId[] = engine === "all" ? ENGINE_CATALOG.map((e) => e.id) : [engine];
  let items: EngineHistoryItem[] = [];
  for (const id of ids) {
    try {
      const scanned = SCANNERS[id]?.() ?? [];
      // *-launch / non-Codex history is list+transcript only; never resume into main chat.
      items.push(
        ...scanned.map((item) => ({
          ...item,
          canResume: id === "codex" ? Boolean(item.canResume) : false
        }))
      );
    } catch (error) {
      console.warn(`[engine-history] scanner failed for ${id}:`, error instanceof Error ? error.message : error);
    }
  }
  if (q) {
    items = items.filter((item) => {
      const hay = `${item.title} ${item.preview ?? ""} ${item.cwd ?? ""} ${item.engine}`.toLowerCase();
      return hay.includes(q);
    });
  }
  items.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  items = items.slice(0, limit).map((item) => ({
    ...item,
    title: redact(item.title),
    preview: item.preview ? redact(item.preview) : undefined
  }));
  return { engines: ENGINE_CATALOG, items };
}

// --- transcripts ------------------------------------------------------------

function transcriptClaude(id: string): EngineTranscript | null {
  const projects = join(home(), ".claude", "projects");
  const files = walkFiles(projects, (n) => n === `${id}.jsonl`, 20);
  const file = files[0];
  if (!file) return null;
  const messages: EngineMessage[] = [];
  for (const row of parseJsonl(file, 2000)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const type = r.type;
    if (type === "user" || type === "assistant" || type === "human") {
      let text = "";
      if (typeof r.message === "string") text = r.message;
      else if (r.message && typeof r.message === "object") {
        const m = r.message as Record<string, unknown>;
        if (typeof m.content === "string") text = m.content;
        else if (Array.isArray(m.content)) {
          text = m.content
            .map((c) => {
              if (typeof c === "string") return c;
              if (c && typeof c === "object" && typeof (c as { text?: string }).text === "string") {
                return (c as { text: string }).text;
              }
              return "";
            })
            .join("\n");
        }
      } else if (typeof r.content === "string") text = r.content;
      text = redact(text.trim());
      if (!text) continue;
      messages.push({
        role: type === "assistant" ? "assistant" : "user",
        text: clip(text, 4000) || text,
        timestamp: toMs(r.timestamp)
      });
    }
  }
  return {
    engine: "claude",
    id,
    title: messages.find((m) => m.role === "user")?.text.slice(0, 80) || id.slice(0, 8),
    messages,
    sourcePath: file
  };
}

function transcriptAgy(id: string): EngineTranscript | null {
  // Prefer history.jsonl lines for this conversation + metadata preview
  const hist = join(home(), ".gemini", "antigravity-cli", "history.jsonl");
  const messages: EngineMessage[] = [];
  for (const row of parseJsonl(hist, 3000)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.conversationId !== id) continue;
    if (typeof r.display === "string" && r.display.trim()) {
      messages.push({
        role: "user",
        text: redact(clip(r.display, 4000) || r.display),
        timestamp: toMs(r.timestamp)
      });
    }
  }
  const metaPath = join(home(), ".gemini", "antigravity-cli", "cache", "conversation_metadata.json");
  const raw = parseJson(metaPath) as { conversations?: Record<string, { summary?: { Preview?: string; Title?: string } }> } | null;
  const summary = raw?.conversations?.[id]?.summary;
  const title = summary?.Title || summary?.Preview || id.slice(0, 8);
  if (messages.length === 0 && summary?.Preview) {
    messages.push({ role: "other", text: `Preview: ${redact(summary.Preview)}` });
  }
  return {
    engine: "agy",
    id,
    title: clip(title, 80) || id.slice(0, 8),
    messages,
    sourcePath: hist
  };
}

function transcriptGemini(id: string): EngineTranscript | null {
  const tmp = join(home(), ".gemini", "tmp");
  if (!existsSync(tmp)) return null;
  const candidateFiles = walkFiles(tmp, (n) => n.startsWith("session-") && n.endsWith(".jsonl"), 200);
  let file = candidateFiles.find((f) => basename(f).includes(id));
  if (!file) {
    for (const f of candidateFiles) {
      const head = safeRead(f, 2000);
      if (head && head.includes(id)) {
        file = f;
        break;
      }
    }
  }
  if (!file) return null;
  const messages: EngineMessage[] = [];
  for (const row of parseJsonl(file, 2000)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.type === "user" || r.type === "gemini" || r.type === "model" || r.type === "assistant") {
      let text = "";
      if (typeof r.content === "string") text = r.content;
      else if (Array.isArray(r.content)) {
        text = r.content
          .map((c) => (c && typeof c === "object" && typeof (c as { text?: string }).text === "string" ? (c as { text: string }).text : ""))
          .join("\n");
      }
      text = text.replace(/<session_context>[\s\S]*?<\/session_context>/gi, "").trim();
      if (!text) continue;
      messages.push({
        role: r.type === "user" ? "user" : "assistant",
        text: redact(clip(text, 4000) || text),
        timestamp: toMs(r.timestamp)
      });
    }
  }
  return {
    engine: "gemini",
    id,
    title: messages.find((m) => m.role === "user")?.text.slice(0, 80) || id.slice(0, 8),
    messages,
    sourcePath: file
  };
}

function transcriptCrush(id: string): EngineTranscript | null {
  const projectsPath = join(home(), ".local", "share", "crush", "projects.json");
  const raw = parseJson(projectsPath) as { projects?: Array<{ data_dir?: string }> } | null;
  const dirs = new Set<string>();
  if (raw?.projects) for (const p of raw.projects) if (p.data_dir) dirs.add(p.data_dir);
  dirs.add(join(home(), "projects", ".crush"));
  for (const dataDir of dirs) {
    const dbPath = join(dataDir, "crush.db");
    if (!existsSync(dbPath)) continue;
    try {
      const db = new Database(dbPath, { readonly: true });
      const sess = db.query(`SELECT id, title FROM sessions WHERE id = ?`).get(id) as { id: string; title: string } | null;
      if (!sess) {
        db.close();
        continue;
      }
      const rows = db
        .query(`SELECT role, parts, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 500`)
        .all(id) as Array<{ role: string; parts: string; created_at: number }>;
      const messages: EngineMessage[] = [];
      for (const row of rows) {
        let text = "";
        try {
          const parts = JSON.parse(row.parts) as Array<{ type?: string; data?: { text?: string } }>;
          text = parts.map((p) => p?.data?.text ?? "").join("\n").trim();
        } catch {
          text = row.parts;
        }
        if (!text) continue;
        messages.push({
          role: row.role === "user" ? "user" : row.role === "assistant" ? "assistant" : "other",
          text: redact(clip(text, 4000) || text),
          timestamp: toMs(row.created_at)
        });
      }
      db.close();
      return {
        engine: "crush",
        id,
        title: sess.title || id.slice(0, 8),
        messages,
        sourcePath: dbPath
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

function transcriptAuggie(id: string): EngineTranscript | null {
  const full = join(home(), ".augment", "sessions", `${id}.json`);
  const raw = parseJson(full) as Record<string, unknown> | null;
  if (!raw) return null;
  const messages: EngineMessage[] = [];
  if (Array.isArray(raw.chatHistory)) {
    for (const entry of raw.chatHistory) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const exchange =
        e.exchange && typeof e.exchange === "object" ? (e.exchange as Record<string, unknown>) : null;
      if (exchange) {
        if (typeof exchange.request_message === "string" && exchange.request_message.trim()) {
          messages.push({
            role: "user",
            text: redact(clip(exchange.request_message, 4000) || exchange.request_message),
            timestamp: toMs(e.finishedAt ?? e.timestamp)
          });
        }
        if (typeof exchange.response_text === "string" && exchange.response_text.trim()) {
          messages.push({
            role: "assistant",
            text: redact(clip(exchange.response_text, 4000) || exchange.response_text),
            timestamp: toMs(e.finishedAt ?? e.timestamp)
          });
        }
        continue;
      }
      const text = typeof e.content === "string" ? e.content : typeof e.text === "string" ? e.text : "";
      if (!text.trim()) continue;
      const roleRaw = String(e.role ?? e.type ?? "other").toLowerCase();
      const role: EngineMessage["role"] =
        roleRaw.includes("user") || roleRaw === "human"
          ? "user"
          : roleRaw.includes("assist") || roleRaw === "ai"
            ? "assistant"
            : "other";
      messages.push({ role, text: redact(clip(text, 4000) || text), timestamp: toMs(e.timestamp ?? e.created) });
    }
  }
  const title = (typeof raw.customTitle === "string" && raw.customTitle) || id.slice(0, 8);
  return { engine: "auggie", id, title, messages, sourcePath: full };
}

function transcriptGrok(id: string): EngineTranscript | null {
  const root = join(home(), ".grok", "sessions");
  if (!existsSync(root)) return null;
  for (const proj of readdirSync(root)) {
    const sess = join(root, proj, id);
    const chat = join(sess, "chat_history.jsonl");
    const summaryPath = join(sess, "summary.json");
    if (!existsSync(chat) && !existsSync(summaryPath)) continue;
    const summary = parseJson(summaryPath) as Record<string, unknown> | null;
    const title =
      (summary && typeof summary.generated_title === "string" && summary.generated_title) ||
      (summary && typeof summary.session_summary === "string" && summary.session_summary) ||
      id.slice(0, 8);
    const messages: EngineMessage[] = [];
    for (const row of parseJsonl(chat, 2000)) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const roleRaw = String(r.role ?? r.type ?? "").toLowerCase();
      let text = "";
      if (typeof r.content === "string") text = r.content;
      else if (typeof r.text === "string") text = r.text;
      else if (typeof r.message === "string") text = r.message;
      if (!text.trim()) continue;
      messages.push({
        role: roleRaw.includes("user") ? "user" : roleRaw.includes("assist") || roleRaw.includes("model") ? "assistant" : "other",
        text: redact(clip(text, 4000) || text),
        timestamp: toMs(r.timestamp ?? r.created_at)
      });
    }
    return { engine: "grok", id, title: clip(title, 80) || id.slice(0, 8), messages, sourcePath: chat };
  }
  return null;
}

function transcriptFreebuff(id: string): EngineTranscript | null {
  const root = join(home(), ".config", "manicode", "projects");
  const metas = walkFiles(root, (n, full) => n === "chat-meta.json" && full.includes(`/${id}/`), 20);
  let chatDir: string | null = null;
  for (const meta of walkFiles(root, (n) => n === "chat-meta.json", 300)) {
    if (basename(meta.replace(/\/chat-meta\.json$/, "")) === id) {
      chatDir = meta.replace(/\/chat-meta\.json$/, "");
      break;
    }
  }
  void metas;
  if (!chatDir) return null;
  const msgPath = join(chatDir, "chat-messages.json");
  const raw = parseJson(msgPath);
  const messages: EngineMessage[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const content = typeof e.content === "string" ? e.content : "";
      if (!content.trim()) continue;
      const variant = String(e.variant ?? "").toLowerCase();
      messages.push({
        role: variant === "user" ? "user" : variant === "ai" || variant === "assistant" ? "assistant" : "other",
        text: redact(clip(content, 4000) || content)
      });
    }
  }
  const meta = parseJson(join(chatDir, "chat-meta.json")) as { firstPrompt?: string } | null;
  return {
    engine: "freebuff",
    id,
    title: meta?.firstPrompt || id,
    messages,
    sourcePath: msgPath
  };
}

function transcriptCoderabbit(id: string): EngineTranscript | null {
  const full = join(home(), ".coderabbit", "logs", `${id}.log`);
  const text = safeRead(full, 100_000);
  if (!text) return null;
  return {
    engine: "coderabbit",
    id,
    title: `CLI run ${id.slice(-12)}`,
    messages: [{ role: "other", text: redact(text.slice(-8000)) }],
    sourcePath: full
  };
}

function transcriptCodex(id: string): EngineTranscript | null {
  const sessions = join(home(), ".codex", "sessions");
  const files = walkFiles(sessions, (n) => n.includes(id) && n.endsWith(".jsonl"), 10);
  const file = files[0];
  if (!file) return null;
  const messages: EngineMessage[] = [];
  for (const row of parseJsonl(file, 1500)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.type === "event_msg" && r.payload && typeof r.payload === "object") {
      const p = r.payload as Record<string, unknown>;
      if (p.type === "user_message" && typeof p.message === "string") {
        messages.push({ role: "user", text: redact(clip(p.message, 4000) || p.message), timestamp: toMs(r.timestamp) });
      }
      if (p.type === "agent_message" && typeof p.message === "string") {
        messages.push({ role: "assistant", text: redact(clip(p.message, 4000) || p.message), timestamp: toMs(r.timestamp) });
      }
    }
  }
  return {
    engine: "codex",
    id,
    title: messages.find((m) => m.role === "user")?.text.slice(0, 80) || id.slice(0, 8),
    messages,
    sourcePath: file
  };
}

const TRANSCRIPTS: Record<EngineId, (id: string) => EngineTranscript | null> = {
  codex: transcriptCodex,
  claude: transcriptClaude,
  agy: transcriptAgy,
  gemini: transcriptGemini,
  crush: transcriptCrush,
  auggie: transcriptAuggie,
  grok: transcriptGrok,
  freebuff: transcriptFreebuff,
  coderabbit: transcriptCoderabbit
};

export function getEngineTranscript(engine: EngineId, id: string): EngineTranscript | null {
  try {
    return TRANSCRIPTS[engine](id);
  } catch {
    return null;
  }
}

export function isEngineId(value: string): value is EngineId {
  return AGENT_ENGINE_CATALOG.some((e) => e.id === value);
}

/** Future multi-agent: engines with chatRuntime capability. */
export function enginesReadyForChatRuntime(): EngineMeta[] {
  return ENGINE_CATALOG.filter((e) => e.canChat);
}

