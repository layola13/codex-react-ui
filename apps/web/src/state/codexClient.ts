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

export type McpToolEntry = {
  name: string;
  title?: string;
  description?: string;
};

export type McpResourceEntry = {
  name: string;
  title?: string;
  uri?: string;
  description?: string;
};

export type McpServerEntry = {
  name: string;
  authStatus: string;
  serverInfo?: string;
  tools: McpToolEntry[];
  resources: McpResourceEntry[];
  resourceTemplates: McpResourceEntry[];
};

export type SkillEntry = {
  name: string;
  displayName: string;
  description: string;
  shortDescription?: string;
  path: string;
  scope: string;
  enabled: boolean;
};

export type SkillGroup = {
  cwd: string;
  skills: SkillEntry[];
  errors: Array<{ path: string; message: string }>;
};

export type PluginEntry = {
  id: string;
  remotePluginId?: string;
  name: string;
  displayName: string;
  description?: string;
  version?: string;
  localVersion?: string;
  installed: boolean;
  enabled: boolean;
  source: string;
  availability: string;
  capabilities: string[];
  keywords: string[];
};

export type PluginDetailEntry = {
  marketplaceName: string;
  marketplacePath?: string;
  plugin: PluginEntry;
  description?: string;
  shareUrl?: string;
  skills: Array<{ name: string; description?: string; enabled: boolean; path?: string; remoteReadable: boolean }>;
  hooks: Array<{ key: string; eventName: string }>;
  apps: Array<{ id: string; name: string; description?: string }>;
  mcpServers: string[];
  scheduledTaskCount?: number;
};

export type McpResourceContentEntry = {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
};

export type ComposerMention = {
  name: string;
  path: string;
  token: string;
};

export type PluginMarketplace = {
  name: string;
  path?: string;
  displayName?: string;
  description?: string;
  plugins: PluginEntry[];
};

