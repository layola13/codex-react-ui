import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

function createStoredTestZip(entries: Record<string, Buffer>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const records: Array<{ path: string; data: Buffer; crc: number; offset: number }> = [];
  let offset = 0;
  for (const [path, data] of Object.entries(entries)) {
    const name = Buffer.from(path);
    const crc = crc32(data);
    const header = Buffer.alloc(30 + name.length);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    name.copy(header, 30);
    localParts.push(header, data);
    records.push({ path, data, crc, offset });
    offset += header.length + data.length;
  }
  const centralOffset = offset;
  for (const record of records) {
    const name = Buffer.from(record.path);
    const header = Buffer.alloc(46 + name.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt32LE(record.crc, 16);
    header.writeUInt32LE(record.data.length, 20);
    header.writeUInt32LE(record.data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(record.offset, 42);
    name.copy(header, 46);
    centralParts.push(header);
    offset += header.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(records.length, 8);
  end.writeUInt16LE(records.length, 10);
  end.writeUInt32LE(offset - centralOffset, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function readStoredTestZip(zip: Buffer): Map<string, Buffer> {
  const endOffset = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOffset < 0) {
    throw new Error("Missing ZIP end directory");
  }
  const entryCount = zip.readUInt16LE(endOffset + 10);
  let cursor = zip.readUInt32LE(endOffset + 16);
  const files = new Map<string, Buffer>();
  for (let index = 0; index < entryCount; index += 1) {
    if (zip.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory");
    }
    const method = zip.readUInt16LE(cursor + 10);
    const size = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;
    if (method !== 0) {
      throw new Error("Only stored ZIP entries are supported by this test helper");
    }
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    files.set(name, zip.subarray(dataStart, dataStart + size));
  }
  return files;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const mockProvider = {
  id: "hubproxy-grok",
  kind: "responsesRelay",
  name: "HubProxy Grok",
  baseUrl: "https://api.astrdark.cyou/v1",
  apiKeyRef: "env:CODEX_UI_PROVIDER_HUBPROXY_GROK_API_KEY",
  apiKeyPreview: "key...ring",
  apiKeyStorage: "keyring",
  defaultModel: "codex",
  nativeModels: ["grok-4.5"],
  modelAliases: [
    { alias: "gpt-5.5", model: "grok-4.5" },
    { alias: "codex", model: "gpt-5.5" }
  ],
  createdAt: 1,
  updatedAt: 2
};

const importedProvider = {
  id: "imported-relay",
  kind: "responsesRelay",
  name: "Imported Relay",
  baseUrl: "https://relay.example.test/v1",
  apiKeyRef: "env:CODEX_UI_PROVIDER_IMPORTED_RELAY_API_KEY",
  apiKeyStorage: "none",
  defaultModel: "imported-model",
  nativeModels: ["imported-model"],
  modelAliases: [{ alias: "codex-imported", model: "imported-model" }],
  createdAt: 3,
  updatedAt: 4
};

type TestJsonSchemaLike = TestJsonSchema | boolean;

type TestJsonSchema = {
  $ref?: string;
  allOf?: TestJsonSchemaLike[];
  properties?: Record<string, TestJsonSchemaLike>;
};

type TestCodexSchema = TestJsonSchema & {
  definitions?: Record<string, TestJsonSchemaLike>;
};

function flattenTestSchemaProperties(
  root: TestCodexSchema,
  properties: Record<string, TestJsonSchemaLike>,
  parentPath: string[] = []
): string[] {
  return Object.keys(properties)
    .sort((a, b) => a.localeCompare(b))
    .flatMap((key) => {
      const keyPath = [...parentPath, key];
      const schema = resolveTestSchema(root, properties[key]);
      return [keyPath.join("."), ...flattenTestSchemaProperties(root, schema.properties ?? {}, keyPath)];
    });
}

function resolveTestSchema(root: TestCodexSchema, schema: TestJsonSchemaLike | undefined, seen = new Set<string>()): TestJsonSchema {
  if (!schema || typeof schema === "boolean") {
    return {};
  }
  let resolved: TestJsonSchema = schema;
  if (schema.$ref?.startsWith("#/definitions/")) {
    const name = schema.$ref.slice("#/definitions/".length);
    if (!seen.has(name)) {
      seen.add(name);
      resolved = mergeTestSchema(resolveTestSchema(root, root.definitions?.[name], seen), withoutTestRef(schema));
    }
  }
  if (resolved.allOf?.length) {
    return resolved.allOf.reduce<TestJsonSchema>((acc, entry) => mergeTestSchema(acc, resolveTestSchema(root, entry, seen)), withoutTestAllOf(resolved));
  }
  return resolved;
}

function mergeTestSchema(base: TestJsonSchema, override: TestJsonSchema): TestJsonSchema {
  return {
    ...base,
    ...override,
    properties: {
      ...(base.properties ?? {}),
      ...(override.properties ?? {})
    }
  };
}

function withoutTestRef(schema: TestJsonSchema): TestJsonSchema {
  const { $ref: _ref, ...rest } = schema;
  return rest;
}

function withoutTestAllOf(schema: TestJsonSchema): TestJsonSchema {
  const { allOf: _allOf, ...rest } = schema;
  return rest;
}

async function confirmWorkspace(page: Page, cwd = "~/"): Promise<void> {
  const panel = page.getByTestId("workspace-selection-panel");
  if (!(await panel.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false))) {
    return;
  }
  await panel.getByRole("textbox", { name: "Workspace" }).fill(cwd);
  await panel.getByRole("button", { name: "Use workspace" }).click();
  await expect(panel).toHaveCount(0, { timeout: 10_000 });
}

async function openTranscriptSearch(page: Page): Promise<void> {
  const promptMap = page.getByTestId("chat-prompt-map");
  if (await promptMap.isVisible().catch(() => false)) {
    await promptMap.getByRole("button", { name: "Close prompt map" }).click();
    await expect(promptMap).toHaveCount(0);
  }
  const overlay = page.getByTestId("chat-search-overlay");
  if (await overlay.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("chat-search-open").click();
  await expect(overlay).toBeVisible();
}

async function setTranscriptSearchScope(page: Page, scope: "All" | "User" | "Assistant" | "Tools" | "Files" | "Commands"): Promise<void> {
  const overlay = page.getByTestId("chat-search-overlay");
  await expect(overlay).toBeVisible();
  if (await page.getByRole("listbox").isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  }
  await overlay.getByTestId("chat-search-scope").click();
  await page.getByRole("option", { name: scope }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

async function openPromptMap(page: Page): Promise<void> {
  const searchOverlay = page.getByTestId("chat-search-overlay");
  if (await searchOverlay.isVisible().catch(() => false)) {
    await searchOverlay.getByRole("button", { name: "Close transcript search" }).click();
    await expect(searchOverlay).toHaveCount(0);
  }
  const promptMap = page.getByTestId("chat-prompt-map");
  if (await promptMap.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("chat-prompt-map-open").click();
  await expect(promptMap).toBeVisible();
}

let providerApiList = [mockProvider];
let providerModelFetchRequests: Array<{ baseUrl?: string; apiKey?: string; kind?: string; providerId?: string }> = [];
let auditApiEvents: Array<{
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
  inputSummary?: { items: number; textItems: number; imageItems: number; mentionItems: number };
}> = [];

test.beforeEach(async ({ page }) => {
  providerApiList = [mockProvider];
  providerModelFetchRequests = [];
  auditApiEvents = [];

  await page.addInitScript(() => {
    const outbound = ((window as unknown as { __codexUiOutbound: unknown[] }).__codexUiOutbound = []);
    const sockets = ((window as unknown as { __codexUiSockets: unknown[] }).__codexUiSockets = []);
    let threadStartCount = 0;
    let turnStartCount = 0;
    let tokenTotal = 0;

    class MockWebSocket extends EventTarget {
      public static readonly CONNECTING = 0;
      public static readonly OPEN = 1;
      public static readonly CLOSING = 2;
      public static readonly CLOSED = 3;
      public readonly CONNECTING = 0;
      public readonly OPEN = 1;
      public readonly CLOSING = 2;
      public readonly CLOSED = 3;
      public readyState = MockWebSocket.CONNECTING;
      public onopen: ((event: Event) => void) | null = null;
      public onmessage: ((event: MessageEvent) => void) | null = null;
      public onclose: ((event: CloseEvent) => void) | null = null;
      public onerror: ((event: Event) => void) | null = null;
      private readonly commandExecRequests = new Map<string, string>();

      public constructor(public readonly url: string) {
        super();
        sockets.push(this);
        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          const event = new Event("open");
          this.dispatchEvent(event);
          this.onopen?.(event);
          this.emit({ type: "engine.status", status: { phase: "ready", codexVersion: "mock-codex" } });
        }, 0);
      }

      public send(raw: string): void {
        const message = JSON.parse(raw) as {
          id?: string;
          method?: string;
          type?: string;
          providerId?: string;
          model?: string;
          provider?: {
            id?: string;
            kind?: string;
            name?: string;
            baseUrl?: string;
            apiKeyRef?: string;
            apiKeyPreview?: string;
            apiKeyStorage?: string;
            defaultModel?: string;
            nativeModels?: string[];
            modelAliases?: Array<{ alias: string; model: string }>;
            modelRates?: unknown[];
            remark?: string;
            createdAt?: number;
            updatedAt?: number;
          };
          apiKey?: string;
          params?: unknown;
        };
        outbound.push(message);
        if (message.type === "provider.save" && message.id && message.provider) {
          const name = message.provider.name || "Saved relay";
          const providerId =
            message.provider.id ||
            name
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 40) ||
            "saved-relay";
          const preview =
            message.apiKey && message.apiKey.length > 8
              ? `${message.apiKey.slice(0, 4)}...${message.apiKey.slice(-4)}`
              : message.provider.apiKeyPreview;
          setTimeout(
            () =>
              this.emit({
                type: "provider.saved",
                id: message.id,
                provider: {
                  ...message.provider,
                  id: providerId,
                  name,
                  apiKeyRef: message.apiKey ? `env:CODEX_UI_PROVIDER_${providerId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}_API_KEY` : message.provider.apiKeyRef,
                  apiKeyPreview: preview,
                  apiKeyStorage: message.apiKey ? "keyring" : message.provider.apiKeyStorage ?? "none",
                  createdAt: message.provider.createdAt || Date.now(),
                  updatedAt: Date.now()
                }
              }),
            0
          );
          return;
        }
        if (message.type === "provider.activate" && message.id) {
          setTimeout(
            () =>
              this.emit({
                type: "provider.activated",
                id: message.id,
                activation: {
                  providerId: message.providerId ?? "hubproxy-grok",
                  modelProvider: message.providerId ?? "hubproxy-grok",
                  model: message.model ?? "codex",
                  restartedAt: Date.now()
                }
              }),
            0
          );
          return;
        }
        if (message.type !== "rpc" || !message.id) {
          return;
        }
        if (message.method === "command/exec") {
          const processId = (message.params as { processId?: string } | undefined)?.processId;
          if (processId) {
            this.commandExecRequests.set(processId, message.id);
            setTimeout(() => {
              this.emit({
                type: "codex.notification",
                message: {
                  method: "command/exec/outputDelta",
                  params: {
                    processId,
                    stream: "stdout",
                    deltaBase64: btoa("terminal-ready\n"),
                    capReached: false
                  }
                }
              });
            }, 0);
          }
          return;
        }
        if (message.method === "command/exec/write") {
          const params = message.params as { processId?: string; deltaBase64?: string } | undefined;
          if (params?.processId && params.deltaBase64) {
            const input = atob(params.deltaBase64);
            setTimeout(() => {
              this.emit({
                type: "codex.notification",
                message: {
                  method: "command/exec/outputDelta",
                  params: {
                    processId: params.processId,
                    stream: "stdout",
                    deltaBase64: btoa(`stdin:${input}`),
                    capReached: false
                  }
                }
              });
            }, 0);
          }
          setTimeout(() => this.emit({ type: "rpc.result", id: message.id, result: {} }), 0);
          return;
        }
        if (message.method === "command/exec/resize") {
          setTimeout(() => this.emit({ type: "rpc.result", id: message.id, result: {} }), 0);
          return;
        }
        if (message.method === "command/exec/terminate") {
          const processId = (message.params as { processId?: string } | undefined)?.processId;
          const execRequestId = processId ? this.commandExecRequests.get(processId) : null;
          setTimeout(() => {
            this.emit({ type: "rpc.result", id: message.id, result: {} });
            if (execRequestId) {
              this.emit({ type: "rpc.result", id: execRequestId, result: { exitCode: 143, stdout: "", stderr: "" } });
            }
          }, 0);
          return;
        }
        const result = rpcResult(message.method ?? "", message.params);
        if (message.method === "thread/start") {
          const thread = (result as { thread?: { id?: string; preview?: string; status?: string } }).thread;
          setTimeout(() => {
            this.emit({ type: "rpc.result", id: message.id, result });
            if (thread?.id) {
              this.emit({
                type: "codex.notification",
                message: {
                  method: "thread/started",
                  params: { thread }
                }
              });
            }
          }, 0);
          return;
        }
        if (message.method === "turn/start") {
          const params = message.params as { threadId?: string; input?: Array<{ type?: string; text?: string; url?: string; path?: string; name?: string; detail?: string }> } | undefined;
          const threadId = params?.threadId ?? "thread-missing";
          const turnIndex = ++turnStartCount;
          const turnId = `turn-${turnIndex}`;
          const itemId = `item-${turnIndex}`;
          const inputText = params?.input?.find((entry) => entry.type === "text")?.text ?? "";
          const parallelAgentsPrompt = inputText.toLowerCase().includes("parallel agents");
          const workingStatusPrompt = inputText.toLowerCase().includes("working status probe");
          setTimeout(() => {
            this.emit({ type: "rpc.result", id: message.id, result });
            this.emit({
              type: "codex.notification",
              message: {
                method: "turn/started",
                params: {
                  threadId,
                  turn: { id: turnId, threadId, status: "inProgress" }
                }
              }
            });
            this.emit({
              type: "codex.notification",
              message: {
                method: "item/completed",
                params: {
                  threadId,
                  turnId,
                  item: {
                    type: "userMessage",
                    id: `${itemId}-user`,
                    content: params?.input ?? []
                  }
                }
              }
            });
            if (workingStatusPrompt) {
              setTimeout(() => {
                this.emit({
                  type: "codex.notification",
                  message: {
                    method: "item/started",
                    params: {
                      threadId,
                      turnId,
                      item: {
                        type: "reasoning",
                        id: `${itemId}-reasoning`,
                        text: "Inspecting current workspace state",
                        status: "inProgress"
                      }
                    }
                  }
                });
              }, 350);
              setTimeout(() => {
                this.emit({
                  type: "codex.notification",
                  message: {
                    method: "item/agentMessage/delta",
                    params: {
                      turnId,
                      itemId,
                      delta: "Accepted working status probe"
                    }
                  }
                });
              }, 700);
              setTimeout(() => {
                tokenTotal += 1234;
                this.emit({
                  type: "codex.notification",
                  message: {
                    method: "thread/tokenUsage/updated",
                    params: {
                      threadId,
                      turnId,
                      tokenUsage: {
                        total: {
                          totalTokens: tokenTotal,
                          inputTokens: Math.round(tokenTotal * 0.5),
                          cachedInputTokens: 100,
                          cacheWriteInputTokens: 20,
                          outputTokens: Math.round(tokenTotal * 0.35),
                          reasoningOutputTokens: Math.round(tokenTotal * 0.15)
                        },
                        last: {
                          totalTokens: 1234,
                          inputTokens: 617,
                          cachedInputTokens: 100,
                          cacheWriteInputTokens: 20,
                          outputTokens: 432,
                          reasoningOutputTokens: 185
                        },
                        modelContextWindow: 128000
                      }
                    }
                  }
                });
              }, 820);
              setTimeout(() => {
                this.emit({
                  type: "codex.notification",
                  message: {
                    method: "turn/completed",
                    params: {
                      threadId,
                      turn: { id: turnId, threadId, status: "completed" }
                    }
                  }
                });
              }, 1100);
              return;
            }
            if (parallelAgentsPrompt) {
              const reviewThreadId = "agent-review-thread";
              const testsThreadId = "agent-tests-thread";
              this.emit({
                type: "codex.notification",
                message: {
                  method: "item/started",
                  params: {
                    threadId,
                    turnId,
                    startedAtMs: Date.now(),
                    item: {
                      type: "collabAgentToolCall",
                      id: `${itemId}-spawn`,
                      tool: "spawnAgent",
                      status: "inProgress",
                      senderThreadId: threadId,
                      receiverThreadIds: [reviewThreadId, testsThreadId],
                      prompt: "Split the implementation into review and test agents",
                      model: "gpt-5.6-sol",
                      reasoningEffort: "medium",
                      agentsStates: {
                        [reviewThreadId]: { status: "running", message: "reviewing UI state" },
                        [testsThreadId]: { status: "running", message: "building Playwright proof" }
                      }
                    }
                  }
                }
              });
              [
                {
                  id: reviewThreadId,
                  turnId: "turn-agent-review",
                  itemId: "item-agent-review",
                  nickname: "Review",
                  role: "Reviewer",
                  text: "Review agent found missing tests for completion badges."
                },
                {
                  id: testsThreadId,
                  turnId: "turn-agent-tests",
                  itemId: "item-agent-tests",
                  nickname: "Tests",
                  role: "Playwright",
                  text: "Test agent reproduced the parallel rail switching path."
                }
              ].forEach((agent, index) => {
                setTimeout(() => {
                  this.emit({
                    type: "codex.notification",
                    message: {
                      method: "thread/started",
                      params: {
                        thread: {
                          id: agent.id,
                          parentThreadId: threadId,
                          preview: `${agent.nickname} agent`,
                          agentNickname: agent.nickname,
                          agentRole: agent.role,
                          status: "running"
                        }
                      }
                    }
                  });
                  this.emit({
                    type: "codex.notification",
                    message: {
                      method: "turn/started",
                      params: {
                        threadId: agent.id,
                        turn: { id: agent.turnId, threadId: agent.id, status: "inProgress" }
                      }
                    }
                  });
                  this.emit({
                    type: "codex.notification",
                    message: {
                      method: "item/agentMessage/delta",
                      params: {
                        threadId: agent.id,
                        turnId: agent.turnId,
                        itemId: agent.itemId,
                        delta: agent.text
                      }
                    }
                  });
                  this.emit({
                    type: "codex.notification",
                    message: {
                      method: "item/completed",
                      params: {
                        threadId: agent.id,
                        turnId: agent.turnId,
                        completedAtMs: Date.now(),
                        item: {
                          type: "agentMessage",
                          id: agent.itemId,
                          text: agent.text,
                          phase: null,
                          memoryCitation: null
                        }
                      }
                    }
                  });
                  this.emit({
                    type: "codex.notification",
                    message: {
                      method: "turn/completed",
                      params: {
                        threadId: agent.id,
                        turn: { id: agent.turnId, threadId: agent.id, status: "completed" }
                      }
                    }
                  });
                }, 40 + index * 40);
              });
              setTimeout(() => {
                this.emit({
                  type: "codex.notification",
                  message: {
                    method: "item/completed",
                    params: {
                      threadId,
                      turnId,
                      completedAtMs: Date.now(),
                      item: {
                        type: "collabAgentToolCall",
                        id: `${itemId}-spawn`,
                        tool: "spawnAgent",
                        status: "completed",
                        senderThreadId: threadId,
                        receiverThreadIds: [reviewThreadId, testsThreadId],
                        prompt: "Split the implementation into review and test agents",
                        model: "gpt-5.6-sol",
                        reasoningEffort: "medium",
                        agentsStates: {
                          [reviewThreadId]: { status: "completed", message: "review complete" },
                          [testsThreadId]: { status: "completed", message: "tests complete" }
                        }
                      }
                    }
                  }
                });
                this.emit({
                  type: "codex.notification",
                  message: {
                    method: "turn/completed",
                    params: {
                      threadId,
                      turn: { id: turnId, threadId, status: "completed" }
                    }
                  }
                });
              }, 160);
              return;
            }
            this.emit({
              type: "codex.notification",
              message: {
                method: "item/agentMessage/delta",
                params: {
                  turnId,
                  itemId,
                  delta: `Accepted ${inputText}`
                }
              }
            });
            setTimeout(() => {
              tokenTotal += 1234;
              this.emit({
                type: "codex.notification",
                message: {
                  method: "thread/tokenUsage/updated",
                  params: {
                    threadId,
                    turnId,
                    tokenUsage: {
                      total: {
                        totalTokens: tokenTotal,
                        inputTokens: Math.round(tokenTotal * 0.5),
                        cachedInputTokens: 100,
                        cacheWriteInputTokens: 20,
                        outputTokens: Math.round(tokenTotal * 0.35),
                        reasoningOutputTokens: Math.round(tokenTotal * 0.15)
                      },
                      last: {
                        totalTokens: 1234,
                        inputTokens: 617,
                        cachedInputTokens: 100,
                        cacheWriteInputTokens: 20,
                        outputTokens: 432,
                        reasoningOutputTokens: 185
                      },
                      modelContextWindow: 128000
                    }
                  }
                }
              });
              this.emit({
                type: "codex.notification",
                message: {
                  method: "turn/completed",
                  params: {
                    threadId,
                    turn: { id: turnId, threadId, status: "completed" }
                  }
                }
              });
            }, 250);
          }, 0);
          return;
        }
        setTimeout(() => this.emit({ type: "rpc.result", id: message.id, result }), 0);
      }

      public close(): void {
        this.readyState = MockWebSocket.CLOSED;
        const event = new CloseEvent("close");
        this.dispatchEvent(event);
        this.onclose?.(event);
      }

      private emit(value: unknown): void {
        const event = new MessageEvent("message", { data: JSON.stringify(value) });
        this.dispatchEvent(event);
        this.onmessage?.(event);
      }
    }

    let skillExtraRoots: string[] = [];
    const threadGoals: Record<
      string,
      {
        threadId: string;
        objective: string;
        status: "active" | "paused" | "blocked" | "usageLimited" | "budgetLimited" | "complete";
        tokenBudget: number | null;
        tokensUsed: number;
        timeUsedSeconds: number;
        createdAt: number;
        updatedAt: number;
      }
    > = {};
    const virtualFiles: Record<string, string> = {
      "/root/projects/README.md": "# Mock Project\n\nEditable from Playwright.\n",
      "/root/projects/src/App.tsx": "export const value = 1;\n"
    };
    const engineConfig: Record<string, unknown> = {
      model: "gpt-5.6-sol",
      review_model: "gpt-5.6-sol",
      model_provider: "openai",
      model_reasoning_effort: "medium",
      model_reasoning_summary: "auto",
      model_verbosity: "medium",
      approval_policy: "on-request",
      sandbox_mode: "workspace-write",
      web_search: "cached",
      service_tier: "default",
      instructions: "Be precise.",
      developer_instructions: "Prefer workspace-write tools.",
      history: {
        persistence: "save-all",
        max_bytes: 1048576
      },
      tui: {
        animations: true,
        alternate_screen: "auto"
      },
      memories: {
        generate_memories: true,
        max_rollouts_per_startup: 4
      },
      features: {
        web_search_request: true
      },
      runtime_only_config: {
        enabled: true
      }
    };
    const installedPlugin = {
      id: "mock-plugin@mock-market",
      remotePluginId: "remote-mock",
      name: "mock-plugin",
      version: "1.0.0",
      localVersion: "1.0.0",
      shareContext: null,
      source: { type: "remote" },
      installed: true,
      enabled: true,
      installPolicy: "AVAILABLE",
      installPolicySource: null,
      authPolicy: "ON_USE",
      availability: "AVAILABLE",
      interface: {
        displayName: "Mock Plugin",
        shortDescription: "Mock plugin",
        longDescription: null,
        developerName: "Mock Dev",
        category: "Search",
        capabilities: ["search"],
        websiteUrl: "https://example.test/mock-plugin",
        privacyPolicyUrl: null,
        termsOfServiceUrl: null,
        defaultPrompt: ["Search the mock catalog"],
        brandColor: null,
        composerIcon: null,
        composerIconUrl: null,
        logo: null,
        logoDark: null,
        logoUrl: null,
        logoUrlDark: null,
        screenshots: [],
        screenshotUrls: []
      },
      keywords: []
    };
    const authPlugin = {
      id: "auth-plugin@mock-market",
      remotePluginId: "remote-auth",
      name: "auth-plugin",
      version: "1.0.0",
      localVersion: null,
      shareContext: null,
      source: { type: "remote" },
      installed: false,
      enabled: false,
      installPolicy: "AVAILABLE",
      installPolicySource: null,
      authPolicy: "ON_INSTALL",
      availability: "AVAILABLE",
      interface: {
        displayName: "Auth Plugin",
        shortDescription: "Needs auth",
        longDescription: null,
        developerName: "Auth Dev",
        category: "Productivity",
        capabilities: ["calendar"],
        websiteUrl: null,
        privacyPolicyUrl: null,
        termsOfServiceUrl: null,
        defaultPrompt: null,
        brandColor: null,
        composerIcon: null,
        composerIconUrl: null,
        logo: null,
        logoDark: null,
        logoUrl: null,
        logoUrlDark: null,
        screenshots: [],
        screenshotUrls: []
      },
      keywords: []
    };
    let mockThreadRows: Array<Record<string, string | number>> = [
      { id: "thread-1", name: "Mock thread", preview: "Mock thread preview", status: "idle", cwd: "/root/projects", source: "cli", updatedAt: 1710000030, recencyAt: 1710000030 },
      { id: "thread-2", preview: "Second task", status: "idle", cwd: "/root/projects/codex-react-ui", source: "appServer", updatedAt: 1710000010, recencyAt: 1710000010 },
      {
        id: "019c2d47-4935-7423-a190-05691f566092",
        name: "Session Index Title",
        preview: "rollout preview fallback",
        status: "idle",
        cwd: "/root/projects/indexed",
        source: "vscode",
        modelProvider: "openai",
        createdAt: 1709900000,
        updatedAt: 1710000020,
        recencyAt: 1710000020
      }
    ];

    function rpcResult(method: string, params?: unknown): unknown {
      switch (method) {
        case "account/read":
          return { authMode: "mock" };
        case "config/read":
          return {
            config: { ...engineConfig },
            origins: {},
            layers: null
          };
        case "config/value/write": {
          const writeParams = params as { keyPath?: string; value?: unknown } | undefined;
          if (writeParams?.keyPath) {
            setConfigAtPath(engineConfig, writeParams.keyPath, writeParams.value);
          }
          return {};
        }
        case "config/batchWrite": {
          const batchParams = params as {
            edits?: Array<{ keyPath?: string; value?: unknown }>;
            reloadUserConfig?: boolean;
          } | undefined;
          for (const edit of batchParams?.edits ?? []) {
            if (edit.keyPath) {
              setConfigAtPath(engineConfig, edit.keyPath, edit.value);
            }
          }
          return { reloaded: Boolean(batchParams?.reloadUserConfig) };
        }
        case "model/list":
          return {
            data: [
              {
                model: "gpt-5.6-sol",
                displayName: "GPT 5.6 Sol",
                supportedReasoningEfforts: [
                  { reasoningEffort: "low", description: "Fast low effort" },
                  { reasoningEffort: "medium", description: "Balanced effort" },
                  { reasoningEffort: "high", description: "Deep effort" }
                ]
              }
            ]
          };
        case "thread/list":
          {
            const searchTerm = typeof (params as { searchTerm?: unknown } | undefined)?.searchTerm === "string" ? String((params as { searchTerm?: string }).searchTerm).toLowerCase() : "";
            const filtered = searchTerm
              ? mockThreadRows.filter((row) =>
                  [row.name, row.preview, row.cwd, row.source, row.modelProvider, row.id]
                    .filter((value): value is string => typeof value === "string")
                    .some((value) => value.toLowerCase().includes(searchTerm))
                )
              : mockThreadRows;
            return { data: filtered };
          }
        case "thread/read": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId ?? "thread-1";
          const row = mockThreadRows.find((entry) => entry.id === threadId);
          return {
            thread: {
              id: threadId,
              name: typeof row?.name === "string" ? row.name : undefined,
              preview: typeof row?.preview === "string" ? row.preview : undefined,
              status: typeof row?.status === "string" ? row.status : "idle",
              cwd: typeof row?.cwd === "string" ? row.cwd : "/root/projects",
              source: typeof row?.source === "string" ? row.source : "cli",
              updatedAt: typeof row?.updatedAt === "number" ? row.updatedAt : 1710000020,
              recencyAt: typeof row?.recencyAt === "number" ? row.recencyAt : 1710000020,
              turns: []
            }
          };
        }
        case "thread/start": {
          const id = `thread-new-${++threadStartCount}`;
          return { thread: { id, preview: `New mock thread ${threadStartCount}`, status: "idle" } };
        }
        case "thread/name/set": {
          const nameParams = params as { threadId?: string; name?: string } | undefined;
          mockThreadRows = mockThreadRows.map((row) =>
            row.id === nameParams?.threadId ? { ...row, name: nameParams.name ?? row.name, updatedAt: 1710000040, recencyAt: 1710000040 } : row
          );
          return {};
        }
        case "thread/archive": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId;
          mockThreadRows = mockThreadRows.filter((row) => row.id !== threadId);
          return {};
        }
        case "thread/delete": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId;
          mockThreadRows = mockThreadRows.filter((row) => row.id !== threadId);
          return {};
        }
        case "review/start": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId ?? "thread-1";
          return {
            turn: { id: `review-turn-${Date.now()}`, threadId, status: "inProgress" },
            reviewThreadId: threadId
          };
        }
        case "gitDiffToRemote":
          return {
            sha: "abc123def456",
            diff: "diff --git a/README.md b/README.md\n+Slash command diff preview"
          };
        case "thread/compact/start":
          return {};
        case "thread/resume": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId ?? "thread-1";
          const row = mockThreadRows.find((entry) => entry.id === threadId);
          return {
            thread: {
              id: threadId,
              name: typeof row?.name === "string" ? row.name : undefined,
              preview: typeof row?.preview === "string" ? row.preview : undefined,
              status: typeof row?.status === "string" ? row.status : "idle",
              cwd: typeof row?.cwd === "string" ? row.cwd : "/root/projects",
              source: typeof row?.source === "string" ? row.source : "cli"
            },
            model: "gpt-5.6-sol",
            modelProvider: "openai",
            serviceTier: null,
            cwd: typeof row?.cwd === "string" ? row.cwd : "/root/projects",
            instructionSources: [],
            approvalPolicy: "on-request",
            approvalsReviewer: "appServer",
            sandbox: { type: "workspaceWrite", writableRoots: ["/root/projects"], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false },
            reasoningEffort: "medium"
          };
        }
        case "thread/goal/set": {
          const goalParams = params as { threadId?: string; objective?: string | null; status?: "active" | "paused" | "blocked" | "usageLimited" | "budgetLimited" | "complete" | null; tokenBudget?: number | null } | undefined;
          const threadId = goalParams?.threadId ?? "thread-missing";
          const existing = threadGoals[threadId];
          const now = Math.floor(Date.now() / 1000);
          const goal = {
            threadId,
            objective: goalParams?.objective ?? existing?.objective ?? "Mock goal",
            status: goalParams?.status ?? existing?.status ?? "active",
            tokenBudget: goalParams && "tokenBudget" in goalParams ? goalParams.tokenBudget ?? null : existing?.tokenBudget ?? null,
            tokensUsed: existing?.tokensUsed ?? 0,
            timeUsedSeconds: existing?.timeUsedSeconds ?? 0,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
          };
          threadGoals[threadId] = goal;
          return { goal };
        }
        case "thread/goal/get": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId ?? "";
          return { goal: threadGoals[threadId] ?? null };
        }
        case "thread/goal/clear": {
          const threadId = (params as { threadId?: string } | undefined)?.threadId ?? "";
          delete threadGoals[threadId];
          return { cleared: true };
        }
        case "turn/start":
          return {};
        case "mcpServerStatus/list":
          return {
            data: [
              {
                name: "mock-mcp",
                serverInfo: { name: "mock", version: "1.0.0" },
                authStatus: "unsupported",
                tools: {
                  ping: {
                    name: "ping",
                    title: "Ping",
                    description: "Ping tool",
                    inputSchema: {
                      type: "object",
                      properties: {
                        message: { type: "string", default: "hello" }
                      }
                    },
                    outputSchema: {
                      type: "object",
                      properties: {
                        ok: { type: "boolean" }
                      }
                    }
                  }
                },
                resources: [{ name: "readme", title: "Readme", uri: "mock://readme", description: "Mock resource" }],
                resourceTemplates: []
              }
            ],
            nextCursor: null
          };
        case "mcpServer/tool/call":
          return {
            content: [{ type: "text", text: "pong" }],
            structuredContent: {
              ok: true,
              echo: (params as { arguments?: { message?: string } } | undefined)?.arguments ?? null
            },
            _meta: null
          };
        case "skills/list":
          return {
            data: [
              {
                cwd: "/root/projects",
                skills: [{ name: "mock-skill", description: "Mock skill", path: "/tmp/mock/SKILL.md", scope: "user", enabled: true }],
                errors: []
              },
              ...skillExtraRoots.map((cwd) => ({
                cwd,
                skills: [{ name: "extra-skill", description: "Extra skill", path: `${cwd}/SKILL.md`, scope: "user", enabled: true }],
                errors: []
              }))
            ]
          };
        case "skills/extraRoots/set":
          skillExtraRoots = Array.isArray((params as { extraRoots?: string[] } | undefined)?.extraRoots)
            ? ((params as { extraRoots?: string[] }).extraRoots ?? []).map(String)
            : [];
          return {};
        case "hooks/list":
          return {
            data: [
              {
                cwd: "/root/projects",
                hooks: [
                  {
                    key: "/root/.codex/config.toml:pre_tool_use:0:0",
                    eventName: "pre_tool_use",
                    handlerType: "command",
                    matcher: "Bash",
                    command: "python3 /root/hooks/pre_tool_use.py",
                    timeoutSec: 5,
                    statusMessage: "checking command",
                    sourcePath: "/root/.codex/config.toml",
                    source: "user",
                    pluginId: null,
                    displayOrder: 0,
                    enabled: true,
                    isManaged: false,
                    currentHash: "sha256:mock-user-hook",
                    trustStatus: "trusted"
                  },
                  {
                    key: "plugin://mock-plugin@mock-market:post_turn:0:0",
                    eventName: "post_turn",
                    handlerType: "command",
                    matcher: null,
                    command: "node mock-plugin/hook.js",
                    timeoutSec: 10,
                    statusMessage: "sync plugin state",
                    sourcePath: "/root/.codex/plugins/mock-plugin/plugin.json",
                    source: "plugin",
                    pluginId: "mock-plugin@mock-market",
                    displayOrder: 1,
                    enabled: false,
                    isManaged: true,
                    currentHash: "sha256:mock-plugin-hook",
                    trustStatus: "untrusted"
                  }
                ],
                warnings: ["Mock hook warning"],
                errors: [{ path: "/root/projects/.codex/hooks.toml", message: "Mock hook parse warning" }]
              }
            ]
          };
        case "fs/readFile":
          if ((params as { path?: string } | undefined)?.path === "/tmp/mock/SKILL.md") {
            return {
              dataBase64: btoa("# Mock Skill\n\nLocal preview from Playwright.")
            };
          }
          return {
            dataBase64: btoa(virtualFiles[(params as { path?: string } | undefined)?.path ?? ""] ?? "")
          };
        case "fs/readDirectory": {
          const path = (params as { path?: string } | undefined)?.path ?? "/root/projects";
          const entries =
            path === "/root"
              ? [{ fileName: "projects", isDirectory: true, isFile: false }]
              : path === "/root/projects"
              ? [
                  { fileName: "src", isDirectory: true, isFile: false },
                  { fileName: "README.md", isDirectory: false, isFile: true }
                ]
              : path === "/root/projects/src"
                ? [{ fileName: "App.tsx", isDirectory: false, isFile: true }]
                : [];
          return { entries };
        }
        case "fs/writeFile": {
          const path = (params as { path?: string } | undefined)?.path;
          const dataBase64 = (params as { dataBase64?: string } | undefined)?.dataBase64;
          if (path && dataBase64) {
            virtualFiles[path] = atob(dataBase64);
          }
          return {};
        }
        case "plugin/list":
          return {
            marketplaces: [{ name: "mock-market", path: null, interface: { displayName: "Mock Market" }, plugins: [installedPlugin, authPlugin] }],
            marketplaceLoadErrors: [],
            featuredPluginIds: ["mock-plugin@mock-market"]
          };
        case "plugin/installed":
          return {
            marketplaces: [{ name: "mock-market", path: null, interface: { displayName: "Mock Market" }, plugins: [installedPlugin] }],
            marketplaceLoadErrors: []
          };
        case "plugin/read":
          return {
            plugin: {
              marketplaceName: "mock-market",
              marketplacePath: null,
              summary: installedPlugin,
              shareUrl: "https://example.test/share/mock-plugin",
              description: "Detailed mock plugin description.",
              skills: [{ name: "mock-skill", description: "Mock skill", enabled: true, path: "/tmp/mock/SKILL.md" }],
              hooks: [{ key: "on-turn", eventName: "turn" }],
              apps: [{ id: "mock-calendar", name: "Mock Calendar", description: "Calendar access", installUrl: "https://example.test/connect/calendar", category: "Calendar" }],
              appTemplates: [
                {
                  templateId: "calendar-template",
                  name: "Calendar Template",
                  description: "Template calendar app",
                  category: "Calendar",
                  canonicalConnectorId: "calendar",
                  logoUrl: null,
                  logoUrlDark: null,
                  materializedAppIds: ["mock-calendar"],
                  reason: null
                }
              ],
              mcpServers: ["mock-mcp"],
              scheduledTasks: []
            }
          };
        case "plugin/install":
          return {
            authPolicy: "ON_INSTALL",
            appsNeedingAuth: [{ id: "auth-console", name: "Auth Console", description: "Connect before use", installUrl: "https://example.test/connect/auth", category: "Auth" }]
          };
        case "app/list":
          return {
            data: [
              {
                id: "mock-calendar",
                name: "Mock Calendar",
                description: "Calendar access",
                logoUrl: null,
                logoUrlDark: null,
                iconAssets: null,
                iconDarkAssets: null,
                distributionChannel: "mock",
                branding: { category: "Calendar", developer: "Mock Dev", website: "https://example.test/calendar", privacyPolicy: null, termsOfService: null, isDiscoverableApp: true },
                appMetadata: null,
                labels: null,
                installUrl: "https://example.test/connect/calendar",
                isAccessible: false,
                isEnabled: true,
                pluginDisplayNames: ["Mock Plugin"]
              }
            ],
            nextCursor: null
          };
        default:
          return {};
      }
    }

    function setConfigAtPath(config: Record<string, unknown>, keyPath: string, value: unknown): void {
      const segments = keyPath.split(".").filter(Boolean);
      let cursor = config;
      segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
          cursor[segment] = value;
          return;
        }
        const existing = cursor[segment];
        if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
          cursor[segment] = {};
        }
        cursor = cursor[segment] as Record<string, unknown>;
      });
    }

    Object.defineProperty(window, "WebSocket", { value: MockWebSocket });
  });

  await page.route("/api/session", (route) => route.fulfill({ json: { token: "test-token" } }));
  await page.route("/api/providers", (route) => route.fulfill({ json: { data: providerApiList } }));
  await page.route("/api/profile/export", (route) =>
    route.fulfill({
      json: {
        schema: "codex-react-ui.profile.v1",
        exportedAt: 123,
        providers: providerApiList.map(({ apiKeyPreview: _apiKeyPreview, ...provider }) => ({
          ...provider,
          apiKeyStorage: "none"
        }))
      }
    })
  );
  await page.route("/api/profile/import", async (route) => {
    const body = route.request().postDataJSON() as { providers?: typeof providerApiList };
    const imported = body.providers ?? [];
    providerApiList = [
      ...providerApiList.filter((provider) => !imported.some((entry) => entry.id === provider.id)),
      ...imported
    ];
    await route.fulfill({ json: { importedProviders: imported.length, providers: providerApiList } });
  });
  await page.route("/api/provider/fetch-models", async (route) => {
    const body = route.request().postDataJSON() as { baseUrl?: string; apiKey?: string; kind?: string; providerId?: string };
    providerModelFetchRequests.push(body);
    await route.fulfill({
      json: {
        endpoint: `${(body.baseUrl ?? "").replace(/\/+$/, "")}/models`,
        error: null,
        models: [
          { id: "deepseek-chat" },
          { id: "glm-4.5" },
          { id: "openai/gpt-5.5" }
        ]
      }
    });
  });
  await page.route("/api/audit/events", (route) => route.fulfill({ json: { data: auditApiEvents } }));
});

