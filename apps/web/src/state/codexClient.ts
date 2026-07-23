import {
  DANGER_CONFIRMATION,
  type AuthSession,
  type AuthUser,
  type CaptchaChallenge,
  type PublicAuthConfig,
  type SystemAuthSettings,
  type UsageSummary,
  type EngineStatus,
  type ImageGenerationProtocol,
  type JsonRpcFailure,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonValue,
  type DangerousPermissionAuditEvent,
  type PermissionPresetId,
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

export type HookEntry = {
  key: string;
  eventName: string;
  handlerType: string;
  matcher?: string;
  command?: string;
  timeoutSec?: number;
  statusMessage?: string;
  sourcePath: string;
  source: string;
  pluginId?: string;
  displayOrder?: number;
  enabled: boolean;
  isManaged: boolean;
  currentHash?: string;
  trustStatus: string;
};

export type HookGroup = {
  cwd: string;
  hooks: HookEntry[];
  warnings: string[];
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

export type WebDevServerStatus = "running" | "completed" | "failed" | "terminated";

export type WebDevServerSession = {
  id: string;
  command: string;
  cwd: string;
  status: WebDevServerStatus;
  output: string;
  url?: string;
  pid?: number;
  exitCode?: number;
  startedAt: number;
  updatedAt: number;
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
  hookGroups: HookGroup[];
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
  sessionId?: string;
  title?: string;
  name?: string;
  preview?: string;
  model?: string;
  modelProvider?: string;
  parentThreadId?: string;
  forkedFromId?: string;
  agentNickname?: string;
  agentRole?: string;
  createdAt?: number;
  updatedAt?: number;
  recencyAt?: number;
  status?: string;
  cwd?: string;
  source?: string;
  threadSource?: string;
  path?: string;
};

export type WorkbenchItem = {
  id: string;
  type: string;
  title: string;
  text: string;
  images?: WorkbenchImage[];
  files?: WorkbenchFile[];
  status?: string;
  firstTokenAt?: number;
  agentId?: string;
  agentThreadId?: string;
  agentName?: string;
  agentRole?: string;
  agentStatus?: string;
  payload?: JsonValue;
};

export type WorkbenchImage = {
  url: string;
  name?: string;
  detail?: string;
  revisedPrompt?: string;
  model?: string;
  providerName?: string;
};

export type WorkbenchFile = {
  name: string;
  path?: string;
  url?: string;
  mediaType?: string;
  size?: number;
};

export type WorkbenchTurn = {
  id: string;
  threadId: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
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
  kind?: "image" | "file";
  path?: string;
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
    hookGroups: [],
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
  private token: string | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private connectPromise: Promise<void> | null = null;
  private closedByClient = false;
  private nextClientId = 1;
  private pending = new Map<
    string,
    {
      resolve: (value: JsonValue) => void;
      reject: (error: JsonRpcFailure["error"]) => void;
    }
  >();

  public async connect(token: string): Promise<void> {
    this.token = token;
    this.closedByClient = false;
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this.openSocket(token);
    return this.connectPromise;
  }

  public disconnect(): void {
    this.closedByClient = true;
    this.clearReconnectTimer();
    this.rejectPending("WebSocket disconnected");
    this.socket?.close();
    this.socket = null;
    this.connectPromise = null;
    this.dispatch("connected", false);
  }

  private openSocket(token: string): Promise<void> {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`);
    this.socket = socket;
    let opened = false;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const rejectOnce = (message: string) => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      };
      const failHandshake = (message: string) => {
        if (opened || this.socket !== socket) return;
        window.clearTimeout(handshakeTimer);
        this.socket = null;
        this.connectPromise = null;
        rejectOnce(message);
        this.dispatch("connected", false);
        try {
          socket.close();
        } catch {
          // The browser may already have discarded the failed socket.
        }
        if (!this.closedByClient) this.scheduleReconnect();
      };
      const handshakeTimer = window.setTimeout(
        () => failHandshake("WebSocket connection timed out"),
        10_000
      );

      socket.addEventListener("open", () => {
        if (this.socket !== socket) {
          window.clearTimeout(handshakeTimer);
          rejectOnce("WebSocket connection was superseded");
          socket.close();
          return;
        }
        window.clearTimeout(handshakeTimer);
        opened = true;
        settled = true;
        this.connectPromise = null;
        this.reconnectAttempt = 0;
        this.clearReconnectTimer();
        this.dispatch("connected", true);
        resolve();
      });
      socket.addEventListener("error", () => {
        failHandshake("WebSocket connection failed");
      }, { once: true });
      socket.addEventListener("close", () => {
        if (this.socket !== socket) return;
        window.clearTimeout(handshakeTimer);
        this.socket = null;
        this.connectPromise = null;
        if (!opened) rejectOnce("WebSocket closed before connecting");
        this.dispatch("connected", false);
        this.rejectPending("WebSocket disconnected");
        if (!this.closedByClient) {
          this.scheduleReconnect();
        }
      });
      socket.addEventListener("message", (event) => {
        if (this.socket !== socket) return;
        this.handleMessage(event.data);
      });
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

  public watchThread(threadId: string): void {
    this.send({ type: "thread.watch", threadId });
  }

  public unwatchThread(threadId: string): void {
    this.send({ type: "thread.unwatch", threadId });
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
          reject(new Error(formatErrorText(detail.message)));
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
          reject(new Error(formatErrorText(detail.message)));
        }
      };
      this.addEventListener("server-message", onMessage);
    });
  }

  public deleteProvider(providerId: string): Promise<string> {
    const id = `provider-delete-${this.nextClientId++}`;
    this.send({ type: "provider.delete", id, providerId });
    return new Promise((resolve, reject) => {
      const onMessage = (event: Event) => {
        const detail = (event as CustomEvent<ServerToClientMessage>).detail;
        if (detail.type === "provider.deleted" && detail.id === id) {
          this.removeEventListener("server-message", onMessage);
          resolve(detail.providerId);
        }
        if (detail.type === "server.error") {
          this.removeEventListener("server-message", onMessage);
          reject(new Error(formatErrorText(detail.message)));
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

  private scheduleReconnect(): void {
    if (!this.token || this.reconnectTimer !== null) {
      return;
    }
    const delay = Math.min(30_000, 750 * 2 ** Math.min(this.reconnectAttempt, 5));
    this.reconnectAttempt += 1;
    this.dispatch("reconnecting", { attempt: this.reconnectAttempt, delayMs: delay });
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.token || this.closedByClient || this.socket?.readyState === WebSocket.OPEN) {
        return;
      }
      this.connectPromise = this.openSocket(this.token).catch(() => {
        this.connectPromise = null;
        this.scheduleReconnect();
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private rejectPending(message: string): void {
    if (this.pending.size === 0) {
      return;
    }
    const error = { code: -32000, message };
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export async function fetchSessionToken(token?: string | null): Promise<AuthSession> {
  const response = await fetch("/api/session", token ? { headers: { "x-codex-ui-token": token } } : undefined);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { loginRequired?: boolean };
    if (response.status === 401 && body.loginRequired) {
      throw new LoginRequiredError();
    }
    throw new Error(`Failed to read UI session: ${response.status}`);
  }
  const body = (await response.json()) as AuthSession;
  return body;
}

export type LoginResponse =
  | AuthSession
  | {
      requires_2fa: true;
      pendingToken: string;
      expiresAt: number;
    };

export async function fetchPublicAuthConfig(): Promise<PublicAuthConfig> {
  const response = await fetch("/api/auth/config");
  if (!response.ok) {
    return { registrationEnabled: false, captchaEnabled: false, totpEnabled: false };
  }
  return (await response.json()) as PublicAuthConfig;
}

export async function fetchCaptcha(): Promise<CaptchaChallenge> {
  const response = await fetch("/api/auth/captcha", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Captcha failed: ${response.status}`);
  }
  return (await response.json()) as CaptchaChallenge;
}

export async function login(
  email: string,
  password: string,
  captcha?: { captchaId?: string; captchaAnswer?: string }
): Promise<LoginResponse> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      captchaId: captcha?.captchaId,
      captchaAnswer: captcha?.captchaAnswer
    })
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : response.status === 401 ? "Invalid email or password" : `Login failed: ${response.status}`);
  }
  return body as LoginResponse;
}

