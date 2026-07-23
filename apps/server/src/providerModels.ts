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
const PROVIDER_TEST_TIMEOUT_MS = 60_000;
const DEFAULT_PROVIDER_TEST_PROMPT = "Reply with exactly: pong";
const PROVIDER_TEST_PROMPTS = [
  DEFAULT_PROVIDER_TEST_PROMPT,
  "Say only the word ready.",
  "Answer with one short word: ok."
];

export async function fetchProviderModels(input: FetchProviderModelsInput): Promise<FetchProviderModelsResult> {
  const baseUrl = (input.baseUrl ?? "").trim();
  const apiKey = (input.apiKey ?? "").trim();
  const kind = (input.kind ?? "responsesRelay").trim();

  if (!baseUrl) {
    return { models: [], error: "Base URL is required" };
  }

  const { endpoint, headers } = prepareModelsEndpoint(kind, baseUrl);

  if (apiKey) {
    applyProviderAuthHeaders(headers, kind, baseUrl, apiKey);
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

export type TestProviderInput = FetchProviderModelsInput & {
  model?: string;
  timeoutMs?: number;
};

export type TestProviderResult = {
  ok: boolean;
  model: string;
  prompt: string;
  message: string;
  endpoint?: string;
  statusCode?: number;
  elapsedMs: number;
};

/**
 * Validate a provider with the wire protocol it advertises.
 *
 * Responses relays must never be probed through `/chat/completions`: a number
 * of Codex-compatible relays expose only `/responses` and may reject the same
 * model on the legacy Chat Completions endpoint. Explicit Chat Completions
 * channel kinds retain the legacy probe for compatibility.
 */
export async function testProvider(input: TestProviderInput): Promise<TestProviderResult> {
  if (isResponsesRelayKind(input.kind)) {
    return testResponsesProvider(input);
  }
  return testChatCompletionsProvider(input);
}

/** @deprecated Use testProvider; kept for callers compiled against older builds. */
export async function testProviderChat(input: TestProviderInput): Promise<TestProviderResult> {
  return testProvider(input);
}

async function testResponsesProvider(input: TestProviderInput): Promise<TestProviderResult> {
  const startedAt = Date.now();
  const baseUrl = (input.baseUrl ?? "").trim();
  const apiKey = (input.apiKey ?? "").trim();
  const kind = (input.kind ?? "responsesRelay").trim();
  const prompt = DEFAULT_PROVIDER_TEST_PROMPT;
  const requestedModel = (input.model ?? "").trim();
  const timeoutMs = normalizeTimeout(input.timeoutMs, PROVIDER_TEST_TIMEOUT_MS);

  if (!baseUrl) {
    return providerTestResult(false, requestedModel, prompt, "Base URL is required", startedAt, "Responses");
  }

  const model = requestedModel || (await firstProviderModel({ baseUrl, apiKey, kind })) || "gpt-4o-mini";
  const { endpoint, headers } = prepareResponsesEndpoint(kind, baseUrl);
  applyProviderAuthHeaders(headers, kind, baseUrl, apiKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: 24
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    const bodyText = await response.text().catch(() => "");
    if (!response.ok) {
      return providerTestResult(
        false,
        model,
        prompt,
        `Responses test failed: HTTP ${response.status}${bodyText ? ` - ${extractErrorMessage(bodyText)}` : ""}`,
        startedAt,
        "Responses",
        endpoint,
        response.status
      );
    }

    const content = extractResponsesContent(bodyText);
    if (!content) {
      return providerTestResult(false, model, prompt, "Responses test returned no assistant content", startedAt, "Responses", endpoint, response.status);
    }

    return providerTestResult(
      true,
      model,
      prompt,
      `Responses test passed in ${Date.now() - startedAt}ms with model ${model}: ${content.slice(0, 120)}`,
      startedAt,
      "Responses",
      endpoint,
      response.status
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    const message = error instanceof Error ? error.message : String(error);
    return providerTestResult(
      false,
      model,
      prompt,
      timedOut ? `Responses test timed out after ${Math.round(timeoutMs / 1000)}s with no response` : `Responses test failed: ${message}`,
      startedAt,
      "Responses",
      endpoint
    );
  }
}

async function testChatCompletionsProvider(input: TestProviderInput): Promise<TestProviderResult> {
  const startedAt = Date.now();
  const baseUrl = (input.baseUrl ?? "").trim();
  const apiKey = (input.apiKey ?? "").trim();
  const kind = (input.kind ?? "responsesRelay").trim();
  const prompt = PROVIDER_TEST_PROMPTS[Math.floor(Math.random() * PROVIDER_TEST_PROMPTS.length)] ?? DEFAULT_PROVIDER_TEST_PROMPT;
  const requestedModel = (input.model ?? "").trim();
  const timeoutMs = normalizeTimeout(input.timeoutMs, PROVIDER_TEST_TIMEOUT_MS);

  if (!baseUrl) {
    return providerTestResult(false, requestedModel, prompt, "Base URL is required", startedAt, "Chat Completions");
  }

  const model = requestedModel || (await firstProviderModel({ baseUrl, apiKey, kind })) || "gpt-4o-mini";
  const { endpoint, headers } = prepareChatCompletionsEndpoint(kind, baseUrl);
  applyProviderAuthHeaders(headers, kind, baseUrl, apiKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 24,
        temperature: 0
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    const bodyText = await response.text().catch(() => "");
    if (!response.ok) {
      return providerTestResult(
        false,
        model,
        prompt,
        `Chat Completions test failed: HTTP ${response.status}${bodyText ? ` - ${extractErrorMessage(bodyText)}` : ""}`,
        startedAt,
        "Chat Completions",
        endpoint,
        response.status
      );
    }

    const content = extractChatContent(bodyText);
    if (!content) {
      return providerTestResult(false, model, prompt, "Chat Completions test returned no assistant content", startedAt, "Chat Completions", endpoint, response.status);
    }

    return providerTestResult(true, model, prompt, `Chat Completions test passed in ${Date.now() - startedAt}ms with model ${model}: ${content.slice(0, 120)}`, startedAt, "Chat Completions", endpoint, response.status);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    const message = error instanceof Error ? error.message : String(error);
    return providerTestResult(
      false,
      model,
      prompt,
      timedOut ? `Chat Completions test timed out after ${Math.round(timeoutMs / 1000)}s with no response` : `Chat Completions test failed: ${message}`,
      startedAt,
      "Chat Completions",
      endpoint
    );
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

function isResponsesRelayKind(kind: string | undefined): boolean {
  return (kind ?? "responsesRelay").trim().toLowerCase() === "responsesrelay";
}

function prepareResponsesEndpoint(kind: string, rawBaseUrl: string): { endpoint: string; headers: Headers } {
  const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  let baseURL = rawBaseUrl.replace(/\/+$/, "");
  if (baseURL.endsWith("#")) {
    baseURL = baseURL.slice(0, -1).replace(/\/+$/, "");
  }
  if (baseURL.endsWith("/responses")) {
    return { endpoint: baseURL, headers };
  }
  if (/\/v1(\/|$)/i.test(baseURL) || /\/v\d+(\/|$)/i.test(baseURL)) {
    return { endpoint: `${baseURL}/responses`, headers };
  }
  if (kindLooksAnthropic(kind, baseURL)) {
    baseURL = baseURL.replace(/\/anthropic$/i, "").replace(/\/claude$/i, "");
  }
  return { endpoint: `${baseURL}/v1/responses`, headers };
}

function prepareChatCompletionsEndpoint(kind: string, rawBaseUrl: string): { endpoint: string; headers: Headers } {
  const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  let baseURL = rawBaseUrl.replace(/\/+$/, "");
  if (baseURL.endsWith("#")) {
    baseURL = baseURL.slice(0, -1).replace(/\/+$/, "");
  }
  if (baseURL.endsWith("/chat/completions")) {
    return { endpoint: baseURL, headers };
  }
  if (/\/v1(\/|$)/i.test(baseURL) || /\/v\d+(\/|$)/i.test(baseURL)) {
    return { endpoint: `${baseURL}/chat/completions`, headers };
  }
  if (kindLooksAnthropic(kind, baseURL)) {
    baseURL = baseURL.replace(/\/anthropic$/i, "").replace(/\/claude$/i, "");
  }
  return { endpoint: `${baseURL}/v1/chat/completions`, headers };
}

function applyProviderAuthHeaders(headers: Headers, kind: string, baseUrl: string, apiKey: string): void {
  if (!apiKey) {
    return;
  }
  if (kindLooksAnthropic(kind, baseUrl)) {
    headers.set("X-Api-Key", apiKey);
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("Anthropic-Version", "2023-06-01");
    return;
  }
  if (kindLooksGemini(kind, baseUrl)) {
    headers.set("X-Goog-Api-Key", apiKey);
    headers.set("Authorization", `Bearer ${apiKey}`);
    return;
  }
  headers.set("Authorization", `Bearer ${apiKey}`);
}

async function firstProviderModel(input: FetchProviderModelsInput): Promise<string | null> {
  const result = await fetchProviderModels(input);
  return result.models[0] ?? null;
}

function normalizeTimeout(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value) {
    return fallback;
  }
  return Math.max(1_000, Math.min(120_000, value));
}

function providerTestResult(
  ok: boolean,
  model: string,
  prompt: string,
  message: string,
  startedAt: number,
  _protocol: "Responses" | "Chat Completions",
  endpoint?: string,
  statusCode?: number
): TestProviderResult {
  return {
    ok,
    model,
    prompt,
    message,
    endpoint,
    statusCode,
    elapsedMs: Date.now() - startedAt
  };
}

function extractResponsesContent(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const outputText = parsed.output_text;
    if (typeof outputText === "string" && outputText.trim()) {
      return outputText.trim();
    }

    const output = parsed.output;
    if (Array.isArray(output)) {
      const textParts: string[] = [];
      for (const item of output) {
        if (!item || typeof item !== "object") continue;
        const itemRecord = item as Record<string, unknown>;
        const directText = itemRecord.text;
        if (typeof directText === "string" && directText.trim()) {
          textParts.push(directText.trim());
        }
        const content = itemRecord.content;
        if (!Array.isArray(content)) continue;
        for (const part of content) {
          if (!part || typeof part !== "object") continue;
          const partRecord = part as Record<string, unknown>;
          const text = partRecord.text;
          if (typeof text === "string" && text.trim()) {
            textParts.push(text.trim());
          }
        }
      }
      if (textParts.length > 0) {
        return textParts.join("\n");
      }
    }
  } catch {
    return "";
  }
  return "";
}

function extractChatContent(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const choices = parsed.choices;
    if (Array.isArray(choices)) {
      for (const choice of choices) {
        if (!choice || typeof choice !== "object") continue;
        const record = choice as Record<string, unknown>;
        const message = record.message;
        if (message && typeof message === "object") {
          const content = (message as Record<string, unknown>).content;
          if (typeof content === "string" && content.trim()) return content.trim();
        }
        const text = record.text;
        if (typeof text === "string" && text.trim()) return text.trim();
      }
    }
    const outputText = parsed.output_text;
    if (typeof outputText === "string" && outputText.trim()) return outputText.trim();
  } catch {
    return bodyText.trim();
  }
  return bodyText.trim();
}

function extractErrorMessage(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const error = parsed.error;
    if (typeof error === "string") return error.slice(0, 240);
    if (error && typeof error === "object") {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === "string") return message.slice(0, 240);
    }
  } catch {
    return bodyText.slice(0, 240);
  }
  return bodyText.slice(0, 240);
}