test("renders the workbench and tooling panels", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("mock-codex")).toBeVisible();
  await expect(page.getByRole("tab", { name: "New task" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Mock thread" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Second task" })).toBeVisible();
  await expect(page.getByTestId("right-workspace-panel")).toHaveCount(0);

  await page.getByLabel("Open right workspace").click();
  await expect(page.getByTestId("right-workspace-panel")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Side chat" }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Browser" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Terminal" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Web Dev" })).toBeVisible();

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Plugins settings").click();
  await page.getByRole("tab", { name: "MCP 1" }).click();
  await expect(page.getByText("mock-mcp")).toBeVisible();

  await page.getByLabel("Open Skills settings").click();
  await expect(page.getByText("mock-skill")).toBeVisible();

  await page.getByLabel("Open Plugins settings").click();
  await page.getByRole("tab", { name: "Marketplace 2" }).click();
  await expect(page.getByRole("heading", { name: "Mock Plugin" })).toBeVisible();
});

test("shows working status while a turn is pending or thinking", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page);

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("working status probe");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  const indicator = page.getByTestId("composer-working-indicator");
  await expect(indicator).toContainText("Working");
  await expect(indicator).toContainText(/Working \d+s/);
  await expect(indicator).toContainText(/background terminals running/);
  await expect(indicator).toHaveAttribute("aria-label", /\/ps to view/);
  await expect(indicator).toHaveAttribute("aria-label", /\/stop to interrupt/);
  await expect(indicator).toContainText("Working");
  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  await composer.fill("append while model is running");
  await composer.press("Enter");
  await page.waitForFunction(() => {
    const outbound = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
    return outbound.some((message) => message.method === "turn/start" && message.params?.input?.some((entry) => entry.type === "text" && entry.text === "append while model is running"));
  });
  await composer.press("Escape");
  await page.waitForFunction(() => {
    const outbound = (window as unknown as { __codexUiOutbound?: Array<{ method?: string }> }).__codexUiOutbound ?? [];
    return outbound.some((message) => message.method === "turn/interrupt");
  });
  const acceptedResponse = page.getByTestId("workbench-item-agentMessage").filter({ hasText: "Accepted working status probe" });
  await expect(acceptedResponse.getByText("Accepted working status probe")).toBeVisible();
  await expect(acceptedResponse.getByTestId("assistant-message-started-at")).toContainText(/\d{2}:\d{2}/);
  await expect(acceptedResponse.getByTestId("assistant-first-token")).toContainText(/first \d+(\.\d)?s/);
  await expect(acceptedResponse.getByTestId("assistant-token-usage")).toContainText(/in 617 · out 432 · hit 16\.2% · \d+(\.\d+)? tok\/s · cost \$\d+\.\d+/);
  await expect(acceptedResponse.getByTestId("assistant-usage-details")).toHaveCount(0);
  await expect(page.getByTestId("history-sidebar")).toContainText(/cost \$\d+\.\d+/);
  await expect(page.getByText("completed", { exact: true })).toHaveCount(0);
  await expect(indicator).toHaveCount(0);
  await expect(acceptedResponse.getByTestId("assistant-message-header")).toHaveAttribute("data-live", "false");
});