export async function loginWith2fa(pendingToken: string, totpCode: string): Promise<AuthSession> {
  const response = await fetch("/api/login/2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingToken, totpCode })
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "2FA failed");
  }
  return body as unknown as AuthSession;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  username?: string;
  captchaId?: string;
  captchaAnswer?: string;
}): Promise<AuthUser> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as { data?: AuthUser; error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Register failed: ${response.status}`);
  }
  if (!body.data) {
    throw new Error("Register failed");
  }
  return body.data;
}

export async function fetchAdminSettings(token: string): Promise<SystemAuthSettings> {
  const response = await fetch("/api/admin/settings", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) throw new Error(`Failed to load settings: ${response.status}`);
  const body = (await response.json()) as { data: SystemAuthSettings };
  return body.data;
}

export async function updateAdminSettings(token: string, input: Partial<SystemAuthSettings>): Promise<SystemAuthSettings> {
  const response = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-codex-ui-token": token },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as { data?: SystemAuthSettings; error?: string };
  if (!response.ok) throw new Error(body.error || `Update settings failed: ${response.status}`);
  if (!body.data) throw new Error("Update settings failed");
  return body.data;
}

export async function fetchTotpStatus(token: string): Promise<{ systemEnabled: boolean; enabled: boolean; forceAdminTotp: boolean }> {
  const response = await fetch("/api/totp/status", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) throw new Error(`TOTP status failed: ${response.status}`);
  return (await response.json()) as { systemEnabled: boolean; enabled: boolean; forceAdminTotp: boolean };
}

export async function setupTotp(token: string): Promise<{ secret: string; otpauthUrl: string; qrUrl: string }> {
  const response = await fetch("/api/totp/setup", {
    method: "POST",
    headers: { "x-codex-ui-token": token }
  });
  const body = (await response.json().catch(() => ({}))) as { secret?: string; otpauthUrl?: string; qrUrl?: string; error?: string };
  if (!response.ok) throw new Error(body.error || `TOTP setup failed: ${response.status}`);
  return body as { secret: string; otpauthUrl: string; qrUrl: string };
}

export async function enableTotp(token: string, totpCode: string): Promise<AuthUser> {
  const response = await fetch("/api/totp/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-codex-ui-token": token },
    body: JSON.stringify({ totpCode })
  });
  const body = (await response.json().catch(() => ({}))) as { data?: AuthUser; error?: string };
  if (!response.ok) throw new Error(body.error || `Enable TOTP failed: ${response.status}`);
  if (!body.data) throw new Error("Enable TOTP failed");
  return body.data;
}

export async function disableTotp(token: string, input: { totpCode?: string; password?: string }): Promise<AuthUser> {
  const response = await fetch("/api/totp/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-codex-ui-token": token },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as { data?: AuthUser; error?: string };
  if (!response.ok) throw new Error(body.error || `Disable TOTP failed: ${response.status}`);
  if (!body.data) throw new Error("Disable TOTP failed");
  return body.data;
}

export class LoginRequiredError extends Error {
  public constructor() {
    super("Login required");
    this.name = "LoginRequiredError";
  }
}

export async function listMembers(token: string): Promise<AuthUser[]> {
  const response = await fetch("/api/members", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    throw new Error(`Failed to list members: ${response.status}`);
  }
  const body = (await response.json()) as { data?: AuthUser[] };
  return body.data ?? [];
}

export async function createMember(
  token: string,
  input: {
    email: string;
    password: string;
    username?: string;
    role?: "admin" | "user";
    status?: "active" | "disabled";
    maxPermission?: PermissionPresetId;
    allowWrite?: boolean;
    allowNetwork?: boolean;
    allowDangerBypass?: boolean;
    concurrency?: number;
    balance?: number;
    notes?: string;
    allowedProviderIds?: string[];
  }
): Promise<AuthUser> {
  const response = await fetch("/api/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to create member: ${response.status}`);
  }
  const body = (await response.json()) as { data: AuthUser };
  return body.data;
}

