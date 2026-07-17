import {
  DANGER_CONFIRMATION,
  type EngineStatus,
  type JsonRpcFailure,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonValue,
  type DangerousPermissionAuditEvent,
  type ProviderActivation,
  type ProviderConfig,
  type ServerToClientMessage,
  type UiProfile,
  type UiProfileImportResult
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
  inputSchema: JsonValue;
  outputSchema?: JsonValue;
  annotations?: JsonValue;
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
  authPolicy: string;
  installPolicy: string;
  installPolicySource?: string;
  category?: string;
  developerName?: string;
  websiteUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  defaultPrompt: string[];
  logoUrl?: string;
  screenshotUrls: string[];
  capabilities: string[];
  keywords: string[];
};

export type PluginAppEntry = {
  id: string;
  name: string;
  description?: string;
  installUrl?: string;
  category?: string;
  isAccessible?: boolean;
  isEnabled?: boolean;
  pluginDisplayNames: string[];
  logoUrl?: string;
  developer?: string;
  website?: string;
};

export type PluginAppTemplateEntry = {
  templateId: string;
  name: string;
  description?: string;
  category?: string;
  canonicalConnectorId?: string;
  logoUrl?: string;
  materializedAppIds: string[];
  reason?: string;
};

export type PluginDetailEntry = {
  marketplaceName: string;
  marketplacePath?: string;
  plugin: PluginEntry;
  description?: string;
  shareUrl?: string;
  skills: Array<{ name: string; description?: string; enabled: boolean; path?: string; remoteReadable: boolean }>;
  hooks: Array<{ key: string; eventName: string }>;
  apps: PluginAppEntry[];
  appTemplates: PluginAppTemplateEntry[];
  mcpServers: string[];
  scheduledTaskCount?: number;
};

export type PluginInstallAuthNotice = {
  authPolicy: string;
  apps: PluginAppEntry[];
};

export type McpResourceContentEntry = {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
};

export type FsDirectoryEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
};

export type TerminalSession = {
  processId: string;
  command: string;
  cwd: string;
  output: string;
  status: "running" | "completed" | "failed" | "terminated";
  exitCode?: number;
  rows: number;
  cols: number;
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
  installedPluginMarketplaces: PluginMarketplace[];
  apps: PluginAppEntry[];
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
    installedPluginMarketplaces: [],
    apps: [],
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

export async function exportProfile(token: string): Promise<UiProfile> {
  const response = await fetch("/api/profile/export", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    throw new Error(`Failed to export profile: ${response.status}`);
  }
  return (await response.json()) as UiProfile;
}

export async function importProfile(token: string, profile: UiProfile): Promise<UiProfileImportResult> {
  const response = await fetch("/api/profile/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(profile)
  });
  if (!response.ok) {
    throw new Error(`Failed to import profile: ${response.status}`);
  }
  return (await response.json()) as UiProfileImportResult;
}