test("shows native Codex approval and choice requests in the main chat", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page);

  await page.evaluate(() => {
    const socket = (window as unknown as {
      __codexUiSockets?: Array<{
        dispatchEvent: (event: MessageEvent) => boolean;
        onmessage?: ((event: MessageEvent) => void) | null;
      }>;
    }).__codexUiSockets?.at(-1);
    if (!socket) throw new Error("Missing mock socket");
    const emit = (value: unknown) => {
      const event = new MessageEvent("message", { data: JSON.stringify(value) });
      socket.dispatchEvent(event);
      socket.onmessage?.(event);
    };
    emit({
      type: "codex.serverRequest",
      message: {
        id: "permission-request-1",
        method: "item/permissions/requestApproval",
        params: {
          threadId: "thread-1",
          turnId: "turn-1",
          itemId: "perm-1",
          cwd: "/tmp/workspace",
          reason: "Need temporary network access",
          permissions: { network: { enabled: true }, fileSystem: null }
        }
      }
    });
  });

  const panel = page.getByTestId("pending-server-requests");
  await expect(panel).toContainText("Permission request");
  await expect(panel).toContainText("Need temporary network access");
  await panel.getByRole("button", { name: "Allow session" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; requestId?: string; result?: { scope?: string; permissions?: { network?: { enabled?: boolean } } } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.type === "serverResponse" && message.requestId === "permission-request-1" && message.result?.scope === "session" && message.result.permissions?.network?.enabled === true);
  });
  await expect(panel).toHaveCount(0);

  await page.evaluate(() => {
    const socket = (window as unknown as {
      __codexUiSockets?: Array<{
        dispatchEvent: (event: MessageEvent) => boolean;
        onmessage?: ((event: MessageEvent) => void) | null;
      }>;
    }).__codexUiSockets?.at(-1);
    if (!socket) throw new Error("Missing mock socket");
    const emit = (value: unknown) => {
      const event = new MessageEvent("message", { data: JSON.stringify(value) });
      socket.dispatchEvent(event);
      socket.onmessage?.(event);
    };
    emit({
      type: "codex.serverRequest",
      message: {
        id: "choice-request-1",
        method: "item/tool/requestUserInput",
        params: {
          threadId: "thread-1",
          turnId: "turn-1",
          itemId: "choice-1",
          questions: [
            {
              id: "mode",
              header: "Mode",
              question: "Choose a mode",
              options: [
                { label: "Fast", description: "Use low effort" },
                { label: "Careful", description: "Use more effort" }
              ]
            }
          ],
          autoResolutionMs: null
        }
      }
    });
  });
  await expect(panel).toContainText("Choose an option");
  await panel.getByRole("button", { name: "Careful" }).click();
  await panel.getByRole("button", { name: "Submit" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; requestId?: string; result?: { answers?: { mode?: { answers?: string[] } } } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.type === "serverResponse" && message.requestId === "choice-request-1" && message.result?.answers?.mode?.answers?.[0] === "Careful");
  });
});