export async function updateMember(
  token: string,
  id: string,
  input: Record<string, unknown>
): Promise<AuthUser> {
  const response = await fetch(`/api/members/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to update member: ${response.status}`);
  }
  const body = (await response.json()) as { data: AuthUser };
  return body.data;
}

export async function deleteMember(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/members/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to delete member: ${response.status}`);
  }
}


export async function allocateMemberBalance(
  token: string,
  id: string,
  input: { amount: number; operation?: "set" | "add" | "subtract"; notes?: string }
): Promise<AuthUser> {
  const response = await fetch(`/api/members/${encodeURIComponent(id)}/balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : `Balance update failed (${response.status})`);
  }
  const body = (await response.json()) as { data: AuthUser };
  return body.data;
}

export async function fetchProviders(token: string): Promise<ProviderConfig[]> {
  const response = await fetch("/api/providers", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; loginRequired?: boolean };
    if (response.status === 401 && body.loginRequired) {
      throw new LoginRequiredError();
    }
    throw new Error(typeof body.error === "string" && body.error ? body.error : `Failed to load relay channels: ${response.status}`);
  }
  const body = (await response.json()) as { data?: ProviderConfig[] };
  if (!Array.isArray(body.data)) {
    throw new Error("Failed to load relay channels: malformed response");
  }
  return body.data;
}

export type FetchProviderModelsResponse = {
  models: Array<{ id: string }>;
  error?: string | null;
  endpoint?: string;
};

