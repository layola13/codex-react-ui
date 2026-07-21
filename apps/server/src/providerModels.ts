/**
 * Fetch model IDs from an OpenAI-compatible (or Anthropic/Gemini-like) relay.
 * Mirrors axonhub's ModelFetcher prepareModelsEndpoint + common response parsing,
 * adapted for codex-react-ui's REST bridge.
 */

export type FetchProviderModelsInput = {
  baseUrl: string;
  apiKey?: string;
  kind?: string;
};

export type FetchProviderModelsResult = {
  models: string[];
  error?: string;
  endpoint?: string;
};

const FETCH_TIMEOUT_MS = 12_000;

export async function fetchProviderModels(input: FetchProviderModelsInput): Promise<FetchProviderModelsResult> {
  const baseUrl = (input.baseUrl ?? "").trim();
  const apiKey = (input.apiKey ?? "").trim();
  const kind = (input.kind ?? "responsesRelay").trim();

  if (!baseUrl) {
    return { models: [], error: "Base URL is required" };
  }

  const { endpoint, headers } = prepareModelsEndpoint(kind, baseUrl);

  if (apiKey) {
    if (kindLooksAnthropic(kind, baseUrl)) {
      headers.set("X-Api-Key", apiKey);
      // Keep Bearer as a fallback for OpenAI-compatible Anthropic relays.
      headers.set("Authorization", `Bearer ${apiKey}`);
    } else if (kindLooksGemini(kind, baseUrl)) {
      headers.set("X-Goog-Api-Key", apiKey);
      headers.set("Authorization", `Bearer ${apiKey}`);
    } else {
      headers.set("Authorization", `Bearer ${apiKey}`);
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      return {
        models: [],
        endpoint,
        error: `Failed to fetch models: HTTP ${response.status}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ""}`
      };
    }

    const bodyText = await response.text();
    const models = parseModelsResponse(bodyText);
    if (models.length === 0) {
      return {
        models: [],
        endpoint,
        error: "No models found in provider response"
      };
    }
    return { models: uniqueSorted(models), endpoint };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      models: [],
      endpoint,
      error: timedOut ? `Timed out fetching models from ${endpoint}` : `Failed to fetch models: ${message}`
    };
  }
}

function prepareModelsEndpoint(kind: string, rawBaseUrl: string): { endpoint: string; headers: Headers } {
  const headers = new Headers({ Accept: "application/json" });
  let baseURL = rawBaseUrl.replace(/\/+$/, "");
  let useRawURL = false;

  // axonhub convention: trailing "#" means "use base as-is + /models"
  if (baseURL.endsWith("#")) {
    baseURL = baseURL.slice(0, -1).replace(/\/+$/, "");
    useRawURL = true;
  }

  if (kindLooksAnthropic(kind, baseURL)) {
    headers.set("Anthropic-Version", "2023-06-01");
    baseURL = baseURL.replace(/\/anthropic$/i, "").replace(/\/claude$/i, "");
    if (useRawURL) {
      return { endpoint: `${baseURL}/models`, headers };
    }
    if (baseURL.endsWith("/v1")) {
      return { endpoint: `${baseURL}/models`, headers };
    }
    return { endpoint: `${baseURL}/v1/models`, headers };
  }

  if (kindLooksGemini(kind, baseURL) || /generativelanguage\.googleapis\.com/i.test(baseURL)) {
    if (/\/v1(beta)?(\/|$)/i.test(baseURL) || /\/openai$/i.test(baseURL)) {
      return { endpoint: `${baseURL}/models`, headers };
    }
    return { endpoint: `${baseURL}/v1beta/models`, headers };
  }

  // Zhipu / bigmodel style
  if (/bigmodel\.cn|open\.bigmodel/i.test(baseURL)) {
    const trimmed = baseURL.replace(/\/v4$/i, "").replace(/\/paas\/v4$/i, "");
    if (/\/paas\/v4/i.test(baseURL) || /\/v4/i.test(baseURL)) {
      return { endpoint: `${baseURL.replace(/\/+$/, "")}/models`, headers };
    }
    return { endpoint: `${trimmed}/api/paas/v4/models`, headers };
  }

  if (useRawURL) {
    return { endpoint: `${baseURL}/models`, headers };
  }

  // OpenAI-compatible default (also covers responsesRelay / openai / ollama / lmstudio)
  if (/\/v1(\/|$)/i.test(baseURL) || /\/v\d+(\/|$)/i.test(baseURL)) {
    return { endpoint: `${baseURL}/models`, headers };
  }
  return { endpoint: `${baseURL}/v1/models`, headers };
}

function parseModelsResponse(bodyText: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    // Fallback: extract first JSON array of objects/strings from messy payloads
    const match = bodyText.match(/\[[\s\S]*\]/);
    if (!match) {
      return [];
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  const ids: string[] = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      pushModelId(ids, entry);
    }
    return ids;
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    // OpenAI: { data: [{ id }] }
    if (Array.isArray(record.data)) {
      for (const entry of record.data) {
        pushModelId(ids, entry);
      }
    }
    // Gemini: { models: [{ name: "models/..." }] }
    if (Array.isArray(record.models)) {
      for (const entry of record.models) {
        pushModelId(ids, entry);
      }
    }
  }

  return ids;
}

function pushModelId(ids: string[], entry: unknown): void {
  if (typeof entry === "string" && entry.trim()) {
    ids.push(entry.trim());
    return;
  }
  if (!entry || typeof entry !== "object") {
    return;
  }
  const record = entry as Record<string, unknown>;
  for (const key of ["id", "model", "name", "baseModelId", "displayName"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      ids.push(value.trim().replace(/^models\//, ""));
      return;
    }
  }
}

function uniqueSorted(models: string[]): string[] {
  return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function kindLooksAnthropic(kind: string, baseUrl: string): boolean {
  return kind.toLowerCase().includes("anthropic") || /anthropic|claude/i.test(baseUrl);
}

function kindLooksGemini(kind: string, baseUrl: string): boolean {
  return kind.toLowerCase().includes("gemini") || /generativelanguage\.googleapis\.com|gemini/i.test(baseUrl);
}
