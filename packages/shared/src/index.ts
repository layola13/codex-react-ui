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

export type PermissionPresetId =
  | "readonlyAsk"
  | "workspaceAsk"
  | "fullAsk"
  | "dangerBypass";

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