/** Fetch upstream model IDs for a relay (OpenAI-compatible /v1/models). Mirrors axonhub fetchModels. */
export async function fetchProviderModels(
  token: string,
  input: { baseUrl: string; apiKey?: string; kind?: string; providerId?: string }
): Promise<FetchProviderModelsResponse> {
  const response = await fetch("/api/provider/fetch-models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as FetchProviderModelsResponse & { error?: string };
  if (!response.ok) {
    return {
      models: Array.isArray(body.models) ? body.models : [],
      error: typeof body.error === "string" && body.error ? body.error : `Failed to fetch models (${response.status})`,
      endpoint: body.endpoint
    };
  }
  return {
    models: Array.isArray(body.models) ? body.models : [],
    error: body.error ?? null,
    endpoint: body.endpoint
  };
}
export type TestProviderResponse = {
  ok: boolean;
  model?: string;
  prompt?: string;
  message: string;
  endpoint?: string;
  statusCode?: number;
  elapsedMs?: number;
};

export async function testProvider(
  token: string,
  input: { baseUrl: string; apiKey?: string; kind?: string; providerId?: string; model?: string }
): Promise<TestProviderResponse> {
  const response = await fetch("/api/provider/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as Partial<TestProviderResponse> & { error?: string };
  if (!response.ok) {
    return {
      ok: false,
      message: body.message || body.error || `Provider test failed (${response.status})`,
      model: body.model,
      prompt: body.prompt,
      endpoint: body.endpoint,
      statusCode: body.statusCode,
      elapsedMs: body.elapsedMs
    };
  }
  return {
    ok: Boolean(body.ok),
    message: body.message || "Provider test passed",
    model: body.model,
    prompt: body.prompt,
    endpoint: body.endpoint,
    statusCode: body.statusCode,
    elapsedMs: body.elapsedMs
  };
}

/** @deprecated Use testProvider. */
export const testProviderChat = testProvider;

export type ImageApiResult = {
  data: Array<{
    url?: string;
    b64Json?: string;
    revisedPrompt?: string;
  }>;
  created?: number;
  providerId?: string;
  providerName?: string;
  model?: string;
  prompt?: string;
  endpoint?: string;
  raw?: JsonValue;
};

export type WebDevPreviewProbeResult = {
  ok: boolean;
  url: string;
  status?: number;
  contentType?: string;
  title?: string;
  elapsedMs: number;
  error?: string;
};

export async function probeWebDevPreview(token: string, url: string): Promise<WebDevPreviewProbeResult> {
  const response = await fetch("/api/webdev/probe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify({ url })
  });
  const body = (await response.json().catch(() => ({}))) as WebDevPreviewProbeResult & { error?: string };
  if (!response.ok) {
    return {
      ok: false,
      url,
      elapsedMs: typeof body.elapsedMs === "number" ? body.elapsedMs : 0,
      error: body.error ?? `Preview probe failed (${response.status})`
    };
  }
  return body;
}

export async function listWebDevServers(token: string): Promise<WebDevServerSession[]> {
  const response = await fetch("/api/webdev/servers", {
    headers: { "x-codex-ui-token": token }
  });
  const body = (await response.json().catch(() => ({}))) as { data?: WebDevServerSession[]; error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Failed to list WebDev servers (${response.status})`);
  }
  return body.data ?? [];
}

export async function startWebDevServer(token: string, input: { command: string; cwd: string; id?: string }): Promise<WebDevServerSession> {
  const response = await fetch("/api/webdev/servers/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as { data?: WebDevServerSession; error?: string };
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? `Failed to start WebDev server (${response.status})`);
  }
  return body.data;
}

export async function stopWebDevServer(token: string, id: string): Promise<WebDevServerSession> {
  const response = await fetch("/api/webdev/servers/stop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify({ id })
  });
  const body = (await response.json().catch(() => ({}))) as { data?: WebDevServerSession; error?: string };
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? `Failed to stop WebDev server (${response.status})`);
  }
  return body.data;
}

export async function generateProviderImage(
  token: string,
  input: { providerId: string; prompt: string; model?: string; protocol?: ImageGenerationProtocol; size?: string; n?: number }
): Promise<ImageApiResult> {
  const response = await fetch("/api/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as ImageApiResult & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Image generation failed (${response.status})`);
  }
  return body;
}