export type ToolingState = {
  mcpServers: McpServerEntry[];
  skillGroups: SkillGroup[];
  pluginMarketplaces: PluginMarketplace[];
  featuredPluginIds: string[];
  marketplaceErrors: string[];
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
  tooling: ToolingState;
  toolingLoading: boolean;
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
  tooling: {
    mcpServers: [],
    skillGroups: [],
    pluginMarketplaces: [],
    featuredPluginIds: [],
    marketplaceErrors: []
  },
  toolingLoading: false,
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

export function composerInputToUserInput(text: string, images: ComposerImageAttachment[], mentions: ComposerMention[] = []): JsonValue[] {
  const input: JsonValue[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    input.push({ type: "text", text: trimmed, text_elements: [] });
  }
  for (const mention of mentions) {
    if (trimmed.includes(mention.token)) {
      input.push({ type: "mention", name: mention.name, path: mention.path });
    }
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

export function parseMcpServers(value: JsonValue): McpServerEntry[] {
  const data = asArray(asRecord(value).data);
  return data.map((entry) => {
    const server = asRecord(entry);
    const toolsRecord = asRecord(server.tools);
    return {
      name: stringValue(server.name) ?? "Unnamed MCP server",
      authStatus: stringValue(server.authStatus) ?? "unknown",
      serverInfo: serverInfoLabel(server.serverInfo),
      tools: Object.values(toolsRecord).map((tool) => mcpToolToEntry(asRecord(tool))),
      resources: asArray(server.resources).map((resource) => mcpResourceToEntry(asRecord(resource))),
      resourceTemplates: asArray(server.resourceTemplates).map((resource) => mcpResourceToEntry(asRecord(resource)))
    };
  });
}

export function parseSkillGroups(value: JsonValue): SkillGroup[] {
  return asArray(asRecord(value).data).map((entry) => {
    const group = asRecord(entry);
    return {
      cwd: stringValue(group.cwd) ?? "global",
      skills: asArray(group.skills).map((skill) => skillToEntry(asRecord(skill))),
      errors: asArray(group.errors).map((error) => {
        const raw = asRecord(error);
        return {
          path: stringValue(raw.path) ?? "unknown",
          message: stringValue(raw.message) ?? "Unable to load skill"
        };
      })
    };
  });
}

export function parsePluginMarketplaces(value: JsonValue): Pick<ToolingState, "pluginMarketplaces" | "featuredPluginIds" | "marketplaceErrors"> {
  const record = asRecord(value);
  return {
    pluginMarketplaces: asArray(record.marketplaces).map((marketplace) => marketplaceToEntry(asRecord(marketplace))),
    featuredPluginIds: asArray(record.featuredPluginIds).map(String),
    marketplaceErrors: asArray(record.marketplaceLoadErrors).map((error) => {
      const raw = asRecord(error);
      return [stringValue(raw.marketplacePath), stringValue(raw.message)].filter(Boolean).join(": ") || "Marketplace load failed";
    })
  };
}

export function parsePluginDetail(value: JsonValue): PluginDetailEntry | null {
  const detail = asRecord(asRecord(value).plugin);
  const summary = asRecord(detail.summary);
  const marketplaceName = stringValue(detail.marketplaceName);
  if (!marketplaceName) {
    return null;
  }
  return {
    marketplaceName,
    marketplacePath: stringValue(detail.marketplacePath),
    plugin: pluginToEntry(summary),
    description: stringValue(detail.description),
    shareUrl: stringValue(detail.shareUrl),
    skills: asArray(detail.skills).map((skill) => {
      const raw = asRecord(skill);
      return {
        name: stringValue(raw.name) ?? "skill",
        description: stringValue(raw.description) ?? stringValue(raw.shortDescription),
        enabled: boolValue(raw.enabled) ?? false,
        path: stringValue(raw.path),
        remoteReadable: stringValue(summary.remotePluginId) != null
      };
    }),
    hooks: asArray(detail.hooks).map((hook) => {
      const raw = asRecord(hook);
      return {
        key: stringValue(raw.key) ?? "hook",
        eventName: stringValue(raw.eventName) ?? "hook"
      };
    }),
    apps: asArray(detail.apps).map((app) => {
      const raw = asRecord(app);
      return {
        id: stringValue(raw.id) ?? "app",
        name: stringValue(raw.name) ?? "App",
        description: stringValue(raw.description)
      };
    }),
    mcpServers: asArray(detail.mcpServers).map(String),
    scheduledTaskCount: Array.isArray(detail.scheduledTasks) ? detail.scheduledTasks.length : undefined
  };
}

export function parseMcpResourceContents(value: JsonValue): McpResourceContentEntry[] {
  return asArray(asRecord(value).contents).map((entry) => {
    const raw = asRecord(entry);
    return {
      uri: stringValue(raw.uri) ?? "resource",
      mimeType: stringValue(raw.mimeType),
      text: stringValue(raw.text),
      blob: stringValue(raw.blob)
    };
  });
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

function boolValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function serverInfoLabel(value: unknown): string | undefined {
  const info = asRecord(value);
  const name = stringValue(info.name);
  const title = stringValue(info.title);
  const version = stringValue(info.version);
  return [title ?? name, version].filter(Boolean).join(" ") || undefined;
}

function mcpToolToEntry(tool: Record<string, unknown>): McpToolEntry {
  return {
    name: stringValue(tool.name) ?? "unnamed-tool",
    title: stringValue(tool.title),
    description: stringValue(tool.description)
  };
}

function mcpResourceToEntry(resource: Record<string, unknown>): McpResourceEntry {
  return {
    name: stringValue(resource.name) ?? stringValue(resource.uri) ?? stringValue(resource.uriTemplate) ?? "resource",
    title: stringValue(resource.title),
    uri: stringValue(resource.uri) ?? stringValue(resource.uriTemplate),
    description: stringValue(resource.description)
  };
}

function skillToEntry(skill: Record<string, unknown>): SkillEntry {
  const skillInterface = asRecord(skill.interface);
  const displayName = stringValue(skillInterface.displayName) ?? stringValue(skill.name) ?? "Unnamed skill";
  return {
    name: stringValue(skill.name) ?? displayName,
    displayName,
    description: stringValue(skill.description) ?? stringValue(skillInterface.shortDescription) ?? "",
    shortDescription: stringValue(skill.shortDescription) ?? stringValue(skillInterface.shortDescription),
    path: stringValue(skill.path) ?? "",
    scope: stringValue(skill.scope) ?? "unknown",
    enabled: boolValue(skill.enabled) ?? false
  };
}

function marketplaceToEntry(marketplace: Record<string, unknown>): PluginMarketplace {
  const marketplaceInterface = asRecord(marketplace.interface);
  return {
    name: stringValue(marketplace.name) ?? "marketplace",
    path: stringValue(marketplace.path),
    displayName: stringValue(marketplaceInterface.displayName),
    plugins: asArray(marketplace.plugins).map((plugin) => pluginToEntry(asRecord(plugin)))
  };
}

function pluginToEntry(plugin: Record<string, unknown>): PluginEntry {
  const pluginInterface = asRecord(plugin.interface);
  return {
    id: stringValue(plugin.id) ?? stringValue(plugin.name) ?? "plugin",
    remotePluginId: stringValue(plugin.remotePluginId),
    name: stringValue(plugin.name) ?? stringValue(plugin.id) ?? "plugin",
    displayName: stringValue(pluginInterface.displayName) ?? stringValue(plugin.name) ?? "Plugin",
    description: stringValue(pluginInterface.shortDescription) ?? stringValue(pluginInterface.longDescription),
    version: stringValue(plugin.version),
    localVersion: stringValue(plugin.localVersion),
    installed: boolValue(plugin.installed) ?? false,
    enabled: boolValue(plugin.enabled) ?? false,
    source: sourceLabel(plugin.source),
    availability: stringValue(plugin.availability) ?? "unknown",
    capabilities: asArray(pluginInterface.capabilities).map(String),
    keywords: asArray(plugin.keywords).map(String)
  };
}

function sourceLabel(value: unknown): string {
  const source = asRecord(value);
  const type = stringValue(source.type);
  switch (type) {
    case "local":
      return stringValue(source.path) ?? "local";
    case "git":
      return stringValue(source.url) ?? "git";
    case "npm":
      return stringValue(source.package) ?? "npm";
    case "remote":
      return "remote";
    default:
      return "unknown";
  }
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
