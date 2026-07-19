import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import type { Server, ServerWebSocket } from "bun";
import {
  type ClientToServerMessage,
  type JsonRpcMessage,
  type JsonValue,
  type ProviderActivation,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";
import { CodexBridge } from "./codexBridge.js";
import { LocalDatabase } from "./localDatabase.js";
import { ProviderStore } from "./providerStore.js";
import { AuditLogStore } from "./auditLogStore.js";

const PORT = Number(process.env.CODEX_UI_PORT ?? 43110);
const HOST = "127.0.0.1";
const sessionToken = process.env.CODEX_UI_TOKEN ?? randomBytes(24).toString("base64url");
const localDatabase = new LocalDatabase();
const providerStore = new ProviderStore(localDatabase);
const auditLogStore = new AuditLogStore(localDatabase);
const bridge = new CodexBridge(() => providerStore.runtimeEnv());
const clients = new Set<ServerWebSocket>();

await providerStore.initialize();

const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
const hasWebBuild = existsSync(join(webDist, "index.html"));
const webDistRoot = resolve(webDist);

bridge.on("status", (status) => {
  broadcast({ type: "engine.status", status });
});

bridge.on("message", (message: JsonRpcMessage) => {
  if ("method" in message && "id" in message) {
    broadcast({ type: "codex.serverRequest", message });
  } else if ("method" in message) {
    broadcast({ type: "codex.notification", message });
  }
});

bridge.on("stderr", (message) => {
  console.warn("[codex]", message as string);
});

try {
  await bridge.start();
} catch (error) {
  console.warn("Codex app-server did not start during boot; UI can retry", error);
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  fetch: handleHttpRequest,
  websocket: {
    open(ws) {
      clients.add(ws);
      send(ws, { type: "engine.status", status: bridge.getStatus() });
    },
    async message(ws, raw) {
      try {
        const message = JSON.parse(raw.toString()) as ClientToServerMessage;
        await handleClientMessage(ws, message);
      } catch (error) {
        send(ws, {
          type: "server.error",
          message: errorToMessage(error)
        });
      }
    },
    close(ws) {
      clients.delete(ws);
    }
  }
});

console.info(`Codex React UI listening at http://${HOST}:${PORT}/?token=${sessionToken}`);

async function handleHttpRequest(request: Request, server: Server<undefined>): Promise<Response | undefined> {
  const url = new URL(request.url);
  const headers = securityHeaders();

  try {
    if (url.pathname === "/ws") {
      if (!isAuthorized(request, url)) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      if (server.upgrade(request)) {
        return;
      }
      return jsonResponse({ error: "WebSocket upgrade failed" }, 400, headers);
    }

    if (url.pathname === "/api/session" && request.method === "GET") {
      return jsonResponse({ token: sessionToken }, 200, headers);
    }

    if (url.pathname.startsWith("/api")) {
      if (!isAuthorized(request, url)) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      return await handleApiRequest(request, url, headers);
    }

    return serveStatic(request, url, headers);
  } catch (error) {
    console.error("Request failed", error);
    return jsonResponse({ error: errorToMessage(error) }, 500, headers);
  }
}

async function handleApiRequest(request: Request, url: URL, headers: Headers): Promise<Response> {
  const route = `${request.method} ${url.pathname}`;
  switch (route) {
    case "GET /api/health":
      return jsonResponse({ ok: true, status: bridge.getStatus() }, 200, headers);
    case "GET /api/engine/status":
      return jsonResponse(bridge.getStatus(), 200, headers);
    case "POST /api/engine/start":
      return jsonResponse(await bridge.start(), 200, headers);
    case "GET /api/providers":
      return jsonResponse({ data: await providerStore.list() }, 200, headers);
    case "GET /api/profile/export":
      return jsonResponse(await providerStore.exportProfile(), 200, headers);
    case "POST /api/profile/import": {
      try {
        return jsonResponse(await providerStore.importProfile(await request.json()), 200, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }
    case "GET /api/audit/events":
      return jsonResponse({ data: await auditLogStore.list() }, 200, headers);
    default:
      return jsonResponse({ error: "Not found" }, 404, headers);
  }
}

function serveStatic(request: Request, url: URL, headers: Headers): Response {
  if (!hasWebBuild || (request.method !== "GET" && request.method !== "HEAD")) {
    return jsonResponse({ error: "Not found" }, 404, headers);
  }

  const path = decodeURIComponent(url.pathname);
  const normalized = resolve(webDistRoot, `.${path === "/" ? "/index.html" : path}`);
  const isInsideWebDist = normalized === webDistRoot || normalized.startsWith(`${webDistRoot}${sep}`);
  if (isInsideWebDist && existsSync(normalized) && statSync(normalized).isFile()) {
    return new Response(request.method === "HEAD" ? null : Bun.file(normalized), { headers });
  }

  return new Response(request.method === "HEAD" ? null : Bun.file(join(webDistRoot, "index.html")), { headers });
}

function isAuthorized(request: Request, url: URL): boolean {
  const queryToken = url.searchParams.get("token");
  const headerToken = request.headers.get("x-codex-ui-token");
  return (headerToken ?? queryToken) === sessionToken;
}

function jsonResponse(value: unknown, status = 200, headers = securityHeaders()): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers: responseHeaders });
}