test("creates a Full Auto chat through the New Chat danger dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "New task" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reasoning strength" })).toContainText("Medium");

  await page.getByRole("button", { name: "Choose New Chat mode" }).first().click();
  await page.getByRole("menuitem", { name: /Full Access \/ Danger Bypass/ }).click();

  const dialog = page.getByTestId("danger-new-chat-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Create Full Auto chat");
  await expect(dialog).toContainText("Current cwd");
  await expect(dialog).toContainText("~/");
  await expect(dialog).toContainText("Model");
  await expect(dialog).toContainText("gpt-5.6-sol");
  await expect(dialog).toContainText("Reasoning");
  await expect(dialog).toContainText("Medium");
  await expect(dialog).toContainText("No sandbox boundary");
  await expect(dialog).toContainText("No approval prompts");

  const backendParams = page.getByTestId("danger-backend-params");
  await expect(backendParams).toContainText('"sandbox": "danger-full-access"');
  await expect(backendParams).toContainText('"approvalPolicy": "never"');
  await expect(backendParams).toContainText('"type": "dangerFullAccess"');
  await expect(dialog).toContainText("codex --dangerously-bypass-approvals-and-sandbox");

  const createButton = page.getByRole("button", { name: "Create Full Auto Chat" });
  await expect(createButton).toBeDisabled();
  await page.screenshot({
    path: "snapshot/new-chat-danger-bypass-dialog.png",
    fullPage: false
  });

  await page.getByLabel("Confirm Danger Bypass").check();
  await expect(createButton).toBeEnabled();
  await createButton.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("danger-session-badge")).toContainText("Full Auto");
  await confirmWorkspace(page);

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Run this in full auto");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: {
            sandbox?: string;
            sandboxPolicy?: { type?: string };
            approvalPolicy?: string;
            effort?: string;
            model?: string;
          };
        }>;
      }
    ).__codexUiOutbound;
    const threadStart = messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "thread/start" &&
        message.params?.sandbox === "danger-full-access" &&
        message.params?.approvalPolicy === "never" &&
        message.params?.model === "gpt-5.6-sol"
    );
    const turnStart = messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.sandboxPolicy?.type === "dangerFullAccess" &&
        message.params?.approvalPolicy === "never" &&
        message.params?.effort === "medium" &&
        message.params?.model === "gpt-5.6-sol"
    );
    return threadStart && turnStart;
  });
});

test("supports settings, black theme, task tabs, and reasoning effort", async ({ page }) => {
  await page.goto("/");

  const reasoningButton = page.getByRole("button", { name: "Reasoning strength" });
  await expect(reasoningButton).toContainText("Medium");
  await reasoningButton.click();
  await expect(page.getByText("Reasoning strength")).toBeVisible();
  await page.getByRole("slider").press("End");
  await expect(page.locator("button").filter({ hasText: "High" }).first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByLabel("Open settings").click();
  await expect(page.getByLabel("Open Appearance settings")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Codex Engine Config" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Default reasoning effort" })).toContainText("Medium");
  await expect(page.getByRole("combobox", { name: "Web search" })).toContainText("Cached");
  await page.getByLabel("Open Appearance settings").click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(page.getByRole("button", { name: /System/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Light/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dark/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Install" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Install" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "dream-rose");
  await page.getByLabel("Skin").click();
  await page.getByRole("option", { name: "Official Black" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "official-black");
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();

  await page.getByRole("tab", { name: "Second task" }).click();
  await expect(page.getByRole("tab", { name: "Second task" })).toHaveAttribute("aria-selected", "true");

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Use high effort");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { effort?: string } }> })
      .__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "turn/start" && message.params?.effort === "high");
  });
});

test("reconnects websocket after a disconnect and refreshes basics", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => (window as unknown as { __codexUiSockets?: unknown[] }).__codexUiSockets?.length === 1);
  await page.evaluate(() => {
    (window as unknown as { __codexUiOutbound: unknown[] }).__codexUiOutbound.length = 0;
    const socket = (window as unknown as { __codexUiSockets: Array<{ close: () => void }> }).__codexUiSockets[0];
    socket.close();
  });
  await page.waitForFunction(() => (window as unknown as { __codexUiSockets?: unknown[] }).__codexUiSockets?.length >= 2);
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string }> }).__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "account/read");
  });
  await expect(page.getByTestId("topbar-conversation-status")).toHaveText("idle");

  // A delayed close from the superseded socket must not mark the live socket disconnected.
  await page.evaluate(() => {
    const oldSocket = (window as unknown as { __codexUiSockets: Array<EventTarget> }).__codexUiSockets[0];
    oldSocket.dispatchEvent(new CloseEvent("close"));
  });
  await page.waitForTimeout(50);
  await expect(page.getByTestId("topbar-conversation-status")).toHaveText("idle");
});

test("uses thread/list for unified history and never requests /api/engine-history", async ({ page }) => {
  let engineHistoryRequests = 0;
  await page.route(/\/api\/engine-history(?:\?.*)?$/, async (route) => {
    engineHistoryRequests += 1;
    await route.fulfill({ status: 404, body: "Not Found" });
  });

  await page.goto("/");
  await expect(page.getByTestId("topbar-conversation-status")).toHaveText("idle");

  const threadListCalls = await page.evaluate(() => {
    const outbound = (window as unknown as { __codexUiOutbound: Array<{ method?: string; params?: { sourceKinds?: string[] } }> }).__codexUiOutbound;
    return outbound.filter((message) => message.method === "thread/list");
  });

  expect(engineHistoryRequests).toBe(0);
  expect(threadListCalls.length).toBeGreaterThan(0);
  expect(threadListCalls[0]?.params?.sourceKinds).toEqual(["cli", "vscode", "exec", "appServer"]);
  expect((threadListCalls[0]?.params as { modelProviders?: string[] } | undefined)?.modelProviders).toEqual([]);
});

test("searches Codex history by app-server metadata and resumes selected rows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");

  const sessionRow = page.getByRole("button", { name: "Open history Session Index Title" });
  await expect(sessionRow).toBeVisible();
  await expect(sessionRow).not.toContainText("rollout preview fallback");
  await page.getByLabel("Search history").first().fill("indexed");
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { searchTerm?: string } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.method === "thread/list" && message.params?.searchTerm === "indexed");
  });
  await expect(page.getByRole("button", { name: "Open history Session Index Title" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Open history Mock thread" })).toHaveCount(0);

  await page
    .getByLabel("Search history")
    .first()
    .fill("Session renamed to codex-ui-5.6. To resume this session run codex resume, then select codex-ui-5.6 (019c2d47-4935-7423-a190-05691f566092)");
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { threadId?: string } }> }).__codexUiOutbound ?? [];
    return messages.some(
      (message) => message.method === "thread/read" && message.params?.threadId === "019c2d47-4935-7423-a190-05691f566092"
    );
  });
  await expect(page.getByRole("button", { name: "Open history Session Index Title" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open history Session Index Title" }).first().click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { threadId?: string; cwd?: string } }> }).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.method === "thread/resume" &&
        message.params?.threadId === "019c2d47-4935-7423-a190-05691f566092" &&
        message.params?.cwd === "/root/projects/indexed"
    );
  });
  await expect(page.getByRole("tab", { name: "Session Index Title" })).toHaveAttribute("aria-selected", "true");

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Continue indexed thread");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{ method?: string; params?: { threadId?: string; cwd?: string; input?: Array<{ text?: string }> } }>;
      }
    ).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.method === "turn/start" &&
        message.params?.threadId === "019c2d47-4935-7423-a190-05691f566092" &&
        message.params?.cwd === "/root/projects/indexed" &&
        message.params?.input?.some((input) => input.text === "Continue indexed thread")
    );
  });

  await page.getByRole("button", { name: "Rename history Session Index Title" }).click();
  await page.getByLabel("Thread name").fill("Renamed history row");
  await page.getByRole("button", { name: "Save rename" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { threadId?: string; name?: string } }> }).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.method === "thread/name/set" &&
        message.params?.threadId === "019c2d47-4935-7423-a190-05691f566092" &&
        message.params?.name === "Renamed history row"
    );
  });
  await expect(page.getByRole("tab", { name: "Renamed history row" })).toHaveAttribute("aria-selected", "true");

  await page.getByLabel("Search history").fill("");
  await expect(page.getByRole("button", { name: "Open history Second task" })).toBeVisible();
  await page.getByRole("button", { name: "Archive history Second task" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { threadId?: string } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.method === "thread/archive" && message.params?.threadId === "thread-2");
  });
  await expect(page.getByRole("button", { name: "Open history Second task" })).toHaveCount(0);

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete history Mock thread" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { threadId?: string } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.method === "thread/delete" && message.params?.threadId === "thread-1");
  });
  await expect(page.getByRole("button", { name: "Open history Mock thread" })).toHaveCount(0);
});

