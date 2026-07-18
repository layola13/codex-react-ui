import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

let providerApiList = [mockProvider];
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
  auditApiEvents = [];

  await page.addInitScript(() => {
    const outbound = ((window as unknown as { __codexUiOutbound: unknown[] }).__codexUiOutbound = []);
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
        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          const event = new Event("open");
          this.dispatchEvent(event);
          this.onopen?.(event);
          this.emit({ type: "engine.status", status: { phase: "ready", codexVersion: "mock-codex" } });
        }, 0);
      }

      public send(raw: string): void {
        const message = JSON.parse(raw) as { id?: string; method?: string; type?: string; model?: string; params?: unknown };
        outbound.push(message);
        if (message.type === "provider.activate" && message.id) {
          setTimeout(
            () =>
              this.emit({
                type: "provider.activated",
                id: message.id,
                activation: {
                  providerId: "hubproxy-grok",
                  modelProvider: "hubproxy-grok",
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
          const params = message.params as { threadId?: string; input?: Array<{ type?: string; text?: string }> } | undefined;
          const threadId = params?.threadId ?? "thread-missing";
          const turnIndex = ++turnStartCount;
          const turnId = `turn-${turnIndex}`;
          const itemId = `item-${turnIndex}`;
          const inputText = params?.input?.find((entry) => entry.type === "text")?.text ?? "";
          const parallelAgentsPrompt = inputText.toLowerCase().includes("parallel agents");
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
          return {
            data: [
              { id: "thread-1", preview: "Mock thread", status: "idle" },
              { id: "thread-2", preview: "Second task", status: "idle" }
            ]
          };
        case "thread/start": {
          const id = `thread-new-${++threadStartCount}`;
          return { thread: { id, preview: `New mock thread ${threadStartCount}`, status: "idle" } };
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
            path === "/root/projects"
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
  await expect(dialog).toContainText("/root/projects");
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

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Run this in full auto");
  await page.getByRole("button", { name: "Send" }).click();

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
  await page.getByLabel("Skin theme").click();
  await page.getByRole("option", { name: "Official Black" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "official-black");
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();

  await page.getByRole("tab", { name: "Second task" }).click();
  await expect(page.getByRole("tab", { name: "Second task" })).toHaveAttribute("aria-selected", "true");

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Use high effort");
  await page.getByRole("button", { name: "Send" }).click();

  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ type?: string; method?: string; params?: { effort?: string } }> })
      .__codexUiOutbound;
    return messages?.some((message) => message.type === "rpc" && message.method === "turn/start" && message.params?.effort === "high");
  });
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

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByLabel("Custom theme name").fill("Sakura Builder");
  await page.getByLabel("Custom theme primary").fill("#DB2777");
  await page.getByLabel("Custom theme secondary").fill("#2563EB");
  await page.getByLabel("Custom theme background").fill("#FFF7FB");
  await page.getByLabel("Custom theme app background image").fill(heroImage);
  await page.getByLabel("Custom theme hero image").fill(heroImage);
  await page.getByLabel("Custom theme corner image").fill(avatarImage);
  await page.getByLabel("Custom theme pet image").fill(avatarImage);
  await page.getByLabel("Custom theme decorations").click();
  await page.getByRole("option", { name: "Rich" }).click();
  await page.getByLabel("Save custom theme plugin").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-sakura-builder-/);
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);

  await expect(page.getByTestId("default-workbench-empty")).toBeVisible();
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
  await page.getByLabel("Custom theme name").fill("Reference Rose");
  await page.getByLabel("Custom theme primary").fill("#D94F75");
  await page.getByLabel("Custom theme secondary").fill("#B76E79");
  await page.getByLabel("Custom theme background").fill("#FFF4F7");
  await page.getByLabel("Background image file").setInputFiles("/root/projects/codex-react-ui/snapshot/参考/HNVjQXebIAI_AwK.jpg");
  await expect(page.getByTestId("custom-theme-background-preview")).toContainText("local image");
  await page.getByLabel("Save custom theme plugin").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-reference-rose-/);

  const storedTheme = await page.evaluate(() => {
    const raw = localStorage.getItem("codex-react-ui.custom-theme-plugins");
    return raw ? JSON.parse(raw) : [];
  });
  expect(JSON.stringify(storedTheme)).toContain("data:image/jpeg;base64,");

  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByTestId("default-workbench-empty")).toBeVisible();
  await page.screenshot({
    path: "snapshot/user-theme-background-switching.png",
    fullPage: false
  });

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByLabel("Skin theme").click();
  await page.getByRole("option", { name: "Official Black" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "official-black");
  await page.getByLabel("Skin theme").click();
  await page.getByRole("option", { name: "Reference Rose" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-reference-rose-/);

  await page.getByLabel("Edit theme Reference Rose").click();
  await expect(page.getByText("Edit theme plugin")).toBeVisible();
  await expect(page.getByLabel("Custom theme app background image")).toHaveValue(/^data:image\/jpeg;base64,/);
  await page.getByLabel("Custom theme secondary").fill("#2563EB");
  await page.getByLabel("Save custom theme plugin").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-reference-rose-/);
  await expect(page.getByLabel("Edit theme Reference Rose")).toBeVisible();

  const importedTheme = {
    name: "Imported Mint",
    description: "Imported user background theme.",
    preview: { primary: "#0F766E", secondary: "#F59E0B", background: "#ECFDF5" },
    dark: false,
    assets: {
      appBackgroundImage:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MDAiIGhlaWdodD0iMzIwIj48cmVjdCB3aWR0aD0iOTAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI2VjZmRmNSIvPjxjaXJjbGUgY3g9IjY4MCIgY3k9IjEyMCIgcj0iOTAiIGZpbGw9IiMwZjc2NmUiIG9wYWNpdHk9IjAuMjUiLz48cGF0aCBkPSJNMTIwIDIyMCBDMjgwIDkwIDQ2MCAyNzAgNzIwIDEyMCIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjE4IiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjQ1Ii8+PC9zdmc+"
    },
    layout: { heroEnabled: true, petEnabled: true, decorationIntensity: "subtle" }
  };
  await page.getByLabel("Custom theme plugin JSON file").setInputFiles({
    name: "imported-mint.theme.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedTheme))
  });
  await expect(page.getByLabel("Custom theme name")).toHaveValue("Imported Mint");
  await page.getByLabel("Save custom theme plugin").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-imported-mint-/);
  await page.getByLabel("Skin theme").click();
  await expect(page.getByRole("option", { name: "Reference Rose" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Imported Mint" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("supports drag and drop image attachments in the composer", async ({ page }) => {
  await page.goto("/");

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
  await expect(page.getByText(/1 image/)).toBeVisible();

  await composer.fill("Describe the dropped image");
  await page.getByRole("button", { name: "Send" }).click();

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
  await expect(transcript.getByText("/goal first side window", { exact: true })).toBeVisible();

  await page.getByLabel("New side chat").click();
  await page.getByRole("menuitem", { name: /Side chat/ }).click();
  await expect(transcript.getByText("/goal first side window", { exact: true })).toHaveCount(0);
  await input.fill(secondGoal);
  await sendSideChat.click();
  await expect(transcript.getByText(secondGoal, { exact: true })).toBeVisible();

  await page.getByLabel("New side chat").click();
  await page.getByRole("menuitem", { name: /Side chat/ }).click();
  await input.fill(statusCommand);
  await sendSideChat.click();
  await expect(transcript.getByText(statusCommand, { exact: true })).toBeVisible();

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
  await expect(transcript.getByText("/goal first side window", { exact: true })).toBeVisible();
  await expect(transcript.getByText(secondGoal, { exact: true })).toHaveCount(0);
  await page.getByTestId("sidechat-tab-sidechat-2").click();
  await expect(transcript.getByText(secondGoal, { exact: true })).toBeVisible();
  await expect(transcript.getByText(statusCommand, { exact: true })).toHaveCount(0);

  await page.screenshot({
    path: "snapshot/sidechat-workbench.png",
    fullPage: false
  });
});

test("routes main slash commands to fast status goal and plan UI", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");

  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  const send = page.getByRole("button", { name: "Send" });
  await expect(page.getByText("mock-codex")).toBeVisible();
  await expect(composer).toBeEnabled();

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
  await expect(page.getByTestId("topbar-plan-badge")).toBeVisible();
  await expect(page.getByTestId("composer-plan-badge")).toBeVisible();
  await page.waitForFunction(() => {
    const messages = (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { effort?: string; input?: Array<{ type?: string; text?: string }> } }> }).__codexUiOutbound ?? [];
    return messages.some(
      (message) =>
        message.method === "turn/start" &&
        message.params?.effort === "low" &&
        message.params?.input?.some((entry) => entry.type === "text" && entry.text === "inspect slash router states")
    );
  });
  outbound = await page.evaluate(() => (window as unknown as { __codexUiOutbound?: Array<{ method?: string; params?: { input?: Array<{ text?: string }> } }> }).__codexUiOutbound ?? []);
  expect(outbound.some((message) => message.method === "turn/start" && message.params?.input?.some((entry) => entry.text === "/plan inspect slash router states"))).toBe(false);

  await composer.fill("/usage");
  await send.click();
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Project Stats");

  await composer.fill("/status");
  await send.click();
  await expect(page.getByTestId("slash-stats-panel")).toBeVisible();
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Session Status");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Thread tokens");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("2,468");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Fast on");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Plan on");
  await expect(page.getByTestId("slash-stats-panel")).toContainText("Goal Active");

  await page.screenshot({
    path: "snapshot/slash-command-status-goal-plan.png",
    fullPage: false
  });
});