export async function fetchAuditEvents(token: string): Promise<DangerousPermissionAuditEvent[]> {
  const response = await fetch("/api/audit/events", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    throw new Error(`Failed to read audit events: ${response.status}`);
  }
  const body = (await response.json()) as { data?: DangerousPermissionAuditEvent[] };
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

export function parseInstalledPluginMarketplaces(value: JsonValue): Pick<ToolingState, "installedPluginMarketplaces" | "marketplaceErrors"> {
  const record = asRecord(value);
  return {
    installedPluginMarketplaces: asArray(record.marketplaces).map((marketplace) => marketplaceToEntry(asRecord(marketplace))),
    marketplaceErrors: asArray(record.marketplaceLoadErrors).map((error) => {
      const raw = asRecord(error);
      return [stringValue(raw.marketplacePath), stringValue(raw.message)].filter(Boolean).join(": ") || "Installed plugin load failed";
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
      return appSummaryToEntry(raw);
    }),
    appTemplates: asArray(detail.appTemplates).map((template) => appTemplateToEntry(asRecord(template))),
    mcpServers: asArray(detail.mcpServers).map(String),
    scheduledTaskCount: Array.isArray(detail.scheduledTasks) ? detail.scheduledTasks.length : undefined
  };
}

export function parsePluginInstallAuthNotice(value: JsonValue): PluginInstallAuthNotice {
  const record = asRecord(value);
  return {
    authPolicy: stringValue(record.authPolicy) ?? "unknown",
    apps: asArray(record.appsNeedingAuth).map((app) => appSummaryToEntry(asRecord(app)))
  };
}

export function parseApps(value: JsonValue): PluginAppEntry[] {
  return asArray(asRecord(value).data).map((app) => {
    const raw = asRecord(app);
    const branding = asRecord(raw.branding);
    return {
      id: stringValue(raw.id) ?? "app",
      name: stringValue(raw.name) ?? "App",
      description: stringValue(raw.description),
      installUrl: stringValue(raw.installUrl),
      category: stringValue(branding.category),
      isAccessible: boolValue(raw.isAccessible),
      isEnabled: boolValue(raw.isEnabled),
      pluginDisplayNames: asArray(raw.pluginDisplayNames).map(String),
      logoUrl: stringValue(raw.logoUrl) ?? stringValue(raw.logoUrlDark),
      developer: stringValue(branding.developer),
      website: stringValue(branding.website)
    };
  });
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

export function parseFsDirectory(value: JsonValue, parentPath: string): FsDirectoryEntry[] {
  return asArray(asRecord(value).entries)
    .map((entry) => {
      const raw = asRecord(entry);
      const name = stringValue(raw.fileName) ?? "";
      if (!name) {
        return null;
      }
      return {
        name,
        path: joinPath(parentPath, name),
        isDirectory: boolValue(raw.isDirectory) ?? false,
        isFile: boolValue(raw.isFile) ?? false
      };
    })
    .filter(isPresent)
    .sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) {
        return left.isDirectory ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
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
    description: stringValue(tool.description),
    inputSchema: "inputSchema" in tool ? (tool.inputSchema as JsonValue) : {},
    outputSchema: "outputSchema" in tool ? (tool.outputSchema as JsonValue) : undefined,
    annotations: "annotations" in tool ? (tool.annotations as JsonValue) : undefined
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
    authPolicy: stringValue(plugin.authPolicy) ?? "unknown",
    installPolicy: stringValue(plugin.installPolicy) ?? "unknown",
    installPolicySource: stringValue(plugin.installPolicySource),
    category: stringValue(pluginInterface.category),
    developerName: stringValue(pluginInterface.developerName),
    websiteUrl: stringValue(pluginInterface.websiteUrl),
    privacyPolicyUrl: stringValue(pluginInterface.privacyPolicyUrl),
    termsOfServiceUrl: stringValue(pluginInterface.termsOfServiceUrl),
    defaultPrompt: asArray(pluginInterface.defaultPrompt).map(String),
    logoUrl: stringValue(pluginInterface.logoUrl) ?? stringValue(pluginInterface.logoUrlDark) ?? stringValue(pluginInterface.composerIconUrl),
    screenshotUrls: asArray(pluginInterface.screenshotUrls).map(String),
    capabilities: asArray(pluginInterface.capabilities).map(String),
    keywords: asArray(plugin.keywords).map(String)
  };
}

function appSummaryToEntry(app: Record<string, unknown>): PluginAppEntry {
  return {
    id: stringValue(app.id) ?? "app",
    name: stringValue(app.name) ?? "App",
    description: stringValue(app.description),
    installUrl: stringValue(app.installUrl),
    category: stringValue(app.category),
    pluginDisplayNames: []
  };
}

function appTemplateToEntry(template: Record<string, unknown>): PluginAppTemplateEntry {
  return {
    templateId: stringValue(template.templateId) ?? "template",
    name: stringValue(template.name) ?? "App template",
    description: stringValue(template.description),
    category: stringValue(template.category),
    canonicalConnectorId: stringValue(template.canonicalConnectorId),
    logoUrl: stringValue(template.logoUrl) ?? stringValue(template.logoUrlDark),
    materializedAppIds: asArray(template.materializedAppIds).map(String),
    reason: stringValue(template.reason)
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

function joinPath(parentPath: string, name: string): string {
  return `${parentPath.replace(/\/+$/, "")}/${name}`;
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
      return [`MCP`, stringValue(item.server), stringValue(item.tool)].filter(Boolean).join(" / ");
    case "dynamicToolCall":
      return [`Tool`, stringValue(item.namespace), stringValue(item.tool)].filter(Boolean).join(" / ");
    default:
      return type;
  }
}

function itemText(item: Record<string, unknown>): string {
  if (stringValue(item.type) === "mcpToolCall") {
    const payload = asRecord(item.result);
    const error = asRecord(item.error);
    const errorMessage = stringValue(error.message);
    if (errorMessage) {
      return errorMessage;
    }
    if (Array.isArray(payload.content) && payload.content.length > 0) {
      return payload.content.map((entry) => summarizeJsonValue(entry)).filter(Boolean).join("\n");
    }
    if ("structuredContent" in payload && payload.structuredContent != null) {
      return summarizeJsonValue(payload.structuredContent);
    }
    if ("arguments" in item) {
      return summarizeJsonValue(item.arguments);
    }
  }
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

function summarizeJsonValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}
