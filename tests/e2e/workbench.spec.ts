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

    let skillExtraRoots: string[] = [];
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
        case "fs/readFile":
          return {
            dataBase64: btoa("# Mock Skill\n\nLocal preview from Playwright.")
          };
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

  await page.getByRole("tab", { name: "Plugins 2" }).click();
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

test("saves skill extra roots and previews local markdown", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Tools" }).click();
  await page.getByRole("tab", { name: "Skills 1" }).click();

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
  await page.getByRole("tab", { name: "Tools" }).click();
  await page.getByRole("tab", { name: "Plugins 2" }).click();

  const installedPicker = page.getByRole("combobox").last();
  await expect(installedPicker).toHaveText(/Mock Plugin/);
  await installedPicker.click();
  await expect(page.getByRole("option", { name: "Mock Plugin" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Auth Plugin" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Auth Plugin" })).toBeVisible();

  await page.getByRole("button", { name: "Insert mention" }).click();
  const composer = page.getByPlaceholder("Ask Codex to inspect, edit, test, or explain this workspace...");
  await expect(composer).toHaveValue(/@mock-plugin/);
  await page.getByRole("button", { name: "Send" }).focus();
  await page.keyboard.press("Enter");

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
