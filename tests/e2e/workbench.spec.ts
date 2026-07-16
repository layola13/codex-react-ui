import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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
        const message = JSON.parse(raw) as { id?: string; method?: string; type?: string };
        if (message.type !== "rpc" || !message.id) {
          return;
        }
        const result = rpcResult(message.method ?? "");
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

    function rpcResult(method: string): unknown {
      switch (method) {
        case "account/read":
          return { authMode: "mock" };
        case "model/list":
          return { data: [{ model: "gpt-5.6-sol", displayName: "GPT 5.6 Sol" }] };
        case "thread/list":
          return { data: [{ id: "thread-1", preview: "Mock thread", status: "idle" }] };
        case "mcpServerStatus/list":
          return {
            data: [
              {
                name: "mock-mcp",
                serverInfo: { name: "mock", version: "1.0.0" },
                authStatus: "unsupported",
                tools: { ping: { name: "ping", title: "Ping", description: "Ping tool", inputSchema: {} } },
                resources: [{ name: "readme", title: "Readme", uri: "mock://readme", description: "Mock resource" }],
                resourceTemplates: []
              }
            ],
            nextCursor: null
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
  await page.route("/api/providers", (route) => route.fulfill({ json: { data: [] } }));
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
