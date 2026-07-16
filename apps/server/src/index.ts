import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import {
  type ClientToServerMessage,
  type JsonRpcMessage,
  type JsonValue,
  type ProviderActivation,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";
import { CodexBridge } from "./codexBridge.js";
import { ProviderStore } from "./providerStore.js";

const PORT = Number(process.env.CODEX_UI_PORT ?? 43110);
const HOST = "127.0.0.1";
const sessionToken = process.env.CODEX_UI_TOKEN ?? randomBytes(24).toString("base64url");
const providerStore = new ProviderStore();
const bridge = new CodexBridge(() => providerStore.runtimeEnv());
const clients = new Set<WebSocket>();

await providerStore.initialize();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: ["req.headers.authorization", "*.apiKey", "*.token"]
  }
});

await app.register(websocket);

app.addHook("onRequest", async (request, reply) => {
  reply.header("Cross-Origin-Resource-Policy", "same-origin");
  reply.header("X-Content-Type-Options", "nosniff");
  if (request.url === "/api/session") {
    return;
  }
  if (request.url.startsWith("/api") || request.url.startsWith("/ws")) {
    const url = new URL(request.url, "http://127.0.0.1");
    const queryToken = url.searchParams.get("token");
    const headerValue = request.headers["x-codex-ui-token"];
    const token = Array.isArray(headerValue) ? headerValue[0] : headerValue ?? queryToken;
    if (token !== sessionToken) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  }
});

app.get("/api/session", async () => ({ token: sessionToken }));
app.get("/api/health", async () => ({ ok: true, status: bridge.getStatus() }));
app.get("/api/engine/status", async () => bridge.getStatus());
app.post("/api/engine/start", async () => bridge.start());
app.get("/api/providers", async () => ({ data: await providerStore.list() }));

app.get("/ws", { websocket: true }, (socket) => {
  const ws = socket as WebSocket;
  clients.add(ws);
  send(ws, { type: "engine.status", status: bridge.getStatus() });

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString("utf8")) as ClientToServerMessage;
      await handleClientMessage(ws, message);
    } catch (error) {
      send(ws, {
        type: "server.error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  ws.once("close", () => clients.delete(ws));
});

const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
const hasWebBuild = existsSync(join(webDist, "index.html"));
if (hasWebBuild) {
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: "/"
  });
}

app.setNotFoundHandler((request, reply) => {
  if (hasWebBuild && request.method === "GET" && !request.url.startsWith("/api") && !request.url.startsWith("/ws")) {
    reply.sendFile("index.html");
    return;
  }
  reply.code(404).send({ error: "Not found" });
});

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
  app.log.warn({ source: "codex" }, message as string);
});

try {
  await bridge.start();
} catch (error) {
  app.log.warn({ error }, "Codex app-server did not start during boot; UI can retry");
}

await app.listen({ host: HOST, port: PORT });
app.log.info(`Codex React UI listening at http://${HOST}:${PORT}/?token=${sessionToken}`);

async function handleClientMessage(ws: WebSocket, message: ClientToServerMessage): Promise<void> {
  switch (message.type) {
    case "rpc": {
      try {
        const result = await bridge.request(message.method, message.params);
        send(ws, { type: "rpc.result", id: message.id, result });
      } catch (error) {
        send(ws, {
          type: "rpc.error",
          id: message.id,
          error: {
            message:
              typeof error === "object" && error && "message" in error
                ? String((error as { message: unknown }).message)
                : String(error)
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
          message: error instanceof Error ? error.message : String(error)
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
  return provider.modelAliases.find((entry) => entry.alias === selectedModel)?.model ?? selectedModel;
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

function send(ws: WebSocket, message: ServerToClientMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(message: ServerToClientMessage): void {
  for (const client of clients) {
    send(client, message);
  }
}