test("shows parallel agents rail with switchable transcripts and completion controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Mock thread" }).click();
  await expect(page.getByRole("tab", { name: "Mock thread" })).toHaveAttribute("aria-selected", "true");

  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Launch parallel agents");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByTestId("parallel-agent-rail")).toBeVisible();
  await expect(page.getByTestId("parallel-agent-button-agent-review-thread")).toBeVisible();
  await expect(page.getByTestId("parallel-agent-button-agent-tests-thread")).toBeVisible();
  await expect(page.getByText("Tool: spawnAgent")).toBeVisible();
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
  await expect(page.getByText("Tool: spawnAgent")).toBeVisible();
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
  await page.getByLabel("Custom theme name").fill("Aurora Studio");
  await page.getByLabel("Custom theme primary").fill("#0EA5E9");
  await page.getByLabel("Custom theme secondary").fill("#F97316");
  await page.getByLabel("Custom theme background").fill("#0B1220");
  await page.getByRole("switch", { name: "Dark" }).check();
  await page.getByLabel("Save custom theme plugin").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", /user-aurora-studio-/);

  await page.getByLabel("Skin theme").click();
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
  await expect(page.getByLabel("Runtime Only Config", { exact: true })).toBeVisible();

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

test("resolves chained provider aliases before starting a turn", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Relay settings").click();
  await expect(page.getByText("HubProxy Grok")).toBeVisible();
  await expect(page.getByText("key...ring")).toBeVisible();
  await expect(page.getByText("codex -> gpt-5.5")).toBeVisible();

  await page.getByRole("button", { name: "Activate" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("Use the relay alias");
  await page.getByRole("button", { name: "Send" }).click();

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

test("manages Codex plugins and MCP servers from Settings with slash command entry points", async ({ page }) => {
  await page.goto("/");

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
  await page.evaluate(() => {
    ((window as unknown as { __codexUiOutbound?: unknown[] }).__codexUiOutbound ?? []).length = 0;
  });
  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("/plugins");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Codex Plugins" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Marketplace 2" })).toHaveAttribute("aria-selected", "true");

  let outbound = await page.evaluate(() => (window as unknown as { __codexUiOutbound?: Array<{ method?: string }> }).__codexUiOutbound ?? []);
  expect(outbound.some((message) => message.method === "turn/start")).toBe(false);

  await page.getByRole("button", { name: "Close settings" }).click();
  await page.evaluate(() => {
    ((window as unknown as { __codexUiOutbound?: unknown[] }).__codexUiOutbound ?? []).length = 0;
  });
  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("/mcp");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Codex Plugins" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "MCP 1" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("mock-mcp")).toBeVisible();

  outbound = await page.evaluate(() => (window as unknown as { __codexUiOutbound?: Array<{ method?: string }> }).__codexUiOutbound ?? []);
  expect(outbound.some((message) => message.method === "turn/start")).toBe(false);

  await page.getByRole("button", { name: "Close settings" }).click();
  await page.evaluate(() => {
    ((window as unknown as { __codexUiOutbound?: unknown[] }).__codexUiOutbound ?? []).length = 0;
  });
  await page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...").fill("/hooks");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Codex Plugins" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Hooks 2" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "pre_tool_use" })).toBeVisible();

  outbound = await page.evaluate(() => (window as unknown as { __codexUiOutbound?: Array<{ method?: string }> }).__codexUiOutbound ?? []);
  expect(outbound.some((message) => message.method === "turn/start")).toBe(false);
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
  await page.getByRole("button", { name: "Send" }).click();

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
  await expect(page.getByText("auth ON_USE")).toBeVisible();
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
  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Workspace settings").click();
  await expect(page.getByRole("button", { name: "README.md" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
  await expect(page.getByText("No file selected")).toBeVisible();
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
  await page.getByLabel("Skin theme").click();
  await page.getByRole("option", { name: "Atmospheric Codex" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "atmospheric-codex");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page).toHaveScreenshot("workbench-atmospheric-theme.png", {
    animations: "disabled",
    fullPage: false
  });

  await page.getByLabel("Open settings").click();
  await page.getByLabel("Open Appearance settings").click();
  await page.getByLabel("Skin theme").click();
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
