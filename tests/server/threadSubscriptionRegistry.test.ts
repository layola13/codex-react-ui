import { EventEmitter } from "node:events";
import { expect, test } from "bun:test";
import type { EngineStatus, JsonRpcFailure, JsonRpcId, JsonValue } from "@codex-ui/shared";
import { ThreadSubscriptionRegistry } from "../../apps/server/src/threadSubscriptionRegistry.ts";
import type { CodexRuntimeClient } from "../../apps/server/src/daemonCodexBridge.ts";

class FakeRuntimeClient extends EventEmitter implements CodexRuntimeClient {
  public status: EngineStatus = { phase: "ready", transport: "daemon-unix" };
  public requests: Array<{ method: string; params?: JsonValue }> = [];
  public failResumeCount = 0;

  public getStatus(): EngineStatus {
    return this.status;
  }

  public async start(): Promise<EngineStatus> {
    this.status = { phase: "ready", transport: "daemon-unix" };
    this.emit("status", this.status);
    return this.status;
  }

  public stop(): void {
    this.status = { phase: "stopped", transport: "daemon-unix" };
    this.emit("status", this.status);
  }

  public async restart(): Promise<EngineStatus> {
    this.stop();
    return this.start();
  }

  public async request(method: string, params?: JsonValue): Promise<JsonValue> {
    this.requests.push({ method, params });
    if (method === "thread/resume" && this.failResumeCount > 0) {
      this.failResumeCount -= 1;
      throw new Error("no rollout found");
    }
    return {};
  }

  public async notify(_method: string, _params?: JsonValue): Promise<void> {}

  public respond(_id: JsonRpcId, _result?: JsonValue, _error?: JsonRpcFailure["error"]): void {}
}

test("ThreadSubscriptionRegistry resumes once for multiple watchers and unsubscribes after the last watcher leaves", async () => {
  const client = new FakeRuntimeClient();
  const registry = new ThreadSubscriptionRegistry(() => client);

  registry.watch("thread-1", "browser-a");
  registry.watch("thread-1", "browser-b");
  await Promise.resolve();

  expect(client.requests.filter((request) => request.method === "thread/resume")).toHaveLength(1);

  registry.unwatch("thread-1", "browser-a");
  await Promise.resolve();
  expect(client.requests.filter((request) => request.method === "thread/unsubscribe")).toHaveLength(0);

  registry.unwatch("thread-1", "browser-b");
  await Promise.resolve();
  expect(client.requests.filter((request) => request.method === "thread/unsubscribe")).toHaveLength(1);
});

test("ThreadSubscriptionRegistry keeps daemon subscription alive while a turn hold is active", async () => {
  const client = new FakeRuntimeClient();
  const registry = new ThreadSubscriptionRegistry(() => client);

  registry.watch("thread-2", "browser-a");
  registry.addTurnHold("thread-2", "turn:turn-1");
  await Promise.resolve();

  registry.unwatch("thread-2", "browser-a");
  await Promise.resolve();
  expect(client.requests.filter((request) => request.method === "thread/unsubscribe")).toHaveLength(0);

  registry.removeTurnHold("thread-2", "turn:turn-1");
  await Promise.resolve();
  expect(client.requests.filter((request) => request.method === "thread/unsubscribe")).toHaveLength(1);
});

test("ThreadSubscriptionRegistry reattaches watched threads after daemon reconnect", async () => {
  const client = new FakeRuntimeClient();
  const registry = new ThreadSubscriptionRegistry(() => client);
  registry.registerClient(client);

  registry.watch("thread-3", "browser-a");
  await Promise.resolve();

  client.emit("status", { phase: "ready", transport: "daemon-unix", connectionEpoch: 2 } satisfies EngineStatus);
  await Promise.resolve();

  const resumes = client.requests.filter((request) => request.method === "thread/resume");
  expect(resumes).toHaveLength(2);
  expect(resumes.every((request) => (request.params as { threadId?: string }).threadId === "thread-3")).toBe(true);
});

test("ThreadSubscriptionRegistry retries transient resume failures while watchers remain", async () => {
  const client = new FakeRuntimeClient();
  client.failResumeCount = 1;
  const registry = new ThreadSubscriptionRegistry(() => client);

  registry.watch("thread-4", "browser-a");
  await new Promise((resolve) => setTimeout(resolve, 650));

  const resumes = client.requests.filter((request) => request.method === "thread/resume");
  expect(resumes).toHaveLength(2);
  expect(client.requests.filter((request) => request.method === "thread/unsubscribe")).toHaveLength(0);
});
