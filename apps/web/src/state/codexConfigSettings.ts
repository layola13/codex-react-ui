import type { JsonValue } from "@codex-ui/shared";

/**
 * Curated Codex user-config surface for the Settings drawer.
 * Theme / provider API keys stay out of this module by design.
 */
export type CodexUserConfigView = {
  model: string | null;
  modelProvider: string | null;
  modelReasoningEffort: string | null;
  modelReasoningSummary: string | null;
  modelVerbosity: string | null;
  approvalPolicy: string | null;
  sandboxMode: string | null;
  webSearch: string | null;
};

export type CodexConfigFieldKey = keyof CodexUserConfigView;

export type CodexConfigEdit = {
  keyPath: string;
  value: JsonValue;
  mergeStrategy: "replace";
};

export const CODEX_CONFIG_KEY_PATHS: Record<CodexConfigFieldKey, string> = {
  model: "model",
  modelProvider: "model_provider",
  modelReasoningEffort: "model_reasoning_effort",
  modelReasoningSummary: "model_reasoning_summary",
  modelVerbosity: "model_verbosity",
  approvalPolicy: "approval_policy",
  sandboxMode: "sandbox_mode",
  webSearch: "web_search"
};

export const CODEX_CONFIG_FIELD_META: Array<{
  key: CodexConfigFieldKey;
  keyPath: string;
  label: string;
  description: string;
  kind: "text" | "select";
  options?: Array<{ value: string; label: string }>;
  /** When true, field is shown read-only (managed elsewhere or display-only). */
  readOnly?: boolean;
}> = [
  {
    key: "model",
    keyPath: CODEX_CONFIG_KEY_PATHS.model,
    label: "Default model",
    description: "Codex user config model default (provider activation may override for the active session).",
    kind: "text"
  },
  {
    key: "modelProvider",
    keyPath: CODEX_CONFIG_KEY_PATHS.modelProvider,
    label: "Model provider",
    description: "Engine model_provider key. Third-party relays are activated from the Config inspector, not rewritten as API keys here.",
    kind: "text",
    readOnly: true
  },
  {
    key: "modelReasoningEffort",
    keyPath: CODEX_CONFIG_KEY_PATHS.modelReasoningEffort,
    label: "Default reasoning effort",
    description: "Persisted model_reasoning_effort in user config.toml.",
    kind: "select",
    options: [
      { value: "minimal", label: "Minimal" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "xhigh", label: "Extra high" }
    ]
  },
  {
    key: "modelReasoningSummary",
    keyPath: CODEX_CONFIG_KEY_PATHS.modelReasoningSummary,
    label: "Reasoning summary",
    description: "Persisted model_reasoning_summary.",
    kind: "select",
    options: [
      { value: "auto", label: "Auto" },
      { value: "concise", label: "Concise" },
      { value: "detailed", label: "Detailed" },
      { value: "none", label: "None" }
    ]
  },
  {
    key: "modelVerbosity",
    keyPath: CODEX_CONFIG_KEY_PATHS.modelVerbosity,
    label: "Model verbosity",
    description: "Persisted model_verbosity for Responses models.",
    kind: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" }
    ]
  },
  {
    key: "approvalPolicy",
    keyPath: CODEX_CONFIG_KEY_PATHS.approvalPolicy,
    label: "Approval policy",
    description: "Default approval_policy for new threads (string forms only).",
    kind: "select",
    options: [
      { value: "untrusted", label: "Untrusted" },
      { value: "on-request", label: "On request" },
      { value: "never", label: "Never" }
    ]
  },
  {
    key: "sandboxMode",
    keyPath: CODEX_CONFIG_KEY_PATHS.sandboxMode,
    label: "Sandbox mode",
    description: "Default sandbox_mode for command execution.",
    kind: "select",
    options: [
      { value: "read-only", label: "Read only" },
      { value: "workspace-write", label: "Workspace write" },
      { value: "danger-full-access", label: "Danger full access" }
    ]
  },
  {
    key: "webSearch",
    keyPath: CODEX_CONFIG_KEY_PATHS.webSearch,
    label: "Web search",
    description: "Default web_search mode.",
    kind: "select",
    options: [
      { value: "disabled", label: "Disabled" },
      { value: "cached", label: "Cached" },
      { value: "indexed", label: "Indexed" },
      { value: "live", label: "Live" }
    ]
  }
];

