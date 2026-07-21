import { afterEach, expect, test } from "bun:test";
import { fetchProviderModels } from "../../apps/server/src/providerModels.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockJsonFetch(payload: unknown, status = 200): Array<{ url: string; headers: Headers }> {
  const calls: Array<{ url: string; headers: Headers }> = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({
      url: String(input),
      headers: new Headers(init?.headers)
    });
    return new Response(JSON.stringify(payload), { status });
  }) as typeof fetch;
  return calls;
}

test("fetchProviderModels fetches OpenAI-compatible models with bearer auth", async () => {
  const calls = mockJsonFetch({
    data: [{ id: "z-model" }, { id: "a-model" }, { id: "a-model" }]
  });

  const result = await fetchProviderModels({
    baseUrl: "https://relay.example",
    apiKey: "sk-relay",
    kind: "responsesRelay"
  });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://relay.example/v1/models");
  expect(calls[0]?.headers.get("Authorization")).toBe("Bearer sk-relay");
  expect(result).toEqual({
    endpoint: "https://relay.example/v1/models",
    models: ["a-model", "z-model"]
  });
});

test("fetchProviderModels fetches Gemini-style models and strips models prefix", async () => {
  const calls = mockJsonFetch({
    models: [{ name: "models/gemini-2.5-pro" }, { name: "models/gemini-2.5-flash" }]
  });

  const result = await fetchProviderModels({
    baseUrl: "https://generativelanguage.googleapis.com",
    apiKey: "gemini-key",
    kind: "gemini"
  });

  expect(calls[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models");
  expect(calls[0]?.headers.get("X-Goog-Api-Key")).toBe("gemini-key");
  expect(calls[0]?.headers.get("Authorization")).toBe("Bearer gemini-key");
  expect(result.models).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
});

test("fetchProviderModels fetches Anthropic-like models with Anthropic headers", async () => {
  const calls = mockJsonFetch({
    data: [{ id: "claude-opus-4-6" }, { id: "claude-sonnet-4-5" }]
  });

  const result = await fetchProviderModels({
    baseUrl: "https://api.anthropic.com",
    apiKey: "anthropic-key",
    kind: "anthropic"
  });

  expect(calls[0]?.url).toBe("https://api.anthropic.com/v1/models");
  expect(calls[0]?.headers.get("Anthropic-Version")).toBe("2023-06-01");
  expect(calls[0]?.headers.get("X-Api-Key")).toBe("anthropic-key");
  expect(calls[0]?.headers.get("Authorization")).toBe("Bearer anthropic-key");
  expect(result.models).toEqual(["claude-opus-4-6", "claude-sonnet-4-5"]);
});

test("fetchProviderModels reports upstream HTTP failures", async () => {
  const calls = mockJsonFetch({ error: "bad key" }, 401);

  const result = await fetchProviderModels({
    baseUrl: "https://relay.example/v1",
    apiKey: "bad-key",
    kind: "responsesRelay"
  });

  expect(calls[0]?.url).toBe("https://relay.example/v1/models");
  expect(result.models).toEqual([]);
  expect(result.endpoint).toBe("https://relay.example/v1/models");
  expect(result.error).toContain("HTTP 401");
  expect(result.error).toContain("bad key");
});