test("virtualizes long main chat transcripts and keeps jump-to-latest usable", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open history Mock thread" }).click();
  await expect(page.getByRole("tab", { name: "Mock thread" })).toHaveAttribute("aria-selected", "true");

  await page.evaluate(() => {
    const socket = (window as unknown as {
      __codexUiSockets?: Array<{
        dispatchEvent: (event: MessageEvent) => boolean;
        onmessage?: ((event: MessageEvent) => void) | null;
      }>;
    }).__codexUiSockets?.at(-1);
    if (!socket) {
      throw new Error("Missing mock socket");
    }
    const emit = (value: unknown) => {
      const event = new MessageEvent("message", { data: JSON.stringify(value) });
      socket.dispatchEvent(event);
      socket.onmessage?.(event);
    };
    for (let index = 0; index < 320; index += 1) {
      const turnId = `long-turn-${index}`;
      emit({
        type: "codex.notification",
        message: {
          method: "turn/started",
          params: { threadId: "thread-1", turn: { id: turnId, threadId: "thread-1", status: "inProgress" } }
        }
      });
      emit({
        type: "codex.notification",
        message: {
          method: "item/completed",
          params: {
            threadId: "thread-1",
            turnId,
            item: { type: "userMessage", id: `long-user-${index}`, text: `Long user prompt ${index}` }
          }
        }
      });
      if (index === 310) {
        emit({
          type: "codex.notification",
          message: {
            method: "item/completed",
            params: {
              threadId: "thread-1",
              turnId,
              item: { type: "reasoning", id: "long-reasoning-310", text: "Completed reasoning detail 310\n\n- checked files\n- prepared answer" }
            }
          }
        });
      }
      emit({
        type: "codex.notification",
        message: {
          method: "item/completed",
          params: {
            threadId: "thread-1",
            turnId,
            item: {
              type: "agentMessage",
              id: `long-agent-${index}`,
              text: `Long assistant answer ${index}\n\n\`\`\`ts\nexport const value${index} = ${index};\n\`\`\``
            }
          }
        }
      });
      if (index === 260) {
        emit({
          type: "codex.notification",
          message: {
            method: "item/completed",
            params: {
              threadId: "thread-1",
              turnId,
              item: {
                type: "fileChange",
                id: "long-file-260",
                status: "modified",
                path: "apps/web/file-audit-260.ts",
                changes: [{ path: "apps/web/file-audit-260.ts", status: "modified" }],
                old_string: "old file audit line",
                new_string: "file audit diff marker 260"
              }
            }
          }
        });
      }
      if (index === 275) {
        emit({
          type: "codex.notification",
          message: {
            method: "item/completed",
            params: {
              threadId: "thread-1",
              turnId,
              item: {
                type: "mcpToolCall",
                id: "long-tool-275",
                server: "filesystem",
                tool: "readFile",
                status: "completed",
                durationMs: 42,
                arguments: { path: "/tmp/tool-audit-275.txt" },
                result: {
                  structuredContent: {
                    message: "tool audit secret 275",
                    bytes: 2048
                  }
                }
              }
            }
          }
        });
      }
      if (index === 276) {
        emit({
          type: "codex.notification",
          message: {
            method: "item/completed",
            params: {
              threadId: "thread-1",
              turnId,
              item: {
                type: "mcpToolCall",
                id: "long-edit-tool-276",
                tool: "Edit",
                status: "completed",
                arguments: {
                  path: "apps/web/tool-edit-276.ts",
                  old_string: "old tool edit line",
                  new_string: "tool edit diff marker 276"
                },
                result: {
                  structuredContent: {
                    status: "completed"
                  }
                }
              }
            }
          }
        });
      }
      if (index % 25 === 0) {
        const commandText =
          index === 300
            ? [
                "stdout line 300",
                ...Array.from({ length: 78 }, (_, lineIndex) => `long command line ${String(lineIndex + 1).padStart(2, "0")}`),
                "long command tail marker 300"
              ].join("\n")
            : `stdout line ${index}\ncompleted`;
        emit({
          type: "codex.notification",
          message: {
            method: "item/completed",
            params: {
              threadId: "thread-1",
              turnId,
              item: { type: "commandExecution", id: `long-command-${index}`, command: "bun test", text: commandText, status: "completed" }
            }
          }
        });
        if (index === 225) {
          for (const suffix of [1, 2]) {
            emit({
              type: "codex.notification",
              message: {
                method: "item/completed",
                params: {
                  threadId: "thread-1",
                  turnId,
                  item: {
                    type: "commandExecution",
                    id: `long-command-${index}-folded-${suffix}`,
                    command: `bun run folded-${suffix}`,
                    text: `folded bash output ${suffix}\ncompleted`,
                    status: "completed"
                  }
                }
              }
            });
          }
        }
      }
      emit({
        type: "codex.notification",
        message: {
          method: "turn/completed",
          params: { threadId: "thread-1", turn: { id: turnId, threadId: "thread-1", status: "completed" } }
        }
      });
    }
  });

  const waterfall = page.getByTestId("conversation-waterfall");
  await expect(waterfall).toHaveAttribute("data-row-count", "657");
  await page.waitForTimeout(120);
  const mountedRows = await waterfall.locator('[data-testid^="conversation-item-"]').count();
  expect(mountedRows).toBeGreaterThan(0);
  expect(mountedRows).toBeLessThan(80);

  await expect(page.getByTestId("chat-floor-rail")).toBeVisible();
  await page.getByRole("button", { name: /Jump to prompt 150: Long user prompt 149/ }).click();
  await expect(page.getByTestId("conversation-item-long-user-149").getByText("Long user prompt 149")).toBeVisible();
  await openPromptMap(page);
  await page.getByLabel("Filter prompts").fill("Long user prompt 219");
  await expect(page.getByText("1/320 prompts")).toBeVisible();
  await page.getByTestId("chat-prompt-map").getByRole("button", { name: /Jump to prompt 220: Long user prompt 219/ }).click();
  await expect(page.getByTestId("conversation-item-long-user-219").getByText("Long user prompt 219")).toBeVisible();

  await openTranscriptSearch(page);
  await page.getByLabel("Search transcript").fill("Long assistant answer 319");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  await expect(page.getByTestId("conversation-item-long-agent-319").getByText("Long assistant answer 319")).toBeVisible();
  await setTranscriptSearchScope(page, "Commands");
  await page.getByLabel("Search transcript").fill("stdout line 300");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  const longCommandRow = page.getByTestId("conversation-item-long-command-300");
  await expect(longCommandRow.getByText("Bash")).toBeVisible();
  await expect(longCommandRow.getByText("(bun test)")).toBeVisible();
  await expect(longCommandRow.getByTestId("command-output")).toHaveCount(0);
  await longCommandRow.getByRole("button", { name: "ctrl+o to expand" }).click();
  await expect(longCommandRow.getByTestId("command-output")).toContainText("long command line 01");
  await expect(longCommandRow.getByTestId("command-output")).toContainText("long command tail marker 300");
  await longCommandRow.getByRole("button", { name: "collapse" }).click();
  await expect(longCommandRow.getByTestId("command-output")).toHaveCount(0);
  await longCommandRow.getByRole("button", { name: "ctrl+o to expand" }).click();
  await page.getByLabel("Search transcript").fill("folded bash output 1");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  const commandGroupRow = page.locator('[data-testid^="conversation-item-command-group-"]').first();
  await expect(commandGroupRow.getByText(/old Bash command/)).toBeVisible();
  await expect(commandGroupRow).not.toContainText("folded bash output 1");
  await commandGroupRow.getByText(/old Bash command/).click();
  await expect(commandGroupRow).toContainText("folded bash output 1");
  await expect(commandGroupRow).toContainText("bun run folded-1");
  await setTranscriptSearchScope(page, "User");
  await expect(page.getByText("No transcript rows match this search.")).toBeVisible();

  const scroll = page.getByTestId("chat-waterfall-scroll");
  await scroll.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(page.getByRole("button", { name: /Jump to latest/ })).toBeVisible();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+Shift+ArrowDown" : "Control+Shift+ArrowDown");
  await expect(page.getByText("Long assistant answer 319")).toBeVisible();
  await openTranscriptSearch(page);
  await setTranscriptSearchScope(page, "Commands");
  await page.getByLabel("Search transcript").fill("stdout line 300");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  await expect(longCommandRow.getByTestId("command-output")).toContainText("long command tail marker 300");
  await setTranscriptSearchScope(page, "Tools");
  await page.getByLabel("Search transcript").fill("tool audit secret 275");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  const toolRow = page.getByTestId("conversation-item-long-tool-275");
  await expect(toolRow.getByText("Read")).toBeVisible();
  await expect(toolRow.getByText("(/tmp/tool-audit-275.txt)")).toBeVisible();
  await expect(toolRow).not.toContainText("tool audit secret 275");
  await toolRow.getByRole("button", { name: "Expand tool details" }).click();
  await expect(toolRow.getByTestId("tool-audit-details")).toContainText("tool audit secret 275");
  await page.getByLabel("Search transcript").fill("tool edit diff marker 276");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  const editToolRow = page.getByTestId("conversation-item-long-edit-tool-276");
  await expect(editToolRow.getByText("Edit")).toBeVisible();
  await expect(editToolRow.getByText("(apps/web/tool-edit-276.ts (+1 -1))").first()).toBeVisible();
  await expect(editToolRow).not.toContainText("tool edit diff marker 276");
  await editToolRow.getByRole("button", { name: "Expand tool details" }).click();
  await expect(editToolRow.getByTestId("tool-file-diff-details")).toContainText("tool edit diff marker 276");
  await expect(editToolRow.getByTestId("file-diff-view")).toBeVisible();
  await setTranscriptSearchScope(page, "Files");
  await page.getByLabel("Search transcript").fill("file audit diff marker 260");
  await expect(page.getByText("1/1 results in 657 rows")).toBeVisible();
  const fileRow = page.getByTestId("conversation-item-long-file-260");
  await expect(fileRow.getByText("Edited")).toBeVisible();
  await expect(fileRow.getByText("(apps/web/file-audit-260.ts (+1 -1))").first()).toBeVisible();
  await expect(fileRow).not.toContainText("file audit diff marker 260");
  await fileRow.getByRole("button", { name: "Expand file details" }).click();
  await expect(fileRow.getByTestId("file-audit-details")).toContainText("file audit diff marker 260");
  await expect(fileRow.getByTestId("file-diff-view")).toBeVisible();
  await setTranscriptSearchScope(page, "Assistant");
  await page.getByLabel("Search transcript").fill("Long assistant answer 310");
  const reasoningRow = page.getByTestId("conversation-item-long-agent-310");
  await expect(reasoningRow.getByText("Long assistant answer 310")).toBeVisible();
  await expect(reasoningRow.getByTestId("workbench-item-agentMessage")).toHaveAttribute("data-assistant-tone", "plain");
  await expect(reasoningRow.getByTestId("assistant-message-started-at")).toContainText(/\d{2}:\d{2}/);
  await expect(reasoningRow.getByTestId("assistant-message-header")).toHaveCount(0);
  await expect(reasoningRow.getByTestId("completed-thinking-panel")).toHaveCount(0);
  await reasoningRow.getByRole("button", { name: "Expand thinking" }).click();
  await expect(reasoningRow.getByTestId("completed-thinking-panel")).toContainText("Completed reasoning detail 310");
  await page.getByRole("button", { name: /Jump to latest/ }).click();
  await expect(page.getByText("Long assistant answer 319")).toBeVisible();
  await page.getByLabel("Search transcript").fill("Long assistant answer 311");
  const tintedAssistantRow = page.getByTestId("conversation-item-long-agent-311");
  await expect(tintedAssistantRow.getByText("Long assistant answer 311")).toBeVisible();
  await expect(tintedAssistantRow.getByTestId("workbench-item-agentMessage")).toHaveAttribute("data-assistant-tone", "tinted");
  await expect(tintedAssistantRow.getByTestId("assistant-message-started-at")).toContainText(/\d{2}:\d{2}/);
  await page.getByLabel("Search transcript").fill("Long assistant answer 310");
  await expect(reasoningRow.getByTestId("completed-thinking-panel")).toContainText("Completed reasoning detail 310");
  await setTranscriptSearchScope(page, "Tools");
  await page.getByLabel("Search transcript").fill("tool audit secret 275");
  await expect(toolRow.getByTestId("tool-audit-details")).toContainText("tool audit secret 275");
  await setTranscriptSearchScope(page, "Files");
  await page.getByLabel("Search transcript").fill("file audit diff marker 260");
  await expect(fileRow.getByTestId("file-audit-details")).toContainText("file audit diff marker 260");
});

test("applies user theme media plugins to the default workbench", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const heroImage =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iNDIwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB4Mj0iMSI+PHN0b3Agc3RvcC1jb2xvcj0iI2ZiY2ZlOCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2JhZTZmZCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI5MDAiIGhlaWdodD0iNDIwIiBmaWxsPSJ1cmwoI2cpIi8+PGNpcmNsZSBjeD0iNzIwIiBjeT0iMTQwIiByPSIxMTAiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuNDUiLz48cGF0aCBkPSJNMTIwIDI1MCBDMjYwIDEyMCA0MjAgMzQwIDYyMCAxOTAiIHN0cm9rZT0iI2RiMjc3NyIgc3Ryb2tlLXdpZHRoPSIxOCIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC40NSIvPjwvc3ZnPg==";
  const avatarImage =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCIgcng9IjI4IiBmaWxsPSIjZjlhOGQ0Ii8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iOTIiIHI9IjQ4IiBmaWxsPSIjZmZmN2VkIi8+PHBhdGggZD0iTTcwIDE2OCBRMTIwIDIwNSAxNzAgMTY4IiBzdHJva2U9IiNiZTE4NWQiIHN0cm9rZS13aWR0aD0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==";

  await page.goto("/");
  await expect(page.getByTestId("default-workbench-empty")).toBeVisible();
  await page.getByTestId("default-prompt-card-explore").click();
  await expect(page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...")).toHaveValue(/Explore this repository/);
  await expect(page.getByTestId("default-workbench-empty")).toHaveCount(0);

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByRole("textbox", { name: "Name" }).fill("Sakura Builder");
  await page.getByRole("textbox", { name: "Primary" }).fill("#DB2777");
  await page.getByRole("textbox", { name: "Secondary", exact: true }).fill("#2563EB");
  await page.getByRole("textbox", { name: "Background", exact: true }).fill("#FFF7FB");
  await page.getByLabel("Main chat waterfall background").fill(heroImage);
  await page.getByLabel("Legacy hero image").fill(heroImage);
  await page.getByLabel("Corner image").fill(avatarImage);
  await page.getByLabel("Pet/avatar image").fill(avatarImage);
  await page.getByLabel("Decorations").click();
  await page.getByRole("option", { name: "Rich" }).click();
  await page.getByRole("button", { name: /Save plugin|Save changes/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-sakura-builder-/);
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);

  await expect(page.getByTestId("default-workbench-empty")).toHaveCount(0);
  await expect(page.getByTestId("theme-pet-dock")).toBeVisible();
  await page.screenshot({
    path: "snapshot/theme-plugin-applied.png",
    fullPage: false
  });
});

