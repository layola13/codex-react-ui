import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Slider,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BoltIcon from "@mui/icons-material/Bolt";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChecklistIcon from "@mui/icons-material/Checklist";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import TuneIcon from "@mui/icons-material/Tune";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Group as PanelGroup, Panel } from "react-resizable-panels";
import {
  permissionPresets,
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
  parseHookGroups,
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
import {
  ChatPanel,
  type GoalBannerState,
  type GoalStatus,
  type RequestMonitorEntry,
  type ThreadTokenUsageState,
  type TokenUsageBreakdown,
  type WorkbenchModeState,
  type WorkbenchStatsState
} from "./components/ChatPanel";
import { Composer } from "./components/Composer";
import { NewChatButton } from "./components/NewChatButton";
import { SideChatPanel, type SideChatTab } from "./components/SideChatPanel";
import { ThemeBackgroundMedia } from "./components/ThemeBackgroundMedia";
import { RightWorkspacePanel, type RightWorkspaceTab } from "./components/RightWorkspacePanel";
import { SettingsDrawer, type ReasoningOption, type SettingsSectionId } from "./components/SettingsDrawer";
import type { CodexPluginSettingsTab } from "./components/CodexPluginSettingsPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { localeOptions, useI18n, type Locale } from "./i18n";
import {
  applyConfigWriteToView,
  buildDynamicConfigValueWrite,
  buildConfigValueWrite,
  parseConfigReadResponse,
  type CodexConfigFieldKey,
  type CodexUserConfigView
} from "./state/codexConfigSettings";
import { installedThemePluginDefaults, isThemeId, themePlugins, themeVisualTuning, type ThemeId, type ThemeMode, type ThemePlugin } from "./theme";

const UI_STORAGE_KEYS = {
  installedThemes: "codex-react-ui.installed-theme-plugins",
  leftPanelVisible: "codex-react-ui.left-panel-visible",
  petDockEnabled: "codex-react-ui.pet-dock-enabled",
  panelLayout: "codex-react-ui.panel-layout",
  filesPanelLayout: "codex-react-ui.files-panel-layout"
} as const;

const DEFAULT_NEW_CHAT_CWD = "~/";

type AppProps = {
  themeMode: ThemeMode;
  customThemePlugins: ThemePlugin[];
  onThemeModeChange: (mode: ThemeMode) => void;
  onCustomThemePluginsChange: (plugins: ThemePlugin[]) => void;
};

type DangerDialogIntent = {
  source: "new-chat" | "permission";
  nextPermission: PermissionPresetId;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type ComposerSlashCommand =
  | { type: "settings"; section: SettingsSectionId; pluginTab?: CodexPluginSettingsTab }
  | { type: "fast"; enabled?: boolean }
  | { type: "stats"; scope: "status" | "stats" }
  | { type: "goal"; action: "show" | "set" | "clear" | "pause" | "resume" | "complete" | "edit"; objective: string }
  | { type: "plan"; enabled?: boolean; prompt?: string }
  | { type: "new"; permission?: PermissionPresetId }
  | { type: "rename"; name: string }
  | { type: "review"; target: JsonValue; delivery: "inline" | "detached" }
  | { type: "diff" }
  | { type: "compact" }
  | { type: "resume"; threadId?: string };

type SlashCommandNotice = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning";
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
  | { type: "threadMerged"; thread: ClientState["threads"][number] | null; turns: ClientState["turns"] }
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
    case "threadMerged":
      return {
        ...state,
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
      return { ...state, errors: [formatErrorText(action.message), ...state.errors].slice(0, 8) };
    case "clearError":
      return { ...state, errors: state.errors.slice(1) };
  }
}

export function App({ themeMode, customThemePlugins, onThemeModeChange, onCustomThemePluginsChange }: AppProps) {
  const [state, dispatch] = useReducer(reducer, initialClientState);
  const [permission, setPermission] = useState<PermissionPresetId>("workspaceAsk");
  const [dangerBypassConfirmed, setDangerBypassConfirmed] = useState(false);
  const [dangerDialogIntent, setDangerDialogIntent] = useState<DangerDialogIntent | null>(null);
  const [dangerDialogAcknowledged, setDangerDialogAcknowledged] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [reasoningEffort, setReasoningEffort] = useState("medium");
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [cwd, setCwd] = useState(DEFAULT_NEW_CHAT_CWD);
  const [workspaceSelectionPending, setWorkspaceSelectionPending] = useState(true);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [workspacePickerPath, setWorkspacePickerPath] = useState("/root");
  const [fastModeEnabled, setFastModeEnabled] = useState(false);
  const [planModeEnabled, setPlanModeEnabled] = useState(false);
  const [statsPanelScope, setStatsPanelScope] = useState<"status" | "stats" | null>(null);
  const [slashNotice, setSlashNotice] = useState<SlashCommandNotice | null>(null);
  const [threadGoals, setThreadGoals] = useState<Record<string, GoalBannerState>>({});
  const [threadTokenUsage, setThreadTokenUsage] = useState<Record<string, ThreadTokenUsageState>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("codex");
  const [settingsPluginTab, setSettingsPluginTab] = useState<CodexPluginSettingsTab>("marketplace");
  const [installedThemePluginIds, setInstalledThemePluginIds] = useState<ThemeId[]>(readInstalledThemes);
  const [leftPanelVisible, setLeftPanelVisible] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.leftPanelVisible, true));
  const [rightWorkspaceVisible, setRightWorkspaceVisible] = useState(false);
  const [rightWorkspaceTab, setRightWorkspaceTab] = useState<RightWorkspaceTab>("sidechat");
  const [sideChatTabs, setSideChatTabs] = useState<SideChatTab[]>(() => [
    {
      id: "sidechat-1",
      title: "Side chat",
      threadId: null,
      draft: "",
      sending: false,
      userMessages: []
    }
  ]);
  const [activeSideChatId, setActiveSideChatId] = useState("sidechat-1");
  const [sideChatError, setSideChatError] = useState<string | null>(null);
  const sideChatSequenceRef = useRef(2);
  const sideChatInFlightRef = useRef(new Set<string>());
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
  const [composerSuggestion, setComposerSuggestion] = useState<{ id: string; text: string } | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [pluginDetails, setPluginDetails] = useState<Record<string, PluginDetailEntry>>({});
  const [pluginSkillPreviews, setPluginSkillPreviews] = useState<Record<string, string>>({});
  const [pluginAuthNotices, setPluginAuthNotices] = useState<Record<string, PluginInstallAuthNotice>>({});
  const [skillExtraRoots, setSkillExtraRoots] = useState<string[]>([]);
  const [skillPreviews, setSkillPreviews] = useState<Record<string, string>>({});
  const [fileDirectories, setFileDirectories] = useState<Record<string, FsDirectoryEntry[]>>({});
  const [openFile, setOpenFile] = useState<{ path: string; content: string; savedContent: string; loading: boolean; saving: boolean } | null>(null);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const [auditEvents, setAuditEvents] = useState<DangerousPermissionAuditEvent[]>([]);
  const [mcpResourceContents, setMcpResourceContents] = useState<Record<string, McpResourceContentEntry[]>>({});
  const [mcpOauthUrls, setMcpOauthUrls] = useState<Record<string, string>>({});
  const clientRef = useRef<CodexSocketClient | null>(null);
  const desktopLayout = useMediaQuery("(min-width:900px)");
  const { locale, setLocale, t } = useI18n();

  const openSettings = useCallback((section: SettingsSectionId = "codex", pluginTab: CodexPluginSettingsTab = "marketplace") => {
    setSettingsSection(section);
    if (section === "plugins") {
      setSettingsPluginTab(pluginTab);
    }
    setSettingsOpen(true);
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setAppInstalled(true);
      setInstallPromptEvent(null);
    }
  }, [installPromptEvent]);

  const client = useMemo(() => {
    const socketClient = new CodexSocketClient();
    clientRef.current = socketClient;
    return socketClient;
  }, []);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.installedThemes, JSON.stringify(installedThemePluginIds));
  }, [installedThemePluginIds]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setAppInstalled(true);
      setInstallPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.leftPanelVisible, JSON.stringify(leftPanelVisible));
  }, [leftPanelVisible]);

  useEffect(() => {
    if (!rightWorkspaceVisible || rightWorkspaceTab !== "sidechat") {
      return;
    }
    const hasActive = sideChatTabs.some((tab) => tab.id === activeSideChatId);
    if (!hasActive && sideChatTabs[0]) {
      setActiveSideChatId(sideChatTabs[0].id);
    }
  }, [activeSideChatId, rightWorkspaceTab, rightWorkspaceVisible, sideChatTabs]);

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
      loadAllThreads(client)
    ]);
    dispatch({ type: "account", account });
    const models = asRecord(modelResult).data ?? asRecord(modelResult).models;
    dispatch({ type: "models", models: Array.isArray(models) ? (models as ClientState["models"]) : [] });
    dispatch({ type: "threads", threads: threadResult });
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
      const normalizedCwd = normalizeWorkspaceCwd(cwd) || "/root";
      const skillCwds = [normalizedCwd, ...effectiveSkillExtraRoots.map(normalizeWorkspaceCwd)]
        .filter((entry, index, entries) => entry && entries.indexOf(entry) === index);
      const [mcpResult, skillResult, hookResult, pluginResult, installedPluginResult, appResult] = await Promise.allSettled([
        client.rpc("mcpServerStatus/list", { detail: "full" }),
        client.rpc("skills/list", { cwds: skillCwds, forceReload: options?.forceSkillReload ?? false }),
        client.rpc("hooks/list", { cwds: [normalizedCwd] }),
        client.rpc("plugin/list", {
          cwds: [normalizedCwd],
          marketplaceKinds: ["local"]
        }),
        client.rpc("plugin/installed", { cwds: [normalizedCwd], installSuggestionPluginNames: [] }),
        client.rpc("app/list", { threadId: state.activeThreadId, limit: 50, forceRefetch: options?.forceSkillReload ?? false })
      ]);

      const nextTooling: ClientState["tooling"] = {
        mcpServers: [],
        skillGroups: [],
        hookGroups: [],
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

      if (hookResult.status === "fulfilled") {
        nextTooling.hookGroups = parseHookGroups(hookResult.value);
      } else {
        errors.push(errorMessage("Hooks inventory", hookResult.reason));
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
      } else if (!isThreadNotFoundError(appResult.reason)) {
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
        if (message.message.method === "thread/tokenUsage/updated") {
          const params = asRecord(message.message.params);
          const threadId = stringValue(params.threadId);
          const usage = parseThreadTokenUsage(params.tokenUsage);
          if (threadId && usage) {
            setThreadTokenUsage((current) => ({ ...current, [threadId]: usage }));
          }
        }
        if (message.message.method === "thread/goal/updated") {
          const params = asRecord(message.message.params);
          const goal = parseGoal(asRecord(params.goal));
          if (goal) {
            setThreadGoals((current) => ({ ...current, [goal.threadId]: goal }));
          }
        }
        if (message.message.method === "thread/goal/cleared") {
          const params = asRecord(message.message.params);
          const threadId = stringValue(params.threadId);
          if (threadId) {
            setThreadGoals((current) => {
              const next = { ...current };
              delete next[threadId];
              return next;
            });
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
      if (message.type === "provider.deleted") {
        dispatch({
          type: "providers",
          providers: state.providers.filter((provider) => provider.id !== message.providerId)
        });
        if (message.providerId === activeProviderId) {
          setActiveProviderId(null);
        }
      }
      if (message.type === "server.error") {
        dispatch({ type: "error", message: formatErrorText(message.message) });
      }
    };
    client.addEventListener("connected", onConnected);
    client.addEventListener("server-message", onMessage);
    return () => {
      client.removeEventListener("connected", onConnected);
      client.removeEventListener("server-message", onMessage);
    };
  }, [activeProviderId, appendTerminalOutput, client, loadTooling, state.providers]);

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
        try {
          const configResult = await client.rpc("config/read", { includeLayers: false });
          if (!mounted) return;
          const view = parseConfigReadResponse(configResult);
          setCodexConfig(view);
          const providerFromConfig = view.modelProvider ? providers.find((provider) => provider.id === view.modelProvider) : undefined;
          if (providerFromConfig) {
            setActiveProviderId(providerFromConfig.id);
          }
          if (view.model) {
            setSelectedModel((current) => current || view.model || current);
          }
        } catch {
          /* The workbench can still load with engine defaults if config/read is unavailable. */
        }
        await loadBasics();
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
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
    if (settingsOpen && settingsSection === "plugins" && state.connected && state.engine.phase === "ready") {
      void loadTooling({ forceSkillReload: true });
    }
  }, [loadTooling, settingsOpen, settingsSection, state.connected, state.engine.phase]);

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

  const loadThreadGoal = useCallback(
    async (threadId: string) => {
      try {
        const result = await client.rpc("thread/goal/get", { threadId });
        const goal = parseGoal(asRecord(asRecord(result).goal));
        setThreadGoals((current) => {
          const next = { ...current };
          if (goal) {
            next[threadId] = goal;
          } else {
            delete next[threadId];
          }
          return next;
        });
      } catch {
        // Older app-server builds may not expose goal reads; keep the local banner state.
      }
    },
    [client]
  );

  const loadThread = useCallback(
    async (threadId: string) => {
      setWelcomeDismissed(false);
      dispatch({ type: "activeThread", threadId });
      try {
        const result = await client.rpc("thread/read", { threadId, includeTurns: true });
        const loaded = threadReadToTurns(result);
        dispatch({ type: "threadLoaded", thread: loaded.thread, turns: loaded.turns });
        void loadThreadGoal(threadId);
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
      }
    },
    [client, loadThreadGoal]
  );

  const loadThreadIntoCache = useCallback(
    async (threadId: string) => {
      try {
        const result = await client.rpc("thread/read", { threadId, includeTurns: true });
        const loaded = threadReadToTurns(result);
        dispatch({ type: "threadMerged", thread: loaded.thread, turns: loaded.turns });
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
      }
    },
    [client]
  );

  useEffect(() => {
    if (!state.connected || !state.token) {
      return;
    }
    const token = state.token;
    let cancelled = false;
    void (async () => {
      try {
        const providers = await fetchProviders(token);
        if (cancelled) return;
        dispatch({ type: "providers", providers });
        await loadBasics();
        if (cancelled) return;
        if (state.activeThreadId) {
          await loadThreadIntoCache(state.activeThreadId);
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({ type: "error", message: errorMessage("Reconnect refresh", error) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBasics, loadThreadIntoCache, state.activeThreadId, state.connected, state.token]);

  const selectTaskTab = useCallback(
    (threadId: string | null) => {
      if (!threadId) {
        setCwd(DEFAULT_NEW_CHAT_CWD);
        setWorkspaceSelectionPending(true);
        setWelcomeDismissed(false);
        dispatch({ type: "activeThread", threadId: null });
        return;
      }
      setWorkspaceSelectionPending(false);
      void loadThread(threadId);
    },
    [loadThread]
  );

  const beginNewSession = useCallback((nextPermission: PermissionPresetId) => {
    setPermission(nextPermission);
    setDangerBypassConfirmed(nextPermission === "dangerBypass");
    setCwd(DEFAULT_NEW_CHAT_CWD);
    setWorkspaceSelectionPending(true);
    setWelcomeDismissed(false);
    dispatch({ type: "activeThread", threadId: null });
  }, []);

  const requestNewSession = useCallback(
    (nextPermission: PermissionPresetId) => {
      if (nextPermission === "dangerBypass") {
        setCwd(DEFAULT_NEW_CHAT_CWD);
        setWorkspaceSelectionPending(true);
        setWelcomeDismissed(false);
        dispatch({ type: "activeThread", threadId: null });
        setDangerDialogIntent({ source: "new-chat", nextPermission });
        setDangerDialogAcknowledged(false);
        return;
      }
      beginNewSession(nextPermission);
    },
    [beginNewSession]
  );

  const requestPermissionChange = useCallback(
    (nextPermission: PermissionPresetId) => {
      if (nextPermission === "dangerBypass" && !dangerBypassConfirmed) {
        setDangerDialogIntent({ source: "permission", nextPermission });
        setDangerDialogAcknowledged(false);
        return;
      }
      setPermission(nextPermission);
      if (nextPermission !== "dangerBypass") {
        setDangerBypassConfirmed(false);
      }
    },
    [dangerBypassConfirmed]
  );

  const confirmWorkspaceSelection = useCallback(() => {
    const normalized = normalizeWorkspaceCwd(cwd);
    if (!normalized) {
      dispatch({ type: "error", message: t("workspace.required") });
      return;
    }
    setCwd(normalized);
    setWorkspaceSelectionPending(false);
  }, [cwd, t]);

  const closeDangerDialog = useCallback(() => {
    setDangerDialogIntent(null);
    setDangerDialogAcknowledged(false);
  }, []);

  const confirmDangerDialog = useCallback(() => {
    if (!dangerDialogIntent) {
      return;
    }
    setPermission(dangerDialogIntent.nextPermission);
    setDangerBypassConfirmed(true);
    if (dangerDialogIntent.source === "new-chat") {
      setWorkspaceSelectionPending(true);
      setWelcomeDismissed(false);
      dispatch({ type: "activeThread", threadId: null });
    }
    closeDangerDialog();
  }, [closeDangerDialog, dangerDialogIntent]);

  const useSaferModeFromDangerDialog = useCallback(() => {
    if (dangerDialogIntent?.source === "new-chat") {
      beginNewSession("workspaceAsk");
    } else {
      setPermission("workspaceAsk");
      setDangerBypassConfirmed(false);
    }
    closeDangerDialog();
  }, [beginNewSession, closeDangerDialog, dangerDialogIntent?.source]);

  const loadAuditEvents = useCallback(async () => {
    if (!state.token) {
      return;
    }
    try {
      setAuditEvents(await fetchAuditEvents(state.token));
    } catch (error) {
      dispatch({ type: "error", message: formatErrorText(error) });
    }
  }, [state.token]);

  useEffect(() => {
    if (state.token) {
      void loadAuditEvents();
    }
  }, [loadAuditEvents, state.token]);

  const ensureActiveThread = useCallback(async (): Promise<string> => {
    if (state.activeThreadId) {
      return state.activeThreadId;
    }
    if (workspaceSelectionPending) {
      throw new Error(t("workspace.required"));
    }
    const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
    const permissionOverrides = permissionToTurnOverrides(permission, cwd);
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
    const threadId = stringValue(thread.id);
    if (!threadId) {
      throw new Error("Codex did not return a thread id");
    }
    dispatch({ type: "activeThread", threadId });
    return threadId;
  }, [activeProviderId, client, cwd, permission, selectedModel, state.activeThreadId, state.providers, t, workspaceSelectionPending]);

  const startCodexTurn = useCallback(
    async (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[], options: { preserveText?: boolean; forceEffort?: string } = {}) => {
      if (permission === "dangerBypass" && !dangerBypassConfirmed) {
        setDangerDialogIntent({ source: "permission", nextPermission: "dangerBypass" });
        setDangerDialogAcknowledged(false);
        return;
      }
      const input = composerInputToUserInput(text, images, mentions, { preserveText: options.preserveText });
      if (input.length === 0) {
        return;
      }
      try {
        const threadId = await ensureActiveThread();
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, cwd);
        const turnParams: Record<string, JsonValue> = {
          threadId,
          input,
          cwd,
          sandboxPolicy: permissionOverrides.sandboxPolicy,
          approvalPolicy: permissionOverrides.approvalPolicy,
          effort: options.forceEffort ?? (fastModeEnabled ? fastReasoningEffort(reasoningOptions, reasoningEffort) : reasoningEffort)
        };
        if (effectiveModel) {
          turnParams.model = effectiveModel;
        }
        await client.rpc("turn/start", turnParams);
        if (permission === "dangerBypass") {
          await loadAuditEvents();
        }
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
      }
    },
    [
      activeProviderId,
      client,
      cwd,
      dangerBypassConfirmed,
      ensureActiveThread,
      fastModeEnabled,
      loadAuditEvents,
      permission,
      reasoningEffort,
      reasoningOptions,
      selectedModel,
      state.providers
    ]
  );

  const setGoalForActiveThread = useCallback(
    async (objective: string) => {
      if (permission === "dangerBypass" && !dangerBypassConfirmed) {
        setDangerDialogIntent({ source: "permission", nextPermission: "dangerBypass" });
        setDangerDialogAcknowledged(false);
        return;
      }
      const normalized = objective.trim();
      if (!normalized) {
        dispatch({ type: "error", message: "Usage: /goal <objective>" });
        return;
      }
      try {
        const threadId = await ensureActiveThread();
        const optimisticGoal = buildLocalGoal(threadId, normalized, "active", threadGoals[threadId]);
        setThreadGoals((current) => ({ ...current, [threadId]: optimisticGoal }));
        const result = await client.rpc("thread/goal/set", { threadId, objective: normalized, status: "active" });
        const goal = parseGoal(asRecord(asRecord(result).goal));
        if (goal) {
          setThreadGoals((current) => ({ ...current, [threadId]: goal }));
        }
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Goal set", error) });
      }
    },
    [client, dangerBypassConfirmed, ensureActiveThread, permission, threadGoals]
  );

  const setActiveGoalStatus = useCallback(
    async (status: GoalStatus) => {
      const threadId = state.activeThreadId;
      if (!threadId) {
        dispatch({ type: "error", message: "Select or start a conversation before changing goal status" });
        return;
      }
      const existing = threadGoals[threadId];
      if (!existing) {
        dispatch({ type: "error", message: "No goal is active for this conversation" });
        return;
      }
      try {
        setThreadGoals((current) => ({ ...current, [threadId]: buildLocalGoal(threadId, existing.objective, status, existing) }));
        const result = await client.rpc("thread/goal/set", { threadId, status });
        const goal = parseGoal(asRecord(asRecord(result).goal));
        if (goal) {
          setThreadGoals((current) => ({ ...current, [threadId]: goal }));
        }
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Goal status", error) });
      }
    },
    [client, state.activeThreadId, threadGoals]
  );

  const clearActiveGoal = useCallback(async () => {
    const threadId = state.activeThreadId;
    if (!threadId) {
      dispatch({ type: "error", message: "Select or start a conversation before clearing a goal" });
      return;
    }
    try {
      setThreadGoals((current) => {
        const next = { ...current };
        delete next[threadId];
        return next;
      });
      await client.rpc("thread/goal/clear", { threadId });
    } catch (error) {
      dispatch({ type: "error", message: errorMessage("Goal clear", error) });
    }
  }, [client, state.activeThreadId]);

  const renameActiveThread = useCallback(
    async (name: string) => {
      const threadId = state.activeThreadId;
      if (!threadId) {
        dispatch({ type: "error", message: "Select or start a conversation before renaming it" });
        return;
      }
      const normalized = name.trim();
      if (!normalized) {
        setComposerSuggestion({ id: `rename-${Date.now()}`, text: "/rename " });
        return;
      }
      try {
        await client.rpc("thread/name/set", { threadId, name: normalized });
        dispatch({ type: "threads", threads: renameThreadEntry(state.threads, threadId, normalized) });
        setSlashNotice({
          id: `rename-${Date.now()}`,
          title: "Thread renamed",
          message: normalized,
          severity: "success"
        });
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Rename thread", error) });
      }
    },
    [client, state.activeThreadId, state.threads]
  );

  const startReview = useCallback(
    async (target: JsonValue, delivery: "inline" | "detached") => {
      if (permission === "dangerBypass" && !dangerBypassConfirmed) {
        setDangerDialogIntent({ source: "permission", nextPermission: "dangerBypass" });
        setDangerDialogAcknowledged(false);
        return;
      }
      try {
        const threadId = await ensureActiveThread();
        const result = await client.rpc("review/start", { threadId, target, delivery });
        const reviewThreadId = stringValue(asRecord(result).reviewThreadId) ?? threadId;
        if (delivery === "detached" && reviewThreadId !== threadId) {
          void loadThreadIntoCache(reviewThreadId);
        }
        setSlashNotice({
          id: `review-${Date.now()}`,
          title: delivery === "detached" ? "Detached review started" : "Review started",
          message: reviewTargetLabel(target),
          severity: "success"
        });
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Review start", error) });
      }
    },
    [client, dangerBypassConfirmed, ensureActiveThread, loadThreadIntoCache, permission]
  );

  const showDiffToRemote = useCallback(async () => {
    try {
      const result = asRecord(await client.rpc("gitDiffToRemote", { cwd }));
      const sha = stringValue(result.sha);
      const diff = stringValue(result.diff) ?? "";
      setSlashNotice({
        id: `diff-${Date.now()}`,
        title: "Diff to remote",
        message: formatDiffNotice(sha, diff),
        severity: diff.trim() ? "info" : "success"
      });
    } catch (error) {
      dispatch({ type: "error", message: errorMessage("Diff to remote", error) });
    }
  }, [client, cwd]);

  const compactActiveThread = useCallback(async () => {
    const threadId = state.activeThreadId;
    if (!threadId) {
      dispatch({ type: "error", message: "Select or start a conversation before compacting context" });
      return;
    }
    try {
      await client.rpc("thread/compact/start", { threadId });
      setSlashNotice({
        id: `compact-${Date.now()}`,
        title: "Context compaction started",
        message: `Compacting ${threadId}`,
        severity: "success"
      });
    } catch (error) {
      dispatch({ type: "error", message: errorMessage("Compact context", error) });
    }
  }, [client, state.activeThreadId]);

  const resumeThreadFromSlash = useCallback(
    async (threadId?: string) => {
      const sideChatThreadIds = new Set(sideChatTabs.map((tab) => tab.threadId).filter((value): value is string => Boolean(value)));
      const fallbackThreadId = state.threads.find((thread) => !sideChatThreadIds.has(thread.id))?.id;
      const targetThreadId = threadId?.trim() || state.activeThreadId || fallbackThreadId;
      if (!targetThreadId) {
        dispatch({ type: "error", message: "Usage: /resume <thread-id>" });
        return;
      }
      try {
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, cwd);
        const resumeParams: Record<string, JsonValue> = {
          threadId: targetThreadId,
          cwd,
          approvalPolicy: permissionOverrides.approvalPolicy,
          sandbox: permissionOverrides.sandbox
        };
        if (effectiveModel) {
          resumeParams.model = effectiveModel;
        }
        await client.rpc("thread/resume", resumeParams);
        await loadThread(targetThreadId);
        setSlashNotice({
          id: `resume-${Date.now()}`,
          title: "Thread resumed",
          message: targetThreadId,
          severity: "success"
        });
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Resume thread", error) });
      }
    },
    [activeProviderId, client, cwd, loadThread, permission, selectedModel, sideChatTabs, state.activeThreadId, state.providers, state.threads]
  );

  const handleComposerSlashCommand = useCallback(
    async (command: ComposerSlashCommand) => {
      switch (command.type) {
        case "settings":
          openSettings(command.section, command.pluginTab ?? "marketplace");
          return;
        case "fast":
          setFastModeEnabled((current) => command.enabled ?? !current);
          return;
        case "stats":
          setStatsPanelScope(command.scope);
          return;
        case "new":
          {
            const nextPermission = command.permission ?? permission;
            requestNewSession(nextPermission);
            if (nextPermission === "dangerBypass") {
              return;
            }
          }
          setSlashNotice({
            id: `new-${Date.now()}`,
            title: "New chat ready",
            message: "The next prompt will start a fresh Codex thread.",
            severity: "success"
          });
          return;
        case "rename":
          await renameActiveThread(command.name);
          return;
        case "review":
          await startReview(command.target, command.delivery);
          return;
        case "diff":
          await showDiffToRemote();
          return;
        case "compact":
          await compactActiveThread();
          return;
        case "resume":
          await resumeThreadFromSlash(command.threadId);
          return;
        case "goal":
          if (command.action === "set") {
            await setGoalForActiveThread(command.objective);
            return;
          }
          if (command.action === "clear") {
            await clearActiveGoal();
            return;
          }
          if (command.action === "pause") {
            await setActiveGoalStatus("paused");
            return;
          }
          if (command.action === "resume") {
            await setActiveGoalStatus("active");
            return;
          }
          if (command.action === "complete") {
            await setActiveGoalStatus("complete");
            return;
          }
          if (command.action === "edit") {
            const existing = state.activeThreadId ? threadGoals[state.activeThreadId] : null;
            setComposerSuggestion({ id: `goal-edit-${Date.now()}`, text: existing ? `/goal ${existing.objective}` : "/goal " });
            return;
          }
          setStatsPanelScope("status");
          return;
        case "plan":
          setPlanModeEnabled(command.enabled ?? true);
          if (command.prompt) {
            await startCodexTurn(command.prompt, [], []);
          }
          return;
      }
    },
    [
      clearActiveGoal,
      compactActiveThread,
      openSettings,
      permission,
      renameActiveThread,
      requestNewSession,
      resumeThreadFromSlash,
      setActiveGoalStatus,
      setGoalForActiveThread,
      showDiffToRemote,
      startCodexTurn,
      startReview,
      state.activeThreadId,
      threadGoals
    ]
  );

  const sendPrompt = useCallback(
    async (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[]) => {
      setWelcomeDismissed(true);
      const slashCommand = parseComposerSlashCommand(text, images, mentions);
      if (slashCommand) {
        await handleComposerSlashCommand(slashCommand);
        return;
      }
      await startCodexTurn(text, images, mentions);
    },
    [handleComposerSlashCommand, startCodexTurn]
  );

  const addSideChatTab = useCallback(() => {
    const nextIndex = sideChatSequenceRef.current;
    sideChatSequenceRef.current += 1;
    const nextTab: SideChatTab = {
      id: `sidechat-${nextIndex}`,
      title: `Side chat ${nextIndex}`,
      threadId: null,
      draft: "",
      sending: false,
      userMessages: []
    };
    setSideChatTabs((current) => [...current, nextTab]);
    setActiveSideChatId(nextTab.id);
    setRightWorkspaceTab("sidechat");
    setRightWorkspaceVisible(true);
  }, []);

  const closeSideChatTab = useCallback((tabId: string) => {
    setSideChatTabs((current) => {
      if (current.length <= 1) {
        sideChatInFlightRef.current.delete(tabId);
        return current.map((tab) => (tab.id === tabId ? { ...tab, threadId: null, draft: "", sending: false, userMessages: [] } : tab));
      }
      const next = current.filter((tab) => tab.id !== tabId);
      sideChatInFlightRef.current.delete(tabId);
      setActiveSideChatId((active) => (active === tabId ? next[Math.max(0, current.findIndex((tab) => tab.id === tabId) - 1)]?.id ?? next[0]?.id ?? active : active));
      return next;
    });
  }, []);

  const changeSideChatDraft = useCallback((tabId: string, draft: string) => {
    setSideChatTabs((current) => current.map((tab) => (tab.id === tabId ? { ...tab, draft } : tab)));
  }, []);

  const sendSideChatPrompt = useCallback(
    async (tabId: string, text: string) => {
      const commandText = text;
      const titleText = commandText.trim();
      if (!titleText || sideChatInFlightRef.current.has(tabId)) {
        return;
      }
      const tab = sideChatTabs.find((entry) => entry.id === tabId);
      if (!tab || tab.sending) {
        return;
      }
      if (permission === "dangerBypass" && !dangerBypassConfirmed) {
        setDangerDialogIntent({ source: "permission", nextPermission: "dangerBypass" });
        setDangerDialogAcknowledged(false);
        return;
      }
      const localMessage = {
        id: `sidechat-message-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: commandText
      };
      sideChatInFlightRef.current.add(tabId);
      setSideChatError(null);
      setSideChatTabs((current) =>
        current.map((entry) =>
          entry.id === tabId
            ? {
                ...entry,
                title: entry.userMessages.length === 0 ? sideChatTitle(titleText, current.filter((candidate) => candidate.id !== entry.id).length + 1) : entry.title,
                draft: "",
                sending: true,
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
        }
        const turnParams: Record<string, JsonValue> = {
          threadId,
          input: composerInputToUserInput(commandText, [], [], { preserveText: true }),
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
        setSideChatTabs((current) => current.map((entry) => (entry.id === tabId ? { ...entry, sending: false } : entry)));
      } catch (error) {
        setSideChatError(formatErrorText(error));
        setSideChatTabs((current) =>
          current.map((entry) =>
            entry.id === tabId
              ? { ...entry, draft: commandText, sending: false, userMessages: entry.userMessages.filter((message) => message.id !== localMessage.id) }
              : entry
          )
        );
      } finally {
        sideChatInFlightRef.current.delete(tabId);
      }
    },
    [
      activeProviderId,
      client,
      cwd,
      dangerBypassConfirmed,
      loadAuditEvents,
      permission,
      reasoningEffort,
      selectedModel,
      sideChatTabs,
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
        dispatch({ type: "error", message: formatErrorText(error) });
        throw error;
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
        dispatch({ type: "error", message: formatErrorText(error) });
        throw error;
      }
    },
    [client, loadBasics]
  );

  const deleteProvider = useCallback(
    async (providerId: string) => {
      try {
        const deletedProviderId = await client.deleteProvider(providerId);
        dispatch({
          type: "providers",
          providers: state.providers.filter((entry) => entry.id !== deletedProviderId)
        });
        if (activeProviderId === deletedProviderId) {
          setActiveProviderId(null);
        }
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
        throw error;
      }
    },
    [activeProviderId, client, state.providers]
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
      dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
      dispatch({ type: "error", message: formatErrorText(error) });
    }
  }, [client, loadTooling]);

  const toggleSkill = useCallback(
    async (skill: SkillEntry, enabled: boolean) => {
      try {
        await client.rpc("skills/config/write", { path: skill.path || null, name: skill.path ? null : skill.name, enabled });
        await loadTooling({ forceSkillReload: true });
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
      }
    },
    [client]
  );

  useEffect(() => {
    if (!workspacePickerOpen) {
      return;
    }
    if (!fileDirectories[workspacePickerPath]) {
      void readDirectory(workspacePickerPath);
    }
  }, [fileDirectories, readDirectory, workspacePickerOpen, workspacePickerPath]);

  const openWorkspacePicker = useCallback(() => {
    const normalized = normalizeWorkspaceCwd(cwd) || "/root";
    setWorkspacePickerPath(normalized);
    setWorkspacePickerOpen(true);
  }, [cwd]);

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
        dispatch({ type: "error", message: formatErrorText(error) });
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
      dispatch({ type: "error", message: formatErrorText(error) });
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
        appendTerminalOutput(processId, `\n${formatErrorText(error)}\n`);
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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
        dispatch({ type: "error", message: formatErrorText(error) });
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

  const allThemePlugins = useMemo(
    () => [...themePlugins, ...customThemePlugins.filter((plugin) => !themePlugins.some((entry) => entry.id === plugin.id))],
    [customThemePlugins]
  );
  const activeThemePlugin = allThemePlugins.find((plugin) => plugin.id === themeMode) ?? null;
  const shellBackgroundImage = safeThemeAssetUrl(activeThemePlugin?.assets?.appBackgroundImage);
  const shellBackgroundVideo = safeThemeVideoUrl(activeThemePlugin?.assets?.appBackgroundVideo);
  const backgroundScene = activeThemePlugin?.layout?.backgroundScene;
  const themeTuning = themeVisualTuning(activeThemePlugin);
  const petImage = safeThemeAssetUrl(activeThemePlugin?.assets?.petImage);
  const showThemePet = Boolean(petImage && activeThemePlugin?.layout?.petEnabled !== false);

  const usePromptSuggestion = useCallback((text: string) => {
    setWelcomeDismissed(true);
    setComposerSuggestion({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text });
  }, []);

  function renderCenterPanel() {
    return (
      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          height: { md: "100%" },
          display: "grid",
          gridTemplateRows: { xs: "auto auto minmax(360px, 1fr) auto", md: "auto minmax(0, 1fr) auto" },
          borderInline: { xs: 0, md: "1px solid" },
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.default, themeTuning.workspaceSurfaceOpacity),
          backdropFilter: `blur(${themeTuning.blurStrength}px)`,
          zIndex: 1,
          position: "relative"
        }}
      >
        {state.engine.phase === "starting" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">{t("app.engineStarting")}</Typography>
          </Box>
        )}
        {workspaceSelectionPending && !state.activeThreadId && (
          <Box
            data-testid="workspace-selection-panel"
            sx={{
              m: { xs: 1, sm: 1.5 },
              p: { xs: 1.5, sm: 2 },
              border: "1px solid",
              borderColor: "primary.main",
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.08)
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                <FolderOpenIcon color="primary" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                    {t("workspace.title")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("workspace.description")}
                  </Typography>
                </Box>
              </Stack>
              <TextField
                size="small"
                label={t("workspace.label")}
                value={cwd}
                onChange={(event) => setCwd(event.target.value)}
                sx={{ minWidth: { xs: "100%", md: 320 } }}
              />
              <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={openWorkspacePicker}>
                {t("workspace.browse")}
              </Button>
              <Button variant="contained" onClick={confirmWorkspaceSelection}>
                {t("workspace.use")}
              </Button>
            </Stack>
          </Box>
        )}
        <ChatPanel
          turns={allTurns}
          threads={historyThreads}
          activeThreadId={state.activeThreadId}
          errors={state.errors}
          goal={activeGoal}
          slashNotice={slashNotice}
          stats={statsState}
          requestMonitor={requestMonitor}
          statsOpen={Boolean(statsPanelScope)}
          modes={modeState}
          activeThemePlugin={activeThemePlugin}
          welcomeDismissed={welcomeDismissed}
          t={t}
          onPromptSelect={usePromptSuggestion}
          onAgentThreadSelect={(threadId) => void loadThreadIntoCache(threadId)}
          onStatsClose={() => setStatsPanelScope(null)}
          onSlashNoticeClose={() => setSlashNotice(null)}
          onGoalEdit={() => setComposerSuggestion({ id: `goal-edit-${Date.now()}`, text: activeGoal ? `/goal ${activeGoal.objective}` : "/goal " })}
          onGoalStatusChange={(status) => void setActiveGoalStatus(status)}
          onGoalClear={() => void clearActiveGoal()}
        />
        {showThemePet && (
          <Box
            data-testid="theme-pet-dock"
            sx={{
              position: "absolute",
              right: { xs: 14, sm: 22 },
              bottom: { xs: 220, sm: 246 },
              width: { xs: 74, sm: 104 },
              aspectRatio: "1 / 1",
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.panelSurfaceOpacity),
              boxShadow: (theme) => theme.customShadows?.z8,
              pointerEvents: "none",
              display: { xs: "none", sm: "block" },
              zIndex: 2
            }}
          >
            <Box component="img" src={petImage ?? ""} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </Box>
        )}
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.panelSurfaceOpacity)
          }}
        >
          <Composer
            cwd={cwd}
            permission={permission}
            disabled={!state.connected || state.engine.phase !== "ready"}
            sendBlockedReason={
              workspaceSelectionPending && !state.activeThreadId
                ? t("workspace.required")
                : !state.connected || state.engine.phase !== "ready"
                  ? t("engine.notReady")
                  : undefined
            }
            pendingMention={pendingMention}
            suggestedPrompt={composerSuggestion}
            activeThemePlugin={activeThemePlugin}
            t={t}
            modeBadges={modeState}
            dangerBypassConfirmed={dangerBypassConfirmed}
            onMentionConsumed={() => setPendingMention(null)}
            onUserActivity={() => setWelcomeDismissed(true)}
            onSuggestedPromptConsumed={() => setComposerSuggestion(null)}
            onSend={(text, images, mentions) => void sendPrompt(text, images, mentions)}
          />
        </Box>
      </Box>
    );
  }

  function renderSideChatPanel() {
    return (
      <SideChatPanel
        tabs={sideChatTabs}
        activeTabId={activeSideChatId}
        turns={state.turns}
        models={composerModels}
        selectedModel={selectedModel}
        reasoningLabel={selectedReasoning?.label ?? reasoningEffort}
        permissionLabel={sideChatPermissionLabel}
        connected={state.connected}
        engineReady={state.engine.phase === "ready"}
        error={sideChatError}
        onTabChange={setActiveSideChatId}
        onAddTab={addSideChatTab}
        onCloseTab={closeSideChatTab}
        onClosePanel={() => setRightWorkspaceVisible(false)}
        onDraftChange={changeSideChatDraft}
        onSend={(tabId, text) => void sendSideChatPrompt(tabId, text)}
      />
    );
  }

  function renderRightWorkspacePanel() {
    return (
      <RightWorkspacePanel
        activeTab={rightWorkspaceTab}
        sideChat={renderSideChatPanel()}
        cwd={cwd}
        terminalSessions={terminalSessions}
        onTabChange={setRightWorkspaceTab}
        onClose={() => setRightWorkspaceVisible(false)}
        onRunTerminalCommand={(command, commandCwd, size) => void runTerminalCommand(command, commandCwd, size)}
        onWriteTerminalInput={(processId, input) => void writeTerminalInput(processId, input)}
        onTerminateTerminal={(processId) => void terminateTerminal(processId)}
        onResizeTerminal={(processId, size) => void resizeTerminal(processId, size)}
      />
    );
  }

  const statusColor =
    state.engine.phase === "ready" ? "success" : state.engine.phase === "error" ? "error" : "warning";
  const sideChatThreadIds = new Set(sideChatTabs.map((tab) => tab.threadId).filter((threadId): threadId is string => Boolean(threadId)));
  const historyThreads = state.threads;
  const mainThreads = historyThreads.filter((thread) => !sideChatThreadIds.has(thread.id) && !thread.parentThreadId);
  const allTurns = state.turns;
  const activeGoal = state.activeThreadId ? threadGoals[state.activeThreadId] ?? null : null;
  const modeState: WorkbenchModeState = {
    fast: fastModeEnabled,
    plan: planModeEnabled,
    goalActive: Boolean(activeGoal)
  };
  const taskTabs = mainThreads.slice(0, 12);
  const reasoningIndex = Math.max(0, reasoningOptions.findIndex((option) => option.value === reasoningEffort));
  const selectedReasoning = reasoningOptions[reasoningIndex] ?? reasoningOptions[0];
  const reasoningMax = Math.max(0, reasoningOptions.length - 1);
  const showReasoningGlow = reasoningIndex === reasoningMax && reasoningMax > 0;
  const sideChatPermissionLabel = permission === "dangerBypass" ? "Bypass approvals" : "Ask for approval";
  const effectiveSelectedModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
  const activeProvider = state.providers.find((provider) => provider.id === activeProviderId);
  const activeProviderLabel = activeProvider?.name ?? activeProvider?.id ?? t("app.defaultRelay");
  const permissionLabel = permissionPresets.find((preset) => preset.id === permission)?.label ?? permission;
  const activeThreadTurns = state.activeThreadId ? allTurns.filter((turn) => turn.threadId === state.activeThreadId) : [];
  const activeThreadUsage = state.activeThreadId ? threadTokenUsage[state.activeThreadId] : undefined;
  const projectUsage = sumTokenBreakdowns(Object.values(threadTokenUsage).map((usage) => usage.total));
  const requestMonitor = buildRequestMonitorEntries(allTurns, historyThreads, threadTokenUsage);
  const statsState: WorkbenchStatsState = {
    scope: statsPanelScope ?? "status",
    activeThreadId: state.activeThreadId,
    model: effectiveSelectedModel,
    provider: activeProviderLabel,
    reasoningEffort: fastModeEnabled ? `${reasoningLabel(fastReasoningEffort(reasoningOptions, reasoningEffort))} (Fast)` : reasoningLabel(reasoningEffort),
    permissionLabel,
    sessionTurns: activeThreadTurns.length,
    sessionItems: activeThreadTurns.reduce((total, turn) => total + turn.items.length, 0),
    projectThreads: historyThreads.length,
    projectTurns: allTurns.length,
    threadUsage: activeThreadUsage,
    projectUsage,
    goal: activeGoal,
    modes: modeState
  };
  const dangerBackendPreview = buildDangerBackendPreview(cwd, effectiveSelectedModel, reasoningEffort);
  const dangerDialogPreset = permissionPresets.find((preset) => preset.id === dangerDialogIntent?.nextPermission);
  const workspacePickerEntries = fileDirectories[workspacePickerPath] ?? [];
  const workspacePickerFolders = workspacePickerEntries.filter((entry) => entry.isDirectory);
  const workspacePickerParent = parentWorkspacePath(workspacePickerPath);

  return (
    <Box
      sx={{
        height: "100dvh",
        maxHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "56px minmax(0, 1fr)",
        gap: { xs: 1, sm: 1.25, lg: 1.5 },
        p: { xs: 1, sm: 1.5, lg: 2.5 },
        position: "relative",
        bgcolor: "background.default",
        overflow: "hidden"
      }}
    >
      {(shellBackgroundImage || shellBackgroundVideo || backgroundScene) && (
        <ThemeBackgroundMedia imageUrl={shellBackgroundImage} videoUrl={shellBackgroundVideo} scene={backgroundScene} tuning={themeTuning} />
      )}
      <Box
        data-testid="theme-background-effects"
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backdropFilter: themeTuning.effectsLayerOpacity > 0 ? `blur(${themeTuning.blurStrength * themeTuning.effectsLayerOpacity}px)` : "none",
          background: (theme) =>
            [
              `radial-gradient(ellipse at top right, ${alpha(themeTuning.toneColor, themeTuning.toneOpacity)}, transparent 68%)`,
              `linear-gradient(135deg, ${alpha(theme.palette.background.default, themeTuning.backgroundOverlayOpacity)}, ${alpha(theme.palette.background.default, Math.max(0, themeTuning.backgroundOverlayOpacity - 0.05))})`
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
          bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.panelSurfaceOpacity),
          backdropFilter: `blur(${themeTuning.blurStrength}px)`,
          boxShadow: (theme) => theme.customShadows?.z8
        }}
      >
        <Toolbar variant="dense" sx={{ gap: { xs: 0.75, sm: 1 }, minHeight: 54, px: { xs: 1, sm: 1.5, lg: 2 }, overflow: "hidden" }}>
          <PlayArrowIcon color="primary" sx={{ display: { xs: "none", sm: "block" } }} />
          <Typography component="h1" variant="h6" sx={{ fontSize: 17, fontWeight: 800, display: { xs: "none", sm: "block" } }}>
            {t("app.title")}
          </Typography>
          <FormControl size="small" sx={{ minWidth: { xs: 148, sm: 236 }, maxWidth: { xs: 160, sm: 320 } }}>
            <Select
              value={selectedModel}
              displayEmpty
              inputProps={{ "aria-label": t("app.model") }}
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
          <Tooltip title={t("app.reasoningStrength")}>
            <Button
              size="small"
              variant={showReasoningGlow ? "contained" : "outlined"}
              startIcon={<TuneIcon />}
              aria-label={t("app.reasoningStrength")}
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
          <Tooltip title={t("app.currentRelay", { provider: activeProviderLabel })}>
            <Chip
              size="small"
              icon={<CloudQueueIcon />}
              label={activeProvider ? activeProvider.name : t("app.defaultRelay")}
              data-testid="topbar-provider-chip"
              sx={{
                maxWidth: { xs: 130, sm: 220, lg: 280 },
                display: { xs: "none", sm: "inline-flex" },
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              }}
            />
          </Tooltip>
          {fastModeEnabled && (
            <Tooltip title={t("app.fastTooltip", { effort: reasoningLabel(fastReasoningEffort(reasoningOptions, reasoningEffort)) })}>
              <Chip
                size="small"
                color="warning"
                icon={<BoltIcon />}
                label={t("app.fast")}
                data-testid="topbar-fast-badge"
                sx={{ display: { xs: "none", sm: "inline-flex" }, fontWeight: 800 }}
              />
            </Tooltip>
          )}
          {planModeEnabled && (
            <Tooltip title={t("app.planTooltip")}>
              <Chip
                size="small"
                color="primary"
                icon={<ChecklistIcon />}
                label={t("app.plan")}
                data-testid="topbar-plan-badge"
                sx={{ display: { xs: "none", sm: "inline-flex" }, fontWeight: 800 }}
              />
            </Tooltip>
          )}
          <Box sx={{ display: { xs: "none", lg: "block" }, flex: "0 0 auto" }}>
            <NewChatButton currentPermission={permission} t={t} onNew={requestNewSession} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          <Box sx={{ display: { xs: "none", md: "contents" } }}>
            <Tooltip title={leftPanelVisible ? t("app.hideHistory") : t("app.showHistory")}>
              <IconButton size="small" onClick={() => setLeftPanelVisible((visible) => !visible)}>
                <ViewSidebarIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Tooltip title={rightWorkspaceVisible ? t("app.hideWorkspace") : t("app.openWorkspace")}>
            <IconButton
              size="small"
              onClick={() => {
                setRightWorkspaceTab("sidechat");
                setRightWorkspaceVisible((visible) => !visible);
              }}
              aria-label={rightWorkspaceVisible ? t("app.hideWorkspace") : t("app.openWorkspace")}
              color={rightWorkspaceVisible ? "primary" : "default"}
            >
              <ViewColumnIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {permission === "dangerBypass" && dangerBypassConfirmed && (
            <Tooltip title="sandbox: danger-full-access · approvalPolicy: never">
              <Chip
                data-testid="danger-session-badge"
                size="small"
                color="error"
                icon={<WarningAmberIcon />}
                label={t("app.fullAuto")}
                sx={{ display: { xs: "none", sm: "inline-flex" }, fontWeight: 800 }}
              />
            </Tooltip>
          )}
          <Tooltip title={t("app.sessionStats")}>
            <IconButton size="small" onClick={() => setStatsPanelScope("status")} aria-label={t("app.sessionStats")}>
              <AssessmentIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <FormControl size="small" sx={{ minWidth: { xs: 74, sm: 96 }, display: { xs: "none", sm: "inline-flex" } }}>
            <Select
              value={locale}
              inputProps={{ "aria-label": t("app.language") }}
              onChange={(event) => setLocale(event.target.value as Locale)}
              sx={{ "& .MuiSelect-select": { py: 0.55, fontSize: 13, fontWeight: 750 } }}
            >
              {localeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip size="small" color={statusColor} label={state.engine.phase} sx={{ display: { xs: "none", sm: "inline-flex" } }} />
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", lg: "block" } }}>
            {state.engine.codexVersion ?? state.engine.message ?? t("app.initializing")}
          </Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => void loadBasics()} sx={{ display: { xs: "none", md: "inline-flex" } }}>
            {t("app.refresh")}
          </Button>
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
          bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.workspaceSurfaceOpacity),
          backdropFilter: `blur(${themeTuning.blurStrength}px)`,
          boxShadow: (theme) => theme.customShadows?.card,
          zIndex: 1
        }}
        data-testid="workbench-shell"
      >
        <Box
          role="tablist"
          aria-label={t("app.taskTabs")}
          sx={{
            display: "flex",
            alignItems: "stretch",
            gap: 0.75,
            overflowX: "auto",
            overflowY: "hidden",
            px: { xs: 1, sm: 1.5 },
            bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.panelSurfaceOpacity),
            borderBottom: "1px solid",
            borderColor: "divider"
          }}
        >
          <Tooltip title={t("app.newTask")}>
            <Button
              role="tab"
              aria-label={t("app.newTask")}
              aria-selected={state.activeThreadId === null || dangerDialogIntent?.source === "new-chat"}
              size="small"
              onClick={() => requestNewSession(permission)}
              sx={{
                my: 0.625,
                px: 0,
                minWidth: 36,
                width: 36,
                flex: "0 0 auto",
                borderRadius: 1.5,
                color: (state.activeThreadId === null || dangerDialogIntent?.source === "new-chat") ? "primary.main" : "text.secondary",
                bgcolor: (state.activeThreadId === null || dangerDialogIntent?.source === "new-chat") ? "action.selected" : "transparent",
                border: "1px solid",
                borderColor: (state.activeThreadId === null || dangerDialogIntent?.source === "new-chat") ? "primary.main" : "transparent"
              }}
            >
              <AddIcon fontSize="small" />
            </Button>
          </Tooltip>
          {taskTabs.map((thread) => {
            const active = state.activeThreadId === thread.id && dangerDialogIntent?.source !== "new-chat";
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
                      threads={mainThreads}
                      activeThreadId={state.activeThreadId}
                      providerLabel={activeProviderLabel}
                      installAvailable={Boolean(installPromptEvent) && !appInstalled}
                      t={t}
                      onSelect={(threadId) => selectTaskTab(threadId)}
                      onInstallApp={() => void handleInstallApp()}
                      onOpenSettings={() => openSettings("codex")}
                    />
                  </Box>
                </Panel>
                <ResizeHandle />
              </>
            )}
            <Panel
              id="chat"
              defaultSize={rightWorkspaceVisible ? "52%" : "80%"}
              minSize="28%"
            >
              {renderCenterPanel()}
            </Panel>
            {rightWorkspaceVisible && (
              <>
                <ResizeHandle />
                <Panel id="right-workspace" defaultSize="32%" minSize="24%" maxSize="56%">
                  {renderRightWorkspacePanel()}
                </Panel>
              </>
            )}
          </PanelGroup>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateRows: "auto auto auto", minHeight: 0 }}>
            {leftPanelVisible && (
              <HistorySidebar
                threads={mainThreads}
                activeThreadId={state.activeThreadId}
                providerLabel={activeProviderLabel}
                installAvailable={Boolean(installPromptEvent) && !appInstalled}
                t={t}
                onSelect={(threadId) => selectTaskTab(threadId)}
                onInstallApp={() => void handleInstallApp()}
                onOpenSettings={() => openSettings("codex")}
              />
            )}
            {renderCenterPanel()}
            {rightWorkspaceVisible && <Box sx={{ minHeight: 560, height: "72vh" }}>{renderRightWorkspacePanel()}</Box>}
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
                {t("app.reasoningStrength")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("app.reasoningSentAs")}
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
            {selectedReasoning?.description ?? t("app.reasoningDescription")}
          </Typography>
        </Stack>
      </Popover>
      <Dialog
        data-testid="workspace-folder-picker-dialog"
        open={workspacePickerOpen}
        onClose={() => setWorkspacePickerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <FolderOpenIcon color="primary" />
            <Box sx={{ minWidth: 0 }}>
              <Typography component="span" variant="h6" sx={{ fontWeight: 850 }}>
                {t("workspace.pickerTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("workspace.pickerSubtitle")}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label={t("workspace.currentFolder")}
              value={workspacePickerPath}
              onChange={(event) => setWorkspacePickerPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void readDirectory(workspacePickerPath);
                }
              }}
              fullWidth
              inputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 } }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={() => setWorkspacePickerPath("/root")}>
                {t("workspace.home")}
              </Button>
              <Button size="small" variant="outlined" onClick={() => setWorkspacePickerPath("/root/projects")}>
                {t("workspace.projects")}
              </Button>
              <Button size="small" variant="outlined" disabled={!workspacePickerParent} onClick={() => workspacePickerParent && setWorkspacePickerPath(workspacePickerParent)}>
                {t("workspace.parent")}
              </Button>
              <Button size="small" variant="text" onClick={() => void readDirectory(workspacePickerPath)}>
                {t("app.refresh")}
              </Button>
            </Stack>
            <Box
              sx={{
                minHeight: 220,
                maxHeight: 360,
                overflow: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.default",
                p: 0.75
              }}
            >
              {workspacePickerFolders.length > 0 ? (
                <Stack spacing={0.5}>
                  {workspacePickerFolders.map((entry) => (
                    <Button
                      key={entry.path}
                      data-testid={`workspace-folder-option-${sanitizeDomId(entry.path)}`}
                      variant="text"
                      color="inherit"
                      startIcon={<FolderOpenIcon />}
                      onClick={() => setWorkspacePickerPath(entry.path)}
                      sx={{
                        justifyContent: "flex-start",
                        px: 1,
                        fontWeight: 700,
                        "& .MuiButton-startIcon": { color: "primary.main" }
                      }}
                    >
                      <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.name}
                      </Box>
                    </Button>
                  ))}
                </Stack>
              ) : (
                <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ minHeight: 200, textAlign: "center", color: "text.secondary" }}>
                  <FolderOpenIcon />
                  <Typography variant="body2">{t("workspace.noFolders")}</Typography>
                  <Button size="small" onClick={() => void readDirectory(workspacePickerPath)}>
                    {t("workspace.loadFolders")}
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkspacePickerOpen(false)}>{t("workspace.cancel")}</Button>
          <Button
            variant="contained"
            onClick={() => {
              setCwd(workspacePickerPath);
              setWorkspacePickerOpen(false);
            }}
          >
            {t("workspace.useFolder")}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        data-testid="danger-new-chat-dialog"
        open={Boolean(dangerDialogIntent)}
        onClose={closeDangerDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberIcon color="error" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="span" variant="h6" sx={{ fontWeight: 850 }}>
                Create Full Auto chat
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Full Access / Danger Bypass
              </Typography>
            </Box>
            <Chip size="small" color="error" label="Danger" />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="error">
              This chat will run without sandbox boundaries and without approval prompts. Use it only for trusted workspaces.
            </Alert>
            <Box
              data-testid="danger-new-chat-details"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "150px minmax(0, 1fr)" },
                gap: 1.25,
                alignItems: "center"
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Current cwd
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ minWidth: 0 }}>
                <TextField
                  size="small"
                  label={t("workspace.label")}
                  value={cwd}
                  onChange={(event) => setCwd(event.target.value)}
                  sx={{ flex: 1, minWidth: 0 }}
                  inputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 } }}
                />
                <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={openWorkspacePicker}>
                  {t("workspace.browse")}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Model
              </Typography>
              <Typography sx={{ overflowWrap: "anywhere" }}>{effectiveSelectedModel || "Engine default"}</Typography>
              <Typography variant="caption" color="text.secondary">
                Reasoning
              </Typography>
              <Typography>{selectedReasoning?.label ?? reasoningEffort}</Typography>
              <Typography variant="caption" color="text.secondary">
                Actual permissions
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="error" label="No sandbox boundary" />
                <Chip size="small" color="error" label="No approval prompts" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Selected preset
              </Typography>
              <Typography>{dangerDialogPreset?.label ?? dangerDialogIntent?.nextPermission ?? "Danger Bypass"}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
                Backend parameters
              </Typography>
              <Typography
                component="pre"
                data-testid="danger-backend-params"
                sx={{
                  m: 0,
                  p: 1.25,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12
                }}
              >
                {JSON.stringify(dangerBackendPreview, null, 2)}
              </Typography>
              <Typography
                component="code"
                sx={{
                  display: "block",
                  mt: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                  color: "error.main",
                  overflowWrap: "anywhere"
                }}
              >
                codex --dangerously-bypass-approvals-and-sandbox
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={dangerDialogAcknowledged}
                  onChange={(event) => setDangerDialogAcknowledged(event.target.checked)}
                  inputProps={{ "aria-label": "Confirm Danger Bypass" }}
                />
              }
              label="I trust this workspace and allow this chat to run in Full Auto mode."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDangerDialog}>Cancel</Button>
          <Button color="inherit" onClick={useSaferModeFromDangerDialog}>
            Use Safer Mode
          </Button>
          <Button variant="contained" color="error" disabled={!dangerDialogAcknowledged} onClick={confirmDangerDialog}>
            Create Full Auto Chat
          </Button>
        </DialogActions>
      </Dialog>
      <SettingsDrawer
        open={settingsOpen}
        initialSection={settingsSection}
        initialPluginTab={settingsPluginTab}
        themeMode={themeMode}
        installedThemePluginIds={installedThemePluginIds}
        customThemePlugins={customThemePlugins}
        leftPanelVisible={leftPanelVisible}
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
        tooling={state.tooling}
        toolingLoading={state.toolingLoading}
        skillExtraRoots={skillExtraRoots}
        skillPreviews={skillPreviews}
        fileDirectories={fileDirectories}
        openFile={openFile}
        filesPanelLayout={filesPanelLayout}
        activeThreadId={state.activeThreadId}
        pluginDetails={pluginDetails}
        pluginSkillPreviews={pluginSkillPreviews}
        pluginAuthNotices={pluginAuthNotices}
        mcpResourceContents={mcpResourceContents}
        mcpOauthUrls={mcpOauthUrls}
        auditEvents={auditEvents}
        t={t}
        onClose={() => setSettingsOpen(false)}
        onThemeModeChange={onThemeModeChange}
        onInstallThemePlugin={installThemePlugin}
        onUninstallThemePlugin={uninstallThemePlugin}
        onSaveCustomThemePlugin={saveCustomThemePlugin}
        onRemoveCustomThemePlugin={removeCustomThemePlugin}
        onLeftPanelVisibleChange={setLeftPanelVisible}
        onPetDockEnabledChange={setPetDockEnabled}
        onCwdChange={setCwd}
        onPermissionChange={requestPermissionChange}
        onReasoningEffortChange={setReasoningEffort}
        onReloadCodexConfig={() => void loadCodexConfig()}
        onCodexConfigFieldChange={(field, value) => void writeCodexConfigField(field, value)}
        onCodexConfigValueChange={(keyPath, value) => void writeCodexConfigValue(keyPath, value)}
        onSaveProvider={saveProvider}
        onActivateProvider={activateProvider}
        onDeleteProvider={deleteProvider}
        onReloadTooling={() => void loadTooling({ forceSkillReload: true })}
        onReloadMcp={() => void reloadMcp()}
        onExportProfile={() => downloadProfile()}
        onImportProfile={(file) => uploadProfile(file)}
        onReloadAuditEvents={() => loadAuditEvents()}
        onStartMcpOauth={(serverName) => void startMcpOauth(serverName)}
        onReadMcpResource={(serverName, uri) => void readMcpResource(serverName, uri)}
        onCallMcpTool={(serverName, toolName, args) => callMcpTool(serverName, toolName, args)}
        onToggleSkill={(skill, enabled) => void toggleSkill(skill, enabled)}
        onSaveSkillExtraRoots={(roots) => void saveSkillExtraRoots(roots)}
        onReadSkillPreview={(skill) => void readSkillPreview(skill)}
        onFilesPanelLayoutChange={(layout) => {
          setFilesPanelLayout(layout);
          localStorage.setItem(UI_STORAGE_KEYS.filesPanelLayout, JSON.stringify(layout));
        }}
        onReadDirectory={(path) => void readDirectory(path)}
        onReadFile={(path) => void readFile(path)}
        onChangeOpenFileContent={changeOpenFileContent}
        onSaveOpenFile={() => void saveOpenFile()}
        onReadPluginDetail={(marketplace, plugin) => void readPluginDetail(marketplace, plugin)}
        onReadPluginSkill={(marketplace, plugin, skillName) => void readPluginSkill(marketplace, plugin, skillName)}
        onInsertPluginMention={insertPluginMention}
        onInstallPlugin={(marketplace, plugin) => void installPlugin(marketplace, plugin)}
        onUninstallPlugin={(plugin) => void uninstallPlugin(plugin)}
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

function parseComposerSlashCommand(
  text: string,
  images: ComposerImageAttachment[],
  mentions: ComposerMention[]
): ComposerSlashCommand | null {
  if (images.length > 0 || mentions.length > 0) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  const match = /^\/([a-zA-Z][\w-]*)(?:\s+([\s\S]*))?$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const name = match[1]?.toLowerCase() ?? "";
  const rest = match[2]?.trim() ?? "";
  switch (name) {
    case "new":
      return { type: "new", permission: parseNewChatPermission(rest) };
    case "resume":
      return { type: "resume", threadId: rest || undefined };
    case "rename":
      return { type: "rename", name: rest };
    case "review": {
      const review = parseReviewCommand(rest);
      return { type: "review", target: review.target, delivery: review.delivery };
    }
    case "diff":
      return { type: "diff" };
    case "compact":
      return { type: "compact" };
    case "plugins":
      return { type: "settings", section: "plugins", pluginTab: "marketplace" };
    case "mcp":
      return rest.toLowerCase() === "verbose"
        ? { type: "settings", section: "plugins", pluginTab: "mcp" }
        : { type: "settings", section: "plugins", pluginTab: "mcp" };
    case "hooks":
      return { type: "settings", section: "plugins", pluginTab: "hooks" };
    case "apps":
      return { type: "settings", section: "plugins", pluginTab: "apps" };
    case "skills":
      return { type: "settings", section: "skills" };
    case "model":
    case "permissions":
    case "debug-config":
      return { type: "settings", section: "codex" };
    case "theme":
      return { type: "settings", section: "appearance" };
    case "pets":
    case "pet":
      return { type: "settings", section: "pet" };
    case "title":
    case "statusline":
      return { type: "settings", section: "layout" };
    case "fast":
      return { type: "fast", enabled: parseOptionalBoolean(rest) };
    case "status":
      return { type: "stats", scope: "status" };
    case "stats":
    case "usage":
      return { type: "stats", scope: "stats" };
    case "goal": {
      const normalized = rest.toLowerCase();
      if (!rest) {
        return { type: "goal", action: "show", objective: "" };
      }
      if (normalized === "clear") {
        return { type: "goal", action: "clear", objective: "" };
      }
      if (normalized === "pause") {
        return { type: "goal", action: "pause", objective: "" };
      }
      if (normalized === "resume") {
        return { type: "goal", action: "resume", objective: "" };
      }
      if (normalized === "complete" || normalized === "done") {
        return { type: "goal", action: "complete", objective: "" };
      }
      if (normalized === "edit") {
        return { type: "goal", action: "edit", objective: "" };
      }
      return { type: "goal", action: "set", objective: rest };
    }
    case "plan":
      if (!rest) {
        return { type: "plan", enabled: true };
      }
      if (["off", "disable", "disabled"].includes(rest.toLowerCase())) {
        return { type: "plan", enabled: false };
      }
      return { type: "plan", enabled: true, prompt: rest };
    default:
      return null;
  }
}

function parseOptionalBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["on", "true", "enable", "enabled"].includes(normalized)) {
    return true;
  }
  if (["off", "false", "disable", "disabled"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseNewChatPermission(value: string): PermissionPresetId | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["read", "readonly", "read-only", "safe"].includes(normalized)) {
    return "readonlyAsk";
  }
  if (["workspace", "default", "ask"].includes(normalized)) {
    return "workspaceAsk";
  }
  if (["full", "full-access", "fullask"].includes(normalized)) {
    return "fullAsk";
  }
  if (["danger", "bypass", "full-auto", "danger-bypass"].includes(normalized)) {
    return "dangerBypass";
  }
  return undefined;
}

function parseReviewCommand(value: string): { target: JsonValue; delivery: "inline" | "detached" } {
  let rest = value.trim();
  let delivery: "inline" | "detached" = "inline";
  const detachedPrefix = /^(--detached|-d|detached)\b/i.exec(rest);
  if (detachedPrefix) {
    delivery = "detached";
    rest = rest.slice(detachedPrefix[0].length).trim();
  }
  const normalized = rest.toLowerCase();
  if (!rest || ["changes", "uncommitted", "uncommitted changes"].includes(normalized)) {
    return { target: { type: "uncommittedChanges" }, delivery };
  }
  const branch = /^(?:branch|base|base-branch)\s+(.+)$/i.exec(rest);
  if (branch?.[1]?.trim()) {
    return { target: { type: "baseBranch", branch: branch[1].trim() }, delivery };
  }
  const commit = /^commit\s+([0-9a-fA-F]{6,64})(?:\s+(.+))?$/i.exec(rest);
  if (commit?.[1]) {
    return { target: { type: "commit", sha: commit[1], title: commit[2]?.trim() || null }, delivery };
  }
  return { target: { type: "custom", instructions: rest }, delivery };
}

function reviewTargetLabel(target: JsonValue): string {
  const record = asRecord(target);
  switch (record.type) {
    case "baseBranch":
      return `Review against ${stringValue(record.branch) ?? "base branch"}`;
    case "commit":
      return `Review commit ${stringValue(record.sha) ?? ""}`.trim();
    case "custom":
      return stringValue(record.instructions) ?? "Custom review";
    default:
      return "Review uncommitted changes";
  }
}

function formatDiffNotice(sha: string | undefined, diff: string): string {
  const header = sha ? `Remote base: ${sha}` : "Remote base unavailable";
  const trimmed = diff.trim();
  if (!trimmed) {
    return `${header}\nNo diff returned.`;
  }
  const maxLength = 1800;
  const preview = trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}\n...diff truncated in UI...` : trimmed;
  return `${header}\n${preview}`;
}

function renameThreadEntry(threads: ClientState["threads"], threadId: string, name: string): ClientState["threads"] {
  const updatedAt = Math.floor(Date.now() / 1000);
  const found = threads.some((thread) => thread.id === threadId);
  if (!found) {
    return [{ id: threadId, preview: name, updatedAt, status: "idle" }, ...threads];
  }
  return threads.map((thread) => (thread.id === threadId ? { ...thread, preview: name, updatedAt } : thread));
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseGoal(goal: Record<string, unknown>): GoalBannerState | null {
  const threadId = stringValue(goal.threadId);
  const objective = stringValue(goal.objective);
  if (!threadId || !objective) {
    return null;
  }
  return {
    threadId,
    objective,
    status: parseGoalStatus(goal.status),
    tokenBudget: numberValue(goal.tokenBudget) ?? null,
    tokensUsed: numberValue(goal.tokensUsed),
    timeUsedSeconds: numberValue(goal.timeUsedSeconds)
  };
}

function parseGoalStatus(value: unknown): GoalStatus {
  switch (value) {
    case "active":
    case "paused":
    case "blocked":
    case "usageLimited":
    case "budgetLimited":
    case "complete":
      return value;
    default:
      return "active";
  }
}

function buildLocalGoal(threadId: string, objective: string, status: GoalStatus, existing?: GoalBannerState): GoalBannerState {
  return {
    threadId,
    objective,
    status,
    tokenBudget: existing?.tokenBudget ?? null,
    tokensUsed: existing?.tokensUsed ?? 0,
    timeUsedSeconds: existing?.timeUsedSeconds ?? 0
  };
}

function parseThreadTokenUsage(value: unknown): ThreadTokenUsageState | null {
  const usage = asRecord(value);
  const total = parseTokenBreakdown(usage.total);
  const last = parseTokenBreakdown(usage.last);
  if (!total || !last) {
    return null;
  }
  return {
    total,
    last,
    modelContextWindow: numberValue(usage.modelContextWindow) ?? null
  };
}

function parseTokenBreakdown(value: unknown): TokenUsageBreakdown | null {
  const record = asRecord(value);
  const totalTokens = numberValue(record.totalTokens);
  if (totalTokens == null) {
    return null;
  }
  return {
    totalTokens,
    inputTokens: numberValue(record.inputTokens) ?? 0,
    cachedInputTokens: numberValue(record.cachedInputTokens) ?? 0,
    cacheWriteInputTokens: numberValue(record.cacheWriteInputTokens) ?? 0,
    outputTokens: numberValue(record.outputTokens) ?? 0,
    reasoningOutputTokens: numberValue(record.reasoningOutputTokens) ?? 0
  };
}

function sumTokenBreakdowns(values: TokenUsageBreakdown[]): TokenUsageBreakdown | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce<TokenUsageBreakdown>(
    (total, usage) => ({
      totalTokens: total.totalTokens + usage.totalTokens,
      inputTokens: total.inputTokens + usage.inputTokens,
      cachedInputTokens: total.cachedInputTokens + usage.cachedInputTokens,
      cacheWriteInputTokens: total.cacheWriteInputTokens + usage.cacheWriteInputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      reasoningOutputTokens: total.reasoningOutputTokens + usage.reasoningOutputTokens
    }),
    {
      totalTokens: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0
    }
  );
}

function fastReasoningEffort(options: ReasoningOption[], current: string): string {
  return options[0]?.value ?? (current === "minimal" ? "minimal" : "low");
}

function normalizeThreads(value: unknown[]): ClientState["threads"] {
  return value
    .map((entry) => asRecord(entry))
    .map((entry) => ({
      id: String(entry.id ?? ""),
      preview: typeof entry.preview === "string" ? entry.preview : undefined,
      model: typeof entry.model === "string" ? entry.model : undefined,
      modelProvider: typeof entry.modelProvider === "string" ? entry.modelProvider : undefined,
      parentThreadId: typeof entry.parentThreadId === "string" ? entry.parentThreadId : undefined,
      agentNickname: typeof entry.agentNickname === "string" ? entry.agentNickname : undefined,
      agentRole: typeof entry.agentRole === "string" ? entry.agentRole : undefined,
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
  return `${scope}: ${formatErrorText(error)}`;
}

function isThreadNotFoundError(error: unknown): boolean {
  const message = formatErrorText(error).toLowerCase();
  return message.includes("thread not found");
}

function formatErrorText(error: unknown): string {
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
      if (value && typeof value === "object") {
        const nested = formatErrorText(value);
        if (nested && nested !== "[object Object]") {
          return nested;
        }
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

function buildDangerBackendPreview(cwd: string, model: string, effort: string): JsonValue {
  const threadStart: Record<string, JsonValue> = {
    cwd,
    sandbox: "danger-full-access",
    approvalPolicy: "never",
    sessionStartSource: "startup"
  };
  const turnStart: Record<string, JsonValue> = {
    cwd,
    sandboxPolicy: { type: "dangerFullAccess" },
    approvalPolicy: "never",
    effort
  };
  if (model) {
    threadStart.model = model;
    turnStart.model = model;
  }
  return {
    "thread/start": threadStart,
    "turn/start": turnStart,
    cli: "codex --dangerously-bypass-approvals-and-sandbox"
  };
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

function normalizeWorkspaceCwd(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "~") {
    return "/root";
  }
  if (trimmed.startsWith("~/")) {
    return `/root/${trimmed.slice(2)}`;
  }
  return trimmed;
}

function parentWorkspacePath(path: string): string | null {
  const normalized = normalizeWorkspaceCwd(path);
  if (!normalized || normalized === "/") {
    return null;
  }
  const withoutTrailingSlash = normalized.replace(/\/+$/, "");
  if (!withoutTrailingSlash || withoutTrailingSlash === "/") {
    return null;
  }
  const parent = withoutTrailingSlash.slice(0, withoutTrailingSlash.lastIndexOf("/")) || "/";
  return parent === withoutTrailingSlash ? null : parent;
}

function sanitizeDomId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "root";
}

function safeThemeAssetUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || /["'()\\]/.test(trimmed)) {
    return undefined;
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  return undefined;
}

function safeThemeVideoUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || /["'()\\]/.test(trimmed)) {
    return undefined;
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:video/")) {
    return trimmed;
  }
  return undefined;
}

function sideChatTitle(text: string, fallbackIndex: number): string {
  const title = text.replace(/\s+/g, " ").trim();
  if (!title) {
    return fallbackIndex <= 1 ? "Side chat" : `Side chat ${fallbackIndex}`;
  }
  return title.length > 28 ? `${title.slice(0, 27)}...` : title;
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

async function loadAllThreads(client: CodexSocketClient): Promise<ClientState["threads"]> {
  const threads: ClientState["threads"] = [];
  for (const archived of [false, true]) {
    let cursor: string | null = null;
    for (let guard = 0; guard < 32; guard += 1) {
      const response = await client.rpc("thread/list", {
        cursor,
        limit: 200,
        archived,
        sourceKinds: ["cli", "vscode", "exec", "appServer", "subAgent", "subAgentReview", "subAgentCompact", "subAgentThreadSpawn", "subAgentOther", "unknown"],
        useStateDbOnly: true
      });
      const record = asRecord(response);
      const batch = Array.isArray(record.data)
        ? normalizeThreads(record.data)
        : Array.isArray(record.threads)
          ? normalizeThreads(record.threads)
          : [];
      for (const thread of batch) {
        if (!threads.some((entry) => entry.id === thread.id)) {
          threads.push(thread);
        }
      }
      const nextCursor = typeof record.nextCursor === "string" ? record.nextCursor : null;
      if (!nextCursor || nextCursor === cursor) {
        break;
      }
      cursor = nextCursor;
    }
  }
  return threads.sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
}

function buildRequestMonitorEntries(
  turns: ClientState["turns"],
  threads: ClientState["threads"],
  tokenUsage: Record<string, ThreadTokenUsageState>
): RequestMonitorEntry[] {
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  return turns.slice(0, 24).map((turn) => {
    const thread = threadById.get(turn.threadId);
    const usage = tokenUsage[turn.threadId];
    return {
      id: turn.id,
      threadId: turn.threadId,
      title: thread?.preview || thread?.id || turn.id,
      source: threadSourceLabel(thread),
      status: turn.status,
      provider: thread?.modelProvider ?? "default",
      model: thread?.model ?? "Engine default",
      lastTokens: usage?.last,
      totalTokens: usage?.total
    };
  });
}

function threadSourceLabel(thread?: ClientState["threads"][number]): string {
  if (!thread) {
    return "unknown";
  }
  if (thread.parentThreadId) {
    return "agent";
  }
  if (thread.agentNickname || thread.agentRole) {
    return "sidechat";
  }
  return "main";
}