function securityHeaders(): Headers {
  return new Headers({
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff"
  });
}

async function handleClientMessage(ws: ServerWebSocket, message: ClientToServerMessage): Promise<void> {
  switch (message.type) {
    case "rpc": {
      try {
        try {
          await auditLogStore.recordDangerousPermission(message.method, message.params);
        } catch (error) {
          console.warn("Failed to write dangerous permission audit event", { error, method: message.method });
        }
        const result = await bridge.request(message.method, message.params);
        send(ws, { type: "rpc.result", id: message.id, result });
      } catch (error) {
        send(ws, {
          type: "rpc.error",
          id: message.id,
          error: {
            message: errorToMessage(error)
          }
        });
      }
      return;
    }
    case "serverResponse": {
      bridge.respond(message.requestId, message.result, message.error);
      return;
    }
    case "provider.save": {
      const provider = await providerStore.save(message.provider, message.apiKey);
      send(ws, { type: "provider.saved", id: message.id, provider });
      return;
    }
    case "provider.delete": {
      await providerStore.delete(message.providerId);
      send(ws, { type: "provider.deleted", id: message.id, providerId: message.providerId });
      return;
    }
    case "provider.activate": {
      try {
        const activation = await activateProvider(message.providerId, message.model);
        send(ws, { type: "provider.activated", id: message.id, activation });
      } catch (error) {
        send(ws, {
          type: "server.error",
          message: errorToMessage(error)
        });
      }
      return;
    }
  }
}

async function activateProvider(providerId: string, model?: string): Promise<ProviderActivation> {
  const provider = await providerStore.get(providerId);
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  await bridge.start();

  const modelProvider = provider.kind === "chatgpt" ? "openai" : provider.id;
  const selectedModel = resolveProviderModel(provider, model || provider.defaultModel || provider.nativeModels[0]);
  const edits: Array<{ keyPath: string; value: JsonValue; mergeStrategy: "replace" }> = [];

  if (provider.kind !== "chatgpt") {
    edits.push({
      keyPath: `model_providers.${provider.id}`,
      value: providerToCodexConfig(provider),
      mergeStrategy: "replace"
    });
  }

  edits.push({ keyPath: "model_provider", value: modelProvider, mergeStrategy: "replace" });
  if (selectedModel) {
    edits.push({ keyPath: "model", value: selectedModel, mergeStrategy: "replace" });
  }

  await bridge.request("config/batchWrite", {
    edits,
    reloadUserConfig: true
  });
  await bridge.restart();

  return {
    providerId: provider.id,
    modelProvider,
    model: selectedModel,
    restartedAt: Date.now()
  };
}

function resolveProviderModel(provider: ProviderConfig, selectedModel?: string): string | undefined {
  if (!selectedModel) {
    return undefined;
  }
  let model = selectedModel;
  const seen = new Set<string>();
  for (let index = 0; index < 8; index += 1) {
    if (seen.has(model)) {
      return model;
    }
    seen.add(model);
    const next = provider.modelAliases.find((entry) => entry.alias === model)?.model;
    if (!next || next === model) {
      return model;
    }
    model = next;
  }
  return model;
}

function providerToCodexConfig(provider: ProviderConfig): JsonValue {
  const config: Record<string, JsonValue> = {
    name: provider.name,
    wire_api: "responses",
    supports_websockets: false
  };
  if (provider.baseUrl) {
    config.base_url = provider.baseUrl;
  }
  if (provider.apiKeyRef?.startsWith("env:")) {
    config.env_key = provider.apiKeyRef.slice("env:".length);
  }
  return config;
}

function send(ws: ServerWebSocket, message: ServerToClientMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    clients.delete(ws);
  }
}

function broadcast(message: ServerToClientMessage): void {
  for (const client of clients) {
    send(client, message);
  }
}

function errorToMessage(error: unknown): string {
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