test("supports uploaded background images and user theme switching", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByRole("textbox", { name: "Name" }).fill("Reference Rose");
  await page.getByRole("textbox", { name: "Primary" }).fill("#D94F75");
  await page.getByRole("textbox", { name: "Secondary", exact: true }).fill("#B76E79");
  await page.getByRole("textbox", { name: "Background", exact: true }).fill("#FFF4F7");
  await page.getByLabel("Background image file").setInputFiles("/root/projects/codex-react-ui/snapshot/参考/HNVjQXebIAI_AwK.jpg");
  await expect(page.getByTestId("custom-theme-background-preview")).toContainText("local image");
  await expect(page.getByLabel("Theme background overlay opacity")).toHaveValue("0");
  await expect(page.getByLabel("Theme effects layer opacity")).toHaveValue("0");
  await expect(page.getByLabel("Theme tone opacity")).toHaveValue("0");
  await page.getByLabel("Background video file").setInputFiles({
    name: "reference-loop.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109])
  });
  await expect(page.getByTestId("custom-theme-background-preview")).toContainText("local video");
  await page.getByLabel("Theme background overlay opacity").fill("8");
  await page.getByLabel("Theme workspace surface opacity").fill("14");
  await page.getByLabel("Theme hero overlay opacity").fill("18");
  await page.getByLabel("Theme panel opacity").fill("72");
  await page.getByLabel("Theme glass blur").fill("6");
  await page.getByLabel("Tone color").fill("#D94F75");
  await page.getByLabel("Dynamic background").click();
  await page.getByRole("option", { name: "Three.js loop" }).click();
  await page.getByLabel("Scene preset").click();
  await page.getByRole("option", { name: "Orbit" }).click();
  await page.getByRole("button", { name: /Save plugin|Save changes/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-reference-rose-/);

  const storedTheme = await page.evaluate(() => {
    const raw = localStorage.getItem("codex-react-ui.custom-theme-plugins");
    return raw ? JSON.parse(raw) : [];
  });
  expect(JSON.stringify(storedTheme)).toContain("data:image/jpeg;base64,");
  expect(JSON.stringify(storedTheme)).toContain("data:video/mp4;base64,");
  expect(JSON.stringify(storedTheme)).toContain("\"backgroundOverlayOpacity\":0.08");
  expect(JSON.stringify(storedTheme)).toContain("\"workspaceSurfaceOpacity\":0.14");
  expect(JSON.stringify(storedTheme)).toContain("\"renderer\":\"three\"");

  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByTestId("default-workbench-empty")).toBeVisible();
  await expect(page.getByTestId("theme-background-media")).toBeVisible();
  await expect(page.getByTestId("theme-background-image")).toBeVisible();
  await expect(page.getByTestId("theme-background-video")).toBeVisible();
  await expect(page.getByTestId("theme-background-three")).toBeVisible();
  await page.screenshot({
    path: "snapshot/user-theme-background-switching.png",
    fullPage: false
  });

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByLabel("Skin").click();
  await page.getByRole("option", { name: "Official Black" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "official-black");
  await page.getByLabel("Skin").click();
  await page.getByRole("option", { name: "Reference Rose" }).last().click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-reference-rose-/);

  await page.getByRole("button", { name: "Edit theme Reference Rose" }).last().click();
  await expect(page.getByText("Edit theme plugin")).toBeVisible();
  await expect(page.getByLabel("Main chat waterfall background")).toHaveValue(/^data:image\/jpeg;base64,/);
  await expect(page.getByLabel("Workbench background video")).toHaveValue(/^data:video\/mp4;base64,/);
  await expect(page.getByLabel("Dynamic background")).toHaveText("Three.js loop");
  const [themeZipDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export ZIP" }).click()]);
  const themeZipPath = await themeZipDownload.path();
  if (!themeZipPath) {
    throw new Error("Theme ZIP download path was unavailable.");
  }
  const exportedThemeFiles = readStoredTestZip(await readFile(themeZipPath));
  const exportedThemeJson = exportedThemeFiles.get("theme.json");
  expect(exportedThemeJson?.toString("utf8")).toContain("\"name\": \"Reference Rose\"");
  expect(exportedThemeJson?.toString("utf8")).toContain("\"appBackgroundImage\": \"assets/appBackgroundImage.jpg\"");
  expect(exportedThemeJson?.toString("utf8")).toContain("\"appBackgroundVideo\": \"assets/appBackgroundVideo.mp4\"");
  expect(exportedThemeFiles.get("assets/appBackgroundImage.jpg")?.byteLength).toBeGreaterThan(1000);
  expect(exportedThemeFiles.get("assets/appBackgroundVideo.mp4")?.byteLength).toBeGreaterThan(0);
  await page.getByRole("textbox", { name: "Secondary", exact: true }).fill("#2563EB");
  await page.getByRole("button", { name: /Save plugin|Save changes/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-reference-rose-/);
  await expect(page.getByRole("button", { name: "Edit theme Reference Rose" }).last()).toBeVisible();

  const importedTheme = {
    name: "Imported Mint",
    description: "Imported user background theme.",
    preview: { primary: "#0F766E", secondary: "#F59E0B", background: "#ECFDF5" },
    dark: false,
    assets: {
      appBackgroundImage:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iMzIwIj48cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI2VjZmRmNSIvPjxjaXJjbGUgY3g9IjY4MCIgY3k9IjEyMCIgcj0iOTAiIGZpbGw9IiMwZjc2NmUiIG9wYWNpdHk9IjAuMjUiLz48cGF0aCBkPSJNMTIwIDIyMCBDMjgwIDkwIDQ2MCAyNzAgNzIwIDEyMCIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjE4IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQ1Ii8+PC9zdmc+",
      appBackgroundVideo: "https://example.com/theme-loop.webm"
    },
    layout: {
      heroEnabled: true,
      petEnabled: true,
      decorationIntensity: "subtle",
      backgroundOverlayOpacity: 0.04,
      effectsLayerOpacity: 0,
      workspaceSurfaceOpacity: 0.18,
      panelSurfaceOpacity: 0.7,
      toneColor: "#0F766E",
      toneOpacity: 0,
      backgroundScene: { renderer: "canvas", preset: "particles", color: "#0F766E", secondaryColor: "#F59E0B", speed: 0.8, density: 0.4, opacity: 0.5 }
    }
  };
  await page.getByLabel("Custom theme plugin JSON or ZIP file").setInputFiles({
    name: "imported-mint.theme.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedTheme))
  });
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Imported Mint");
  await expect(page.getByLabel("Workbench background video")).toHaveValue("https://example.com/theme-loop.webm");
  await expect(page.getByLabel("Dynamic background")).toHaveText("Canvas loop");
  await page.getByRole("button", { name: /Save plugin|Save changes/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-imported-mint-/);
  await page.getByLabel("Skin").click();
  await expect(page.getByRole("option", { name: "Reference Rose" }).last()).toBeVisible();
  await expect(page.getByRole("option", { name: "Imported Mint" })).toBeVisible();
  await page.keyboard.press("Escape");

  const zippedTheme = {
    name: "Zipped Mint",
    description: "ZIP theme with separate media assets.",
    preview: { primary: "#047857", secondary: "#F97316", background: "#F0FDFA" },
    dark: false,
    assets: {
      appBackgroundImage: "assets/waterfall.svg",
      composerBackgroundImage: "assets/composer.svg",
      appBackgroundVideo: "assets/loop.webm"
    },
    layout: {
      heroEnabled: true,
      petEnabled: true,
      decorationIntensity: "rich",
      backgroundOverlayOpacity: 0.02,
      workspaceSurfaceOpacity: 0.16,
      panelSurfaceOpacity: 0.68,
      toneColor: "#047857",
      toneOpacity: 0,
      backgroundScene: { renderer: "canvas", preset: "aurora", color: "#047857", secondaryColor: "#F97316", speed: 0.7, density: 0.45, opacity: 0.5 }
    }
  };
  const zippedThemeSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180"><rect width="360" height="180" fill="#ccfbf1"/><circle cx="270" cy="70" r="52" fill="#047857" opacity=".35"/></svg>'
  );
  const zippedThemeBuffer = createStoredTestZip({
    "theme.json": Buffer.from(JSON.stringify(zippedTheme)),
    "assets/waterfall.svg": zippedThemeSvg,
    "assets/composer.svg": zippedThemeSvg,
    "assets/loop.webm": Buffer.from([26, 69, 223, 163, 159, 66, 134, 129, 1, 66, 247, 129, 1])
  });
  await page.getByLabel("Custom theme plugin JSON or ZIP file").setInputFiles({
    name: "zipped-mint.theme.zip",
    mimeType: "application/zip",
    buffer: zippedThemeBuffer
  });
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Zipped Mint");
  await expect(page.getByLabel("Main chat waterfall background")).toHaveValue(/^data:image\/svg\+xml;base64,/);
  await expect(page.getByLabel("Composer input background")).toHaveValue(/^data:image\/svg\+xml;base64,/);
  await expect(page.getByLabel("Workbench background video")).toHaveValue(/^data:video\/webm;base64,/);
  await expect(page.getByLabel("Dynamic background")).toHaveText("Canvas loop");
  await page.getByRole("button", { name: /Save plugin|Save changes/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-zipped-mint-/);
});

test("supports drag and drop image attachments in the composer", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page);

  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  const dataTransfer = await page.evaluateHandle(() => {
    const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";
    const bytes = Uint8Array.from(atob(tinyPngBase64), (char) => char.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "drop.png", { type: "image/png" }));
    return data;
  });

  await composer.dispatchEvent("dragenter", { dataTransfer });
  await composer.dispatchEvent("dragover", { dataTransfer });
  await composer.dispatchEvent("drop", { dataTransfer });
  await expect(page.getByText("drop.png")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove drop.png" })).toBeVisible();

  await composer.fill("Describe the dropped image");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { input?: Array<{ type?: string; text?: string; url?: string; detail?: string }> };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.input?.some((input) => input.type === "text" && input.text === "Describe the dropped image") &&
        message.params?.input?.some((input) => input.type === "image" && input.detail === "auto" && input.url?.startsWith("data:image/png;base64,"))
    );
  });
  await expect(page.locator('img[src^="data:image/png;base64,"]').first()).toBeVisible();
  await expect(page.getByText(/data:image\/png;base64/)).toHaveCount(0);
});

test("supports document attachments as uploaded file mentions without rendering base64", async ({ page }) => {
  await page.route("/api/attachments/upload", async (route) => {
    await route.fulfill({
      status: 201,
      json: {
        name: "report.pdf",
        path: "/tmp/codex-ui-attachments/report.pdf",
        mediaType: "application/pdf",
        size: 7
      }
    });
  });
  await page.goto("/");
  await confirmWorkspace(page);

  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  const dataTransfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array([37, 80, 68, 70, 45, 49, 46])], "report.pdf", { type: "application/pdf" }));
    return data;
  });

  await composer.dispatchEvent("dragenter", { dataTransfer });
  await composer.dispatchEvent("dragover", { dataTransfer });
  await composer.dispatchEvent("drop", { dataTransfer });
  await expect(page.getByText("report.pdf")).toBeVisible();

  await composer.fill("Summarize the attached report");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { input?: Array<{ type?: string; text?: string; path?: string; name?: string }> };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.input?.some((input) => input.type === "text" && input.text === "Summarize the attached report") &&
        message.params?.input?.some((input) => input.type === "mention" && input.name === "report.pdf" && input.path === "/tmp/codex-ui-attachments/report.pdf")
    );
  });
  await expect(page.getByText("/tmp/codex-ui-attachments/report.pdf")).toBeVisible();
  await expect(page.getByText(/base64/)).toHaveCount(0);
});

test("supports SSH workspaces when starting a new conversation", async ({ page }) => {
  const sshDirectoryRequests: Array<{ command?: string; path?: string }> = [];
  await page.route("/api/ssh/list-directory", async (route) => {
    const body = route.request().postDataJSON() as { command?: string; path?: string };
    sshDirectoryRequests.push(body);
    await route.fulfill({
      json: {
        entries: [
          { fileName: "remote-project", isDirectory: true, isFile: false },
          { fileName: "README.md", isDirectory: false, isFile: true }
        ]
      }
    });
  });
  await page.goto("/");

  const panel = page.getByTestId("workspace-selection-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "SSH" }).click();
  await expect(panel.getByLabel("SSH command")).toHaveValue("ssh user@192.168.11.1");
  await expect(panel).toContainText("SSH key setup");
  await expect(panel).toContainText("ssh-copy-id user@192.168.11.1");

  await panel.getByRole("button", { name: "Browse" }).click();
  const picker = page.getByTestId("workspace-folder-picker-dialog");
  await expect(picker).toBeVisible();
  await expect(picker.getByText("remote-project")).toBeVisible();
  await picker.getByRole("button", { name: "remote-project" }).click();
  await picker.getByRole("button", { name: "Use this folder" }).click();
  await expect(panel.getByLabel("Remote folder")).toHaveValue("/home/user/remote-project");
  await panel.getByRole("button", { name: "Use workspace" }).click();

  expect(sshDirectoryRequests).toContainEqual({ command: "ssh user@192.168.11.1", path: "/home/user" });
  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Use the ssh workspace");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const outbound = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { cwd?: string; workspace?: { type?: string; command?: string; cwd?: string }; input?: Array<{ type?: string; text?: string }> };
        }>;
      }
    ).__codexUiOutbound ?? [];
    const hasThreadStart = outbound.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "thread/start" &&
        message.params?.cwd === "/home/user/remote-project" &&
        message.params.workspace?.type === "ssh" &&
        message.params.workspace?.command === "ssh user@192.168.11.1" &&
        message.params.workspace?.cwd === "/home/user/remote-project"
    );
    const hasTurnStart = outbound.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.cwd === "/home/user/remote-project" &&
        message.params.workspace?.type === "ssh" &&
        message.params.workspace?.command === "ssh user@192.168.11.1" &&
        message.params.workspace?.cwd === "/home/user/remote-project" &&
        message.params.input?.some((entry) => entry.type === "text" && entry.text === "Use the ssh workspace")
    );
    return hasThreadStart && hasTurnStart;
  });
});

test("sidechat supports multiple isolated /goal windows and preserves slash command text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Mock thread" }).click();
  await expect(page.getByRole("tab", { name: "Mock thread" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Open right workspace" }).click();
  await expect(page.getByRole("button", { name: "Hide side chat" })).toBeVisible();
  await expect(page.getByTestId("right-workspace-panel")).toBeVisible();
  await expect(page.getByTestId("sidechat-panel")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Side chat tabs" })).toBeVisible();

  const transcript = page.getByTestId("sidechat-transcript");
  const input = page.getByRole("textbox", { name: "Side chat message" });
  const sendSideChat = page.getByRole("button", { name: "Send side chat message" });
  const firstGoal = " /goal first side window  ";
  const secondGoal = "/goal second side window";
  const statusCommand = "/status preserve command shape";
  const slashTexts = [firstGoal, secondGoal, statusCommand];

  await input.fill(firstGoal);
  await sendSideChat.click();
  await expect(transcript.getByText("/goal first side window", { exact: true }).first()).toBeVisible();

  await page.getByLabel("New side chat").click();
  await page.getByRole("menuitem", { name: /Side chat/ }).click();
  await expect(transcript.getByText("/goal first side window", { exact: true })).toHaveCount(0);
  await input.fill(secondGoal);
  await sendSideChat.click();
  await expect(transcript.getByText(secondGoal, { exact: true }).first()).toBeVisible();

  await page.getByLabel("New side chat").click();
  await page.getByRole("menuitem", { name: /Side chat/ }).click();
  await input.fill(statusCommand);
  await sendSideChat.click();
  await expect(transcript.getByText(statusCommand, { exact: true }).first()).toBeVisible();

  await page.waitForFunction((expectedTexts) => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { threadId?: string; input?: Array<{ type?: string; text?: string }> };
        }>;
      }
    ).__codexUiOutbound ?? [];
    const threadIds = expectedTexts.map((expectedText) => {
      const message = messages.find(
        (entry) =>
          entry.type === "rpc" &&
          entry.method === "turn/start" &&
          entry.params?.input?.some((input) => input.type === "text" && input.text === expectedText)
      );
      return message?.params?.threadId;
    });
    return threadIds.every(Boolean) && new Set(threadIds).size === expectedTexts.length;
  }, slashTexts);

  const sidechatTurns = await page.evaluate((expectedTexts) => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { threadId?: string; input?: Array<{ type?: string; text?: string }> };
        }>;
      }
    ).__codexUiOutbound ?? [];
    return expectedTexts.map((expectedText) => {
      const message = messages.find(
        (entry) =>
          entry.type === "rpc" &&
          entry.method === "turn/start" &&
          entry.params?.input?.some((input) => input.type === "text" && input.text === expectedText)
      );
      return {
        text: expectedText,
        threadId: message?.params?.threadId ?? null
      };
    });
  }, slashTexts);

  expect(sidechatTurns.map((turn) => turn.text)).toEqual(slashTexts);
  expect(new Set(sidechatTurns.map((turn) => turn.threadId)).size).toBe(slashTexts.length);
  await expect(page.getByRole("tab", { name: "Mock thread" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tablist", { name: "Task tabs" }).getByText("New mock thread")).toHaveCount(0);

  await page.getByTestId("sidechat-tab-sidechat-1").click();
  await expect(transcript.getByText("/goal first side window", { exact: true }).first()).toBeVisible();
  await expect(transcript.getByText(secondGoal, { exact: true })).toHaveCount(0);
  await page.getByTestId("sidechat-tab-sidechat-2").click();
  await expect(transcript.getByText(secondGoal, { exact: true }).first()).toBeVisible();
  await expect(transcript.getByText(statusCommand, { exact: true })).toHaveCount(0);

  await page.screenshot({
    path: "snapshot/sidechat-workbench.png",
    fullPage: false
  });
});

test("routes local slash commands and forwards native slash commands to Codex", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await confirmWorkspace(page);

  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  const send = page.getByRole("button", { name: "Send", exact: true });
  async function sendSlashAndExpectNative(command: string) {
    await composer.fill(command);
    await send.click();
    await page.waitForFunction((expectedText) => {
      const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
      return messages.some(
        (message) =>
          message.method === "turn/start" &&
          message.params?.input?.some((entry) => entry.type === "text" && entry.text === expectedText)
      );
    }, command);
  }
  await expect(page.getByText("mock-codex")).toBeVisible();
  await expect(composer).toBeEnabled();
  await page.getByRole("button", { name: "Attach files to this turn. Images, PDF, Office documents, and text files are supported." }).click();
  await expect(page.getByRole("menuitem").filter({ hasText: "/fast" })).toBeVisible();
  await page.getByRole("menuitem").filter({ hasText: "/status" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.method === "turn/start" && message.params?.input?.some((entry) => entry.type === "text" && entry.text === "/status"));
  });

  await page.evaluate(() => {
    ((window as unknown as { __codexUiOutbound?: unknown[] }).__codexUiOutbound ?? []).length = 0;
  });
  await composer.fill("/fast");
  await send.click();
  await expect(page.getByTestId("topbar-fast-badge")).toBeVisible();
  await expect(page.getByTestId("composer-fast-badge")).toBeVisible();
  let outbound = await page.evaluate(() => (window as unknown as { __codexUiOutbound?: Array<{ method?: string }> }).__codexUiOutbound ?? []);
  expect(outbound.some((message) => message.method === "turn/start")).toBe(false);

  await composer.fill("fast mode turn");
  await send.click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { effort?: string; input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.method === "turn/start" &&
        message.params?.effort === "low" &&
        message.params?.input?.some((entry) => entry.type === "text" && entry.text === "fast mode turn")
    );
  });

  await composer.fill("/goal keep slash command status visible");
  await send.click();
  await expect(page.getByTestId("sticky-goal-bar")).toContainText("keep slash command status visible");
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { objective?: string } }> }).__codexUiOutbound ?? [];
    return messages.some((message) => message.method === "thread/goal/set" && message.params?.objective === "keep slash command status visible");
  });
  await expect(page.getByTestId("composer-goal-badge")).toBeVisible();

  await composer.fill("/plan inspect slash router states");
  await send.click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { effort?: string; input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.method === "turn/start" &&
        message.params?.effort === "low" &&
        message.params?.input?.some((entry) => entry.type === "text" && entry.text === "/plan inspect slash router states")
    );
  });

  await composer.fill("/stats");
  await send.click();
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Project Stats");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Fast on");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Goal Active");

  await sendSlashAndExpectNative("/usage");
  await sendSlashAndExpectNative("/rename Focused slash work");
  await sendSlashAndExpectNative("/review detached branch main");
  await sendSlashAndExpectNative("/diff");
  await sendSlashAndExpectNative("/compact");
  await sendSlashAndExpectNative("/resume thread-2");
  await sendSlashAndExpectNative("/new full");

  await page.screenshot({
    path: "snapshot/slash-command-status-goal-plan.png",
    fullPage: false
  });
});