export async function editProviderImage(
  token: string,
  input: { providerId: string; prompt: string; model?: string; images: File[]; size?: string; n?: number }
): Promise<ImageApiResult> {
  const form = new FormData();
  form.set("providerId", input.providerId);
  form.set("prompt", input.prompt);
  if (input.model) form.set("model", input.model);
  if (input.size) form.set("size", input.size);
  if (input.n != null) form.set("n", String(input.n));
  for (const image of input.images) {
    form.append("image", image, image.name || "image.png");
  }
  const response = await fetch("/api/images/edits", {
    method: "POST",
    headers: {
      "x-codex-ui-token": token
    },
    body: form
  });
  const body = (await response.json().catch(() => ({}))) as ImageApiResult & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Image edit failed (${response.status})`);
  }
  return body;
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
      sessionId: stringValue(thread.sessionId) ?? stringValue(thread.session_id),
      title: stringValue(thread.name) ?? stringValue(thread.title) ?? stringValue(thread.threadName) ?? stringValue(thread.thread_name),
      name: stringValue(thread.name) ?? stringValue(thread.threadName) ?? stringValue(thread.thread_name),
      preview: stringValue(thread.preview),
      model: stringValue(thread.model),
      modelProvider: stringValue(thread.modelProvider) ?? stringValue(thread.model_provider),
      parentThreadId: stringValue(thread.parentThreadId) ?? stringValue(thread.parent_thread_id),
      forkedFromId: stringValue(thread.forkedFromId) ?? stringValue(thread.forked_from_id),
      agentNickname: stringValue(thread.agentNickname) ?? stringValue(thread.agent_nickname),
      agentRole: stringValue(thread.agentRole) ?? stringValue(thread.agent_role),
      createdAt: numberValue(thread.createdAt) ?? numberValue(thread.created_at),
      updatedAt: numberValue(thread.updatedAt) ?? numberValue(thread.updated_at),
      recencyAt: numberValue(thread.recencyAt) ?? numberValue(thread.recency_at),
      status: stringValue(thread.status),
      cwd: stringValue(thread.cwd),
      source: sourceLabel(thread.source ?? thread.thread_source),
      threadSource: sourceLabel(thread.threadSource ?? thread.thread_source),
      path: stringValue(thread.path) ?? stringValue(thread.file_path)
    };
    return {
      ...state,
      activeThreadId: id,
      threads: upsertById(state.threads, entry)
    };
  }
  if (method === "thread/name/updated") {
    const threadId = stringValue(params.threadId);
    const name = stringValue(params.name);
    if (!threadId || !name) {
      return state;
    }
    return {
      ...state,
      threads: state.threads.map((thread) => (thread.id === threadId ? { ...thread, title: name, name, preview: name } : thread))
    };
  }
  if (method === "thread/archived" || method === "thread/deleted") {
    const threadId = stringValue(params.threadId);
    if (!threadId) {
      return state;
    }
    return {
      ...state,
      activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
      threads: state.threads.filter((thread) => thread.id !== threadId),
      turns: method === "thread/deleted" ? state.turns.filter((turn) => turn.threadId !== threadId) : state.turns
    };
  }
  if (method === "thread/unarchived") {
    return state;
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
        startedAt: numberValue(turn.startedAt) ?? Math.floor(Date.now() / 1000),
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
      type: normalizeWorkbenchItemType(stringValue(item.type) ?? inferItemType(item), item),
      title: itemTitle(item),
      text: itemText(item),
      images: itemImages(item),
      files: itemFiles(item),
      status: stringValue(item.status) ?? (method === "item/completed" ? "completed" : undefined),
      firstTokenAt: state.turns.find((turn) => turn.id === turnId)?.items.find((existing) => existing.id === itemId)?.firstTokenAt,
      ...agentItemMetadata(item, params, method === "item/completed"),
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
    const metadata = agentItemMetadata(params);
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
          items: upsertById(turn.items, {
            ...item,
            ...mergeAgentItemMetadata(item, metadata),
            firstTokenAt: item.firstTokenAt ?? Date.now() / 1000,
            text: `${item.text}${delta}`
          })
        };
      })
    };
  }
  if (method === "turn/completed" || method === "turn/failed" || method === "turn/interrupted") {
    const turn = asRecord(params.turn);
    const id = stringValue(turn.id) ?? stringValue(params.turnId);
    if (!id) {
      return state;
    }
    const fallbackStatus = method === "turn/completed" ? "completed" : method === "turn/interrupted" ? "interrupted" : "failed";
    return {
      ...state,
      turns: state.turns.map((entry) =>
        entry.id === id
          ? { ...entry, status: stringValue(turn.status) ?? fallbackStatus, completedAt: numberValue(turn.completedAt) ?? Math.floor(Date.now() / 1000) }
          : entry
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

export function composerInputToUserInput(
  text: string,
  images: ComposerImageAttachment[],
  mentions: ComposerMention[] = [],
  options: { preserveText?: boolean } = {}
): JsonValue[] {
  const input: JsonValue[] = [];
  const trimmed = text.trim();
  const textValue = options.preserveText ? text : trimmed;
  if (trimmed) {
    input.push({ type: "text", text: textValue, text_elements: [] });
  }
  for (const mention of mentions) {
    if (trimmed.includes(mention.token)) {
      input.push({ type: "mention", name: mention.name, path: mention.path });
    }
  }
  for (const image of images) {
    if ((image.kind ?? "image") === "image") {
      input.push({
        type: "image",
        url: image.url,
        detail: "auto"
      });
      continue;
    }
    if (image.path) {
      input.push({
        type: "mention",
        name: image.name,
        path: image.path
      });
      continue;
    }
    input.push({
      type: "text",
      text: `[Attached file: ${image.name} (${image.mediaType || "application/octet-stream"}, ${image.size} bytes)]`,
      text_elements: []
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

export function parseHookGroups(value: JsonValue): HookGroup[] {
  return asArray(asRecord(value).data).map((entry) => {
    const group = asRecord(entry);
    return {
      cwd: stringValue(group.cwd) ?? "global",
      hooks: asArray(group.hooks).map((hook) => hookToEntry(asRecord(hook))),
      warnings: asArray(group.warnings).map(String),
      errors: asArray(group.errors).map((error) => {
        const raw = asRecord(error);
        return {
          path: stringValue(raw.path) ?? "unknown",
          message: stringValue(raw.message) ?? "Unable to load hook"
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

function formatErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "reason"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    try {
      return JSON.stringify(record);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function numberLikeValue(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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

function hookToEntry(hook: Record<string, unknown>): HookEntry {
  return {
    key: stringValue(hook.key) ?? "hook",
    eventName: stringValue(hook.eventName) ?? "hook",
    handlerType: stringValue(hook.handlerType) ?? "command",
    matcher: stringValue(hook.matcher),
    command: stringValue(hook.command),
    timeoutSec: numberLikeValue(hook.timeoutSec),
    statusMessage: stringValue(hook.statusMessage),
    sourcePath: stringValue(hook.sourcePath) ?? "unknown",
    source: stringValue(hook.source) ?? "unknown",
    pluginId: stringValue(hook.pluginId),
    displayOrder: numberLikeValue(hook.displayOrder),
    enabled: boolValue(hook.enabled) ?? false,
    isManaged: boolValue(hook.isManaged) ?? false,
    currentHash: stringValue(hook.currentHash),
    trustStatus: stringValue(hook.trustStatus) ?? "unknown"
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
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
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
  const name = stringValue(thread.name) ?? stringValue(thread.threadName) ?? stringValue(thread.thread_name);
  return {
    id: String(thread.id ?? ""),
    sessionId: stringValue(thread.sessionId) ?? stringValue(thread.session_id),
    title: name ?? stringValue(thread.title) ?? stringValue(thread.thread_name),
    name,
    preview: stringValue(thread.preview) ?? name,
    model: stringValue(thread.model),
    modelProvider: stringValue(thread.modelProvider) ?? stringValue(thread.model_provider),
    parentThreadId: stringValue(thread.parentThreadId) ?? stringValue(thread.parent_thread_id),
    forkedFromId: stringValue(thread.forkedFromId) ?? stringValue(thread.forked_from_id),
    agentNickname: stringValue(thread.agentNickname) ?? stringValue(thread.agent_nickname),
    agentRole: stringValue(thread.agentRole) ?? stringValue(thread.agent_role),
    createdAt: numberValue(thread.createdAt) ?? numberValue(thread.created_at),
    updatedAt: numberValue(thread.updatedAt) ?? numberValue(thread.updated_at),
    recencyAt: numberValue(thread.recencyAt) ?? numberValue(thread.recency_at),
    status: stringValue(thread.status),
    cwd: stringValue(thread.cwd),
    source: sourceLabel(thread.source ?? thread.thread_source),
    threadSource: sourceLabel(thread.threadSource ?? thread.thread_source),
    path: stringValue(thread.path) ?? stringValue(thread.file_path)
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
    startedAt: numberValue(turn.startedAt),
    completedAt: numberValue(turn.completedAt),
    items
  };
}

function threadItemToWorkbenchItem(item: Record<string, unknown>): WorkbenchItem | null {
  const id = stringValue(item.id);
  if (!id) {
    return null;
  }
  const rawType = stringValue(item.type) ?? inferItemType(item);
  const type = normalizeWorkbenchItemType(rawType, item);
  return {
    id,
    type,
    title: itemTitle(item),
    text: itemText(item),
    images: itemImages(item),
    files: itemFiles(item),
    status: stringValue(item.status),
    ...agentItemMetadata(item),
    payload: item as JsonValue
  };
}

function inferItemType(item: Record<string, unknown>): string {
  if ("result" in item && ("revised_prompt" in item || "revisedPrompt" in item)) return "imageGeneration";
  if ("text" in item) return "agentMessage";
  if ("command" in item) return "commandExecution";
  if ("changes" in item) return "fileChange";
  if ("summary" in item) return "reasoning";
  return "item";
}

function normalizeWorkbenchItemType(type: string, item: Record<string, unknown>): string {
  if (type === "message") {
    const role = stringValue(item.role);
    if (role === "user") return "userMessage";
    if (role === "assistant") return "agentMessage";
  }
  if (type === "image_generation_call") {
    return "imageGeneration";
  }
  return type;
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
    case "collabAgentToolCall":
      return "Parallel agent";
    case "subAgentActivity":
      return "Agent activity";
    case "image_generation_call":
    case "imageGeneration":
      return "Image generation";
    default:
      return type;
  }
}

function itemText(item: Record<string, unknown>): string {
  const itemType = stringValue(item.type);
  if (itemType === "image_generation_call" || itemType === "imageGeneration") {
    return stringValue(item.revised_prompt) ?? stringValue(item.revisedPrompt) ?? "";
  }
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
  if (Array.isArray(item.content)) {
    const fromContent = item.content
      .map((entry) => {
        const block = asRecord(entry);
        const blockType = stringValue(block.type);
        if (
          blockType === "text" ||
          blockType === "input_text" ||
          blockType === "output_text" ||
          blockType === "inputText" ||
          blockType === "outputText"
        ) {
          return stringValue(block.text) ?? "";
        }
        if (blockType === "localImage") {
          return "[image]";
        }
        if (blockType === "image") {
          return "[image]";
        }
        if (blockType === "input_image" || blockType === "inputImage") {
          return "[image]";
        }
        if (blockType === "skill" || blockType === "mention") {
          return `@${stringValue(block.name) ?? "mention"}`;
        }
        return stringValue(block.text) ?? "";
      })
      .filter(Boolean)
      .join("\n");
    if (fromContent) {
      return fromContent;
    }
  }
  if (typeof item.text === "string") {
    return item.text;
  }
  if (stringValue(item.type) === "collabAgentToolCall") {
    const tool = stringValue(item.tool);
    const prompt = stringValue(item.prompt);
    const receivers = asArray(item.receiverThreadIds).map(String).filter(Boolean);
    return [
      tool ? `Tool: ${tool}` : "",
      prompt ? `Prompt: ${prompt}` : "",
      receivers.length > 0 ? `Agents: ${receivers.join(", ")}` : ""
    ].filter(Boolean).join("\n");
  }
  if (stringValue(item.type) === "subAgentActivity") {
    return [
      stringValue(item.kind) ? `Status: ${stringValue(item.kind)}` : "",
      stringValue(item.agentPath) ? `Agent: ${stringValue(item.agentPath)}` : ""
    ].filter(Boolean).join("\n");
  }
  if (Array.isArray(item.command)) {
    return item.command.map(String).join(" ");
  }
  if (typeof item.aggregatedOutput === "string") {
    return item.aggregatedOutput;
  }
  return "";
}

function itemImages(item: Record<string, unknown>): WorkbenchImage[] | undefined {
  const itemType = stringValue(item.type);
  if (itemType === "image_generation_call" || itemType === "imageGeneration") {
    const b64 = stringValue(item.result);
    const savedPath = stringValue(item.savedPath) ?? stringValue(item.saved_path);
    const url = b64 ? `data:image/png;base64,${b64}` : savedPath;
    return url
      ? [{
          url,
          name: "generated-image.png",
          revisedPrompt: stringValue(item.revised_prompt) ?? stringValue(item.revisedPrompt),
          model: stringValue(item.model),
          providerName: stringValue(item.provider_name) ?? stringValue(item.providerName)
        }]
      : undefined;
  }
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
      if (block.type === "input_image" || block.type === "inputImage") {
        const url = stringValue(block.image_url) ?? stringValue(block.imageUrl) ?? stringValue(block.url);
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

function itemFiles(item: Record<string, unknown>): WorkbenchFile[] | undefined {
  if (!Array.isArray(item.content)) {
    return undefined;
  }
  const files = item.content
    .map((entry): WorkbenchFile | null => {
      const block = asRecord(entry);
      if (block.type === "mention") {
        const path = stringValue(block.path);
        const name = stringValue(block.name) ?? path;
        return name ? { name, path } : null;
      }
      if (block.type === "file" || block.type === "document") {
        const path = stringValue(block.path);
        const url = stringValue(block.url);
        const name = stringValue(block.name) ?? path ?? url;
        return name
          ? {
              name,
              path,
              url,
              mediaType: stringValue(block.mediaType) ?? stringValue(block.mimeType),
              size: numberValue(block.size)
            }
          : null;
      }
      return null;
    })
    .filter(isPresent);
  return files.length > 0 ? files : undefined;
}

function agentItemMetadata(...recordsOrFlags: Array<Record<string, unknown> | boolean | undefined>): Partial<WorkbenchItem> {
  const markCompleted = recordsOrFlags.some((entry) => entry === true);
  const records = recordsOrFlags.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
  const nestedRecords = records.flatMap((record) => [asRecord(record.agent), asRecord(record.subagent), asRecord(record.subAgent)]);
  const sources = [...records, ...nestedRecords];
  const agentThreadId =
    firstString(sources, ["agentThreadId", "subagentThreadId", "subAgentThreadId", "receiverThreadId"]) ??
    firstString(nestedRecords, ["threadId"]);
  const agentId = firstString(sources, ["agentId", "subagentId", "subAgentId", "agentPath"]) ?? firstString(nestedRecords, ["id"]) ?? agentThreadId;
  const agentName =
    firstString(sources, ["agentName", "agentNickname", "subagentName", "subAgentName", "name", "displayName"]) ??
    firstString(sources, ["agentPath"]);
  const agentRole = firstString(sources, ["agentRole", "role"]);
  const rawStatus = firstString(sources, ["agentStatus", "subagentStatus", "subAgentStatus", "status", "kind"]);
  const agentStatus = markCompleted && agentId ? "completed" : rawStatus ? normalizeAgentItemStatus(rawStatus) : undefined;
  const metadata: Partial<WorkbenchItem> = {};
  if (agentId) {
    metadata.agentId = agentId;
  }
  if (agentThreadId) {
    metadata.agentThreadId = agentThreadId;
  }
  if (agentName) {
    metadata.agentName = agentName;
  }
  if (agentRole) {
    metadata.agentRole = agentRole;
  }
  if (agentStatus) {
    metadata.agentStatus = agentStatus;
  }
  return metadata;
}

function mergeAgentItemMetadata(existing: WorkbenchItem, next: Partial<WorkbenchItem>): Partial<WorkbenchItem> {
  return {
    agentId: next.agentId ?? existing.agentId,
    agentThreadId: next.agentThreadId ?? existing.agentThreadId,
    agentName: next.agentName ?? existing.agentName,
    agentRole: next.agentRole ?? existing.agentRole,
    agentStatus: next.agentStatus ?? existing.agentStatus
  };
}

function firstString(records: Array<Record<string, unknown>>, keys: string[]): string | undefined {
  for (const record of records) {
    for (const key of keys) {
      const value = stringValue(record[key]);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}

function normalizeAgentItemStatus(value: string): string {
  switch (value) {
    case "started":
    case "interacted":
    case "inProgress":
    case "pendingInit":
      return "running";
    case "errored":
      return "failed";
    default:
      return value;
  }
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


export async function fetchUsageSummary(
  token: string,
  options?: { days?: number; userId?: string }
): Promise<UsageSummary> {
  const params = new URLSearchParams();
  if (options?.days) params.set("days", String(options.days));
  if (options?.userId) params.set("userId", options.userId);
  const qs = params.toString() ? `?${params}` : "";
  const response = await fetch(`/api/usage/summary${qs}`, {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    throw new Error(`Failed to load usage summary: ${response.status}`);
  }
  const body = (await response.json()) as { data: UsageSummary };
  return body.data;
}

export async function fetchUsageLedger(
  token: string,
  options?: { limit?: number; userId?: string }
): Promise<Array<Record<string, unknown>>> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.userId) params.set("userId", options.userId);
  const qs = params.toString() ? `?${params}` : "";
  const response = await fetch(`/api/usage/ledger${qs}`, {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    throw new Error(`Failed to load usage ledger: ${response.status}`);
  }
  const body = (await response.json()) as { data: Array<Record<string, unknown>> };
  return body.data ?? [];
}


export async function changeOwnPassword(
  token: string,
  input: {
    currentPassword: string;
    newPassword: string;
    captchaId: string;
    captchaAnswer: string;
  }
): Promise<AuthUser> {
  const response = await fetch("/api/me/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as { data?: AuthUser; error?: string };
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : `Password change failed (${response.status})`);
  }
  if (!body.data) {
    throw new Error("Password change failed");
  }
  return body.data;
}

export type LaunchEnvValues = {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

export type LaunchAdapterStatus = {
  id: string;
  repo: string;
  cloneUrl: string | null;
  cloneable: boolean;
  installed: boolean;
  wrapperPath: string | null;
  productCliPath: string | null;
  productCliPresent: boolean;
  sourceDir: string | null;
  sourcePresent: boolean;
  envPath: string;
  envPresent: boolean;
  envConfigured: boolean;
  envPreview: { baseUrl: string | null; model: string | null; hasApiKey: boolean };
  needsInstall: boolean;
  needsSetup?: boolean;
};

export type LaunchAdaptersDetectResponse = {
  sourceRoot: string;
  adapters: LaunchAdapterStatus[];
};

export type InstallLaunchResultItem = {
  id: string;
  ok: boolean;
  steps: string[];
  error?: string;
  status?: LaunchAdapterStatus;
};

export async function fetchLaunchAdapters(token: string): Promise<LaunchAdaptersDetectResponse> {
  const response = await fetch("/api/launch-adapters", {
    headers: { "x-codex-ui-token": token }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Failed to detect launch adapters: ${response.status}`);
  }
  return (await response.json()) as LaunchAdaptersDetectResponse;
}

