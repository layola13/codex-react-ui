import { expect, test } from "@playwright/test";

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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const outbound = ((window as unknown as { __codexUiOutbound: unknown[] }).__codexUiOutbound = []);

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
        const result = rpcResult(message.method ?? "", message.params);
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

    function rpcResult(method: string, params?: unknown): unknown {
      switch (method) {
        case "account/read":
          return { authMode: "mock" };
        case "model/list":
          return { data: [{ model: "gpt-5.6-sol", displayName: "GPT 5.6 Sol" }] };
        case "thread/list":
          return { data: [{ id: "thread-1", preview: "Mock thread", status: "idle" }] };
        case "thread/start":
          return { thread: { id: "thread-new", preview: "New mock thread", status: "idle" } };
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
            data: [{ cwd: "/root/projects", skills: [{ name: "mock-skill", description: "Mock skill", path: "/tmp/mock/SKILL.md", scope: "user", enabled: true }], errors: [] }]
          };
        case "plugin/list":
          return {
            marketplaces: [{ name: "mock-market", path: null, interface: { displayName: "Mock Market" }, plugins: [{ id: "mock-plugin@mock-market", remotePluginId: "remote-mock", name: "mock-plugin", version: "1.0.0", localVersion: null, shareContext: null, source: { type: "remote" }, installed: true, enabled: true, installPolicy: "ALLOWED", installPolicySource: null, authPolicy: "NONE", availability: "AVAILABLE", interface: { displayName: "Mock Plugin", shortDescription: "Mock plugin", longDescription: null, developerName: null, category: null, capabilities: ["search"], websiteUrl: null, privacyPolicyUrl: null, termsOfServiceUrl: null, defaultPrompt: null, brandColor: null, composerIcon: null, composerIconUrl: null, logo: null, logoDark: null, logoUrl: null, logoUrlDark: null, screenshots: [], screenshotUrls: [] }, keywords: [] }] }],
            marketplaceLoadErrors: [],
            featuredPluginIds: ["mock-plugin@mock-market"]
          };
        default:
          return {};
      }
    }

    Object.defineProperty(window, "WebSocket", { value: MockWebSocket });
  });

  await page.route("/api/session", (route) => route.fulfill({ json: { token: "test-token" } }));
  await page.route("/api/providers", (route) => route.fulfill({ json: { data: [mockProvider] } }));
});

test("renders the workbench and tooling panels", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Codex React UI" })).toBeVisible();
  await expect(page.getByText("mock-codex")).toBeVisible();
  await expect(page.getByText("Mock thread")).toBeVisible();

  await page.getByRole("tab", { name: "Tools" }).click();
  await expect(page.getByRole("tab", { name: "MCP 1" })).toBeVisible();
  await expect(page.getByText("mock-mcp")).toBeVisible();

  await page.getByRole("tab", { name: "Skills 1" }).click();
  await expect(page.getByText("mock-skill")).toBeVisible();

  await page.getByRole("tab", { name: "Plugins 1" }).click();
  await expect(page.getByRole("heading", { name: "Mock Plugin" })).toBeVisible();
});

test("resolves chained provider aliases before starting a turn", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("HubProxy Grok")).toBeVisible();
  await expect(page.getByText("keyring")).toBeVisible();
  await expect(page.getByText("codex -> gpt-5.5")).toBeVisible();

  await page.getByRole("button", { name: "Activate" }).click();
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

  await page.getByText("Mock thread").click();
  await page.getByRole("tab", { name: "Tools" }).click();
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
