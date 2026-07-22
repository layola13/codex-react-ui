export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRpcId = string | number;

export interface JsonRpcRequest {
  id: JsonRpcId;
  method: string;
  params?: JsonValue;
}

export interface JsonRpcNotification {
  method: string;
  params?: JsonValue;
}

export interface JsonRpcSuccess {
  id: JsonRpcId;
  result: JsonValue;
}

export interface JsonRpcFailure {
  id: JsonRpcId;
  error: {
    code?: number;
    message: string;
    data?: JsonValue;
  };
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcFailure;

export type EnginePhase =
  | "idle"
  | "starting"
  | "ready"
  | "stopped"
  | "error"
  | "incompatible";

export interface EngineStatus {
  phase: EnginePhase;
  codexBin?: string;
  codexVersion?: string;
  appServerUserAgent?: string;
  codexHome?: string;
  message?: string;
  startedAt?: number;
}

export type AuthUserRole = "admin" | "user";
export type AuthUserStatus = "active" | "disabled";

export type PermissionPresetId =
  | "readonlyAsk"
  | "workspaceAsk"
  | "fullAsk"
  | "dangerBypass";

export interface MemberCapabilities {
  maxPermission: PermissionPresetId;
  allowWrite: boolean;
  allowNetwork: boolean;
  allowDangerBypass: boolean;
  workspaceRoot: string;
}

export interface AuthUser extends MemberCapabilities {
  id: string;
  email: string;
  username: string;
  role: AuthUserRole;
  status: AuthUserStatus;
  balance: number;
  concurrency: number;
  notes?: string;
  /** Whether Google Authenticator (TOTP) is enabled for this account. */
  totpEnabled?: boolean;
  /** Relay / provider IDs this member may use. Empty = none (admins always all). */
  allowedProviderIds?: string[];
}

export interface SystemAuthSettings {
  registrationEnabled: boolean;
  captchaEnabled: boolean;
  totpEnabled: boolean;
  forceAdminTotp: boolean;
  defaultMemberBalance: number;
  defaultMemberConcurrency: number;
  updatedAt: number;
}

export interface PublicAuthConfig {
  registrationEnabled: boolean;
  captchaEnabled: boolean;
  totpEnabled: boolean;
}

export interface CaptchaChallenge {
  id: string;
  svg: string;
  expiresAt: number;
}

export interface AuthSession {
  authenticated?: boolean;
  token: string;
  user: AuthUser | null;
  expiresAt?: number;
  loginRequired?: boolean;
}

export type CodexSandboxMode = "read-only" | "workspace-write" | "danger-full-access";
export type CodexApprovalPolicy = "on-request" | "never";
export type CodexSandboxPolicy =
  | { type: "readOnly"; networkAccess: boolean }
  | {
      type: "workspaceWrite";
      writableRoots: string[];
      networkAccess: boolean;
      excludeTmpdirEnvVar: boolean;
      excludeSlashTmp: boolean;
    }
  | { type: "dangerFullAccess" };

export interface PermissionPreset {
  id: PermissionPresetId;
  label: string;
  description: string;
  sandbox: CodexSandboxMode;
  approvalPolicy: CodexApprovalPolicy;
  severity: "normal" | "warning" | "critical";
}

export const DANGER_CONFIRMATION = "BYPASS";

export const permissionPresets: PermissionPreset[] = [
  {
    id: "readonlyAsk",
    label: "Read-only + ask",
    description: "Analyze and inspect files. Writes and risky actions require changing permissions.",
    sandbox: "read-only",
    approvalPolicy: "on-request",
    severity: "normal"
  },
  {
    id: "workspaceAsk",
    label: "Workspace write + ask",
    description: "Default. Allows workspace edits while commands, network, and extra paths request approval.",
    sandbox: "workspace-write",
    approvalPolicy: "on-request",
    severity: "normal"
  },
  {
    id: "fullAsk",
    label: "Full access + ask",
    description: "Allows broad filesystem access, while still asking before sensitive actions.",
    sandbox: "danger-full-access",
    approvalPolicy: "on-request",
    severity: "warning"
  },
  {
    id: "dangerBypass",
    label: "Dangerously bypass approvals and sandbox",
    description: "Highest risk. Full local access and no approval prompts for this conversation.",
    sandbox: "danger-full-access",
    approvalPolicy: "never",
    severity: "critical"
  }
];

export function permissionToTurnOverrides(id: PermissionPresetId, cwd: string): {
  sandbox: CodexSandboxMode;
  sandboxPolicy: CodexSandboxPolicy;
  approvalPolicy: CodexApprovalPolicy;
} {
  const preset = permissionPresets.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Unknown permission preset: ${id}`);
  }
  return {
    sandbox: preset.sandbox,
    sandboxPolicy: sandboxModeToPolicy(preset.sandbox, cwd),
    approvalPolicy: preset.approvalPolicy
  };
}

function sandboxModeToPolicy(sandbox: CodexSandboxMode, cwd: string): CodexSandboxPolicy {
  switch (sandbox) {
    case "read-only":
      return { type: "readOnly", networkAccess: false };
    case "workspace-write":
      return {
        type: "workspaceWrite",
        writableRoots: [cwd],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false
      };
    case "danger-full-access":
      return { type: "dangerFullAccess" };
  }
}

export interface TieredContextRatio {
  minTokens: number;
  maxTokens: number | null; // null = infinity
  ratio: number;
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  cacheWriteUsdPerMillion?: number;
  cacheReadUsdPerMillion?: number;
}

export interface ChannelGroupConfig {
  id: string;
  name: string;
  groupRatio: number;
  priority?: number;
  keys: string[];
  enableFallback?: boolean;
  fallbackChannelId?: string;
  fallbackGroupName?: string;
  enableTieredContext?: boolean;
  tieredContextRatios?: TieredContextRatio[];
}

export type StationType = "third_party" | "rich" | "charity" | "official";

export interface ProviderConfig {
  id: string;
  kind: "chatgpt" | "openai" | "responsesRelay" | "ollama" | "lmstudio" | "bedrock";
  name: string;
  baseUrl?: string;
  apiKeyRef?: string;
  apiKeyPreview?: string;
  apiKeyStorage?: "keyring" | "memory" | "none";
  defaultModel?: string;
  nativeModels: string[];
  modelAliases: Array<{
    alias: string;
    model: string;
  }>;
  modelRates?: Array<{
    model: string;
    inputUsdPerMillion: number;
    cachedInputUsdPerMillion?: number;
    cacheWriteUsdPerMillion?: number;
    outputUsdPerMillion: number;
    multiplier: number;
  }>;
  /** Relay Channel Mode: "fast" (default) or "advanced" */
  channelMode?: "fast" | "advanced";
  /** Multi-group configuration for advanced mode */
  groups?: ChannelGroupConfig[];
  /** Total quota / max usage quota in USD (null/undefined = unlimited) */
  quotaUsd?: number | null;
  /** Current accumulated usage in USD */
  usedQuotaUsd?: number;
  /** Station Type Tag: "third_party" (default), "rich", "charity", "official" */
  stationType?: StationType;
  /** For Charity Station (公益站): Enable daily check-in feature */
  enableCheckin?: boolean;
  /** For Charity Station (公益站): Daily check-in reminder (default: true, once per day) */
  remindCheckin?: boolean;
  /** Free-form notes for the relay/channel, shown in list/detail views. */
  remark?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProviderActivation {
  providerId: string;
  modelProvider: string;
  model?: string;
  restartedAt: number;
}

export interface UiProfile {
  schema: "codex-react-ui.profile.v1";
  exportedAt: number;
  providers: ProviderConfig[];
}

export interface UiProfileImportResult {
  importedProviders: number;
  providers: ProviderConfig[];
}

export interface DangerousPermissionAuditEvent {
  id: string;
  createdAt: number;
  method: "thread/start" | "turn/start";
  severity: "warning" | "critical";
  reasons: string[];
  cwd?: string;
  threadId?: string;
  model?: string;
  approvalPolicy?: string;
  sandbox?: string;
  sandboxPolicyType?: string;
  inputSummary?: {
    items: number;
    textItems: number;
    imageItems: number;
    mentionItems: number;
  };
}

export interface ThreadSummary {
  id: string;
  preview?: string;
  model?: string;
  modelProvider?: string;
  cwd?: string;
  createdAt?: number;
  updatedAt?: number;
  status?: string;
}

export interface ChatItem {
  id: string;
  type: string;
  text?: string;
  status?: string;
  title?: string;
  payload?: JsonValue;
}

export interface ChatTurn {
  id: string;
  threadId: string;
  status: "pending" | "inProgress" | "completed" | "failed" | "interrupted";
  items: ChatItem[];
  startedAt: number;
  completedAt?: number;
}

export type ClientToServerMessage =
  | {
      type: "rpc";
      id: string;
      method: string;
      params?: JsonValue;
    }
  | {
      type: "serverResponse";
      requestId: JsonRpcId;
      result?: JsonValue;
      error?: JsonRpcFailure["error"];
    }
  | {
      type: "provider.save";
      id: string;
      provider: ProviderConfig;
      apiKey?: string;
    }
  | {
      type: "provider.delete";
      id: string;
      providerId: string;
    }
  | {
      type: "provider.activate";
      id: string;
      providerId: string;
      model?: string;
    };

export type ServerToClientMessage =
  | { type: "engine.status"; status: EngineStatus }
  | { type: "rpc.result"; id: string; result: JsonValue }
  | { type: "rpc.error"; id: string; error: JsonRpcFailure["error"] }
  | { type: "codex.notification"; message: JsonRpcNotification }
  | { type: "codex.serverRequest"; message: JsonRpcRequest }
  | { type: "provider.saved"; id: string; provider: ProviderConfig }
  | { type: "provider.deleted"; id: string; providerId: string }
  | { type: "provider.activated"; id: string; activation: ProviderActivation }
  | { type: "server.error"; message: string };


export type BalanceLedgerEntry = {
  id: string;
  user_id: string;
  user_email?: string;
  delta: number;
  balance_after: number;
  operation: string;
  reason?: string;
  thread_id?: string;
  method?: string;
  created_at: number;
};

export type UsageDailyPoint = {
  date: string;
  debit: number;
  credit: number;
  turns: number;
};

export type UsageSummary = {
  balance: number | null;
  totalDebit: number;
  totalCredit: number;
  turnCount: number;
  todayDebit: number;
  periodDays: number;
  daily: UsageDailyPoint[];
  byOperation: Array<{ operation: string; count: number; total: number }>;
  topUsers?: Array<{ userId: string; email: string; debit: number; turns: number }>;
};

export {
  AGENT_ENGINE_CATALOG,
  AGENT_RUNTIME_BRIDGE_PLAN,
  agentEngineByLaunchId,
  getAgentEngine,
  isAgentEngineId,
  plannedChatEngines,
  type AgentEngineCapabilities,
  type AgentEngineDefinition,
  type AgentEngineId,
  type AgentProtocol,
  type AgentRuntimeBridgePlan
} from "./agentEngines.js";