export const EMPTY_CODEX_USER_CONFIG: CodexUserConfigView = {
  model: null,
  modelProvider: null,
  modelReasoningEffort: null,
  modelReasoningSummary: null,
  modelVerbosity: null,
  approvalPolicy: null,
  sandboxMode: null,
  webSearch: null
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNullableString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/**
 * Map a raw Codex Config object (or partial) into the curated Settings view.
 */
export function configToUserView(config: unknown): CodexUserConfigView {
  const record = asRecord(config);
  const approval = record.approval_policy;
  return {
    model: asNullableString(record.model),
    modelProvider: asNullableString(record.model_provider),
    modelReasoningEffort: asNullableString(record.model_reasoning_effort),
    modelReasoningSummary: asNullableString(record.model_reasoning_summary),
    modelVerbosity: asNullableString(record.model_verbosity),
    approvalPolicy: typeof approval === "string" ? approval : null,
    sandboxMode: asNullableString(record.sandbox_mode),
    webSearch: asNullableString(record.web_search)
  };
}

/**
 * Parse a config/read RPC result into the curated Settings view.
 */
export function parseConfigReadResponse(result: unknown): CodexUserConfigView {
  const root = asRecord(result);
  const config = root.config ?? result;
  return configToUserView(config);
}

/**
 * Build params for config/value/write for a single curated field.
 * Returns null when the field is read-only or the value is empty/null (clear not supported here).
 */
export function buildConfigValueWrite(
  field: CodexConfigFieldKey,
  value: string | null
): { keyPath: string; value: JsonValue; mergeStrategy: "replace" } | null {
  const meta = CODEX_CONFIG_FIELD_META.find((entry) => entry.key === field);
  if (!meta || meta.readOnly) {
    return null;
  }
  if (value == null || value === "") {
    return null;
  }
  return {
    keyPath: CODEX_CONFIG_KEY_PATHS[field],
    value,
    mergeStrategy: "replace"
  };
}

/**
 * Build params for config/batchWrite with reloadUserConfig.
 */
export function buildConfigBatchWrite(
  edits: Array<{ field: CodexConfigFieldKey; value: string | null }>
): { edits: CodexConfigEdit[]; reloadUserConfig: true } | null {
  const mapped: CodexConfigEdit[] = [];
  for (const edit of edits) {
    const write = buildConfigValueWrite(edit.field, edit.value);
    if (write) {
      mapped.push(write);
    }
  }
  if (mapped.length === 0) {
    return null;
  }
  return { edits: mapped, reloadUserConfig: true };
}

/**
 * Diff two views into field edits (writable fields only).
 */
export function diffConfigViews(
  previous: CodexUserConfigView,
  next: CodexUserConfigView
): Array<{ field: CodexConfigFieldKey; value: string | null }> {
  const edits: Array<{ field: CodexConfigFieldKey; value: string | null }> = [];
  for (const meta of CODEX_CONFIG_FIELD_META) {
    if (meta.readOnly) {
      continue;
    }
    if (previous[meta.key] !== next[meta.key]) {
      edits.push({ field: meta.key, value: next[meta.key] });
    }
  }
  return edits;
}

/**
 * Apply an outbound write into a local view (for optimistic / re-read simulation).
 */
export function applyConfigWriteToView(
  current: CodexUserConfigView,
  keyPath: string,
  value: JsonValue
): CodexUserConfigView {
  const field = (Object.entries(CODEX_CONFIG_KEY_PATHS) as Array<[CodexConfigFieldKey, string]>).find(
    ([, path]) => path === keyPath
  )?.[0];
  if (!field) {
    return current;
  }
  return {
    ...current,
    [field]: asNullableString(value)
  };
}