export async function installLaunchAdapters(
  token: string,
  input: {
    ids?: string[];
    missingOnly?: boolean;
    skipCli?: boolean;
    envMode?: "shared" | "separate" | "none";
    sharedEnv?: LaunchEnvValues;
    separateEnv?: Record<string, LaunchEnvValues>;
    forceEnv?: boolean;
    sourceRoot?: string;
    skipModelTest?: boolean;
  },
  onProgress?: (logs: Array<{ time: string; text: string; level: "info" | "success" | "error" | "warn" }>) => void
): Promise<{ results: InstallLaunchResultItem[]; adapters: LaunchAdapterStatus[] }> {
  const response = await fetch("/api/launch-adapters/install", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as {
    jobId?: string;
    results?: InstallLaunchResultItem[];
    adapters?: LaunchAdapterStatus[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || `Install failed: ${response.status}`);
  }

  if (body.results) {
    return {
      results: body.results,
      adapters: body.adapters ?? []
    };
  }

  if (!body.jobId) {
    throw new Error("Server did not return a valid installation job ID.");
  }

  const jobId = body.jobId;
  const maxWaitMs = 600_000; // 10 min timeout
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 350));
    const statusResp = await fetch(`/api/launch-adapters/job-status?jobId=${encodeURIComponent(jobId)}`, {
      headers: { "x-codex-ui-token": token }
    });
    if (!statusResp.ok) {
      continue;
    }
    const statusData = (await statusResp.json().catch(() => ({}))) as {
      status?: "running" | "completed" | "failed";
      progressStep?: string;
      logs?: Array<{ time: string; text: string; level: "info" | "success" | "error" | "warn" }>;
      results?: InstallLaunchResultItem[];
      adapters?: LaunchAdapterStatus[];
      error?: string;
    };

    if (statusData.logs && statusData.logs.length) {
      onProgress?.(statusData.logs);
    }

    if (statusData.status === "completed") {
      return {
        results: statusData.results ?? [],
        adapters: statusData.adapters ?? []
      };
    }
    if (statusData.status === "failed") {
      throw new Error(statusData.error || "Installation job failed on server.");
    }
  }

  throw new Error("Installation job timed out after 10 minutes.");
}

