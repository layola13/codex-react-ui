import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Slider,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Group as PanelGroup, Panel } from "react-resizable-panels";
import {
  permissionToTurnOverrides,
  type DangerousPermissionAuditEvent,
  type JsonValue,
  type PermissionPresetId,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";
import {
  CodexSocketClient,
  applyNotification,
  composerInputToUserInput,
  exportProfile,
  fetchAuditEvents,
  fetchProviders,
  fetchSessionToken,
  importProfile,
  initialClientState,
  parseMcpServers,
  parseMcpResourceContents,
  parseApps,
  parseFsDirectory,
  parseInstalledPluginMarketplaces,
  parsePluginDetail,
  parsePluginInstallAuthNotice,
  parsePluginMarketplaces,
  parseSkillGroups,
  threadReadToTurns,
  type ClientState,
  type ComposerImageAttachment,
  type ComposerMention,
  type FsDirectoryEntry,
  type McpResourceContentEntry,
  type PluginEntry,
  type PluginInstallAuthNotice,
  type PluginDetailEntry,
  type PluginMarketplace,
  type SkillEntry,
  type TerminalSession
} from "./state/codexClient";
import { HistorySidebar } from "./components/HistorySidebar";
import { ChatPanel } from "./components/ChatPanel";
import { Composer } from "./components/Composer";
import { SideChatPanel, type SideChatTab } from "./components/SideChatPanel";
import { RightInspector } from "./components/RightInspector";
import { SettingsDrawer, type ReasoningOption } from "./components/SettingsDrawer";
import { ResizeHandle } from "./components/ResizeHandle";
import {
  applyConfigWriteToView,
  buildDynamicConfigValueWrite,
  buildConfigValueWrite,
  parseConfigReadResponse,
  type CodexConfigFieldKey,
  type CodexUserConfigView
} from "./state/codexConfigSettings";
import { installedThemePluginDefaults, isThemeId, type ThemeId, type ThemeMode, type ThemePlugin } from "./theme";

const UI_STORAGE_KEYS = {
  installedThemes: "codex-react-ui.installed-theme-plugins",
  leftPanelVisible: "codex-react-ui.left-panel-visible",
  inspectorVisible: "codex-react-ui.inspector-visible",
  petDockEnabled: "codex-react-ui.pet-dock-enabled",
  panelLayout: "codex-react-ui.panel-layout",
  filesPanelLayout: "codex-react-ui.files-panel-layout"
} as const;

type AppProps = {
  themeMode: ThemeMode;
  customThemePlugins: ThemePlugin[];
  onThemeModeChange: (mode: ThemeMode) => void;
  onCustomThemePluginsChange: (plugins: ThemePlugin[]) => void;
};

type Action =
  | { type: "connected"; connected: boolean }
  | { type: "token"; token: string }
  | { type: "engine"; status: ClientState["engine"] }
  | { type: "account"; account: JsonValue }
  | { type: "models"; models: ClientState["models"] }
  | { type: "threads"; threads: ClientState["threads"] }
  | { type: "providers"; providers: ProviderConfig[] }
  | { type: "activeThread"; threadId: string | null }
  | { type: "threadLoaded"; thread: ClientState["threads"][number] | null; turns: ClientState["turns"] }
  | { type: "toolingLoading"; loading: boolean }
  | { type: "tooling"; tooling: ClientState["tooling"] }
  | { type: "notification"; message: Extract<ServerToClientMessage, { type: "codex.notification" }>["message"] }
  | { type: "serverRequest"; message: Extract<ServerToClientMessage, { type: "codex.serverRequest" }>["message"] }
  | { type: "serverRequestResolved"; id: string | number }
  | { type: "error"; message: string }
  | { type: "clearError" };

function reducer(state: ClientState, action: Action): ClientState {
  switch (action.type) {
    case "connected":
      return { ...state, connected: action.connected };
    case "token":
      return { ...state, token: action.token };
    case "engine":
      return { ...state, engine: action.status };
    case "account":
      return { ...state, account: action.account };
    case "models":
      return { ...state, models: action.models };
    case "threads":
      return { ...state, threads: action.threads };
    case "providers":
      return { ...state, providers: action.providers };
    case "activeThread":
      return { ...state, activeThreadId: action.threadId };
    case "threadLoaded":
      return {
        ...state,
        activeThreadId: action.thread?.id ?? state.activeThreadId,
        threads: action.thread ? upsertThread(state.threads, action.thread) : state.threads,
        turns: mergeTurns(state.turns, action.turns)
      };
    case "toolingLoading":
      return { ...state, toolingLoading: action.loading };
    case "tooling":
      return { ...state, tooling: action.tooling, toolingLoading: false };
    case "notification": {
      // Notifications from sidechat threads share the socket with the main chat.
      // Keep the user's main-chat focus stable while still merging their turns.
      const activeThreadId = state.activeThreadId;
      const next = applyNotification(state, action.message);
      return { ...next, activeThreadId };
    }
    case "serverRequest":
      return {
        ...state,
        pendingRequests: [
          {
            id: action.message.id,
            method: action.message.method,
            params: action.message.params
          },
          ...state.pendingRequests
        ]
      };
    case "serverRequestResolved":
      return {
        ...state,
        pendingRequests: state.pendingRequests.filter((request) => request.id !== action.id)
      };
    case "error":
      return { ...state, errors: [action.message, ...state.errors].slice(0, 8) };
    case "clearError":
      return { ...state, errors: state.errors.slice(1) };
  }
}

export function App({ themeMode, customThemePlugins, onThemeModeChange, onCustomThemePluginsChange }: AppProps) {
  const [state, dispatch] = useReducer(reducer, initialClientState);
  const [permission, setPermission] = useState<PermissionPresetId>("workspaceAsk");
  const [selectedModel, setSelectedModel] = useState("");
  const [reasoningEffort, setReasoningEffort] = useState("medium");
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [cwd, setCwd] = useState("/root/projects");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installedThemePluginIds, setInstalledThemePluginIds] = useState<ThemeId[]>(readInstalledThemes);
  const [leftPanelVisible, setLeftPanelVisible] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.leftPanelVisible, true));
  const [inspectorVisible, setInspectorVisible] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.inspectorVisible, true));
  const [sideChatVisible, setSideChatVisible] = useState(false);
  const [sideChatTabs, setSideChatTabs] = useState<SideChatTab[]>(() => [
    {
      id: "sidechat-1",
      title: "Side chat",
      threadId: null,
      draft: "",
      userMessages: []
    }
  ]);
  const [activeSideChatId, setActiveSideChatId] = useState("sidechat-1");
  const [sideChatError, setSideChatError] = useState<string | null>(null);
  const sideChatSequenceRef = useRef(2);
  const [petDockEnabled, setPetDockEnabled] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.petDockEnabled, true));
  const [panelLayout, setPanelLayout] = useState<Record<string, number> | undefined>(() =>
    readPanelLayout(UI_STORAGE_KEYS.panelLayout)
  );
  const [filesPanelLayout, setFilesPanelLayout] = useState<Record<string, number> | undefined>(() =>
    readPanelLayout(UI_STORAGE_KEYS.filesPanelLayout)
  );
  const [codexConfig, setCodexConfig] = useState<CodexUserConfigView | null>(null);
  const [codexConfigLoading, setCodexConfigLoading] = useState(false);
  const [codexConfigSaving, setCodexConfigSaving] = useState(false);
  const [codexConfigError, setCodexConfigError] = useState<string | null>(null);
  const [reasoningAnchor, setReasoningAnchor] = useState<HTMLElement | null>(null);
  const [pendingMention, setPendingMention] = useState<ComposerMention | null>(null);
  const [pluginDetails, setPluginDetails] = useState<Record<string, PluginDetailEntry>>({});
  const [pluginSkillPreviews, setPluginSkillPreviews] = useState<Record<string, string>>({});
  const [pluginAuthNotices, setPluginAuthNotices] = useState<Record<string, PluginInstallAuthNotice>>({});
  const [skillExtraRoots, setSkillExtraRoots] = useState<string[]>([]);
  const [skillPreviews, setSkillPreviews] = useState<Record<string, string>>({});
  const [fileDirectories, setFileDirectories] = useState<Record<string, FsDirectoryEntry[]>>({});
  const [openFile, setOpenFile] = useState<{ path: string; content: string; savedContent: string; loading: boolean; saving: boolean } | null>(null);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [auditEvents, setAuditEvents] = useState<DangerousPermissionAuditEvent[]>([]);
  const [mcpResourceContents, setMcpResourceContents] = useState<Record<string, McpResourceContentEntry[]>>({});
  const [mcpOauthUrls, setMcpOauthUrls] = useState<Record<string, string>>({});
  const clientRef = useRef<CodexSocketClient | null>(null);
  const desktopLayout = useMediaQuery("(min-width:900px)");

  const client = useMemo(() => {
    const socketClient = new CodexSocketClient();
    clientRef.current = socketClient;
    return socketClient;
  }, []);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.installedThemes, JSON.stringify(installedThemePluginIds));
  }, [installedThemePluginIds]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.leftPanelVisible, JSON.stringify(leftPanelVisible));
  }, [leftPanelVisible]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.inspectorVisible, JSON.stringify(inspectorVisible));
  }, [inspectorVisible]);

  useEffect(() => {
    if (!sideChatVisible) {
      return;
    }
    const hasActive = sideChatTabs.some((tab) => tab.id === activeSideChatId);
    if (!hasActive && sideChatTabs[0]) {
      setActiveSideChatId(sideChatTabs[0].id);
    }
  }, [activeSideChatId, sideChatTabs, sideChatVisible]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.petDockEnabled, JSON.stringify(petDockEnabled));
  }, [petDockEnabled]);

  const installThemePlugin = useCallback(
    (id: ThemeId) => {
      setInstalledThemePluginIds((current) => (current.includes(id) ? current : [...current, id]));
      onThemeModeChange(id);
    },
    [onThemeModeChange]
  );

  const uninstallThemePlugin = useCallback(
    (id: ThemeId) => {
      setInstalledThemePluginIds((current) => {
        const next = current.filter((entry) => entry !== id || installedThemePluginDefaults().includes(entry));
        return next.length > 0 ? next : installedThemePluginDefaults();
      });
      if (themeMode === id) {
        onThemeModeChange("official-light");
      }
    },
    [onThemeModeChange, themeMode]
  );

  const saveCustomThemePlugin = useCallback(
    (plugin: ThemePlugin) => {
      onCustomThemePluginsChange(
        customThemePlugins.some((entry) => entry.id === plugin.id)
          ? customThemePlugins.map((entry) => (entry.id === plugin.id ? plugin : entry))
          : [...customThemePlugins, plugin]
      );
      setInstalledThemePluginIds((current) => (current.includes(plugin.id) ? current : [...current, plugin.id]));
      onThemeModeChange(plugin.id);
    },
    [customThemePlugins, onCustomThemePluginsChange, onThemeModeChange]
  );

  const removeCustomThemePlugin = useCallback(
    (id: ThemeId) => {
      onCustomThemePluginsChange(customThemePlugins.filter((entry) => entry.id !== id));
      setInstalledThemePluginIds((current) => {
        const next = current.filter((entry) => entry !== id || installedThemePluginDefaults().includes(entry));
        return next.length > 0 ? next : installedThemePluginDefaults();
      });
      if (themeMode === id) {
        onThemeModeChange("official-light");
      }
    },
    [customThemePlugins, onCustomThemePluginsChange, onThemeModeChange, themeMode]
  );

  const appendTerminalOutput = useCallback((processId: string, output: string) => {
    setTerminalSessions((current) =>
      current.map((session) => (session.processId === processId ? { ...session, output: `${session.output}${output}` } : session))
    );
  }, []);

  const composerModels = useMemo(() => {
    const entries = [...state.models];
    const activeProvider = state.providers.find((provider) => provider.id === activeProviderId);
    if (!activeProvider) {
      return entries;
    }
    const known = new Set(entries.map((entry) => entry.model ?? entry.id).filter(Boolean));
    for (const model of activeProvider.nativeModels) {
      if (!known.has(model)) {
        entries.push({ model, displayName: model });
        known.add(model);
      }
    }
    for (const alias of activeProvider.modelAliases) {
      if (!known.has(alias.alias)) {
        entries.push({ model: alias.alias, displayName: `${alias.alias} -> ${alias.model}` });
        known.add(alias.alias);
      }
    }
    return entries;
  }, [activeProviderId, state.models, state.providers]);

  const loadBasics = useCallback(async () => {
    const [account, modelResult, threadResult] = await Promise.all([
      client.rpc("account/read", { refreshToken: false }),
      client.rpc("model/list", {}),
      client.rpc("thread/list", { limit: 50 })
    ]);
    dispatch({ type: "account", account });
    const models = asRecord(modelResult).data ?? asRecord(modelResult).models;
    dispatch({ type: "models", models: Array.isArray(models) ? (models as ClientState["models"]) : [] });
    const threads = asRecord(threadResult).data ?? asRecord(threadResult).threads;
    dispatch({ type: "threads", threads: Array.isArray(threads) ? normalizeThreads(threads) : [] });
  }, [client]);

  const loadCodexConfig = useCallback(async () => {
    setCodexConfigLoading(true);
    setCodexConfigError(null);
    try {
      const result = await client.rpc("config/read", { includeLayers: false });
      const view = parseConfigReadResponse(result);
      setCodexConfig(view);
      // Session toolbar effort/model stay independent; only fill empty model picker from engine default.
      if (view.model) {
        setSelectedModel((current) => current || view.model || current);
      }
    } catch (error) {
      setCodexConfigError(errorMessage("Codex config read", error));
    } finally {
      setCodexConfigLoading(false);
    }
  }, [client]);

  const writeCodexConfigField = useCallback(
    async (field: CodexConfigFieldKey, value: string) => {
      const write = buildConfigValueWrite(field, value);
      if (!write) {
        return;
      }
      // Skip no-op when value already matches loaded config.
      if (codexConfig && codexConfig[field] === value) {
        return;
      }
      setCodexConfigSaving(true);
      setCodexConfigError(null);
      setCodexConfig((current) => (current ? applyConfigWriteToView(current, write.keyPath, write.value) : current));
      try {
        // batchWrite supports reloadUserConfig so loaded threads pick up user config.toml edits.
        await client.rpc("config/batchWrite", {
          edits: [write],
          reloadUserConfig: true
        });
        const reloaded = await client.rpc("config/read", { includeLayers: false });
        const view = parseConfigReadResponse(reloaded);
        setCodexConfig(view);
      } catch (error) {
        setCodexConfigError(errorMessage("Codex config write", error));
        try {
          const reloaded = await client.rpc("config/read", { includeLayers: false });
          setCodexConfig(parseConfigReadResponse(reloaded));
        } catch {
          /* keep optimistic state if re-read also fails */
        }
      } finally {
        setCodexConfigSaving(false);
      }
    },
    [client, codexConfig]
  );

  const writeCodexConfigValue = useCallback(
    async (keyPath: string, value: JsonValue) => {
      const write = buildDynamicConfigValueWrite(keyPath, value);
      if (!write) {
        return;
      }
      setCodexConfigSaving(true);
      setCodexConfigError(null);
      setCodexConfig((current) => (current ? applyConfigWriteToView(current, write.keyPath, write.value) : current));
      try {
        await client.rpc("config/batchWrite", {
          edits: [write],
          reloadUserConfig: true
        });
        const reloaded = await client.rpc("config/read", { includeLayers: false });
        setCodexConfig(parseConfigReadResponse(reloaded));
      } catch (error) {
        setCodexConfigError(errorMessage("Codex config write", error));
        try {
          const reloaded = await client.rpc("config/read", { includeLayers: false });
          setCodexConfig(parseConfigReadResponse(reloaded));
        } catch {
          /* keep optimistic state if re-read also fails */
        }
      } finally {
        setCodexConfigSaving(false);
      }
    },
    [client]
  );

  useEffect(() => {
    if (settingsOpen && state.connected && state.engine.phase === "ready") {
      void loadCodexConfig();
    }
  }, [settingsOpen, state.connected, state.engine.phase, loadCodexConfig]);

  const loadTooling = useCallback(
    async (options?: { forceSkillReload?: boolean; skillExtraRoots?: string[] }) => {
      dispatch({ type: "toolingLoading", loading: true });
      const effectiveSkillExtraRoots = options?.skillExtraRoots ?? skillExtraRoots;
      const skillCwds = [cwd, ...effectiveSkillExtraRoots].filter((entry, index, entries) => entry && entries.indexOf(entry) === index);
      const [mcpResult, skillResult, pluginResult, installedPluginResult, appResult] = await Promise.allSettled([
        client.rpc("mcpServerStatus/list", { detail: "full" }),
        client.rpc("skills/list", { cwds: skillCwds, forceReload: options?.forceSkillReload ?? false }),
        client.rpc("plugin/list", {
          cwds: [cwd],
          marketplaceKinds: ["local", "workspace-directory", "vertical", "shared-with-me", "created-by-me-remote"]
        }),
        client.rpc("plugin/installed", { cwds: [cwd], installSuggestionPluginNames: [] }),
        client.rpc("app/list", { threadId: state.activeThreadId, limit: 50, forceRefetch: options?.forceSkillReload ?? false })
      ]);

      const nextTooling: ClientState["tooling"] = {
        mcpServers: [],
        skillGroups: [],
        pluginMarketplaces: [],
        installedPluginMarketplaces: [],
        apps: [],
        featuredPluginIds: [],
        marketplaceErrors: []
      };
      const errors: string[] = [];

      if (mcpResult.status === "fulfilled") {
        nextTooling.mcpServers = parseMcpServers(mcpResult.value);
      } else {
        errors.push(errorMessage("MCP inventory", mcpResult.reason));
      }

      if (skillResult.status === "fulfilled") {
        nextTooling.skillGroups = parseSkillGroups(skillResult.value);
      } else {
        errors.push(errorMessage("Skills inventory", skillResult.reason));
      }

      if (pluginResult.status === "fulfilled") {
        Object.assign(nextTooling, parsePluginMarketplaces(pluginResult.value));
      } else {
        errors.push(errorMessage("Plugin inventory", pluginResult.reason));
      }

      if (installedPluginResult.status === "fulfilled") {
        const installed = parseInstalledPluginMarketplaces(installedPluginResult.value);
        nextTooling.installedPluginMarketplaces = installed.installedPluginMarketplaces;
        nextTooling.marketplaceErrors = [...nextTooling.marketplaceErrors, ...installed.marketplaceErrors];
      } else {
        nextTooling.installedPluginMarketplaces = nextTooling.pluginMarketplaces
          .map((marketplace) => ({
            ...marketplace,
            plugins: marketplace.plugins.filter((plugin) => plugin.installed)
          }))
          .filter((marketplace) => marketplace.plugins.length > 0);
        errors.push(errorMessage("Installed plugins", installedPluginResult.reason));
      }

      if (appResult.status === "fulfilled") {
        nextTooling.apps = parseApps(appResult.value);
      } else {
        errors.push(errorMessage("App inventory", appResult.reason));
      }

      dispatch({ type: "tooling", tooling: nextTooling });
      for (const message of errors) {
        dispatch({ type: "error", message });
      }
    },
    [client, cwd, skillExtraRoots, state.activeThreadId]
  );

  useEffect(() => {
    const onConnected = (event: Event) => {
      dispatch({ type: "connected", connected: Boolean((event as CustomEvent<boolean>).detail) });
    };
    const onMessage = (event: Event) => {
      const message = (event as CustomEvent<ServerToClientMessage>).detail;
      if (message.type === "engine.status") {
        dispatch({ type: "engine", status: message.status });
      }
      if (message.type === "codex.notification") {
        dispatch({ type: "notification", message: message.message });
        if (message.message.method === "command/exec/outputDelta") {
          const params = asRecord(message.message.params);
          const processId = typeof params.processId === "string" ? params.processId : null;
          const deltaBase64 = typeof params.deltaBase64 === "string" ? params.deltaBase64 : null;
          if (processId && deltaBase64) {
            appendTerminalOutput(processId, decodeBase64Text(deltaBase64));
          }
        }
        if (message.message.method === "skills/changed") {
          void loadTooling({ forceSkillReload: true });
        }
        if (message.message.method === "mcpServer/startupStatus/updated") {
          void loadTooling();
        }
      }
      if (message.type === "codex.serverRequest") {
        dispatch({ type: "serverRequest", message: message.message });
      }
      if (message.type === "provider.saved") {
        dispatch({
          type: "providers",
          providers: [message.provider, ...state.providers.filter((provider) => provider.id !== message.provider.id)]
        });
      }
      if (message.type === "server.error") {
        dispatch({ type: "error", message: message.message });
      }
    };
    client.addEventListener("connected", onConnected);
    client.addEventListener("server-message", onMessage);
    return () => {
      client.removeEventListener("connected", onConnected);
      client.removeEventListener("server-message", onMessage);
    };
  }, [appendTerminalOutput, client, loadTooling, state.providers]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const token = await fetchSessionToken();
        if (!mounted) return;
        dispatch({ type: "token", token });
        await client.connect(token);
        const providers = await fetchProviders(token);
        if (!mounted) return;
        dispatch({ type: "providers", providers });
        await loadBasics();
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client, loadBasics]);

  useEffect(() => {
    if (state.connected) {
      void loadTooling();
    }
  }, [loadTooling, state.connected]);

  useEffect(() => {
    if (!selectedModel && state.models[0]) {
      setSelectedModel(state.models[0].model ?? state.models[0].id ?? "");
    }
  }, [selectedModel, state.models]);

  const reasoningOptions = useMemo<ReasoningOption[]>(() => {
    const selected = composerModels.find((entry) => (entry.model ?? entry.id ?? "") === selectedModel);
    const supported = selected?.supportedReasoningEfforts ?? [];
    if (supported.length > 0) {
      return supported.map((entry) => ({
        value: entry.reasoningEffort,
        label: reasoningLabel(entry.reasoningEffort),
        description: entry.description
      }));
    }
    return [
      { value: "minimal", label: "Minimal", description: "Fastest responses for small edits and lookups." },
      { value: "low", label: "Low", description: "Light reasoning for straightforward tasks." },
      { value: "medium", label: "Medium", description: "Balanced default for normal coding work." },
      { value: "high", label: "High", description: "Highest built-in effort for complex planning and debugging." }
    ];
  }, [composerModels, selectedModel]);

  useEffect(() => {
    if (reasoningOptions.length > 0 && !reasoningOptions.some((option) => option.value === reasoningEffort)) {
      const fallback = reasoningOptions[Math.min(2, reasoningOptions.length - 1)];
      if (fallback) {
        setReasoningEffort(fallback.value);
      }
    }
  }, [reasoningEffort, reasoningOptions]);

  const loadThread = useCallback(
    async (threadId: string) => {
      dispatch({ type: "activeThread", threadId });
      try {
        const result = await client.rpc("thread/read", { threadId, includeTurns: true });
        const loaded = threadReadToTurns(result);
        dispatch({ type: "threadLoaded", thread: loaded.thread, turns: loaded.turns });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const selectTaskTab = useCallback(
    (threadId: string | null) => {
      if (!threadId) {
        dispatch({ type: "activeThread", threadId: null });
        return;
      }
      void loadThread(threadId);
    },
    [loadThread]
  );

  const loadAuditEvents = useCallback(async () => {
    if (!state.token) {
      return;
    }
    try {
      setAuditEvents(await fetchAuditEvents(state.token));
    } catch (error) {
      dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, [state.token]);

  useEffect(() => {
    if (state.token) {
      void loadAuditEvents();
    }
  }, [loadAuditEvents, state.token]);

  const sendPrompt = useCallback(
    async (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[]) => {
      const input = composerInputToUserInput(text, images, mentions);
      if (input.length === 0) {
        return;
      }
      try {
        let threadId = state.activeThreadId;
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, cwd);
        if (!threadId) {
          const startParams: Record<string, JsonValue> = {
            cwd,
            sandbox: permissionOverrides.sandbox,
            approvalPolicy: permissionOverrides.approvalPolicy,
            sessionStartSource: "startup"
          };
          if (effectiveModel) {
            startParams.model = effectiveModel;
          }
          const threadResult = await client.rpc("thread/start", startParams);
          const thread = asRecord(asRecord(threadResult).thread);
          threadId = typeof thread.id === "string" ? thread.id : null;
          dispatch({ type: "activeThread", threadId });
        }
        if (!threadId) {
          throw new Error("Codex did not return a thread id");
        }
        const turnParams: Record<string, JsonValue> = {
          threadId,
          input,
          cwd,
          sandboxPolicy: permissionOverrides.sandboxPolicy,
          approvalPolicy: permissionOverrides.approvalPolicy,
          effort: reasoningEffort
        };
        if (effectiveModel) {
          turnParams.model = effectiveModel;
        }
        await client.rpc("turn/start", turnParams);
        if (permission === "dangerBypass") {
          await loadAuditEvents();
        }
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [activeProviderId, client, cwd, loadAuditEvents, permission, reasoningEffort, selectedModel, state.activeThreadId, state.providers]
  );

  const addSideChatTab = useCallback(() => {
    const nextIndex = sideChatSequenceRef.current;
    sideChatSequenceRef.current += 1;
    const nextTab: SideChatTab = {
      id: `sidechat-${nextIndex}`,
      title: `Side chat ${nextIndex}`,
      threadId: null,
      draft: "",
      userMessages: []
    };
    setSideChatTabs((current) => [...current, nextTab]);
    setActiveSideChatId(nextTab.id);
    setSideChatVisible(true);
  }, []);

  const closeSideChatTab = useCallback((tabId: string) => {
    setSideChatTabs((current) => {
      if (current.length <= 1) {
        return current.map((tab) => (tab.id === tabId ? { ...tab, threadId: null, draft: "", userMessages: [] } : tab));
      }
      const next = current.filter((tab) => tab.id !== tabId);
      setActiveSideChatId((active) => (active === tabId ? next[Math.max(0, current.findIndex((tab) => tab.id === tabId) - 1)]?.id ?? next[0]?.id ?? active : active));
      return next;
    });
  }, []);

  const changeSideChatDraft = useCallback((tabId: string, draft: string) => {
    setSideChatTabs((current) => current.map((tab) => (tab.id === tabId ? { ...tab, draft } : tab)));
  }, []);

  const sendSideChatPrompt = useCallback(
    async (tabId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      const tab = sideChatTabs.find((entry) => entry.id === tabId);
      if (!tab) {
        return;
      }
      const previousActiveThreadId = state.activeThreadId;
      const localMessage = {
        id: `sidechat-message-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: trimmed
      };
      setSideChatError(null);
      setSideChatTabs((current) =>
        current.map((entry) =>
          entry.id === tabId
            ? {
                ...entry,
                title: entry.userMessages.length === 0 ? sideChatTitle(trimmed, current.filter((candidate) => candidate.id !== entry.id).length + 1) : entry.title,
                draft: "",
                userMessages: [...entry.userMessages, localMessage]
              }
            : entry
        )
      );
      try {
        let threadId = tab.threadId;
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, cwd);
        if (!threadId) {
          const startParams: Record<string, JsonValue> = {
            cwd,
            sandbox: permissionOverrides.sandbox,
            approvalPolicy: permissionOverrides.approvalPolicy,
            sessionStartSource: "startup"
          };
          if (effectiveModel) {
            startParams.model = effectiveModel;
          }
          const threadResult = await client.rpc("thread/start", startParams);
          const thread = asRecord(asRecord(threadResult).thread);
          threadId = typeof thread.id === "string" ? thread.id : null;
          if (!threadId) {
            throw new Error("Codex did not return a sidechat thread id");
          }
          const nextThreadId = threadId;
          setSideChatTabs((current) => current.map((entry) => (entry.id === tabId ? { ...entry, threadId: nextThreadId } : entry)));
          if (previousActiveThreadId !== state.activeThreadId) {
            dispatch({ type: "activeThread", threadId: previousActiveThreadId });
          }
        }
        const turnParams: Record<string, JsonValue> = {
          threadId,
          input: composerInputToUserInput(trimmed, [], []),
          cwd,
          sandboxPolicy: permissionOverrides.sandboxPolicy,
          approvalPolicy: permissionOverrides.approvalPolicy,
          effort: reasoningEffort
        };
        if (effectiveModel) {
          turnParams.model = effectiveModel;
        }
        await client.rpc("turn/start", turnParams);
        if (permission === "dangerBypass") {
          await loadAuditEvents();
        }
        dispatch({ type: "activeThread", threadId: previousActiveThreadId });
      } catch (error) {
        setSideChatError(error instanceof Error ? error.message : String(error));
        setSideChatTabs((current) =>
          current.map((entry) =>
            entry.id === tabId
              ? { ...entry, draft: trimmed, userMessages: entry.userMessages.filter((message) => message.id !== localMessage.id) }
              : entry
          )
        );
        dispatch({ type: "activeThread", threadId: previousActiveThreadId });
      }
    },
    [
      activeProviderId,
      client,
      cwd,
      loadAuditEvents,
      permission,
      reasoningEffort,
      selectedModel,
      sideChatTabs,
      state.activeThreadId,
      state.providers
    ]
  );

  const answerRequest = useCallback(
    (id: string | number, decision: "accept" | "acceptForSession" | "decline" | "cancel") => {
      client.respondToServerRequest(id, { decision });
      dispatch({ type: "serverRequestResolved", id });
    },
    [client]
  );

  const saveProvider = useCallback(
    async (provider: ProviderConfig, apiKey?: string) => {
      try {
        const saved = await client.saveProvider(provider, apiKey);
        dispatch({
          type: "providers",
          providers: [saved, ...state.providers.filter((entry) => entry.id !== saved.id)]
        });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, state.providers]
  );

  const activateProvider = useCallback(
    async (providerId: string, model?: string) => {
      try {
        const activation = await client.activateProvider(providerId, model);
        setActiveProviderId(providerId);
        if (activation.model) {
          setSelectedModel(activation.model);
        }
        await loadBasics();
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, loadBasics]
  );

  const downloadProfile = useCallback(async () => {
    if (!state.token) {
      dispatch({ type: "error", message: "UI session token is not ready" });
      return;
    }
    try {
      const profile = await exportProfile(state.token);
      const blob = new Blob([`${JSON.stringify(profile, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `codex-react-ui-profile-${new Date(profile.exportedAt).toISOString().slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }, [state.token]);

  const uploadProfile = useCallback(
    async (file: File) => {
      if (!state.token) {
        dispatch({ type: "error", message: "UI session token is not ready" });
        return 0;
      }
      try {
        const profile = JSON.parse(await file.text());
        const result = await importProfile(state.token, profile);
        dispatch({ type: "providers", providers: result.providers });
        return result.importedProviders;
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
    [state.token]
  );

  const reloadMcp = useCallback(async () => {
    try {
      await client.rpc("config/mcpServer/reload");
      await loadTooling();
    } catch (error) {
      dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, [client, loadTooling]);

  const toggleSkill = useCallback(
    async (skill: SkillEntry, enabled: boolean) => {
      try {
        await client.rpc("skills/config/write", { path: skill.path || null, name: skill.path ? null : skill.name, enabled });
        await loadTooling({ forceSkillReload: true });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, loadTooling]
  );

  const saveSkillExtraRoots = useCallback(
    async (roots: string[]) => {
      const normalized = roots.map((entry) => entry.trim()).filter(Boolean);
      try {
        await client.rpc("skills/extraRoots/set", { extraRoots: normalized });
        setSkillExtraRoots(normalized);
        await loadTooling({ forceSkillReload: true, skillExtraRoots: normalized });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, loadTooling]
  );

  const readSkillPreview = useCallback(
    async (skill: SkillEntry) => {
      if (!skill.path) {
        dispatch({ type: "error", message: `Skill ${skill.name} does not expose a local path` });
        return;
      }
      try {
        const result = await client.rpc("fs/readFile", { path: skill.path });
        const dataBase64 = asRecord(result).dataBase64;
        setSkillPreviews((current) => ({
          ...current,
          [skill.path]: typeof dataBase64 === "string" ? decodeBase64Text(dataBase64) : "No preview available"
        }));
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const installPlugin = useCallback(
    async (marketplace: PluginMarketplace, plugin: PluginEntry) => {
      try {
        const result = await client.rpc("plugin/install", {
          marketplacePath: marketplace.path ?? null,
          remoteMarketplaceName: marketplace.path ? null : marketplace.name,
          pluginName: plugin.name
        });
        const authNotice = parsePluginInstallAuthNotice(result);
        setPluginAuthNotices((current) => ({ ...current, [plugin.id]: authNotice }));
        await loadTooling({ forceSkillReload: true });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, loadTooling]
  );

  const uninstallPlugin = useCallback(
    async (plugin: PluginEntry) => {
      try {
        await client.rpc("plugin/uninstall", { pluginId: plugin.id });
        await loadTooling({ forceSkillReload: true });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, loadTooling]
  );

  const readPluginDetail = useCallback(
    async (marketplace: PluginMarketplace, plugin: PluginEntry) => {
      try {
        const result = await client.rpc("plugin/read", {
          marketplacePath: marketplace.path ?? null,
          remoteMarketplaceName: marketplace.path ? null : marketplace.name,
          pluginName: plugin.name
        });
        const detail = parsePluginDetail(result);
        if (detail) {
          setPluginDetails((current) => ({ ...current, [plugin.id]: detail }));
        }
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const readPluginSkill = useCallback(
    async (marketplace: PluginMarketplace, plugin: PluginEntry, skillName: string) => {
      if (!plugin.remotePluginId) {
        dispatch({ type: "error", message: "Skill preview is available for remote plugin skills only" });
        return;
      }
      try {
        const result = await client.rpc("plugin/skill/read", {
          remoteMarketplaceName: marketplace.name,
          remotePluginId: plugin.remotePluginId,
          skillName
        });
        const contents = asRecord(result).contents;
        setPluginSkillPreviews((current) => ({
          ...current,
          [`${plugin.id}:${skillName}`]: typeof contents === "string" ? contents : "No preview available"
        }));
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const insertPluginMention = useCallback((marketplace: PluginMarketplace, plugin: PluginEntry) => {
    setPendingMention({
      name: plugin.displayName,
      path: `plugin://${plugin.name}@${marketplace.name}`,
      token: `@${plugin.name}`
    });
  }, []);

  const readDirectory = useCallback(
    async (path: string) => {
      try {
        const result = await client.rpc("fs/readDirectory", { path });
        setFileDirectories((current) => ({ ...current, [path]: parseFsDirectory(result, path) }));
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const readFile = useCallback(
    async (path: string) => {
      setOpenFile({ path, content: "", savedContent: "", loading: true, saving: false });
      try {
        const result = await client.rpc("fs/readFile", { path });
        const dataBase64 = asRecord(result).dataBase64;
        const content = typeof dataBase64 === "string" ? decodeBase64Text(dataBase64) : "";
        setOpenFile({ path, content, savedContent: content, loading: false, saving: false });
      } catch (error) {
        setOpenFile((current) => (current?.path === path ? { ...current, loading: false } : current));
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const changeOpenFileContent = useCallback((content: string) => {
    setOpenFile((current) => (current ? { ...current, content } : current));
  }, []);

  const saveOpenFile = useCallback(async () => {
    if (!openFile || openFile.loading) {
      return;
    }
    const { path, content } = openFile;
    setOpenFile((current) => (current?.path === path ? { ...current, saving: true } : current));
    try {
      await client.rpc("fs/writeFile", { path, dataBase64: encodeBase64Text(content) });
      setOpenFile((current) => (current?.path === path ? { ...current, savedContent: content, saving: false } : current));
      const parentPath = path.slice(0, path.lastIndexOf("/")) || "/";
      if (fileDirectories[parentPath]) {
        await readDirectory(parentPath);
      }
    } catch (error) {
      setOpenFile((current) => (current?.path === path ? { ...current, saving: false } : current));
      dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, [client, fileDirectories, openFile, readDirectory]);

  const runTerminalCommand = useCallback(
    async (command: string, commandCwd: string, size: { rows: number; cols: number }) => {
      const trimmed = command.trim();
      if (!trimmed) {
        return;
      }
      const processId = `term-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTerminalSessions((current) => [
        {
          processId,
          command: trimmed,
          cwd: commandCwd,
          output: `$ ${trimmed}\n`,
          status: "running",
          rows: size.rows,
          cols: size.cols
        },
        ...current
      ]);
      try {
        const result = await client.rpc("command/exec", {
          processId,
          command: ["/bin/bash", "-lc", trimmed],
          cwd: commandCwd,
          tty: true,
          streamStdin: true,
          streamStdoutStderr: true,
          size: { rows: size.rows, cols: size.cols }
        });
        const record = asRecord(result);
        const exitCode = typeof record.exitCode === "number" ? record.exitCode : undefined;
        const stdout = typeof record.stdout === "string" ? record.stdout : "";
        const stderr = typeof record.stderr === "string" ? record.stderr : "";
        setTerminalSessions((current) =>
          current.map((session) =>
            session.processId === processId
              ? {
                  ...session,
                  output: `${session.output}${stdout}${stderr}`,
                  status: session.status === "terminated" ? "terminated" : exitCode === 0 ? "completed" : "failed",
                  exitCode
                }
              : session
          )
        );
      } catch (error) {
        appendTerminalOutput(processId, `\n${error instanceof Error ? error.message : String(error)}\n`);
        setTerminalSessions((current) => current.map((session) => (session.processId === processId ? { ...session, status: "failed" } : session)));
      }
    },
    [appendTerminalOutput, client]
  );

  const writeTerminalInput = useCallback(
    async (processId: string, input: string) => {
      try {
        await client.rpc("command/exec/write", { processId, deltaBase64: encodeBase64Text(input) });
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const terminateTerminal = useCallback(
    async (processId: string) => {
      try {
        await client.rpc("command/exec/terminate", { processId });
        setTerminalSessions((current) => current.map((session) => (session.processId === processId ? { ...session, status: "terminated" } : session)));
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const resizeTerminal = useCallback(
    async (processId: string, size: { rows: number; cols: number }) => {
      try {
        await client.rpc("command/exec/resize", { processId, size });
        setTerminalSessions((current) =>
          current.map((session) => (session.processId === processId ? { ...session, rows: size.rows, cols: size.cols } : session))
        );
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client]
  );

  const startMcpOauth = useCallback(
    async (serverName: string) => {
      try {
        const result = await client.rpc("mcpServer/oauth/login", { name: serverName, threadId: state.activeThreadId, timeoutSecs: 120 });
        const authorizationUrl = asRecord(result).authorizationUrl;
        if (typeof authorizationUrl === "string") {
          setMcpOauthUrls((current) => ({ ...current, [serverName]: authorizationUrl }));
          window.open(authorizationUrl, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, state.activeThreadId]
  );

  const readMcpResource = useCallback(
    async (serverName: string, uri: string) => {
      try {
        const result = await client.rpc("mcpServer/resource/read", { server: serverName, uri, threadId: state.activeThreadId });
        setMcpResourceContents((current) => ({
          ...current,
          [`${serverName}:${uri}`]: parseMcpResourceContents(result)
        }));
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, state.activeThreadId]
  );

  const callMcpTool = useCallback(
    async (serverName: string, toolName: string, args: JsonValue) => {
      if (!state.activeThreadId) {
        throw new Error("Select a conversation before calling an MCP tool");
      }
      return client.rpc("mcpServer/tool/call", {
        threadId: state.activeThreadId,
        server: serverName,
        tool: toolName,
        arguments: args
      });
    },
    [client, state.activeThreadId]
  );

  function renderCenterPanel() {
    return (
      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          height: { md: "100%" },
          display: "grid",
          gridTemplateRows: { xs: "auto minmax(360px, 1fr) auto", md: "minmax(0, 1fr) auto" },
          borderInline: { xs: 0, md: "1px solid" },
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.72 : 0.56),
          backdropFilter: "blur(20px)",
          zIndex: 1
        }}
      >
        {state.engine.phase === "starting" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Starting Codex engine...</Typography>
          </Box>
        )}
        <ChatPanel turns={state.turns} activeThreadId={state.activeThreadId} errors={state.errors} />
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.72 : 0.76)
          }}
        >
          <Composer
            cwd={cwd}
            permission={permission}
            disabled={!state.connected || state.engine.phase !== "ready"}
            pendingMention={pendingMention}
            onCwdChange={setCwd}
            onPermissionChange={setPermission}
            onMentionConsumed={() => setPendingMention(null)}
            onSend={(text, images, mentions) => void sendPrompt(text, images, mentions)}
          />
        </Box>
      </Box>
    );
  }

  function renderInspector() {
    return (
      <RightInspector
        filesPanelLayout={filesPanelLayout}
        onFilesPanelLayoutChange={(layout) => {
          setFilesPanelLayout(layout);
          localStorage.setItem(UI_STORAGE_KEYS.filesPanelLayout, JSON.stringify(layout));
        }}
        account={state.account}
        providers={state.providers}
        activeThreadId={state.activeThreadId}
        pendingRequests={state.pendingRequests}
        tooling={state.tooling}
        toolingLoading={state.toolingLoading}
        pluginDetails={pluginDetails}
        pluginSkillPreviews={pluginSkillPreviews}
        pluginAuthNotices={pluginAuthNotices}
        skillExtraRoots={skillExtraRoots}
        skillPreviews={skillPreviews}
        mcpResourceContents={mcpResourceContents}
        mcpOauthUrls={mcpOauthUrls}
        cwd={cwd}
        fileDirectories={fileDirectories}
        openFile={openFile}
        terminalSessions={terminalSessions}
        auditEvents={auditEvents}
        onAnswerRequest={answerRequest}
        onExportProfile={() => downloadProfile()}
        onImportProfile={(file) => uploadProfile(file)}
        onReloadAuditEvents={() => loadAuditEvents()}
        onReloadTooling={() => void loadTooling({ forceSkillReload: true })}
        onReloadMcp={() => void reloadMcp()}
        onStartMcpOauth={(serverName) => void startMcpOauth(serverName)}
        onReadMcpResource={(serverName, uri) => void readMcpResource(serverName, uri)}
        onCallMcpTool={(serverName, toolName, args) => callMcpTool(serverName, toolName, args)}
        onToggleSkill={(skill, enabled) => void toggleSkill(skill, enabled)}
        onSaveSkillExtraRoots={(roots) => void saveSkillExtraRoots(roots)}
        onReadSkillPreview={(skill) => void readSkillPreview(skill)}
        onReadPluginDetail={(marketplace, plugin) => void readPluginDetail(marketplace, plugin)}
        onReadPluginSkill={(marketplace, plugin, skillName) => void readPluginSkill(marketplace, plugin, skillName)}
        onInsertPluginMention={insertPluginMention}
        onInstallPlugin={(marketplace, plugin) => void installPlugin(marketplace, plugin)}
        onUninstallPlugin={(plugin) => void uninstallPlugin(plugin)}
        onReadDirectory={(path) => void readDirectory(path)}
        onReadFile={(path) => void readFile(path)}
        onChangeOpenFileContent={changeOpenFileContent}
        onSaveOpenFile={() => void saveOpenFile()}
        onRunTerminalCommand={(command, commandCwd, size) => void runTerminalCommand(command, commandCwd, size)}
        onWriteTerminalInput={(processId, input) => void writeTerminalInput(processId, input)}
        onTerminateTerminal={(processId) => void terminateTerminal(processId)}
        onResizeTerminal={(processId, size) => void resizeTerminal(processId, size)}
      />
    );
  }

  const statusColor =
    state.engine.phase === "ready" ? "success" : state.engine.phase === "error" ? "error" : "warning";
  const taskTabs = state.threads.slice(0, 12);
  const reasoningIndex = Math.max(0, reasoningOptions.findIndex((option) => option.value === reasoningEffort));
  const selectedReasoning = reasoningOptions[reasoningIndex] ?? reasoningOptions[0];
  const reasoningMax = Math.max(0, reasoningOptions.length - 1);
  const showReasoningGlow = reasoningIndex === reasoningMax && reasoningMax > 0;

  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "56px minmax(0, 1fr)",
        gap: { xs: 1, sm: 1.25, lg: 1.5 },
        p: { xs: 1, sm: 1.5, lg: 2.5 },
        position: "relative",
        bgcolor: "background.default",
        overflow: "hidden"
      }}
    >
      {/* Immersive Atmospheric Gradient Background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.45,
          background: (theme) =>
            [
              `radial-gradient(ellipse at top right, ${alpha(theme.palette.primary.main, 0.16)}, transparent 72%)`,
              `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.18)}, transparent 42%)`
            ].join(", ")
        }}
      />
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: 1,
          borderRadius: { xs: 2, sm: 3 },
          border: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.76 : 0.82),
          backdropFilter: "blur(22px)",
          boxShadow: (theme) => theme.customShadows?.z8
        }}
      >
        <Toolbar variant="dense" sx={{ gap: { xs: 0.75, sm: 1 }, minHeight: 54, px: { xs: 1, sm: 1.5, lg: 2 }, overflow: "hidden" }}>
          <PlayArrowIcon color="primary" sx={{ display: { xs: "none", sm: "block" } }} />
          <Typography component="h1" variant="h6" sx={{ fontSize: 17, fontWeight: 800, display: { xs: "none", sm: "block" } }}>
            Codex
          </Typography>
          <FormControl size="small" sx={{ minWidth: { xs: 148, sm: 236 }, maxWidth: { xs: 160, sm: 320 } }}>
            <Select
              value={selectedModel}
              displayEmpty
              inputProps={{ "aria-label": "Model" }}
              renderValue={(value) => {
                const selected = composerModels.find((entry) => (entry.model ?? entry.id ?? "") === value);
                return selected?.displayName ?? value;
              }}
              onChange={(event) => setSelectedModel(event.target.value)}
              sx={{
                "& .MuiSelect-select": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              }}
            >
              {composerModels.map((entry) => {
                const value = entry.model ?? entry.id ?? "";
                return (
                  <MenuItem key={value} value={value}>
                    {entry.displayName ?? value}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <Tooltip title="Reasoning strength">
            <Button
              size="small"
              variant={showReasoningGlow ? "contained" : "outlined"}
              startIcon={<TuneIcon />}
              onClick={(event) => setReasoningAnchor(event.currentTarget)}
              sx={{
                flex: "0 0 auto",
                minWidth: { xs: 88, sm: 112 },
                px: { xs: 0.75, sm: 2 },
                "& .MuiButton-startIcon": { mr: { xs: 0.5, sm: 1 } },
                boxShadow: showReasoningGlow ? "0 0 0 3px rgba(97, 243, 243, 0.18), 0 0 22px rgba(97, 243, 243, 0.35)" : undefined
              }}
            >
              {selectedReasoning?.label ?? reasoningEffort}
            </Button>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          <Box sx={{ display: { xs: "none", md: "contents" } }}>
            <Tooltip title={leftPanelVisible ? "Hide history panel" : "Show history panel"}>
              <IconButton size="small" onClick={() => setLeftPanelVisible((visible) => !visible)}>
                <ViewSidebarIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={inspectorVisible ? "Hide inspector panel" : "Show inspector panel"}>
              <IconButton size="small" onClick={() => setInspectorVisible((visible) => !visible)}>
                <ViewColumnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Chip size="small" color={statusColor} label={state.engine.phase} sx={{ display: { xs: "none", sm: "inline-flex" } }} />
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", lg: "block" } }}>
            {state.engine.codexVersion ?? state.engine.message ?? "initializing"}
          </Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => void loadBasics()} sx={{ display: { xs: "none", md: "inline-flex" } }}>
            Refresh
          </Button>
          <Tooltip title="Open settings">
            <IconButton size="small" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          minHeight: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "42px minmax(0, 1fr)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.7 : 0.8),
          backdropFilter: "blur(24px)",
          boxShadow: (theme) => theme.customShadows?.card,
          zIndex: 1
        }}
      >
        <Box
          role="tablist"
          aria-label="Task tabs"
          sx={{
            display: "flex",
            alignItems: "stretch",
            gap: 0.75,
            overflowX: "auto",
            overflowY: "hidden",
            px: { xs: 1, sm: 1.5 },
            bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.62 : 0.72),
            borderBottom: "1px solid",
            borderColor: "divider"
          }}
        >
          <Button
            role="tab"
            aria-selected={state.activeThreadId === null}
            size="small"
            startIcon={<AddIcon />}
            onClick={() => selectTaskTab(null)}
            sx={{
              my: 0.625,
              px: 1.25,
              flex: "0 0 auto",
              borderRadius: 1.5,
              color: state.activeThreadId === null ? "primary.main" : "text.secondary",
              bgcolor: state.activeThreadId === null ? "action.selected" : "transparent",
              border: "1px solid",
              borderColor: state.activeThreadId === null ? "primary.main" : "transparent"
            }}
          >
            New task
          </Button>
          {taskTabs.map((thread) => {
            const active = state.activeThreadId === thread.id;
            return (
              <Button
                key={thread.id}
                role="tab"
                aria-selected={active}
                size="small"
                startIcon={<ChatBubbleOutlineIcon />}
                onClick={() => selectTaskTab(thread.id)}
                sx={{
                  my: 0.625,
                  px: 1.25,
                  flex: "0 0 auto",
                  maxWidth: 220,
                  justifyContent: "flex-start",
                  borderRadius: 1.5,
                  color: active ? "primary.main" : "text.secondary",
                  bgcolor: active ? "action.selected" : "transparent",
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "transparent",
                  "& .MuiButton-startIcon": { mr: 0.75 }
                }}
              >
                <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thread.preview || thread.id}
                </Box>
              </Button>
            );
          })}
        </Box>
        <Box sx={{ minHeight: 0, overflow: desktopLayout ? "hidden" : "auto" }}>
        {desktopLayout ? (
          <Box sx={{ height: "100%", minHeight: 0 }}>
          <PanelGroup
            orientation="horizontal"
            id="codex-react-ui-workbench-panels"
            defaultLayout={panelLayout}
            onLayoutChanged={(layout, meta) => {
              if (!meta.isUserInteraction) {
                return;
              }
              setPanelLayout(layout);
              localStorage.setItem(UI_STORAGE_KEYS.panelLayout, JSON.stringify(layout));
            }}
          >
            {leftPanelVisible && (
              <>
                <Panel id="history" defaultSize="20%" minSize="14%" maxSize="34%">
                  <Box sx={{ height: "100%", minHeight: 0 }}>
                    <HistorySidebar
                      threads={state.threads}
                      activeThreadId={state.activeThreadId}
                      onSelect={(threadId) => selectTaskTab(threadId)}
                      onNew={() => selectTaskTab(null)}
                    />
                  </Box>
                </Panel>
                <ResizeHandle />
              </>
            )}
            <Panel id="chat" defaultSize={inspectorVisible ? "52%" : "80%"} minSize="32%">
              {renderCenterPanel()}
            </Panel>
            {inspectorVisible && (
              <>
                <ResizeHandle />
                <Panel id="inspector" defaultSize="28%" minSize="20%" maxSize="42%">
                  {renderInspector()}
                </Panel>
              </>
            )}
          </PanelGroup>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateRows: "auto auto auto", minHeight: 0 }}>
            {leftPanelVisible && (
              <HistorySidebar
                threads={state.threads}
                activeThreadId={state.activeThreadId}
                onSelect={(threadId) => selectTaskTab(threadId)}
                onNew={() => selectTaskTab(null)}
              />
            )}
            {renderCenterPanel()}
            {inspectorVisible && renderInspector()}
          </Box>
        )}
        </Box>
      </Box>
      <Popover
        open={Boolean(reasoningAnchor)}
        anchorEl={reasoningAnchor}
        onClose={() => setReasoningAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { width: 320, p: 2, mt: 0.75 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TuneIcon fontSize="small" color={showReasoningGlow ? "primary" : "inherit"} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Reasoning strength
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sent as `turn/start.effort`
              </Typography>
            </Box>
            <Chip size="small" label={selectedReasoning?.label ?? reasoningEffort} color={showReasoningGlow ? "primary" : "default"} />
          </Stack>
          <Slider
            value={reasoningIndex}
            min={0}
            max={reasoningMax}
            step={1}
            marks={reasoningOptions.map((option, index) => ({ value: index, label: option.label }))}
            onChange={(_, value) => {
              const index = Array.isArray(value) ? value[0] : value;
              const next = reasoningOptions[index];
              if (next) {
                setReasoningEffort(next.value);
              }
            }}
            sx={{
              mx: 1,
              ...(showReasoningGlow
                ? {
                    "& .MuiSlider-thumb": {
                      boxShadow: "0 0 0 8px rgba(97, 243, 243, 0.12), 0 0 24px rgba(97, 243, 243, 0.42)"
                    }
                  }
                : {})
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {selectedReasoning?.description ?? "Adjust model reasoning effort for the next turn."}
          </Typography>
        </Stack>
      </Popover>
      <SettingsDrawer
        open={settingsOpen}
        themeMode={themeMode}
        installedThemePluginIds={installedThemePluginIds}
        customThemePlugins={customThemePlugins}
        leftPanelVisible={leftPanelVisible}
        inspectorVisible={inspectorVisible}
        petDockEnabled={petDockEnabled}
        cwd={cwd}
        permission={permission}
        providers={state.providers}
        activeProviderId={activeProviderId}
        selectedModel={selectedModel}
        reasoningEffort={reasoningEffort}
        reasoningOptions={reasoningOptions}
        codexConfig={codexConfig}
        codexConfigLoading={codexConfigLoading}
        codexConfigSaving={codexConfigSaving}
        codexConfigError={codexConfigError}
        onClose={() => setSettingsOpen(false)}
        onThemeModeChange={onThemeModeChange}
        onInstallThemePlugin={installThemePlugin}
        onUninstallThemePlugin={uninstallThemePlugin}
        onSaveCustomThemePlugin={saveCustomThemePlugin}
        onRemoveCustomThemePlugin={removeCustomThemePlugin}
        onLeftPanelVisibleChange={setLeftPanelVisible}
        onInspectorVisibleChange={setInspectorVisible}
        onPetDockEnabledChange={setPetDockEnabled}
        onCwdChange={setCwd}
        onPermissionChange={setPermission}
        onReasoningEffortChange={setReasoningEffort}
        onReloadCodexConfig={() => void loadCodexConfig()}
        onCodexConfigFieldChange={(field, value) => void writeCodexConfigField(field, value)}
        onCodexConfigValueChange={(keyPath, value) => void writeCodexConfigValue(keyPath, value)}
        onSaveProvider={(provider, apiKey) => void saveProvider(provider, apiKey)}
        onActivateProvider={(providerId, model) => void activateProvider(providerId, model)}
      />
      <Snackbar
        open={state.errors.length > 0}
        autoHideDuration={6000}
        onClose={() => dispatch({ type: "clearError" })}
      >
        <Alert severity="error" variant="filled">
          {state.errors[0]}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw == null) {
    return fallback;
  }
  try {
    return Boolean(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

function readInstalledThemes(): ThemeId[] {
  const defaults = installedThemePluginDefaults();
  const raw = localStorage.getItem(UI_STORAGE_KEYS.installedThemes);
  if (!raw) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaults;
    }
    // Keep user-defined plugin ids even when they are not in the builtin catalog.
    const valid = parsed.filter((entry): entry is ThemeId => typeof entry === "string" && entry.length > 0);
    return [...defaults, ...valid.filter((entry) => !defaults.includes(entry))];
  } catch {
    return defaults;
  }
}

function readPanelLayout(storageKey: string): Record<string, number> | undefined {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const layout = Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number")
    );
    return Object.keys(layout).length > 0 ? layout : undefined;
  } catch {
    return undefined;
  }
}

function reasoningLabel(value: string): string {
  switch (value) {
    case "minimal":
      return "Minimal";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default:
      return value
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeThreads(value: unknown[]): ClientState["threads"] {
  return value
    .map((entry) => asRecord(entry))
    .map((entry) => ({
      id: String(entry.id ?? ""),
      preview: typeof entry.preview === "string" ? entry.preview : undefined,
      model: typeof entry.model === "string" ? entry.model : undefined,
      modelProvider: typeof entry.modelProvider === "string" ? entry.modelProvider : undefined,
      createdAt: typeof entry.createdAt === "number" ? entry.createdAt : undefined,
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : undefined,
      status: typeof entry.status === "string" ? entry.status : undefined
    }))
    .filter((entry) => entry.id);
}

function upsertThread(threads: ClientState["threads"], thread: ClientState["threads"][number]): ClientState["threads"] {
  const found = threads.some((entry) => entry.id === thread.id);
  return found ? threads.map((entry) => (entry.id === thread.id ? { ...entry, ...thread } : entry)) : [thread, ...threads];
}

function mergeTurns(current: ClientState["turns"], loaded: ClientState["turns"]): ClientState["turns"] {
  const loadedIds = new Set(loaded.map((turn) => turn.id));
  return [...current.filter((turn) => !loadedIds.has(turn.id)), ...loaded];
}

function errorMessage(scope: string, error: unknown): string {
  if (error instanceof Error) {
    return `${scope}: ${error.message}`;
  }
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return `${scope}: ${(error as { message: string }).message}`;
  }
  return `${scope}: ${String(error)}`;
}

function resolveSelectedModel(providers: ProviderConfig[], activeProviderId: string | null, selectedModel: string): string {
  const provider = providers.find((entry) => entry.id === activeProviderId);
  if (!provider) {
    return selectedModel;
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

function decodeBase64Text(value: string): string {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Text(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}