test("forwards native /new danger slash command to Codex", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await confirmWorkspace(page);
  await expect(page.getByRole("tab", { name: "Mock thread" })).toBeVisible();

  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  const send = page.getByRole("button", { name: "Send", exact: true });

  await page.evaluate(() => {
    ((window as unknown as { __codexUiOutbound?: unknown[] }).__codexUiOutbound ?? []).length = 0;
  });
  await composer.fill("/new danger");
  await send.click();

  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: {
            input?: Array<{ type?: string; text?: string }>;
          };
        }>;
      }
    ).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.input?.some((entry) => entry.type === "text" && entry.text === "/new danger")
    );
  });

  await expect(page.getByTestId("danger-new-chat-dialog")).toHaveCount(0);
});

test("shows parallel agents rail with switchable transcripts and completion controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Mock thread" }).click();
  await expect(page.getByRole("tab", { name: "Mock thread" })).toHaveAttribute("aria-selected", "true");

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Launch parallel agents");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await expect(page.getByTestId("parallel-agent-rail")).toBeVisible();
  await expect(page.getByTestId("parallel-agent-button-agent-review-thread")).toBeVisible();
  await expect(page.getByTestId("parallel-agent-button-agent-tests-thread")).toBeVisible();
  await expect(page.getByText("ManageTask").first()).toBeVisible();
  await expect(page.getByText("(spawnAgent)")).toBeVisible();
  await expect(page.getByTestId("parallel-agent-badge-agent-review-thread")).toBeVisible();
  await expect(page.getByTestId("parallel-agent-badge-agent-tests-thread")).toBeVisible();

  await page.screenshot({
    path: "snapshot/parallel-agents-workbench.png",
    fullPage: false
  });

  await page.getByTestId("parallel-agent-button-agent-review-thread").click({ position: { x: 12, y: 30 } });
  await expect(page.getByTestId("parallel-agent-header")).toContainText("Review");
  await expect(page.getByText("Review agent found missing tests for completion badges.")).toBeVisible();
  await expect(page.getByText("Test agent reproduced the parallel rail switching path.")).toHaveCount(0);

  await page.getByTestId("parallel-agent-button-agent-tests-thread").click({ position: { x: 12, y: 30 } });
  await expect(page.getByTestId("parallel-agent-header")).toContainText("Tests");
  await expect(page.getByText("Test agent reproduced the parallel rail switching path.")).toBeVisible();
  await expect(page.getByText("Review agent found missing tests for completion badges.")).toHaveCount(0);

  await page.getByTestId("parallel-agent-main").click();
  await expect(page.getByText("ManageTask").first()).toBeVisible();
  await page.getByTestId("parallel-agent-close-agent-review-thread").click();
  await expect(page.getByTestId("parallel-agent-button-agent-review-thread")).toHaveCount(0);
  await expect(page.getByTestId("parallel-agent-button-agent-tests-thread")).toBeVisible();
});

test("loads live Codex config in Settings and persists edits via config/batchWrite", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.getByText("mock-codex")).toBeVisible();

  await page.getByLabel("Open settings").click();
  await expect(page.getByRole("heading", { name: "Codex Engine Config" })).toBeVisible();
  await expect(page.getByLabel("Default model")).toHaveValue("gpt-5.6-sol");
  await expect(page.getByLabel("Model provider")).toHaveValue("openai");
  await expect(page.getByRole("combobox", { name: "Default reasoning effort" })).toContainText("Medium");
  await expect(page.getByRole("combobox", { name: "Sandbox mode" })).toContainText("Workspace write");
  await expect(page.getByRole("combobox", { name: "Web search" })).toContainText("Cached");
  await expect(page.getByText("config/read", { exact: true })).toBeVisible();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string }> }).__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "config/read");
  });

  await page.getByRole("combobox", { name: "Default reasoning effort" }).click();
  await page.getByRole("option", { name: "High", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: {
            edits?: Array<{ keyPath?: string; value?: unknown }>;
            reloadUserConfig?: boolean;
          };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "config/batchWrite" &&
        message.params?.reloadUserConfig === true &&
        message.params?.edits?.some((edit) => edit.keyPath === "model_reasoning_effort" && edit.value === "high")
    );
  });

  await expect(page.getByRole("combobox", { name: "Default reasoning effort" })).toContainText("High");

  await page.getByRole("combobox", { name: "Web search" }).click();
  await page.getByRole("option", { name: "Live" }).click();

  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { edits?: Array<{ keyPath?: string; value?: unknown }> };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "config/batchWrite" &&
        message.params?.edits?.some((edit) => edit.keyPath === "web_search" && edit.value === "live")
    );
  });

  await expect(page.getByRole("combobox", { name: "Web search" })).toContainText("Live");

  await page.getByLabel("User instructions").fill("Prefer concise answers.");
  await page.getByLabel("User instructions").blur();
  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { edits?: Array<{ keyPath?: string; value?: unknown }> };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "config/batchWrite" &&
        message.params?.edits?.some((edit) => edit.keyPath === "instructions" && edit.value === "Prefer concise answers.")
    );
  });

  // Theme remains independent of config writes.
  await page.getByLabel("Open Appearance settings").click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill("Aurora Studio");
  await page.getByRole("textbox", { name: "Primary" }).fill("#0EA5E9");
  await page.getByRole("textbox", { name: "Secondary", exact: true }).fill("#F97316");
  await page.getByRole("textbox", { name: "Background", exact: true }).fill("#0B1220");
  await page.getByRole("switch", { name: "Dark" }).check();
  await page.getByRole("button", { name: /Save plugin|Save changes/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-aurora-studio-/);

  await page.getByLabel("Skin").click();
  await page.getByRole("option", { name: "Official Black" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "official-black");

  const outbound = await page.evaluate(() => {
    return (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: unknown }> }).__codexUiOutbound ?? [];
  });
  const themeLeakedIntoConfig = outbound.some((message) => {
    if (message.type !== "rpc" || (message.method !== "config/batchWrite" && message.method !== "config/value/write")) {
      return false;
    }
    const raw = JSON.stringify(message.params ?? {});
    return raw.includes("theme") || raw.includes("official-black") || raw.includes("apiKey") || raw.includes("api_key");
  });
  expect(themeLeakedIntoConfig).toBe(false);

  await page.getByLabel("Open Codex Engine settings").click();
  await page.getByRole("button", { name: "Reload Codex config" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string }> }).__codexUiOutbound ?? [];
    return messages.filter((message) => message.type === "rpc" && message.method === "config/read").length >= 2;
  });
  await expect(page.getByRole("combobox", { name: "Default reasoning effort" })).toContainText("High");
  await expect(page.getByRole("combobox", { name: "Web search" })).toContainText("Live");
  await expect(page.getByLabel("User instructions")).toHaveValue("Prefer concise answers.");

  await page.getByRole("button", { name: "All config" }).click();
  await expect(page.getByLabel("Search all Codex config")).toBeVisible();
  await expect(page.getByText("Codex JSON schema", { exact: true })).toBeVisible();
  await page.getByLabel("Search all Codex config").fill("history");
  await expect(page.getByText("history", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("History", { exact: true })).toHaveValue(/"max_bytes": 1048576/);
  await page
    .getByLabel("History", { exact: true })
    .fill('{\n  "persistence": "save-all",\n  "max_bytes": 1572864\n}');
  await page.getByLabel("History", { exact: true }).blur();
  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { edits?: Array<{ keyPath?: string; value?: unknown }> };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "config/batchWrite" &&
        message.params?.edits?.some((edit) => {
          const value = edit.value as { max_bytes?: unknown } | undefined;
          return edit.keyPath === "history" && value?.max_bytes === 1572864;
        })
    );
  });

  await page.getByLabel("Search all Codex config").fill("history.max_bytes");
  await page.getByLabel("History / Max Bytes").fill("2097152");
  await page.getByLabel("History / Max Bytes").blur();
  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: { edits?: Array<{ keyPath?: string; value?: unknown }> };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "config/batchWrite" &&
        message.params?.edits?.some((edit) => edit.keyPath === "history.max_bytes" && edit.value === 2097152)
    );
  });
  await expect(page.getByLabel("History / Max Bytes")).toHaveValue("2097152");

  await page.getByLabel("Search all Codex config").fill("runtime_only_config");
  await expect(page.getByRole("heading", { name: "runtime" })).toBeVisible();
  await expect(page.getByLabel("runtime Only Config", { exact: true })).toBeVisible();

  // Visual proof: Settings page with live engine config fields (material-kit-style section cards).
  await page.screenshot({
    path: "snapshot/codex-ui-settings-open.png",
    fullPage: true
  });

  await page.getByLabel("Open Appearance settings").click();
  await page.screenshot({
    path: "snapshot/codex-ui-settings-appearance.png",
    fullPage: true
  });

  await page.getByLabel("Open Layout settings").click();
  await expect(page.getByText("Right workspace")).toBeVisible();
  await expect(page.getByText("Toolbar controlled")).toBeVisible();
  await page.screenshot({
    path: "snapshot/codex-ui-settings-layout.png",
    fullPage: true
  });
});

test("exposes every bundled Codex schema setting in All config", async ({ page }) => {
  test.setTimeout(180_000);
  const schema = JSON.parse(await readFile("apps/web/src/state/codexConfigSchema.json", "utf8")) as TestCodexSchema;
  const topLevelKeys = Object.keys(schema.properties ?? {}).sort((a, b) => a.localeCompare(b));
  const schemaKeyPaths = flattenTestSchemaProperties(schema, schema.properties ?? {});
  expect(topLevelKeys).toHaveLength(93);
  expect(schemaKeyPaths.length).toBeGreaterThan(topLevelKeys.length);

  await page.goto("/");
  await page.getByLabel("Open settings").click();
  await page.getByRole("button", { name: "All config" }).click();
  await expect(page.getByLabel("Search all Codex config")).toBeVisible();

  for (const keyPath of schemaKeyPaths) {
    await page.getByLabel("Search all Codex config").fill(keyPath);
    await expect(page.getByText(keyPath, { exact: true }).first(), `Settings All config should expose ${keyPath}`).toBeVisible();
  }
});

test("creates relay channels with fetched active models, remarks, and model activation", async ({ page }) => {
  let directProviderProbeRequests = 0;
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/provider/test" || pathname === "/api/provider/test-chat") {
      directProviderProbeRequests += 1;
    }
  });

  await page.goto("/");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Relay settings").click();

  await page.getByRole("button", { name: "Add channel" }).click();
  await expect(page.getByRole("heading", { name: "Add channel" })).toBeVisible();

  await page.getByLabel("Channel name").fill("Axon Relay");
  await page.getByLabel("Base URL").fill("https://axon.example/v1");
  await page.getByLabel("Relay API key").fill("sk-test-axon-relay");
  await page.getByLabel("Active models").fill("");
  await page.getByLabel("Remark").fill("integration smoke remark");

  await page.getByRole("button", { name: "Fetch models" }).click();
  await expect(page.getByText("Fetched models", { exact: true })).toBeVisible();
  expect(providerModelFetchRequests).toContainEqual({
    baseUrl: "https://axon.example/v1",
    apiKey: "sk-test-axon-relay",
    kind: "responsesRelay"
  });

  await page.getByText("deepseek-chat", { exact: true }).click();
  await page.getByText("glm-4.5", { exact: true }).click();
  await page.getByRole("button", { name: "Add selected (2)" }).click();
  await expect(page.getByLabel("Active models")).toHaveValue("deepseek-chat, glm-4.5");

  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; provider?: { name?: string; nativeModels?: string[]; remark?: string }; apiKey?: string }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "provider.save" &&
        message.provider?.name === "Axon Relay" &&
        message.provider?.remark === "integration smoke remark" &&
        message.provider?.nativeModels?.join(",") === "deepseek-chat,glm-4.5" &&
        message.apiKey === "sk-test-axon-relay"
    );
  });

  const axonRow = page.getByRole("row").filter({ hasText: "Axon Relay" }).first();
  await expect(axonRow).toBeVisible();
  await expect(axonRow.getByText("integration smoke remark")).toBeVisible();
  await expect(axonRow).toContainText("deepseek-chat");
  await expect(axonRow).toContainText("glm-4.5");

  await axonRow.getByRole("combobox").click();
  await page.getByRole("option", { name: "glm-4.5" }).click();
  await axonRow.getByRole("button", { name: "Activate" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; providerId?: string; model?: string }> })
      .__codexUiOutbound;
    return messages?.some((message) => message.type === "provider.activate" && message.providerId === "axon-relay" && message.model === "glm-4.5");
  });
  await expect(axonRow.getByText("Active", { exact: true }).first()).toBeVisible();

  await axonRow.getByLabel("Expand Axon Relay").click();
  await expect(page.getByText("Key storage")).toBeVisible();
  await expect(page.getByText("integration smoke remark")).toHaveCount(2);

  await page.getByPlaceholder("Search relay channels, models, tags, or URLs").fill("integration smoke");
  await expect(page.getByRole("row").filter({ hasText: "Axon Relay" }).first()).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "HubProxy Grok" })).toHaveCount(0);

  await axonRow.getByRole("button", { name: "Test with Codex" }).click();
  await expect(page.getByRole("button", { name: "Close settings" })).toHaveCount(0);
  await expect(page.getByTestId("topbar-fast-badge")).toBeVisible();
  await page.waitForFunction(() => {
    const messages = (
      window as unknown as {
        __codexUiOutbound?: Array<{
          type?: string;
          method?: string;
          params?: {
            model?: string;
            effort?: string;
            input?: Array<{ type?: string; text?: string }>;
          };
        }>;
      }
    ).__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.model === "glm-4.5" &&
        message.params?.effort === "minimal" &&
        message.params?.input?.some((entry) => entry.type === "text" && entry.text === "Reply with exactly: CODEX_RELAY_OK")
    );
  });
  expect(directProviderProbeRequests).toBe(0);
});

test("keeps cached relay channels visible when provider reload temporarily fails", async ({ page }) => {
  await page.unroute("/api/providers");
  await page.route("/api/providers", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "rebuilding" }
    })
  );
  await page.addInitScript((provider) => {
    localStorage.setItem(
      "codex-react-ui.providers-cache.local",
      JSON.stringify({
        cachedAt: Date.now(),
        providers: [provider]
      })
    );
  }, {
    id: "cached-relay",
    kind: "responsesRelay",
    name: "Cached Relay",
    baseUrl: "https://cached.example/v1",
    apiKeyStorage: "none",
    defaultModel: "cached-model",
    nativeModels: ["cached-model"],
    modelAliases: [],
    createdAt: 10,
    updatedAt: 11
  });

  await page.goto("/");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Relay settings").click();

  await expect(page.getByRole("row").filter({ hasText: "Cached Relay" }).first()).toBeVisible();
  await expect(page.getByText("https://cached.example/v1")).toBeVisible();
});

