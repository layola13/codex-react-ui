import {
  DANGER_CONFIRMATION,
  type EngineStatus,
  type JsonRpcFailure,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonValue,
  type ProviderActivation,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";

export type PendingServerRequest = {
  id: string | number;
  method: string;
  params?: JsonValue;
};

export type ModelEntry = {
  id?: string;
  model?: string;
  displayName?: string;
  description?: string;
  hidden?: boolean;
  supportedReasoningEfforts?: Array<{ reasoningEffort: string; description?: string }>;
};

export type ThreadEntry = {
  id: string;
  preview?: string;
  model?: string;
  modelProvider?: string;
  createdAt?: number;
  updatedAt?: number;
  status?: string;
};

export type WorkbenchItem = {
  id: string;
  type: string;
  title: string;
  text: string;
  images?: WorkbenchImage[];
  status?: string;
  payload?: JsonValue;
};

export type WorkbenchImage = {
  url: string;
  name?: string;
  detail?: string;
};

export type WorkbenchTurn = {
  id: string;
  threadId: string;
  status: string;
  items: WorkbenchItem[];
};

export type ClientState = {
  token: string | null;
  connected: boolean;
  engine: EngineStatus;
  account: JsonValue | null;
  models: ModelEntry[];
  providers: ProviderConfig[];
  threads: ThreadEntry[];
  activeThreadId: string | null;
  turns: WorkbenchTurn[];
  pendingRequests: PendingServerRequest[];
  errors: string[];
};

export type ComposerImageAttachment = {
  id: string;
  name: string;
  url: string;
  size: number;
  mediaType: string;
};

export const initialClientState: ClientState = {
  token: null,
  connected: false,
  engine: { phase: "idle" },
  account: null,
  models: [],
  providers: [],
  threads: [],
  activeThreadId: null,
  turns: [],
  pendingRequests: [],
  errors: []
};

export class CodexSocketClient extends EventTarget {
  private socket: WebSocket | null = null;
  private nextClientId = 1;
  private pending = new Map<
    string,
    {
      resolve: (value: JsonValue) => void;
      reject: (error: JsonRpcFailure["error"]) => void;
    }
  >();

  public async connect(token: string): Promise<void> {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => {
        this.dispatch("connected", true);
        resolve();
      });
      socket.addEventListener("error", () => reject(new Error("WebSocket connection failed")), {
        once: true
      });
      socket.addEventListener("close", () => this.dispatch("connected", false));
      socket.addEventListener("message", (event) => this.handleMessage(event.data));
    });
  }

  public rpc(method: string, params?: JsonValue): Promise<JsonValue> {
    const id = `ui-${this.nextClientId++}`;
    this.send({ type: "rpc", id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  public respondToServerRequest(id: string | number, result?: JsonValue, error?: JsonRpcFailure["error"]): void {
    this.send({ type: "serverResponse", requestId: id, result, error });
  }

  public saveProvider(provider: ProviderConfig, apiKey?: string): Promise<ProviderConfig> {
    const id = `provider-${this.nextClientId++}`;
    this.send({ type: "provider.save", id, provider, apiKey });
    return new Promise((resolve, reject) => {
      const onMessage = (event: Event) => {
        const detail = (event as CustomEvent<ServerToClientMessage>).detail;
        if (detail.type === "provider.saved" && detail.id === id) {
          this.removeEventListener("server-message", onMessage);
          resolve(detail.provider);
        }
        if (detail.type === "server.error") {
          this.removeEventListener("server-message", onMessage);
          reject(new Error(detail.message));
        }
      };
      this.addEventListener("server-message", onMessage);
    });
  }

  public activateProvider(providerId: string, model?: string): Promise<ProviderActivation> {
    const id = `provider-activate-${this.nextClientId++}`;
    this.send({ type: "provider.activate", id, providerId, model });
    return new Promise((resolve, reject) => {
      const onMessage = (event: Event) => {
        const detail = (event as CustomEvent<ServerToClientMessage>).detail;
        if (detail.type === "provider.activated" && detail.id === id) {
          this.removeEventListener("server-message", onMessage);
          resolve(detail.activation);
        }
        if (detail.type === "server.error") {
          this.removeEventListener("server-message", onMessage);
          reject(new Error(detail.message));
        }
      };
      this.addEventListener("server-message", onMessage);
    });
  }

  private send(value: object): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.socket.send(JSON.stringify(value));
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as ServerToClientMessage;
    this.dispatch("server-message", message);
    if (message.type === "rpc.result") {
      this.pending.get(message.id)?.resolve(message.result);
      this.pending.delete(message.id);
    }
    if (message.type === "rpc.error") {
      this.pending.get(message.id)?.reject(message.error);
      this.pending.delete(message.id);
    }
  }

  private dispatch<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export async function fetchSessionToken(): Promise<string> {
  const response = await fetch("/api/session");
  if (!response.ok) {
    throw new Error(`Failed to read UI session: ${response.status}`);
  }
  const body = (await response.json()) as { token: string };
  return body.token;
}

export async function fetchProviders(token: string): Promise<ProviderConfig[]> {
  const response = await fetch("/api/providers", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as { data?: ProviderConfig[] };
  return body.data ?? [];
}

export function applyNotification(state: ClientState, notification: JsonRpcNotification): ClientState {
  const method = notification.method;
  const params = asRecord(notification.params);
  if (method === "thread/started") {
    const thread = asRecord(params.thread);
    const id = stringValue(thread.id);
    if (!id) {
      return state;
    }
    const entry: ThreadEntry = {
      id,
      preview: stringValue(thread.preview),
      model: stringValue(thread.model),
      modelProvider: stringValue(thread.modelProvider),
      status: stringValue(thread.status)
    };
    return {
      ...state,
      activeThreadId: id,
      threads: upsertById(state.threads, entry)
    };
  }
  if (method === "turn/started") {
    const turn = asRecord(params.turn);
    const id = stringValue(turn.id);
    const threadId = stringValue(params.threadId) ?? stringValue(turn.threadId) ?? state.activeThreadId;
    if (!id || !threadId) {
      return state;
    }
    return {
      ...state,
      activeThreadId: threadId,
      turns: upsertTurn(state.turns, {
        id,
        threadId,
        status: "inProgress",
        items: []
      })
    };
  }
  if (method === "item/started" || method === "item/completed") {
    const item = asRecord(params.item);
    const itemId = stringValue(item.id);
    const turnId = stringValue(params.turnId);
    if (!itemId || !turnId) {
      return state;
    }
    const nextItem: WorkbenchItem = {
      id: itemId,
      type: stringValue(item.type) ?? inferItemType(item),
      title: itemTitle(item),
      text: itemText(item),
      images: itemImages(item),
      status: stringValue(item.status),
      payload: item as JsonValue
    };
    return {
      ...state,
      turns: state.turns.map((turn) =>
        turn.id === turnId ? { ...turn, items: upsertById(turn.items, nextItem) } : turn
      )
    };
  }
  if (method === "item/agentMessage/delta") {
    const itemId = stringValue(params.itemId);
    const turnId = stringValue(params.turnId);
    const delta = stringValue(params.delta) ?? "";
    if (!itemId || !turnId) {
      return state;
    }
    return {
      ...state,
      turns: state.turns.map((turn) => {
        if (turn.id !== turnId) {
          return turn;
        }
        const existing = turn.items.find((item) => item.id === itemId);
        const item: WorkbenchItem = existing ?? {
          id: itemId,
          type: "agentMessage",
          title: "Codex",
          text: ""
        };
        return {
          ...turn,
          items: upsertById(turn.items, { ...item, text: `${item.text}${delta}` })
        };
      })
    };
  }
  if (method === "turn/completed") {
    const turn = asRecord(params.turn);
    const id = stringValue(turn.id);
    if (!id) {
      return state;
    }
    return {
      ...state,
      turns: state.turns.map((entry) =>
        entry.id === id ? { ...entry, status: stringValue(turn.status) ?? "completed" } : entry
      )
    };
  }
  if (method === "error") {
    const error = asRecord(params.error);
    return {
      ...state,
      errors: [stringValue(error.message) ?? "Codex error", ...state.errors].slice(0, 8)
    };
  }
  return state;
}

export function dangerousConfirmationMatches(value: string): boolean {
  return value.trim() === DANGER_CONFIRMATION;
}

export function threadReadToTurns(value: JsonValue): { thread: ThreadEntry | null; turns: WorkbenchTurn[] } {
  const thread = asRecord(asRecord(value).thread);
  const threadId = stringValue(thread.id);
  if (!threadId) {
    return { thread: null, turns: [] };
  }
  const turns = Array.isArray(thread.turns)
    ? thread.turns.map((turn) => turnToWorkbenchTurn(threadId, asRecord(turn))).filter(isPresent)
    : [];
  return {
    thread: threadToEntry(thread),
    turns
  };
}

export function composerInputToUserInput(text: string, images: ComposerImageAttachment[]): JsonValue[] {
  const input: JsonValue[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    input.push({ type: "text", text: trimmed, text_elements: [] });
  }
  for (const image of images) {
    input.push({
      type: "image",
      url: image.url,
      detail: "auto"
    });
  }
  return input;
}

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const found = items.some((item) => item.id === next.id);
  return found ? items.map((item) => (item.id === next.id ? next : item)) : [next, ...items];
}

function upsertTurn(items: WorkbenchTurn[], next: WorkbenchTurn): WorkbenchTurn[] {
  const found = items.some((item) => item.id === next.id);
  return found ? items.map((item) => (item.id === next.id ? { ...item, ...next } : item)) : [...items, next];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function threadToEntry(thread: Record<string, unknown>): ThreadEntry {
  return {
    id: String(thread.id ?? ""),
    preview: stringValue(thread.preview) ?? stringValue(thread.name),
    model: stringValue(thread.model),
    modelProvider: stringValue(thread.modelProvider),
    createdAt: numberValue(thread.createdAt),
    updatedAt: numberValue(thread.updatedAt),
    status: stringValue(thread.status)
  };
}

function turnToWorkbenchTurn(threadId: string, turn: Record<string, unknown>): WorkbenchTurn | null {
  const id = stringValue(turn.id);
  if (!id) {
    return null;
  }
  const items = Array.isArray(turn.items)
    ? turn.items.map((item) => threadItemToWorkbenchItem(asRecord(item))).filter(isPresent)
    : [];
  return {
    id,
    threadId,
    status: stringValue(turn.status) ?? "completed",
    items
  };
}

function threadItemToWorkbenchItem(item: Record<string, unknown>): WorkbenchItem | null {
  const id = stringValue(item.id);
  if (!id) {
    return null;
  }
  const type = stringValue(item.type) ?? inferItemType(item);
  return {
    id,
    type,
    title: itemTitle(item),
    text: itemText(item),
    images: itemImages(item),
    status: stringValue(item.status),
    payload: item as JsonValue
  };
}

function inferItemType(item: Record<string, unknown>): string {
  if ("text" in item) return "agentMessage";
  if ("command" in item) return "commandExecution";
  if ("changes" in item) return "fileChange";
  if ("summary" in item) return "reasoning";
  return "item";
}

function itemTitle(item: Record<string, unknown>): string {
  const type = stringValue(item.type) ?? inferItemType(item);
  switch (type) {
    case "agentMessage":
      return "Codex";
    case "userMessage":
      return "User";
    case "commandExecution":
      return "Command";
    case "fileChange":
      return "File change";
    case "reasoning":
      return "Reasoning";
    case "mcpToolCall":
      return "MCP tool";
    default:
      return type;
  }
}

function itemText(item: Record<string, unknown>): string {
  if (typeof item.text === "string") {
    return item.text;
  }
  if (Array.isArray(item.command)) {
    return item.command.map(String).join(" ");
  }
  if (typeof item.aggregatedOutput === "string") {
    return item.aggregatedOutput;
  }
  if (Array.isArray(item.content)) {
    return item.content
      .map((entry) => {
        const block = asRecord(entry);
        if (block.type === "text") {
          return stringValue(block.text) ?? "";
        }
        if (block.type === "localImage") {
          return `[image: ${stringValue(block.path) ?? "local image"}]`;
        }
        if (block.type === "image") {
          return `[image: ${stringValue(block.url) ?? "attached image"}]`;
        }
        if (block.type === "skill" || block.type === "mention") {
          return `@${stringValue(block.name) ?? "mention"}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function itemImages(item: Record<string, unknown>): WorkbenchImage[] | undefined {
  if (!Array.isArray(item.content)) {
    return undefined;
  }
  const images = item.content
    .map((entry): WorkbenchImage | null => {
      const block = asRecord(entry);
      if (block.type === "image") {
        const url = stringValue(block.url);
        return url ? { url, detail: stringValue(block.detail) } : null;
      }
      if (block.type === "localImage") {
        const path = stringValue(block.path);
        return path ? { url: path, name: path, detail: stringValue(block.detail) } : null;
      }
      return null;
    })
    .filter(isPresent);
  return images.length > 0 ? images : undefined;
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}
