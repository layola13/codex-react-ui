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

  await expect(page.getByRole("heading", { name: "Codex", exact: true })).toBeVisible();
  await expect(page.getByText("mock-codex")).toBeVisible();
  await expect(page.getByRole("tab", { name: "New task" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Mock thread" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Second task" })).toBeVisible();

  await page.getByRole("tab", { name: "Tools" }).click();
  await expect(page.getByRole("tab", { name: "MCP 1" })).toBeVisible();
  await expect(page.getByText("mock-mcp")).toBeVisible();

  await page.getByRole("tab", { name: "Skills 1" }).click();
  await expect(page.getByText("mock-skill")).toBeVisible();

  await page.getByRole("tab", { name: "Plugins 2" }).click();
  await expect(page.getByRole("heading", { name: "Mock Plugin" })).toBeVisible();
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
  await expect(page.getByText("Nested pane splits")).toBeVisible();
  await page.screenshot({
    path: "snapshot/codex-ui-settings-layout.png",
    fullPage: true
  });
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

  await page.getByRole("tab", { name: "Mock thread" }).click();
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

test("exports and imports UI profiles without API keys", async ({ page }) => {
  await page.goto("/");

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

  await expect(page.getByText("Dangerous permission audit")).toBeVisible();
  await expect(page.getByText("critical")).toBeVisible();
  await expect(page.getByText(/approvalPolicy=never/)).toBeVisible();
  await expect(page.getByText(/input 1 items/)).toBeVisible();
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

test("browses and edits files through filesystem RPCs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Files" }).click();

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

test("keeps files explorer editor and terminal panes resizable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Files" }).click();
  await expect(page.getByRole("button", { name: "README.md" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Terminal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
  // Nested VS Code-style splits from react-resizable-panels expose data-group/data-panel attrs.
  await expect(page.locator("[data-group]").first()).toBeVisible();
  await expect(page.locator("[data-panel]").first()).toBeVisible();
  await page.screenshot({
    path: "snapshot/codex-ui-files-resizable.png",
    fullPage: true
  });
});

test("runs terminal commands with stdin resize and terminate controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Files" }).click();

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
  await page.getByRole("tab", { name: "Tools" }).click();
  await page.getByRole("tab", { name: "Plugins 2" }).click();
  await expect(page.getByRole("heading", { name: "Mock Plugin" })).toBeVisible();
  await expect(page).toHaveScreenshot("workbench-desktop.png", {
    animations: "disabled",
    fullPage: false
  });

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