test("resolves chained provider aliases before starting a turn", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page);

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Relay settings").click();
  await expect(page.getByText("HubProxy Grok")).toBeVisible();
  await expect(page.getByText("key...ring")).toBeVisible();
  await expect(page.getByText("codex -> gpt-5.5")).toBeVisible();

  await page.getByRole("button", { name: "Activate" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await confirmWorkspace(page);
  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Use the relay alias");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { model?: string } }> })
      .__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "turn/start" && message.params?.model === "grok-4.5");
  });
});

test("supports direct MCP tool calls with JSON arguments", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Mock thread" }).click();
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Plugins settings").click();
  await page.getByRole("tab", { name: "MCP 1" }).click();

  await expect(page.getByRole("button", { name: "Call tool" })).toBeEnabled();
  await expect(page.getByText("Select a conversation to enable MCP tool calls.")).toHaveCount(0);

  const argsEditor = page.getByLabel("Arguments JSON").first();
  await argsEditor.fill('{"message":"from-playwright"}');
  await page.getByRole("button", { name: "Call tool" }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { server?: string; tool?: string; arguments?: { message?: string } } }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "mcpServer/tool/call" &&
        message.params?.server === "mock-mcp" &&
        message.params?.tool === "ping" &&
        message.params?.arguments?.message === "from-playwright"
    );
  });

  await expect(page.getByText('"ok": true')).toBeVisible();
  await expect(page.getByText('"message": "from-playwright"')).toBeVisible();
});

test("manages Codex plugins and MCP servers from Settings while forwarding native slash entries", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page);
  async function sendNativeSlash(command: string) {
    await page.evaluate(() => {
      ((window as unknown as { __codexUiOutbound?: unknown[] }).__codexUiOutbound ?? []).length = 0;
    });
    await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill(command);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.waitForFunction((expectedText) => {
      const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
      return messages.some(
        (message) =>
          message.method === "turn/start" &&
          message.params?.input?.some((entry) => entry.type === "text" && entry.text === expectedText)
      );
    }, command);
  }

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Plugins settings").click();
  await expect(page.getByRole("heading", { name: "Codex Plugins" })).toBeVisible();
  await expect(page.getByText("Codex plugin settings")).toBeVisible();
  await expect(page.getByText("Customer customization")).toHaveCount(0);
  await expect(page.getByText("Theme plugins", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mock Plugin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auth Plugin" })).toBeVisible();

  await page.getByRole("button", { name: "Details" }).first().click();
  await expect(page.getByText("Detailed mock plugin description.")).toBeVisible();
  await expect(page.getByText("mcp 1", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Hooks 2" }).click();
  await expect(page.getByText("Codex hooks")).toBeVisible();
  await expect(page.getByRole("heading", { name: "pre_tool_use" })).toBeVisible();
  await expect(page.getByText("python3 /root/hooks/pre_tool_use.py")).toBeVisible();
  await expect(page.getByText("trusted", { exact: true })).toBeVisible();
  await expect(page.getByText("plugin mock-plugin@mock-market")).toBeVisible();
  await expect(page.getByText("Mock hook warning")).toBeVisible();
  await expect(page.getByText(/Mock hook parse warning/)).toBeVisible();

  await page.getByRole("tab", { name: "MCP 1" }).click();
  await expect(page.getByText("mock-mcp")).toBeVisible();
  await expect(page.getByText("Ping tool")).toBeVisible();

  await page.getByRole("button", { name: "Close settings" }).click();
  await sendNativeSlash("/plugins");
  await sendNativeSlash("/mcp");
  await sendNativeSlash("/hooks");
});

test("exports and imports UI profiles without API keys", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Privacy settings").click();

  await expect(page.getByText("UI profile")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export profile" }).click()
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const profileContents = await readFile(downloadPath!, "utf8");
  expect(profileContents).toContain('"schema": "codex-react-ui.profile.v1"');
  expect(profileContents).toContain("HubProxy Grok");
  expect(profileContents).not.toContain("key...ring");

  await page.getByLabel("Import profile file").setInputFiles({
    name: "profile.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schema: "codex-react-ui.profile.v1",
        exportedAt: 456,
        providers: [importedProvider]
      })
    )
  });

  await expect(page.getByText("Imported 1 providers.")).toBeVisible();
  await page.getByLabel("Open Relay settings").click();
  await expect(page.getByText("Imported Relay")).toBeVisible();
  await expect(page.getByText("https://relay.example.test/v1")).toBeVisible();
});

test("shows dangerous permission audit records", async ({ page }) => {
  auditApiEvents = [
    {
      id: "audit-1",
      createdAt: 123456789,
      method: "turn/start",
      severity: "critical",
      reasons: ["approvalPolicy=never", "sandboxPolicy=dangerFullAccess"],
      cwd: "/root/projects",
      threadId: "thread-1",
      model: "grok-4.5",
      approvalPolicy: "never",
      sandboxPolicyType: "dangerFullAccess",
      inputSummary: { items: 1, textItems: 1, imageItems: 0, mentionItems: 0 }
    }
  ];

  await page.goto("/");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Privacy settings").click();

  await expect(page.getByText("Dangerous permission audit")).toBeVisible();
  await expect(page.getByText("critical", { exact: true })).toBeVisible();
  await expect(page.getByText(/approvalPolicy=never/)).toBeVisible();
  await expect(page.getByText(/input 1 items/)).toBeVisible();
});

test("saves skill extra roots and previews local markdown", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Skills settings").click();

  const extraRoots = page.getByLabel("Extra roots");
  await extraRoots.fill("/root/projects/extra-skills\n/root/projects/more-skills");
  await page.getByRole("button", { name: "Save roots" }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { extraRoots?: string[] } }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "skills/extraRoots/set" &&
        message.params?.extraRoots?.includes("/root/projects/extra-skills") &&
        message.params?.extraRoots?.includes("/root/projects/more-skills")
    );
  });

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { cwds?: string[] } }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "skills/list" &&
        message.params?.cwds?.includes("/root/projects/extra-skills") &&
        message.params?.cwds?.includes("/root/projects/more-skills")
    );
  });

  await page.getByRole("button", { name: "Preview markdown" }).first().click();
  await expect(page.getByText("Local preview from Playwright.")).toBeVisible();
});

test("uses installed-only plugin mentions and shows plugin app auth state", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page);
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Plugins settings").click();
  await page.getByRole("tab", { name: "Installed 1" }).click();

  const installedPicker = page.getByRole("combobox").last();
  await expect(installedPicker).toHaveText(/Mock Plugin/);
  await installedPicker.click();
  await expect(page.getByRole("option", { name: "Mock Plugin" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Auth Plugin" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Insert mention" }).click();
  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  await expect(composer).toHaveValue(/@mock-plugin/);
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { input?: Array<{ type?: string; path?: string }> } }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "turn/start" &&
        message.params?.input?.some((input) => input.type === "mention" && input.path === "plugin://mock-plugin@mock-market")
    );
  });

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Plugins settings").click();
  await page.getByRole("tab", { name: "Marketplace 2" }).click();
  await expect(page.getByRole("heading", { name: "Auth Plugin" })).toBeVisible();
  await page.getByRole("button", { name: "Details" }).first().click();
  await expect(page.getByText("auth on use")).toBeVisible();
  await expect(page.getByText("Mock Calendar").first()).toBeVisible();
  await expect(page.getByText("Calendar Template")).toBeVisible();

  await page.getByRole("button", { name: "Install", exact: true }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { pluginName?: string } }> })
      .__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "plugin/install" && message.params?.pluginName === "auth-plugin");
  });
  await expect(page.getByText("Authentication needed after install")).toBeVisible();
  await expect(page.getByText("Auth Console")).toBeVisible();
});

test("browses and edits files through filesystem RPCs", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page, "/root/projects");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Workspace settings").click();

  await expect(page.getByRole("button", { name: "README.md" })).toBeVisible();
  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.getByText("Mock Project")).toBeVisible({ timeout: 10000 });

  const nextContent = "# Updated Project\n\nSaved from Playwright.\n";
  await page.getByRole("textbox", { name: "Editor content" }).focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(nextContent);
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { path?: string; dataBase64?: string } }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "fs/writeFile" &&
        message.params?.path === "/root/projects/README.md" &&
        typeof message.params.dataBase64 === "string" &&
        atob(message.params.dataBase64).includes("Saved from Playwright.")
    );
  });

  await expect(page.getByText("Saved").last()).toBeVisible();
});

test("keeps workspace files explorer and editor panes resizable", async ({ page }) => {
  await page.goto("/");
  await confirmWorkspace(page, "/root/projects");
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Workspace settings").click();
  await expect(page.getByRole("button", { name: "README.md" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Select a file to preview or edit." })).toBeVisible();
  // Workspace file splits from react-resizable-panels expose data-group/data-panel attrs.
  await expect(page.locator("[data-group]").first()).toBeVisible();
  await expect(page.locator("[data-panel]").first()).toBeVisible();
  await page.mouse.move(1120, 120);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "snapshot/codex-ui-files-resizable.png",
    fullPage: true
  });
});

test("runs terminal commands with stdin resize and terminate controls", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Open right workspace").click();
  await page.getByRole("tab", { name: "Terminal" }).click();

  await page.getByLabel("Command", { exact: true }).fill("printf terminal-ready");
  await page.getByRole("button", { name: "Run" }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { processId?: string; command?: string[]; tty?: boolean } }> })
      .__codexUiOutbound;
    return messages?.some(
      (message) =>
        message.type === "rpc" &&
        message.method === "command/exec" &&
        message.params?.tty === true &&
        message.params?.command?.join(" ") === "/bin/bash -lc printf terminal-ready"
    );
  });
  await expect(page.getByText("$ printf terminal-ready")).toBeVisible();

  await page.getByLabel("Stdin").fill("hello terminal");
  await page.getByRole("button", { name: "Send stdin" }).click();
  await expect(page.getByText("stdin:hello terminal")).toBeVisible();

  await page.getByLabel("Rows").fill("30");
  await page.getByLabel("Cols").fill("100");
  await page.getByRole("button", { name: "Resize" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { size?: { rows?: number; cols?: number } } }> })
      .__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "command/exec/resize" && message.params?.size?.rows === 30 && message.params?.size?.cols === 100);
  });

  await page.getByRole("button", { name: "Terminate" }).click();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string }> }).__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "command/exec/terminate");
  });
  await expect(page.getByText("terminated 143")).toBeVisible();
});

test("opens Web Dev workspace and manages a preview server", async ({ page }) => {
  const previewUrl = "http://127.0.0.1:4173/";
  const webDevSession = {
    id: "webdev-e2e",
    command: "bun run dev -- --host 127.0.0.1",
    cwd: "/root/projects",
    status: "running",
    output: `$ bun run dev -- --host 127.0.0.1\nVITE ready at ${previewUrl}\n`,
    url: previewUrl,
    pid: 4242,
    startedAt: 1710000100,
    updatedAt: 1710000101
  };
  let sessions: typeof webDevSession[] = [];
  let startRequest: { command?: string; cwd?: string } | null = null;
  let probeRequest: { url?: string } | null = null;

  await page.route("/api/webdev/servers", (route) => route.fulfill({ json: { data: sessions } }));
  await page.route("/api/webdev/servers/start", async (route) => {
    startRequest = route.request().postDataJSON() as { command?: string; cwd?: string };
    sessions = [{ ...webDevSession, command: startRequest.command ?? webDevSession.command, cwd: startRequest.cwd ?? webDevSession.cwd }];
    await route.fulfill({ status: 201, json: { data: sessions[0] } });
  });
  await page.route("/api/webdev/servers/stop", async (route) => {
    const body = route.request().postDataJSON() as { id?: string };
    sessions = sessions.map((session) => (session.id === body.id ? { ...session, status: "terminated", updatedAt: 1710000102 } : session));
    await route.fulfill({ json: { data: sessions[0] } });
  });
  await page.route("/api/webdev/probe", async (route) => {
    probeRequest = route.request().postDataJSON() as { url?: string };
    await route.fulfill({
      json: {
        ok: probeRequest.url === previewUrl,
        url: probeRequest.url ?? previewUrl,
        status: probeRequest.url === previewUrl ? 200 : 503,
        contentType: "text/html",
        title: "WebDev Preview",
        elapsedMs: 12
      }
    });
  });

  await page.goto("/");
  await confirmWorkspace(page, "/root/projects");
  await page.getByLabel("Open right workspace").click();
  await page.getByRole("tab", { name: "Web Dev" }).click();

  await expect(page.getByTestId("webdev-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
  await expect(page.getByTestId("webdev-preview-frame")).toBeVisible();

  await page.getByLabel("Command", { exact: true }).fill("bun run dev -- --host 127.0.0.1");
  await page.getByLabel("Command cwd").fill("/root/projects");
  await page.getByTestId("webdev-run-server").click();

  await expect.poll(() => startRequest).toMatchObject({
    command: "bun run dev -- --host 127.0.0.1",
    cwd: "/root/projects"
  });
  await expect(page.getByTestId("webdev-managed-server-session")).toContainText(previewUrl);
  await expect(page.getByTestId("webdev-preview-url").locator("input")).toHaveValue(previewUrl);
  await expect(page.getByTestId("webdev-preview-status")).toContainText("HTTP 200");
  await expect.poll(() => probeRequest).toMatchObject({ url: previewUrl });
  await expect(page.getByTestId("webdev-preview-frame")).toHaveAttribute("src", previewUrl);
});

test("matches desktop and mobile workbench screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByTestId("right-workspace-panel")).toHaveCount(0);
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Plugins settings").click();
  await page.getByRole("tab", { name: "Marketplace 2" }).click();
  await expect(page.getByRole("heading", { name: "Mock Plugin" })).toBeVisible();
  await expect(page).toHaveScreenshot("workbench-desktop.png", {
    animations: "disabled",
    fullPage: false
  });

  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByLabel("Open right workspace").click();
  await expect(page.getByTestId("right-workspace-panel")).toBeVisible();
  await page.mouse.move(900, 220);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "snapshot/sidechat-workbench.png",
    fullPage: true
  });
  await page.getByRole("banner").getByRole("button", { name: "Hide right workspace" }).click();
  await expect(page.getByTestId("right-workspace-panel")).toHaveCount(0);

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByLabel("Skin").click();
  await page.getByRole("option", { name: "Atmospheric Codex" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "atmospheric-codex");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page).toHaveScreenshot("workbench-atmospheric-theme.png", {
    animations: "disabled",
    fullPage: false
  });

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByLabel("Skin").click();
  await page.getByRole("option", { name: "Official Black" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "official-black");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page).toHaveScreenshot("workbench-official-black-theme.png", {
    animations: "disabled",
    fullPage: false
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();
  await expect(page).toHaveScreenshot("workbench-mobile.png", {
    animations: "disabled",
    fullPage: false
  });
});