export async function writeLaunchAdapterEnvs(
  token: string,
  input: {
    mode: "shared" | "separate";
    ids?: string[];
    sharedEnv?: LaunchEnvValues;
    separateEnv?: Record<string, LaunchEnvValues>;
    force?: boolean;
  }
): Promise<{
  results: Array<{ id: string; ok: boolean; path: string; wrote: boolean; error?: string }>;
  adapters: LaunchAdapterStatus[];
}> {
  const response = await fetch("/api/launch-adapters/env", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(input)
  });
  const body = (await response.json().catch(() => ({}))) as {
    results?: Array<{ id: string; ok: boolean; path: string; wrote: boolean; error?: string }>;
    adapters?: LaunchAdapterStatus[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || `Write env failed: ${response.status}`);
  }
  return {
    results: body.results ?? [],
    adapters: body.adapters ?? []
  };
}

export async function testLaunchAdapterModel(
  token: string,
  env: LaunchEnvValues
): Promise<{ ok: boolean; step1Ok?: boolean; step2Ok?: boolean; message: string; statusCode?: number }> {
  const response = await fetch("/api/launch-adapters/test-model", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify(env)
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    step1Ok?: boolean;
    step2Ok?: boolean;
    message?: string;
    statusCode?: number;
  };
  return {
    ok: body.ok ?? response.ok,
    step1Ok: body.step1Ok,
    step2Ok: body.step2Ok,
    message: body.message || (response.ok ? "Test succeeded" : `HTTP ${response.status}`),
    statusCode: body.statusCode ?? response.status
  };
}
