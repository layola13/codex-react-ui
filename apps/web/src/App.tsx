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
  ToggleButton,
  ToggleButtonGroup,
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
  type AuthSession,
  type AuthUser,
  type DangerousPermissionAuditEvent,
  type JsonValue,
  type PermissionPresetId,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";
import {
  CodexSocketClient,
  editProviderImage,
  applyNotification,
  composerInputToUserInput,
  generateProviderImage,
  exportProfile,
  createMember,
  deleteMember,
  fetchAuditEvents,
  fetchProviders,
  fetchSessionToken,
  importProfile,
  initialClientState,
  listMembers,
  login,
  fetchPublicAuthConfig,
  fetchCaptcha,
  loginWith2fa,
  registerAccount,
  LoginRequiredError,
  allocateMemberBalance,
  updateMember,
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
import { HistorySidebar, type HistoryThreadUsageSummary } from "./components/HistorySidebar";
import { extractThreadIdSearch, filterHistoryThreads } from "./historySearch";
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
import { Composer, type ComposerWorkingStatus } from "./components/Composer";
import { NewChatButton } from "./components/NewChatButton";
import { SideChatPanel, type SideChatTab } from "./components/SideChatPanel";
import { ThemeBackgroundMedia } from "./components/ThemeBackgroundMedia";
import { RightWorkspacePanel, type RightWorkspaceTab } from "./components/RightWorkspacePanel";
import { SettingsDrawer, type ReasoningOption, type SettingsSectionId } from "./components/SettingsDrawer";
import { OfficialOpenAiLoginDialog } from "./components/OfficialOpenAiLoginDialog";
import { TopBarRelayTreeSelector } from "./components/TopBarRelayTreeSelector";
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
  showAssistantUsageDetails: "codex-react-ui.show-assistant-usage-details",
  includeAutomationHistory: "codex-react-ui.include-automation-history",
  petDockEnabled: "codex-react-ui.pet-dock-enabled",
  panelLayout: "codex-react-ui.panel-layout",
  filesPanelLayout: "codex-react-ui.files-panel-layout",
  settingAssistantProviderId: "codex-react-ui.setting-assistant-provider-id",
  settingAssistantModel: "codex-react-ui.setting-assistant-model",
  providerCachePrefix: "codex-react-ui.providers-cache"
} as const;

const DEFAULT_NEW_CHAT_CWD = "~/";
const DEFAULT_SSH_WORKSPACE_COMMAND = "ssh user@192.168.11.1";
const DEFAULT_SSH_WORKSPACE_CWD = "/home/user";
const CODEX_PROVIDER_TEST_PROMPT = "Reply with exactly: CODEX_RELAY_OK";
const DEFAULT_MODEL_RATES: NonNullable<ProviderConfig["modelRates"]> = [
  { model: "gpt-5.5", inputUsdPerMillion: 5, cachedInputUsdPerMillion: 0.5, cacheWriteUsdPerMillion: 5, outputUsdPerMillion: 30, multiplier: 1, inputMultiplier: 1, cacheReadMultiplier: 1, cacheWriteMultiplier: 1, outputMultiplier: 1 },
  { model: "gpt-5.4", inputUsdPerMillion: 2.5, cachedInputUsdPerMillion: 0.25, cacheWriteUsdPerMillion: 2.5, outputUsdPerMillion: 15, multiplier: 1, inputMultiplier: 1, cacheReadMultiplier: 1, cacheWriteMultiplier: 1, outputMultiplier: 1 },
  { model: "gpt-5.6-sol", inputUsdPerMillion: 5, cachedInputUsdPerMillion: 0.5, cacheWriteUsdPerMillion: 5, outputUsdPerMillion: 30, multiplier: 1, inputMultiplier: 1, cacheReadMultiplier: 1, cacheWriteMultiplier: 1, outputMultiplier: 1 }
];

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

type WorkspaceMode = "local" | "ssh";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

async function refreshPwaCache() {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await registration.update();
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

type ComposerSlashCommand =
  | { type: "fast"; enabled?: boolean }
  | { type: "stats"; scope: "status" | "stats" }
  | { type: "image"; mode: "generate" | "edit"; prompt: string }
  | { type: "webdev"; prompt: string }
  | { type: "goal"; action: "show" | "set" | "clear" | "pause" | "resume" | "complete" | "edit"; objective: string };

type SlashCommandNotice = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning";
};

type Action =
  | { type: "connected"; connected: boolean }
  | { type: "token"; token: string | null }
  | { type: "engine"; status: ClientState["engine"] }
  | { type: "account"; account: JsonValue }
  | { type: "models"; models: ClientState["models"] }
  | { type: "threads"; threads: ClientState["threads"] }
  | { type: "providers"; providers: ProviderConfig[] }
  | { type: "activeThread"; threadId: string | null }
  | { type: "newConversation" }
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
    case "newConversation":
      return { ...state, activeThreadId: null, turns: [], pendingRequests: [] };
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
    case "serverRequest": {
      const request = {
        id: action.message.id,
        method: action.message.method,
        params: action.message.params
      };
      return {
        ...state,
        pendingRequests: [
          request,
          ...state.pendingRequests.filter((existing) => existing.id !== request.id)
        ]
      };
    }
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

const AUTH_TOKEN_STORAGE_KEY = "codex-react-ui.authToken";

type AuthStatus = "checking" | "loginRequired" | "authenticated";

export function App({ themeMode, customThemePlugins, onThemeModeChange, onCustomThemePluginsChange }: AppProps) {
  const [state, dispatch] = useReducer(reducer, initialClientState);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [members, setMembers] = useState<AuthUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionPresetId>("workspaceAsk");
  const [dangerBypassConfirmed, setDangerBypassConfirmed] = useState(false);
  const [dangerDialogIntent, setDangerDialogIntent] = useState<DangerDialogIntent | null>(null);
  const [dangerDialogAcknowledged, setDangerDialogAcknowledged] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [reasoningEffort, setReasoningEffort] = useState("medium");
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [settingAssistantProviderId, setSettingAssistantProviderId] = useState<string>(() => readStoredString(UI_STORAGE_KEYS.settingAssistantProviderId, ""));
  const [settingAssistantModel, setSettingAssistantModel] = useState<string>(() => readStoredString(UI_STORAGE_KEYS.settingAssistantModel, ""));
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("local");
  const [sshCommand, setSshCommand] = useState(DEFAULT_SSH_WORKSPACE_COMMAND);
  const [sshCwd, setSshCwd] = useState(DEFAULT_SSH_WORKSPACE_CWD);
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
  const [turnTokenUsage, setTurnTokenUsage] = useState<Record<string, TokenUsageBreakdown>>({});
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [officialLoginOpen, setOfficialLoginOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("codex");
  const [settingsPluginTab, setSettingsPluginTab] = useState<CodexPluginSettingsTab>("marketplace");
  const [installedThemePluginIds, setInstalledThemePluginIds] = useState<ThemeId[]>(readInstalledThemes);
  const [leftPanelVisible, setLeftPanelVisible] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.leftPanelVisible, true));
  const [showAssistantUsageDetails, setShowAssistantUsageDetails] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.showAssistantUsageDetails, false));
  const [includeAutomationHistory, setIncludeAutomationHistory] = useState(() => readStoredBoolean(UI_STORAGE_KEYS.includeAutomationHistory, false));
  const includeAutomationHistoryRef = useRef(includeAutomationHistory);
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
  const [pendingCodexProviderTest, setPendingCodexProviderTest] = useState<{ providerId: string; prompt: string } | null>(null);
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
  const allHistoryThreadsRef = useRef<ClientState["threads"]>([]);
  const historySearchTermRef = useRef(historySearchTerm);
  const historyLoadRequestRef = useRef(0);
  const loadBasicsInFlightRef = useRef<Promise<void> | null>(null);
  const providerRefreshRef = useRef<{ token: string; promise: Promise<ProviderConfig[]> } | null>(null);
  const providerRefreshCacheRef = useRef<{ token: string; refreshedAt: number; providers: ProviderConfig[] } | null>(null);
  const activeThreadIdRef = useRef(state.activeThreadId);
  const authSessionRef = useRef(authSession);
  const clientRef = useRef<CodexSocketClient | null>(null);
  historySearchTermRef.current = historySearchTerm;
  activeThreadIdRef.current = state.activeThreadId;
  authSessionRef.current = authSession;
  const desktopLayout = useMediaQuery("(min-width:900px)");
  const { locale, setLocale, t } = useI18n();

  const openSettings = useCallback((section: SettingsSectionId = "codex", pluginTab: CodexPluginSettingsTab = "marketplace") => {
    setSettingsSection(section);
    if (section === "plugins") {
      setSettingsPluginTab(pluginTab);
    }
    setSettingsOpen(true);
  }, []);

  const allowedPermissions = useMemo((): PermissionPresetId[] => {
    const user = authSession?.user;
    if (!user || user.role === "admin") {
      return permissionPresets.map((preset) => preset.id);
    }
    const rank: Record<PermissionPresetId, number> = {
      readonlyAsk: 0,
      workspaceAsk: 1,
      fullAsk: 2,
      dangerBypass: 3
    };
    return permissionPresets
      .map((preset) => preset.id)
      .filter((id) => {
        if (!user.allowDangerBypass && id === "dangerBypass") return false;
        if (!user.allowWrite && id !== "readonlyAsk") return false;
        return rank[id] <= rank[user.maxPermission];
      });
  }, [authSession?.user]);

  useEffect(() => {
    if (!allowedPermissions.includes(permission)) {
      setPermission(allowedPermissions[0] ?? "readonlyAsk");
      setDangerBypassConfirmed(false);
    }
  }, [allowedPermissions, permission]);

  useEffect(() => {
    const root = authSession?.user?.workspaceRoot;
    if (root) {
      setCwd(root);
      setWorkspacePickerPath(root);
      setWorkspaceSelectionPending(false);
    }
  }, [authSession?.user?.workspaceRoot]);

  // Members may only use paths under their workspace root.
  useEffect(() => {
    const user = authSession?.user;
    if (!user || user.role === "admin" || !user.workspaceRoot) {
      return;
    }
    const root = user.workspaceRoot.replace(/\/+$/, "");
    const normalized = cwd.replace(/\/+$/, "") || root;
    if (normalized !== root && !normalized.startsWith(`${root}/`)) {
      setCwd(root);
    }
  }, [authSession?.user, cwd]);

  const reloadMembers = useCallback(async () => {
    if (!state.token || authSession?.user?.role !== "admin") {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    setMembersError(null);
    try {
      setMembers(await listMembers(state.token));
    } catch (error) {
      setMembersError(formatErrorText(error));
    } finally {
      setMembersLoading(false);
    }
  }, [authSession?.user?.role, state.token]);

  const handleCreateMember = useCallback(
    async (input: {
      email: string;
      password: string;
      username?: string;
      role?: "admin" | "user";
      maxPermission?: PermissionPresetId;
      allowWrite?: boolean;
      allowNetwork?: boolean;
      allowDangerBypass?: boolean;
      balance?: number;
      concurrency?: number;
      notes?: string;
      allowedProviderIds?: string[];
    }) => {
      if (!state.token) throw new Error("Not authenticated");
      await createMember(state.token, input);
      await reloadMembers();
    },
    [reloadMembers, state.token]
  );

  const handleUpdateMember = useCallback(
    async (id: string, input: Record<string, unknown>) => {
      if (!state.token) throw new Error("Not authenticated");
      await updateMember(state.token, id, input);
      await reloadMembers();
    },
    [reloadMembers, state.token]
  );

  const handleDeleteMember = useCallback(
    async (id: string) => {
      if (!state.token) throw new Error("Not authenticated");
      await deleteMember(state.token, id);
      await reloadMembers();
    },
    [reloadMembers, state.token]
  );

  const handleAllocateMemberBalance = useCallback(
    async (id: string, amount: number, operation: "set" | "add" | "subtract" = "add", notes?: string) => {
      if (!state.token) throw new Error("Not authenticated");
      await allocateMemberBalance(state.token, id, { amount, operation, notes });
      await reloadMembers();
      // refresh self session balance if admin topped up themselves
      if (authSession?.user?.id === id) {
        try {
          const me = await fetchSessionToken(state.token);
          setAuthSession(me);
        } catch {
          /* ignore */
        }
      }
    },
    [authSession?.user?.id, reloadMembers, state.token]
  );

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
  const threadCwdById = useMemo(() => {
    const entries = state.threads
      .map((thread) => [thread.id, normalizeWorkspaceCwd(thread.cwd ?? "")] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1]));
    return new Map(entries);
  }, [state.threads]);
  const cwdForThread = useCallback(
    (threadId?: string | null) => {
      if (threadId) {
        const threadCwd = threadCwdById.get(threadId);
        if (threadCwd) {
          return threadCwd;
        }
      }
      return workspaceMode === "ssh" ? normalizeSshWorkspaceCwd(sshCwd) || normalizeSshWorkspaceCwd(cwd) : normalizeWorkspaceCwd(cwd);
    },
    [cwd, sshCwd, threadCwdById, workspaceMode]
  );

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.installedThemes, JSON.stringify(installedThemePluginIds));
  }, [installedThemePluginIds]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void refreshPwaCache().catch((error) => {
        console.warn("[pwa] cache refresh failed", error);
      });
    }
    const win = window as unknown as { __deferredPwaInstallPrompt?: BeforeInstallPromptEvent | null };
    if (win.__deferredPwaInstallPrompt) {
      setInstallPromptEvent(win.__deferredPwaInstallPrompt);
    }
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      win.__deferredPwaInstallPrompt = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setAppInstalled(true);
      setInstallPromptEvent(null);
      win.__deferredPwaInstallPrompt = null;
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
    localStorage.setItem(UI_STORAGE_KEYS.showAssistantUsageDetails, JSON.stringify(showAssistantUsageDetails));
  }, [showAssistantUsageDetails]);

  useEffect(() => {
    try {
      localStorage.removeItem("codex-react-ui.show-launch-history");
    } catch {}
    localStorage.setItem(UI_STORAGE_KEYS.includeAutomationHistory, JSON.stringify(includeAutomationHistory));
    includeAutomationHistoryRef.current = includeAutomationHistory;
    if (state.connected && state.token) {
      allHistoryThreadsRef.current = [];
      void loadHistory(historySearchTermRef.current).catch(() => {});
    }
  }, [includeAutomationHistory, state.connected, state.token]);

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

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.settingAssistantProviderId, settingAssistantProviderId);
  }, [settingAssistantProviderId]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.settingAssistantModel, settingAssistantModel);
  }, [settingAssistantModel]);

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

  const loadHistory = useCallback(
    async (searchTerm = historySearchTermRef.current) => {
      const requestId = ++historyLoadRequestRef.current;
      setHistoryLoading(true);
      try {
        const trimmedSearch = searchTerm.trim();
        const cachedThreads = allHistoryThreadsRef.current;
        const incAuto = includeAutomationHistoryRef.current;
        const directThreadId = extractThreadIdSearch(trimmedSearch);
        const [allThreads, searchedThreads, directThread] = await Promise.all([
          cachedThreads.length > 0 && trimmedSearch ? Promise.resolve(cachedThreads) : loadAllThreads(client, { includeAutomationHistory: incAuto }),
          trimmedSearch ? loadAllThreads(client, { searchTerm: trimmedSearch, includeAutomationHistory: incAuto }) : Promise.resolve<ClientState["threads"]>([]),
          directThreadId ? loadHistoryThreadById(client, directThreadId) : Promise.resolve<ClientState["threads"][number] | null>(null)
        ]);
        if (requestId !== historyLoadRequestRef.current) return;
        if (!trimmedSearch) {
          allHistoryThreadsRef.current = allThreads;
          dispatch({ type: "threads", threads: allThreads });
          return;
        }
        const directThreads = directThread ? [directThread] : [];
        allHistoryThreadsRef.current = mergeThreadLists(allThreads, directThreads);
        dispatch({ type: "threads", threads: mergeThreadLists(directThreads, searchedThreads, filterHistoryThreads(allThreads, trimmedSearch)) });
      } finally {
        if (requestId === historyLoadRequestRef.current) setHistoryLoading(false);
      }
    },
    [client]
  );

  const loadBasics = useCallback((): Promise<void> => {
    const inFlight = loadBasicsInFlightRef.current;
    if (inFlight) return inFlight;

    const task = (async () => {
      const [account, modelResult, threadResult] = await Promise.all([
        client.rpc("account/read", { refreshToken: false }),
        client.rpc("model/list", {}),
        loadAllThreads(client, { includeAutomationHistory: includeAutomationHistoryRef.current })
      ]);
      dispatch({ type: "account", account });
      const models = asRecord(modelResult).data ?? asRecord(modelResult).models;
      dispatch({ type: "models", models: Array.isArray(models) ? (models as ClientState["models"]) : [] });
      allHistoryThreadsRef.current = threadResult;
      const searchTerm = historySearchTermRef.current;
      dispatch({ type: "threads", threads: searchTerm.trim() ? filterHistoryThreads(threadResult, searchTerm) : threadResult });
    })();
    const tracked = task.finally(() => {
      if (loadBasicsInFlightRef.current === tracked) loadBasicsInFlightRef.current = null;
    });
    loadBasicsInFlightRef.current = tracked;
    return tracked;
  }, [client]);

  const applyHistoryThreads = useCallback((threads: ClientState["threads"]) => {
    allHistoryThreadsRef.current = threads;
    const searchTerm = historySearchTermRef.current;
    dispatch({ type: "threads", threads: searchTerm.trim() ? filterHistoryThreads(threads, searchTerm) : threads });
  }, []);

  const refreshProviders = useCallback((token: string, session: AuthSession | null): Promise<ProviderConfig[]> => {
    const cached = providerRefreshCacheRef.current;
    if (cached && cached.token === token && Date.now() - cached.refreshedAt < 1_500) {
      return Promise.resolve(cached.providers);
    }
    const inFlight = providerRefreshRef.current;
    if (inFlight?.token === token) return inFlight.promise;

    const task = fetchProviders(token).then((providers) => {
      writeCachedProviders(session, providers);
      dispatch({ type: "providers", providers });
      providerRefreshCacheRef.current = { token, refreshedAt: Date.now(), providers };
      return providers;
    });
    const tracked = task.finally(() => {
      if (providerRefreshRef.current?.promise === tracked) providerRefreshRef.current = null;
    });
    providerRefreshRef.current = { token, promise: tracked };
    return tracked;
  }, []);

  useEffect(() => {
    if (!state.connected || !state.token) {
      return;
    }
    const trimmedSearch = historySearchTerm.trim();
    if (!trimmedSearch) {
      historyLoadRequestRef.current += 1;
      setHistoryLoading(false);
      if (allHistoryThreadsRef.current.length > 0) {
        dispatch({ type: "threads", threads: allHistoryThreadsRef.current });
      }
      return;
    }
    const timeout = window.setTimeout(() => {
      void loadHistory(trimmedSearch).catch((error) => {
        dispatch({ type: "error", message: errorMessage("History search", error) });
      });
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [historySearchTerm, loadHistory, state.connected, state.token]);

  useEffect(() => {
    if (!client || !state.connected || !state.activeThreadId) return;
    const threadId = state.activeThreadId;
    try {
      client.watchThread(threadId);
    } catch (error) {
      dispatch({ type: "error", message: errorMessage("Watch thread", error) });
      return;
    }
    return () => {
      try {
        client.unwatchThread(threadId);
      } catch {
        // The socket may already be disconnected; server-side close cleanup handles stale watches.
      }
    };
  }, [client, state.activeThreadId, state.connected]);

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
      if (authSession?.user && authSession.user.role !== "admin") {
        setCodexConfigError("Member accounts cannot edit Codex configuration");
        return;
      }
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
    [authSession?.user, client, codexConfig]
  );

  const writeCodexConfigValue = useCallback(
    async (keyPath: string, value: JsonValue) => {
      if (authSession?.user && authSession.user.role !== "admin") {
        setCodexConfigError("Member accounts cannot edit Codex configuration");
        return;
      }
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
    [authSession?.user, client]
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

  const handleSessionExpired = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    client.disconnect();
    dispatch({ type: "connected", connected: false });
    dispatch({ type: "token", token: null });
    setAuthSession(null);
    setAuthStatus("loginRequired");
  }, [client]);

  const verifySessionAfterDisconnect = useCallback(async () => {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      handleSessionExpired();
      return;
    }
    try {
      const session = await fetchSessionToken(token);
      if (session.authenticated === false || session.loginRequired || !session.token) {
        handleSessionExpired();
      }
    } catch (error) {
      if (error instanceof LoginRequiredError) {
        handleSessionExpired();
      }
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    const onConnected = (event: Event) => {
      const connected = Boolean((event as CustomEvent<boolean>).detail);
      dispatch({ type: "connected", connected });
      if (!connected && authStatus === "authenticated") {
        void verifySessionAfterDisconnect();
      }
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
          const turnId = stringValue(params.turnId);
          const usage = parseThreadTokenUsage(params.tokenUsage);
          const currentProvider = state.providers.find((provider) => provider.id === activeProviderId);
          const currentModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
          const pricedUsage = usage ? applyTokenUsagePricing(usage, currentProvider, currentModel) : null;
          if (threadId && pricedUsage) {
            setThreadTokenUsage((current) => ({ ...current, [threadId]: pricedUsage }));
          }
          if (turnId && pricedUsage) {
            setTurnTokenUsage((current) => ({ ...current, [turnId]: pricedUsage.last }));
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
        if (message.message.method === "serverRequest/resolved") {
          const params = asRecord(message.message.params);
          const requestId = params.requestId;
          if (typeof requestId === "string" || typeof requestId === "number") {
            dispatch({ type: "serverRequestResolved", id: requestId });
          }
        }
      }
      if (message.type === "codex.serverRequest") {
        dispatch({ type: "serverRequest", message: message.message });
      }
      if (message.type === "provider.saved") {
        const providers = [message.provider, ...state.providers.filter((provider) => provider.id !== message.provider.id)];
        writeCachedProviders(authSession, providers);
        dispatch({
          type: "providers",
          providers
        });
      }
      if (message.type === "provider.deleted") {
        const providers = state.providers.filter((provider) => provider.id !== message.providerId);
        writeCachedProviders(authSession, providers);
        dispatch({
          type: "providers",
          providers
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
  }, [activeProviderId, appendTerminalOutput, authSession, authStatus, client, loadTooling, selectedModel, state.providers, verifySessionAfterDisconnect]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        const session = await fetchSessionToken(storedToken);
        if (!mounted) return;
        if (session.authenticated === false || session.loginRequired || !session.token) {
          window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          setAuthStatus("loginRequired");
          return;
        }
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
        setAuthSession(session);
        setAuthStatus("authenticated");
        dispatch({ type: "token", token: session.token });
        await client.connect(session.token);
        let providers = readCachedProviders(session) ?? [];
        if (providers.length > 0) {
          dispatch({ type: "providers", providers });
        }
        try {
          providers = await refreshProviders(session.token, session);
          if (!mounted) return;
        } catch (error) {
          if (error instanceof LoginRequiredError) {
            throw error;
          }
          console.warn("[auth] provider fetch failed; preserving current relay list", error);
        }
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
        if (!mounted) return;
        if (error instanceof LoginRequiredError) {
          window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          setAuthStatus("loginRequired");
          return;
        }
        dispatch({ type: "error", message: formatErrorText(error) });
        // A transport/app-server hiccup during bootstrap is transient. Keep the
        // authenticated workbench visible while CodexSocketClient retries;
        // only an explicit LoginRequiredError should return to the login form.
        if (window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
          setAuthStatus("authenticated");
        } else {
          setAuthStatus("loginRequired");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client, loadBasics, refreshProviders]);

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
        syncWorkspaceFromThread(loaded.thread, setCwd, setWorkspaceSelectionPending);
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
        if (threadId === activeThreadIdRef.current) {
          syncWorkspaceFromThread(loaded.thread, setCwd, setWorkspaceSelectionPending);
        }
        dispatch({ type: "threadMerged", thread: loaded.thread, turns: loaded.turns });
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
      }
    },
    [client]
  );

  const openExistingThread = useCallback(
    async (threadId: string) => {
      try {
        const resumeCwd = cwdForThread(threadId);
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, resumeCwd);
        const resumeParams: Record<string, JsonValue> = {
          threadId,
          cwd: resumeCwd,
          approvalPolicy: permissionOverrides.approvalPolicy,
          sandbox: permissionOverrides.sandbox
        };
        if (effectiveModel) {
          resumeParams.model = effectiveModel;
        }
        await client.rpc("thread/resume", resumeParams);
      } catch (error) {
        // Historical CLI sessions may use a provider no longer present in config (e.g. code_launch).
        // Still load the transcript via thread/read so shared history remains readable.
        const message = errorMessage("Resume thread", error);
        if (!/model provider|not found/i.test(message)) {
          dispatch({ type: "error", message });
        } else {
          console.warn(message);
        }
      } finally {
        await loadThread(threadId);
      }
    },
    [activeProviderId, client, cwdForThread, loadThread, permission, selectedModel, state.providers]
  );

  useEffect(() => {
    if (!state.connected || !state.token) {
      return;
    }
    const token = state.token;
    let cancelled = false;
    void (async () => {
      try {
        await refreshProviders(token, authSessionRef.current);
        if (cancelled) return;
        await loadBasics();
        if (cancelled) return;
        const activeThreadId = activeThreadIdRef.current;
        if (activeThreadId) {
          try {
            await client.rpc("thread/resume", { threadId: activeThreadId });
          } catch (error) {
            dispatch({ type: "error", message: errorMessage("Reconnect thread subscription", error) });
          }
          await loadThreadIntoCache(activeThreadId);
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
  }, [client, loadBasics, loadThreadIntoCache, refreshProviders, state.connected, state.token]);

  const selectTaskTab = useCallback(
    (threadId: string | null) => {
      if (!threadId) {
        setWorkspaceMode("local");
        setCwd(DEFAULT_NEW_CHAT_CWD);
        setWorkspaceSelectionPending(true);
        setWelcomeDismissed(false);
        dispatch({ type: "newConversation" });
        return;
      }
      setWorkspaceMode("local");
      setWorkspaceSelectionPending(false);
      void openExistingThread(threadId);
    },
    [openExistingThread]
  );

  const beginNewSession = useCallback((nextPermission: PermissionPresetId) => {
    setPermission(nextPermission);
    setDangerBypassConfirmed(nextPermission === "dangerBypass");
    setWorkspaceMode("local");
    setCwd(DEFAULT_NEW_CHAT_CWD);
    setWorkspaceSelectionPending(true);
    setWelcomeDismissed(false);
    dispatch({ type: "newConversation" });
  }, []);

  const requestNewSession = useCallback(
    (nextPermission: PermissionPresetId) => {
      if (nextPermission === "dangerBypass") {
        setWorkspaceMode("local");
        setCwd(DEFAULT_NEW_CHAT_CWD);
        setWorkspaceSelectionPending(true);
        setWelcomeDismissed(false);
        dispatch({ type: "newConversation" });
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
    if (workspaceMode === "ssh") {
      const normalizedRemoteCwd = normalizeSshWorkspaceCwd(sshCwd);
      if (!normalizedRemoteCwd || !isSshWorkspaceCommand(sshCommand)) {
        dispatch({ type: "error", message: t("workspace.required") });
        return;
      }
      setSshCommand(sshCommand.trim());
      setSshCwd(normalizedRemoteCwd);
      setCwd(normalizedRemoteCwd);
      setWorkspaceSelectionPending(false);
      return;
    }
    const normalized = normalizeWorkspaceCwd(cwd);
    if (!normalized) {
      dispatch({ type: "error", message: t("workspace.required") });
      return;
    }
    setCwd(normalized);
    setWorkspaceSelectionPending(false);
  }, [cwd, sshCommand, sshCwd, t, workspaceMode]);

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
      dispatch({ type: "newConversation" });
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
    const startCwd = cwdForThread(null);
    const permissionOverrides = permissionToTurnOverrides(permission, startCwd);
    const startParams: Record<string, JsonValue> = {
      cwd: startCwd,
      sandbox: permissionOverrides.sandbox,
      approvalPolicy: permissionOverrides.approvalPolicy,
      sessionStartSource: "startup"
    };
    addWorkspaceRpcMetadata(startParams, workspaceMode, sshCommand, startCwd);
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
  }, [activeProviderId, client, cwdForThread, permission, selectedModel, sshCommand, state.activeThreadId, state.providers, t, workspaceMode, workspaceSelectionPending]);

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
        const turnCwd = cwdForThread(threadId);
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, turnCwd);
        const turnParams: Record<string, JsonValue> = {
          threadId,
          input,
          cwd: turnCwd,
          sandboxPolicy: permissionOverrides.sandboxPolicy,
          approvalPolicy: permissionOverrides.approvalPolicy,
          effort: options.forceEffort ?? (fastModeEnabled ? fastReasoningEffort(reasoningOptions, reasoningEffort) : reasoningEffort)
        };
        addWorkspaceRpcMetadata(turnParams, workspaceMode, sshCommand, turnCwd);
        if (effectiveModel) {
          turnParams.model = effectiveModel;
        }
        const activeTurn = state.turns.slice().reverse().find((t) => t.threadId === threadId && (t.status === "pending" || t.status === "inProgress"));
        if (activeTurn?.id) {
          await client.rpc("turn/steer", {
            threadId,
            expectedTurnId: activeTurn.id,
            input
          });
        } else {
          await client.rpc("turn/start", turnParams);
        }
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
      cwdForThread,
      dangerBypassConfirmed,
      ensureActiveThread,
      fastModeEnabled,
      loadAuditEvents,
      permission,
      reasoningEffort,
      reasoningOptions,
      selectedModel,
      sshCommand,
      state.providers,
      workspaceMode
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
        applyHistoryThreads(renameThreadEntry(allHistoryThreadsRef.current, threadId, normalized));
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
    [applyHistoryThreads, client, state.activeThreadId]
  );

  const renameHistoryThread = useCallback(
    async (threadId: string, name: string) => {
      const normalized = name.trim();
      if (!normalized) {
        return;
      }
      try {
        await client.rpc("thread/name/set", { threadId, name: normalized });
        applyHistoryThreads(renameThreadEntry(allHistoryThreadsRef.current, threadId, normalized));
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Rename history thread", error) });
        throw error;
      }
    },
    [applyHistoryThreads, client]
  );

  const archiveHistoryThread = useCallback(
    async (threadId: string) => {
      try {
        await client.rpc("thread/archive", { threadId });
        applyHistoryThreads(allHistoryThreadsRef.current.filter((thread) => thread.id !== threadId));
        if (state.activeThreadId === threadId) {
          setWelcomeDismissed(false);
          dispatch({ type: "newConversation" });
        }
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Archive history thread", error) });
        throw error;
      }
    },
    [applyHistoryThreads, client, state.activeThreadId]
  );

  const deleteHistoryThread = useCallback(
    async (threadId: string) => {
      try {
        await client.rpc("thread/delete", { threadId });
        applyHistoryThreads(allHistoryThreadsRef.current.filter((thread) => thread.id !== threadId));
        setThreadGoals((current) => {
          const next = { ...current };
          delete next[threadId];
          return next;
        });
        if (state.activeThreadId === threadId) {
          setWelcomeDismissed(false);
          dispatch({ type: "newConversation" });
        }
      } catch (error) {
        dispatch({ type: "error", message: errorMessage("Delete history thread", error) });
        throw error;
      }
    },
    [applyHistoryThreads, client, state.activeThreadId]
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
      const targetThreadId = threadId?.trim();
      if (!targetThreadId) {
        setLeftPanelVisible(true);
        setHistorySearchTerm("");
        await loadHistory("");
        setSlashNotice({
          id: `resume-history-${Date.now()}`,
          title: "Resume history opened",
          message: "Select a Codex thread from the left history rail to resume it.",
          severity: "info"
        });
        return;
      }
      try {
        const resumeCwd = cwdForThread(targetThreadId);
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        const permissionOverrides = permissionToTurnOverrides(permission, resumeCwd);
        const resumeParams: Record<string, JsonValue> = {
          threadId: targetThreadId,
          cwd: resumeCwd,
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
    [activeProviderId, client, cwdForThread, loadHistory, loadThread, permission, selectedModel, state.providers]
  );

  function openWebDevWorkspace() {
    setRightWorkspaceVisible(true);
    setRightWorkspaceTab("webdev");
  }

  const runImageCommand = useCallback(
    async (command: Extract<ComposerSlashCommand, { type: "image" }>, images: ComposerImageAttachment[]) => {
      const prompt = command.prompt.trim();
      if (!prompt) {
        setComposerSuggestion({ id: `image-${Date.now()}`, text: command.mode === "edit" ? "/edit-image " : "/image " });
        return;
      }
      if (!state.token) {
        dispatch({ type: "error", message: "Image generation requires an active session" });
        return;
      }
      const provider = state.providers.find((entry) => entry.id === activeProviderId);
      if (!provider) {
        dispatch({ type: "error", message: "Select a relay before generating images" });
        return;
      }
      if (command.mode === "generate" && !provider.image?.generations) {
        dispatch({ type: "error", message: `${provider.name} does not advertise /images/generations` });
        return;
      }
      if (command.mode === "edit" && !provider.image?.edits) {
        dispatch({ type: "error", message: `${provider.name} does not advertise /images/edits` });
        return;
      }
      const imageAttachments = images.filter((image) => (image.kind ?? "image") === "image");
      if (command.mode === "edit" && imageAttachments.length === 0) {
        dispatch({ type: "error", message: "Attach an image before using /edit-image" });
        return;
      }

      try {
        const threadId = await ensureActiveThread();
        const model = provider.image?.defaultModel ?? "gpt-image-2";
        const result =
          command.mode === "edit"
            ? await editProviderImage(state.token, {
                providerId: provider.id,
                prompt,
                model,
                images: await Promise.all(imageAttachments.map(composerImageAttachmentToFile))
              })
            : await generateProviderImage(state.token, {
                providerId: provider.id,
                prompt,
                model
              });
        if (!result.data?.length) {
          throw new Error("Image API returned no images");
        }
        const items = buildImageThreadItems({
          prompt,
          mode: command.mode,
          sourceImages: imageAttachments,
          result,
          provider
        });
        await client.rpc("thread/inject_items", {
          threadId,
          items
        });
        dispatch({
          type: "threadMerged",
          thread: null,
          turns: buildLocalImageThreadTurns({
            threadId,
            prompt,
            mode: command.mode,
            sourceImages: imageAttachments,
            result,
            provider,
            items
          })
        });
        await loadThread(threadId);
        setSlashNotice({
          id: `image-${Date.now()}`,
          title: command.mode === "edit" ? "Image edit completed" : "Image generated",
          message: `${provider.name} · ${model}`,
          severity: "success"
        });
      } catch (error) {
        dispatch({ type: "error", message: errorMessage(command.mode === "edit" ? "Image edit" : "Image generation", error) });
      }
    },
    [activeProviderId, client, ensureActiveThread, loadThread, state.providers, state.token]
  );

  const handleComposerSlashCommand = useCallback(
    async (command: ComposerSlashCommand, images: ComposerImageAttachment[], mentions: ComposerMention[]) => {
      switch (command.type) {
        case "image":
          await runImageCommand(command, images);
          return;
        case "webdev": {
          openWebDevWorkspace();
          const prompt = command.prompt.trim();
          if (!prompt) {
            setComposerSuggestion({ id: `webdev-${Date.now()}`, text: buildWebDevStarterPrompt(cwd) });
            return;
          }
          await startCodexTurn(buildWebDevPrompt(prompt, cwd), images, mentions);
          return;
        }
        case "fast":
          setFastModeEnabled((current) => command.enabled ?? !current);
          return;
        case "stats":
          setStatsPanelScope(command.scope);
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
      }
    },
    [
      clearActiveGoal,
      cwd,
      openWebDevWorkspace,
      runImageCommand,
      setActiveGoalStatus,
      setGoalForActiveThread,
      startCodexTurn,
      state.activeThreadId,
      threadGoals
    ]
  );

  const sendPrompt = useCallback(
    async (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[]) => {
      setWelcomeDismissed(true);
      const slashCommand = parseComposerSlashCommand(text, images, mentions);
      if (slashCommand) {
        await handleComposerSlashCommand(slashCommand, images, mentions);
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
        let turnCwd = cwdForThread(threadId);
        const effectiveModel = resolveSelectedModel(state.providers, activeProviderId, selectedModel);
        let permissionOverrides = permissionToTurnOverrides(permission, turnCwd);
        if (!threadId) {
          const startParams: Record<string, JsonValue> = {
            cwd: turnCwd,
            sandbox: permissionOverrides.sandbox,
            approvalPolicy: permissionOverrides.approvalPolicy,
            sessionStartSource: "startup"
          };
          addWorkspaceRpcMetadata(startParams, workspaceMode, sshCommand, turnCwd);
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
        } else {
          turnCwd = cwdForThread(threadId);
          permissionOverrides = permissionToTurnOverrides(permission, turnCwd);
        }
        const turnParams: Record<string, JsonValue> = {
          threadId,
          input: composerInputToUserInput(commandText, [], [], { preserveText: true }),
          cwd: turnCwd,
          sandboxPolicy: permissionOverrides.sandboxPolicy,
          approvalPolicy: permissionOverrides.approvalPolicy,
          effort: reasoningEffort
        };
        addWorkspaceRpcMetadata(turnParams, workspaceMode, sshCommand, turnCwd);
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
      cwdForThread,
      dangerBypassConfirmed,
      loadAuditEvents,
      permission,
      reasoningEffort,
      selectedModel,
      sideChatTabs,
      sshCommand,
      state.providers,
      workspaceMode
    ]
  );

  const answerRequest = useCallback(
    (id: string | number, decision: "accept" | "acceptForSession" | "decline" | "cancel") => {
      const request = state.pendingRequests.find((entry) => entry.id === id);
      client.respondToServerRequest(id, buildServerRequestDecisionResponse(request?.method, request?.params, decision));
      dispatch({ type: "serverRequestResolved", id });
    },
    [client, state.pendingRequests]
  );

  const respondToServerRequest = useCallback(
    (id: string | number, result: JsonValue) => {
      client.respondToServerRequest(id, result);
      dispatch({ type: "serverRequestResolved", id });
    },
    [client]
  );

  const saveProvider = useCallback(
    async (provider: ProviderConfig, apiKey?: string) => {
      if (authSession?.user && authSession.user.role !== "admin") {
        throw new Error("Admin only: provider management");
      }
      try {
        const saved = await client.saveProvider(provider, apiKey);
        const providers = [saved, ...state.providers.filter((entry) => entry.id !== saved.id)];
        writeCachedProviders(authSession, providers);
        dispatch({
          type: "providers",
          providers
        });
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
        throw error;
      }
    },
    [authSession, client, state.providers]
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

  const testProviderWithCodex = useCallback(
    async (providerId: string, model?: string) => {
      await activateProvider(providerId, model);
      setSettingsOpen(false);
      setPermission("readonlyAsk");
      setDangerBypassConfirmed(false);
      setFastModeEnabled(true);
      setWorkspaceMode("local");
      setWorkspaceSelectionPending(false);
      setWelcomeDismissed(true);
      dispatch({ type: "newConversation" });
      setPendingCodexProviderTest({ providerId, prompt: CODEX_PROVIDER_TEST_PROMPT });
    },
    [activateProvider]
  );

  useEffect(() => {
    if (
      !pendingCodexProviderTest ||
      settingsOpen ||
      workspaceSelectionPending ||
      state.activeThreadId !== null ||
      activeProviderId !== pendingCodexProviderTest.providerId ||
      !state.connected ||
      state.engine.phase !== "ready"
    ) {
      return;
    }
    const { prompt } = pendingCodexProviderTest;
    setPendingCodexProviderTest(null);
    void startCodexTurn(prompt, [], [], {
      forceEffort: fastReasoningEffort(reasoningOptions, reasoningEffort)
    });
  }, [
    activeProviderId,
    pendingCodexProviderTest,
    reasoningEffort,
    reasoningOptions,
    settingsOpen,
    startCodexTurn,
    state.activeThreadId,
    state.connected,
    state.engine.phase,
    workspaceSelectionPending
  ]);

  const deleteProvider = useCallback(
    async (providerId: string) => {
      if (authSession?.user && authSession.user.role !== "admin") {
        throw new Error("Admin only: provider management");
      }
      try {
        const deletedProviderId = await client.deleteProvider(providerId);
        const providers = state.providers.filter((entry) => entry.id !== deletedProviderId);
        writeCachedProviders(authSession, providers);
        dispatch({
          type: "providers",
          providers
        });
        if (activeProviderId === deletedProviderId) {
          setActiveProviderId(null);
        }
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
        throw error;
      }
    },
    [activeProviderId, authSession, client, state.providers]
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
        writeCachedProviders(authSession, result.providers);
        dispatch({ type: "providers", providers: result.providers });
        return result.importedProviders;
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
        throw error;
      }
    },
    [authSession, state.token]
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
        const cacheKey = workspaceDirectoryCacheKey(workspaceMode, sshCommand, path);
        if (workspaceMode === "ssh") {
          if (!state.token) {
            throw new Error("Missing session token");
          }
          const result = await fetchSshDirectory(state.token, sshCommand, path);
          setFileDirectories((current) => ({ ...current, [cacheKey]: parseFsDirectory(result, path) }));
          return;
        }
        const result = await client.rpc("fs/readDirectory", { path });
        setFileDirectories((current) => ({ ...current, [cacheKey]: parseFsDirectory(result, path) }));
      } catch (error) {
        dispatch({ type: "error", message: formatErrorText(error) });
      }
    },
    [client, sshCommand, state.token, workspaceMode]
  );

  useEffect(() => {
    if (!workspacePickerOpen) {
      return;
    }
    if (!fileDirectories[workspaceDirectoryCacheKey(workspaceMode, sshCommand, workspacePickerPath)]) {
      void readDirectory(workspacePickerPath);
    }
  }, [fileDirectories, readDirectory, sshCommand, workspaceMode, workspacePickerOpen, workspacePickerPath]);

  const openWorkspacePicker = useCallback(() => {
    const normalized = workspaceMode === "ssh" ? normalizeSshWorkspaceCwd(sshCwd) || DEFAULT_SSH_WORKSPACE_CWD : normalizeWorkspaceCwd(cwd) || "/root";
    setWorkspacePickerPath(normalized);
    setWorkspacePickerOpen(true);
  }, [cwd, sshCwd, workspaceMode]);

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
  const composerBackgroundImage = safeThemeAssetUrl(activeThemePlugin?.assets?.composerBackgroundImage ?? activeThemePlugin?.assets?.appBackgroundImage);
  const welcomeBackgroundImage = safeThemeAssetUrl(activeThemePlugin?.assets?.welcomeBackgroundImage ?? activeThemePlugin?.assets?.heroImage ?? activeThemePlugin?.assets?.appBackgroundImage);
  const historyBackgroundImage = safeThemeAssetUrl(activeThemePlugin?.assets?.historyBackgroundImage ?? activeThemePlugin?.assets?.appBackgroundImage);
  const shellBackgroundVideo = safeThemeVideoUrl(activeThemePlugin?.assets?.appBackgroundVideo);
  const backgroundScene = activeThemePlugin?.layout?.backgroundScene;
  const themeTuning = themeVisualTuning(activeThemePlugin);
  const petImage = safeThemeAssetUrl(activeThemePlugin?.assets?.petImage);
  const showThemePet = Boolean(petImage && activeThemePlugin?.layout?.petEnabled !== false);
  const activeRunningTurn = state.activeThreadId
    ? [...state.turns].reverse().find((turn) => turn.threadId === state.activeThreadId && isRunningTurnStatus(turn.status)) ?? null
    : null;
  const composerWorkingStatus: ComposerWorkingStatus | null = activeRunningTurn
    ? {
        active: true,
        startedAt: normalizeTimestampMilliseconds(activeRunningTurn.startedAt) ?? Date.now(),
        backgroundTerminalCount: terminalSessions.filter((session) => session.status === "running").length
      }
    : null;

  const stopActiveTurn = useCallback(async () => {
    if (!activeRunningTurn) {
      return;
    }
    try {
      await client.rpc("turn/interrupt", { threadId: activeRunningTurn.threadId, turnId: activeRunningTurn.id });
    } catch (error) {
      dispatch({ type: "error", message: errorMessage("Stop turn", error) });
    }
  }, [activeRunningTurn, client]);

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
              <ToggleButtonGroup
                size="small"
                exclusive
                value={workspaceMode}
                onChange={(_event, value) => {
                  if (value !== "local" && value !== "ssh") {
                    return;
                  }
                  setWorkspaceMode(value);
                  setWorkspacePickerPath(value === "ssh" ? normalizeSshWorkspaceCwd(sshCwd) || DEFAULT_SSH_WORKSPACE_CWD : normalizeWorkspaceCwd(cwd) || "/root");
                }}
                aria-label={t("workspace.mode")}
              >
                <ToggleButton value="local" aria-label={t("workspace.local")}>
                  {t("workspace.local")}
                </ToggleButton>
                <ToggleButton value="ssh" aria-label={t("workspace.ssh")}>
                  SSH
                </ToggleButton>
              </ToggleButtonGroup>
              {workspaceMode === "ssh" && (
                <TextField
                  size="small"
                  label={t("workspace.sshCommand")}
                  value={sshCommand}
                  onChange={(event) => setSshCommand(event.target.value)}
                  sx={{ minWidth: { xs: "100%", md: 320 } }}
                  inputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 } }}
                />
              )}
              <TextField
                size="small"
                label={workspaceMode === "ssh" ? t("workspace.remoteFolder") : t("workspace.label")}
                value={workspaceMode === "ssh" ? sshCwd : cwd}
                onChange={(event) => (workspaceMode === "ssh" ? setSshCwd(event.target.value) : setCwd(event.target.value))}
                sx={{ minWidth: { xs: "100%", md: 320 } }}
              />
              <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={openWorkspacePicker}>
                {t("workspace.browse")}
              </Button>
              <Button variant="contained" onClick={confirmWorkspaceSelection}>
                {t("workspace.use")}
              </Button>
            </Stack>
            {workspaceMode === "ssh" && (
              <Alert severity="info" sx={{ mt: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 750 }}>
                  {t("workspace.sshHelpTitle")}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", mt: 0.35 }}>
                  ssh-keygen -t ed25519 -C "codex-ui"
                </Typography>
                <Typography variant="caption" sx={{ display: "block", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  ssh-copy-id user@192.168.11.1
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
                  {t("workspace.sshHelp")}
                </Typography>
              </Alert>
            )}
          </Box>
        )}
        <ChatPanel
          turns={allTurns}
          turnTokenUsage={turnTokenUsage}
          threads={historyThreads}
          activeThreadId={state.activeThreadId}
          errors={state.errors}
          pendingRequests={state.pendingRequests}
          goal={activeGoal}
          slashNotice={slashNotice}
          stats={statsState}
          requestMonitor={requestMonitor}
          statsOpen={Boolean(statsPanelScope)}
          modes={modeState}
          activeThemePlugin={activeThemePlugin}
          welcomeBackgroundImage={welcomeBackgroundImage}
          welcomeDismissed={welcomeDismissed}
          assistantUsageDisplay={showAssistantUsageDetails ? "details" : "summary"}
          t={t}
          onPromptSelect={usePromptSuggestion}
          onOpenOnboardingSection={(section) => openSettings(section)}
          onOpenOfficialLogin={() => setOfficialLoginOpen(true)}
          onAgentThreadSelect={(threadId) => void loadThreadIntoCache(threadId)}
          onStatsClose={() => setStatsPanelScope(null)}
          onSlashNoticeClose={() => setSlashNotice(null)}
          onAnswerServerRequest={respondToServerRequest}
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
            sessionToken={state.token}
            pendingMention={pendingMention}
            suggestedPrompt={composerSuggestion}
            activeThemePlugin={activeThemePlugin}
            backgroundImage={composerBackgroundImage}
            t={t}
            modeBadges={modeState}
            dangerBypassConfirmed={dangerBypassConfirmed}
            running={Boolean(activeRunningTurn)}
            workingStatus={composerWorkingStatus}
            statusLabel={conversationStatus}
            onStop={() => void stopActiveTurn()}
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
        fileDirectories={fileDirectories}
        openFile={openFile}
        filesPanelLayout={filesPanelLayout}
        terminalSessions={terminalSessions}
        t={t}
        onTabChange={setRightWorkspaceTab}
        onClose={() => setRightWorkspaceVisible(false)}
        onFilesPanelLayoutChange={(layout) => {
          setFilesPanelLayout(layout);
          localStorage.setItem(UI_STORAGE_KEYS.filesPanelLayout, JSON.stringify(layout));
        }}
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

  const completeLoginSession = useCallback(
    async (session: AuthSession) => {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
      setAuthSession(session);
      dispatch({ type: "token", token: session.token });
      // Mark authenticated immediately so UI enters the workbench even if
      // the WebSocket or subsequent RPCs are slow/failing.
      setAuthStatus("authenticated");
      const cachedProviders = readCachedProviders(session);
      if (cachedProviders?.length) {
        dispatch({ type: "providers", providers: cachedProviders });
      }
      // Best-effort post-login setup: never block the workbench.
      void (async () => {
        try {
          await withTimeout(client.connect(session.token), 8000, "WebSocket connect timeout");
        } catch (error) {
          console.warn("[auth] WebSocket connect failed, workbench remains usable", error);
        }
        try {
          const configResult = await withTimeout(client.rpc("config/read", { includeLayers: false }), 8000, "Config read timeout");
          const view = parseConfigReadResponse(configResult);
          setCodexConfig(view);
          const providerFromConfig = view.modelProvider ? state.providers.find((provider) => provider.id === view.modelProvider) : undefined;
          if (providerFromConfig) {
            setActiveProviderId(providerFromConfig.id);
          }
          if (view.model) {
            setSelectedModel((current) => current || view.model || current);
          }
        } catch {
          /* optional */
        }
      })();
    },
    [client, state.providers]
  );

  const handleLogin = useCallback(
    async (email: string, password: string, captcha?: { captchaId?: string; captchaAnswer?: string }) => {
      setLoginSubmitting(true);
      setLoginError(null);
      try {
        const result = await login(email, password, captcha);
        if ("requires_2fa" in result && result.requires_2fa) {
          return { requires_2fa: true as const, pendingToken: result.pendingToken };
        }
        await completeLoginSession(result as AuthSession);
      } catch (error) {
        setLoginError(formatErrorText(error));
        throw error;
      } finally {
        setLoginSubmitting(false);
      }
    },
    [completeLoginSession]
  );

  const handleLogin2fa = useCallback(
    async (pendingToken: string, totpCode: string) => {
      setLoginSubmitting(true);
      setLoginError(null);
      try {
        const session = await loginWith2fa(pendingToken, totpCode);
        await completeLoginSession(session);
      } catch (error) {
        setLoginError(formatErrorText(error));
        throw error;
      } finally {
        setLoginSubmitting(false);
      }
    },
    [completeLoginSession]
  );

  const handleRegister = useCallback(
    async (input: {
      email: string;
      password: string;
      username?: string;
      captchaId?: string;
      captchaAnswer?: string;
    }) => {
      setLoginSubmitting(true);
      setLoginError(null);
      try {
        await registerAccount(input);
        setLoginError(null);
      } catch (error) {
        setLoginError(formatErrorText(error));
        throw error;
      } finally {
        setLoginSubmitting(false);
      }
    },
    []
  );

  if (authStatus === "checking") {
    return <AuthLoadingScreen />;
  }

  if (authStatus === "loginRequired") {
    return (
      <LoginScreen
        error={loginError}
        submitting={loginSubmitting}
        onSubmit={handleLogin}
        onRegister={handleRegister}
        onLogin2fa={handleLogin2fa}
      />
    );
  }

  const currentUserLabel = authSession?.user?.email ?? "Local session";
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
  const conversationStatus = getConversationStatus(state.connected, state.engine.phase, Boolean(activeRunningTurn));
  const conversationStatusColor = conversationStatusColorFor(conversationStatus);
  const settingAssistantProvider = state.providers.find((provider) => provider.id === settingAssistantProviderId) ?? null;
  const settingAssistantEffectiveModel = settingAssistantModel || settingAssistantProvider?.defaultModel || settingAssistantProvider?.nativeModels[0] || "";
  const settingAssistantReady = Boolean(settingAssistantProvider && settingAssistantEffectiveModel);
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
  const historyUsageByThread = buildHistoryUsageByThread(threadTokenUsage);
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
  const workspacePickerCacheKey = workspaceDirectoryCacheKey(workspaceMode, sshCommand, workspacePickerPath);
  const workspacePickerEntries = fileDirectories[workspacePickerCacheKey] ?? [];
  const workspacePickerFolders = workspacePickerEntries.filter((entry) => entry.isDirectory);
  const workspacePickerParent = parentWorkspacePath(workspacePickerPath);
  void currentUserLabel;

  return (
    <Box
      sx={{
        height: "100dvh",
        maxHeight: "100dvh",
        boxSizing: "border-box",
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
          <TopBarRelayTreeSelector
            providers={state.providers}
            activeProviderId={activeProviderId}
            onActivateProvider={activateProvider}
            onOpenOfficialLogin={() => setOfficialLoginOpen(true)}
          />
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
          <FormControl size="small" sx={{ minWidth: { xs: 96, sm: 128 }, display: { xs: "none", sm: "inline-flex" } }}>
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
          <Chip
            size="small"
            color={conversationStatusColor}
            label={conversationStatus}
            data-testid="topbar-conversation-status"
            sx={{ display: { xs: "inline-flex", sm: "inline-flex" }, fontWeight: 850 }}
          />
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
                  {displayThreadTitle(thread)}
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
                      threadUsage={historyUsageByThread}
                      searchTerm={historySearchTerm}
                      loading={historyLoading}
                      installAvailable={Boolean(installPromptEvent) && !appInstalled}
                      backgroundImage={historyBackgroundImage}
                      t={t}
                      onSearchChange={setHistorySearchTerm}
                      onRefresh={() => void loadHistory(historySearchTerm)}
                      onSelect={(threadId) => selectTaskTab(threadId)}
                      onRename={(threadId, name) => renameHistoryThread(threadId, name)}
                      onArchive={(threadId) => archiveHistoryThread(threadId)}
                      onDelete={(threadId) => deleteHistoryThread(threadId)}
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
                threadUsage={historyUsageByThread}
                searchTerm={historySearchTerm}
                loading={historyLoading}
                installAvailable={Boolean(installPromptEvent) && !appInstalled}
                backgroundImage={historyBackgroundImage}
                t={t}
                onSearchChange={setHistorySearchTerm}
                onRefresh={() => void loadHistory(historySearchTerm)}
                onSelect={(threadId) => selectTaskTab(threadId)}
                onRename={(threadId, name) => renameHistoryThread(threadId, name)}
                onArchive={(threadId) => archiveHistoryThread(threadId)}
                onDelete={(threadId) => deleteHistoryThread(threadId)}
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
            {workspaceMode === "ssh" && (
              <TextField
                size="small"
                label={t("workspace.sshCommand")}
                value={sshCommand}
                onChange={(event) => setSshCommand(event.target.value)}
                helperText={t("workspace.sshPickerHelp")}
                fullWidth
                inputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 } }}
              />
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={() => setWorkspacePickerPath(workspaceMode === "ssh" ? DEFAULT_SSH_WORKSPACE_CWD : "/root")}>
                {t("workspace.home")}
              </Button>
              <Button size="small" variant="outlined" onClick={() => setWorkspacePickerPath(workspaceMode === "ssh" ? `${DEFAULT_SSH_WORKSPACE_CWD}/projects` : "/root/projects")}>
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
              if (workspaceMode === "ssh") {
                setSshCwd(normalizeSshWorkspaceCwd(workspacePickerPath) || workspacePickerPath);
              } else {
                setCwd(workspacePickerPath);
              }
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
        sessionToken={state.token}
        open={settingsOpen}
        initialSection={settingsSection}
        initialPluginTab={settingsPluginTab}
        themeMode={themeMode}
        installedThemePluginIds={installedThemePluginIds}
        customThemePlugins={customThemePlugins}
        leftPanelVisible={leftPanelVisible}
        showAssistantUsageDetails={showAssistantUsageDetails}
        includeAutomationHistory={includeAutomationHistory}
        petDockEnabled={petDockEnabled}
        cwd={cwd}
        permission={permission}
        providers={state.providers}
        activeProviderId={activeProviderId}
        selectedModel={selectedModel}
        settingAssistantProviderId={settingAssistantProviderId}
        settingAssistantModel={settingAssistantModel}
        settingAssistantReady={settingAssistantReady}
        settingAssistantEffectiveModel={settingAssistantEffectiveModel}
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
        currentUser={authSession?.user ?? null}
        members={members}
        membersLoading={membersLoading}
        membersError={membersError}
        allowedPermissions={allowedPermissions}
        t={t}
        onClose={() => setSettingsOpen(false)}
        onThemeModeChange={onThemeModeChange}
        onInstallThemePlugin={installThemePlugin}
        onUninstallThemePlugin={uninstallThemePlugin}
        onSaveCustomThemePlugin={saveCustomThemePlugin}
        onRemoveCustomThemePlugin={removeCustomThemePlugin}
        onLeftPanelVisibleChange={setLeftPanelVisible}
        onShowAssistantUsageDetailsChange={setShowAssistantUsageDetails}
        onIncludeAutomationHistoryChange={setIncludeAutomationHistory}
        onPetDockEnabledChange={setPetDockEnabled}
        onCwdChange={setCwd}
        onPermissionChange={requestPermissionChange}
        onReasoningEffortChange={setReasoningEffort}
        onSettingAssistantProviderChange={setSettingAssistantProviderId}
        onSettingAssistantModelChange={setSettingAssistantModel}
        onOpenOfficialLogin={() => setOfficialLoginOpen(true)}
        onReloadCodexConfig={() => void loadCodexConfig()}
        onCodexConfigFieldChange={(field, value) => void writeCodexConfigField(field, value)}
        onCodexConfigValueChange={(keyPath, value) => void writeCodexConfigValue(keyPath, value)}
        onSaveProvider={saveProvider}
        onActivateProvider={activateProvider}
        onTestProviderWithCodex={testProviderWithCodex}
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
        onReloadMembers={reloadMembers}
        onCreateMember={handleCreateMember}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
        onAllocateMemberBalance={handleAllocateMemberBalance}
      />
      <OfficialOpenAiLoginDialog
        open={officialLoginOpen}
        onClose={() => setOfficialLoginOpen(false)}
        onSaveProvider={saveProvider}
        onActivateProvider={activateProvider}
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
  const hasImageAttachments = images.some((image) => (image.kind ?? "image") === "image");
  if (mentions.length > 0 && name !== "image" && name !== "edit-image") {
    return null;
  }
  switch (name) {
    case "image":
    case "img":
      return { type: "image", mode: hasImageAttachments ? "edit" : "generate", prompt: rest };
    case "edit-image":
    case "image-edit":
    case "img-edit":
      return { type: "image", mode: "edit", prompt: rest };
    case "fast":
      if (images.length > 0 || mentions.length > 0) return null;
      return { type: "fast", enabled: parseOptionalBoolean(rest) };
    case "stats":
      if (images.length > 0 || mentions.length > 0) return null;
      return { type: "stats", scope: "stats" };
    case "webdev":
    case "web-dev":
      return { type: "webdev", prompt: rest };
    case "goal": {
      if (images.length > 0 || mentions.length > 0) return null;
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

function buildWebDevPrompt(description: string, cwd: string): string {
  const request = description.trim();
  const stack = chooseWebDevStack(request);
  const lines = [
    `Create the requested web app in the current workspace at ${cwd}.`,
    `Use Bun for package management and local scripts.`,
    stack === "react"
      ? `Scaffold a React app when the request implies a UI framework or component library.`
      : `Use a plain HTML + JavaScript setup when the request is simple, static, or explicitly vanilla.`,
    /\b(3d|three\.js|threejs|webgl)\b/i.test(request)
      ? `Add three.js for any requested 3D or WebGL work.`
      : `Do not add three.js unless the request explicitly asks for 3D.`,
    `Keep the workspace easy to inspect from the file explorer and easy to run from the terminal.`,
    `Create the minimal starter files first, then wire a runnable dev server and a previewable entry point.`,
    `Use the terminal to install dependencies, start the server, and verify the app locally.`,
    request ? `User request: ${request}` : `User request: build a sensible web-dev starter for this workspace.`
  ];
  return lines.join("\n");
}

function buildWebDevStarterPrompt(cwd: string): string {
  return buildWebDevPrompt(
    "Create a Bun web-dev starter. Default to React when a UI framework is wanted, add three.js when 3D is mentioned, and use HTML + JavaScript for a simple vanilla app.",
    cwd
  );
}

function chooseWebDevStack(request: string): "react" | "html-js" {
  const normalized = request.toLowerCase();
  if (/\b(html\s*\+?\s*js|plain html|vanilla|static site|simple site|no framework)\b/.test(normalized)) {
    return "html-js";
  }
  if (/\b(react|vue|svelte|solid|preact|next|nuxt|ui framework|ui library|component library|tailwind|antd|mui|chakra)\b/.test(normalized)) {
    return "react";
  }
  return "html-js";
}

function buildImageThreadItems(input: {
  prompt: string;
  mode: "generate" | "edit";
  sourceImages: ComposerImageAttachment[];
  result: { data?: Array<{ url?: string; b64Json?: string; revisedPrompt?: string }>; model?: string; providerName?: string; prompt?: string } | null;
  provider: ProviderConfig;
}): JsonValue[] {
  const items: JsonValue[] = [];
  const userContent: JsonValue[] = [{ type: "input_text", text: input.prompt }];
  if (input.mode === "edit") {
    for (const image of input.sourceImages) {
      userContent.push({
        type: "input_image",
        image_url: image.url,
        detail: "auto"
      });
    }
  }
  items.push({
    type: "message",
    role: "user",
    content: userContent
  });
  for (const image of input.result?.data ?? []) {
    const b64 = image.b64Json ?? dataUrlToBase64(image.url);
    if (!b64) {
      continue;
    }
    items.push({
      type: "image_generation_call",
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "completed",
      revised_prompt: image.revisedPrompt ?? input.prompt,
      result: b64,
      provider_name: input.provider.name,
      model: input.result?.model ?? input.provider.image?.defaultModel ?? "gpt-image-2"
    });
  }
  return items;
}

function buildLocalImageThreadTurns(input: {
  threadId: string;
  prompt: string;
  mode: "generate" | "edit";
  sourceImages: ComposerImageAttachment[];
  result: { data?: Array<{ url?: string; b64Json?: string; revisedPrompt?: string }>; model?: string; providerName?: string; prompt?: string } | null;
  provider: ProviderConfig;
  items: JsonValue[];
}): ClientState["turns"] {
  const turnId = `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return threadReadToTurns({
    thread: {
      id: input.threadId,
      turns: [
        {
          id: turnId,
          status: "completed",
          startedAt: Math.floor(Date.now() / 1000),
          completedAt: Math.floor(Date.now() / 1000),
          items: input.items
        }
      ]
    }
  } as JsonValue).turns;
}

async function composerImageAttachmentToFile(image: ComposerImageAttachment): Promise<File> {
  const response = await fetch(image.url);
  if (!response.ok) {
    throw new Error(`Failed to read image attachment: ${image.name}`);
  }
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || image.name.split(".").pop() || "png";
  const name = image.name || `image.${extension}`;
  return new File([blob], name, { type: blob.type || "image/png" });
}

function dataUrlToBase64(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  if (!url.startsWith("data:")) {
    return undefined;
  }
  const parts = url.split(",", 2);
  return parts.length === 2 ? parts[1] : undefined;
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
    return [{ id: threadId, title: name, name, preview: name, updatedAt, status: "idle" }, ...threads];
  }
  return threads.map((thread) => (thread.id === threadId ? { ...thread, title: name, name, preview: name, updatedAt } : thread));
}

function displayThreadTitle(thread: ClientState["threads"][number]): string {
  const title = thread.title || thread.name || thread.preview;
  if (title?.trim()) {
    return title.trim();
  }
  const stamp = thread.recencyAt ?? thread.updatedAt ?? thread.createdAt;
  const date = stamp ? new Date(stamp * 1000).toISOString().slice(0, 10) : "Stored thread";
  return `${date} ${thread.id.slice(0, 8)}`;
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

function readStoredString(key: string, fallback: string): string {
  const raw = localStorage.getItem(key);
  return raw == null ? fallback : raw;
}

function providerCacheKey(session: AuthSession | null): string | null {
  if (!session?.token) {
    return null;
  }
  const userScope = session.user?.id ?? session.user?.email ?? "local";
  return `${UI_STORAGE_KEYS.providerCachePrefix}.${userScope}`;
}

function readCachedProviders(session: AuthSession | null): ProviderConfig[] | null {
  const key = providerCacheKey(session);
  if (!key) {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { providers?: unknown };
    if (!Array.isArray(parsed.providers)) {
      return null;
    }
    const providers = parsed.providers.filter(isProviderConfigLike);
    return providers.length === parsed.providers.length ? providers : null;
  } catch {
    return null;
  }
}

function writeCachedProviders(session: AuthSession | null, providers: ProviderConfig[]): void {
  const key = providerCacheKey(session);
  if (!key) {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify({ cachedAt: Date.now(), providers }));
  } catch {
    /* Storage quota or privacy settings should not block the authoritative SQLite store. */
  }
}

function isProviderConfigLike(value: unknown): value is ProviderConfig {
  const record = asRecord(value);
  return (
    typeof record.id === "string" &&
    typeof record.kind === "string" &&
    typeof record.name === "string" &&
    Array.isArray(record.nativeModels) &&
    Array.isArray(record.modelAliases) &&
    typeof record.createdAt === "number" &&
    typeof record.updatedAt === "number"
  );
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

function applyTokenUsagePricing(usage: ThreadTokenUsageState, provider: ProviderConfig | undefined, model: string): ThreadTokenUsageState {
  return {
    ...usage,
    total: priceTokenBreakdown(usage.total, provider, model),
    last: priceTokenBreakdown(usage.last, provider, model)
  };
}

type PricedModelRate = NonNullable<ProviderConfig["modelRates"]>[number] & {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

function priceTokenBreakdown(usage: TokenUsageBreakdown, provider: ProviderConfig | undefined, model: string): TokenUsageBreakdown {
  const rate = resolveModelRate(provider, model);
  if (!rate) {
    return usage;
  }
  const cachedTokens = Math.max(0, usage.cachedInputTokens);
  const cacheWriteTokens = Math.max(0, usage.cacheWriteInputTokens);
  const standardInputTokens = Math.max(0, usage.inputTokens - cachedTokens - cacheWriteTokens);
  const cachedRate = rate.cachedInputUsdPerMillion ?? rate.inputUsdPerMillion;
  const cacheWriteRate = rate.cacheWriteUsdPerMillion ?? rate.inputUsdPerMillion;
  const legacyMultiplier = rate.multiplier || 1;
  const inputMultiplier = rate.inputMultiplier ?? legacyMultiplier;
  const cacheReadMultiplier = rate.cacheReadMultiplier ?? legacyMultiplier;
  const cacheWriteMultiplier = rate.cacheWriteMultiplier ?? legacyMultiplier;
  const outputMultiplier = rate.outputMultiplier ?? legacyMultiplier;
  const inputCost = (standardInputTokens * rate.inputUsdPerMillion) / 1_000_000 * inputMultiplier;
  const cachedInputCost = (cachedTokens * cachedRate) / 1_000_000 * cacheReadMultiplier;
  const cacheWriteCost = (cacheWriteTokens * cacheWriteRate) / 1_000_000 * cacheWriteMultiplier;
  const outputCost = (usage.outputTokens * rate.outputUsdPerMillion) / 1_000_000 * outputMultiplier;
  return {
    ...usage,
    estimatedCostUsd: inputCost + cachedInputCost + cacheWriteCost + outputCost,
    costBreakdownUsd: {
      input: inputCost,
      cachedInput: cachedInputCost,
      cacheWrite: cacheWriteCost,
      output: outputCost
    }
  };
}

function resolveModelRate(provider: ProviderConfig | undefined, model: string): PricedModelRate | undefined {
  const resolvedModel = model.trim();
  const providerRate = provider?.modelRates?.find((rate) => rate.model === resolvedModel);
  const defaultRate = DEFAULT_MODEL_RATES.find((rate) => rate.model === resolvedModel);
  if (!providerRate) {
    return defaultRate && isPricedModelRate(defaultRate) ? defaultRate : undefined;
  }
  const inputUsdPerMillion = providerRate.inputUsdPerMillion ?? defaultRate?.inputUsdPerMillion;
  const outputUsdPerMillion = providerRate.outputUsdPerMillion ?? defaultRate?.outputUsdPerMillion;
  if (inputUsdPerMillion == null || outputUsdPerMillion == null) {
    return undefined;
  }
  return {
    ...defaultRate,
    ...providerRate,
    inputUsdPerMillion,
    outputUsdPerMillion,
    cachedInputUsdPerMillion: providerRate.cachedInputUsdPerMillion ?? defaultRate?.cachedInputUsdPerMillion,
    cacheWriteUsdPerMillion: providerRate.cacheWriteUsdPerMillion ?? defaultRate?.cacheWriteUsdPerMillion
  };
}

function isPricedModelRate(rate: NonNullable<ProviderConfig["modelRates"]>[number]): rate is PricedModelRate {
  return rate.inputUsdPerMillion != null && rate.outputUsdPerMillion != null;
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

function buildHistoryUsageByThread(tokenUsage: Record<string, ThreadTokenUsageState>): Record<string, HistoryThreadUsageSummary> {
  return Object.fromEntries(
    Object.entries(tokenUsage).map(([threadId, usage]) => [
      threadId,
      {
        totalTokens: usage.total.totalTokens,
        inputTokens: usage.total.inputTokens,
        cachedInputTokens: usage.total.cachedInputTokens,
        cacheWriteInputTokens: usage.total.cacheWriteInputTokens,
        outputTokens: usage.total.outputTokens,
        estimatedCostUsd: usage.total.estimatedCostUsd
      }
    ])
  );
}

function fastReasoningEffort(options: ReasoningOption[], current: string): string {
  return options[0]?.value ?? (current === "minimal" ? "minimal" : "low");
}

function normalizeThreads(value: unknown[]): ClientState["threads"] {
  return value
    .map((entry) => asRecord(entry))
    .map((entry) => {
      const name = stringValue(entry.name) ?? stringValue(entry.threadName) ?? stringValue(entry.thread_name);
      const title = name ?? stringValue(entry.title);
      return {
        id: String(entry.id ?? ""),
        sessionId: stringValue(entry.sessionId) ?? stringValue(entry.session_id),
        title,
        name,
        preview: stringValue(entry.preview),
        model: stringValue(entry.model),
        modelProvider: stringValue(entry.modelProvider) ?? stringValue(entry.model_provider),
        parentThreadId: stringValue(entry.parentThreadId) ?? stringValue(entry.parent_thread_id),
        forkedFromId: stringValue(entry.forkedFromId) ?? stringValue(entry.forked_from_id),
        agentNickname: stringValue(entry.agentNickname) ?? stringValue(entry.agent_nickname),
        agentRole: stringValue(entry.agentRole) ?? stringValue(entry.agent_role),
        createdAt: numberValue(entry.createdAt) ?? numberValue(entry.created_at),
        updatedAt: numberValue(entry.updatedAt) ?? numberValue(entry.updated_at),
        recencyAt: numberValue(entry.recencyAt) ?? numberValue(entry.recency_at),
        status: stringValue(entry.status),
        cwd: stringValue(entry.cwd),
        source: normalizeThreadSource(entry.source),
        threadSource: normalizeThreadSource(entry.threadSource ?? entry.thread_source),
        path: stringValue(entry.path)
      };
    })
    .filter((entry) => entry.id);
}

function normalizeThreadSource(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  const record = asRecord(value);
  return stringValue(record.type) ?? stringValue(record.kind) ?? stringValue(record.source);
}

function upsertThread(threads: ClientState["threads"], thread: ClientState["threads"][number]): ClientState["threads"] {
  const found = threads.some((entry) => entry.id === thread.id);
  return found ? threads.map((entry) => (entry.id === thread.id ? { ...entry, ...thread } : entry)) : [thread, ...threads];
}

function mergeTurns(current: ClientState["turns"], loaded: ClientState["turns"]): ClientState["turns"] {
  const loadedIds = new Set(loaded.map((turn) => turn.id));
  return [...current.filter((turn) => !loadedIds.has(turn.id)), ...loaded];
}

function isRunningTurnStatus(status?: string): boolean {
  return status === "inProgress" || status === "pending" || status === "pendingInit" || status === "started";
}

function normalizeTimestampMilliseconds(value?: number): number | null {
  if (!value || !Number.isFinite(value)) {
    return null;
  }
  return value > 1_000_000_000_000 ? value : value * 1000;
}

function buildServerRequestDecisionResponse(method: string | undefined, params: JsonValue | undefined, decision: "accept" | "acceptForSession" | "decline" | "cancel"): JsonValue {
  if (method === "execCommandApproval" || method === "applyPatchApproval") {
    return { decision: legacyReviewDecision(decision) };
  }
  const requestParams = asRecord(params);
  if (method === "item/permissions/requestApproval" || Object.keys(asRecord(requestParams.permissions)).length > 0) {
    if (decision === "accept" || decision === "acceptForSession") {
      const requested = asRecord(requestParams.permissions);
      const permissions: Record<string, JsonValue> = {};
      if (requested.network != null) permissions.network = requested.network as JsonValue;
      if (requested.fileSystem != null) permissions.fileSystem = requested.fileSystem as JsonValue;
      return { permissions, scope: decision === "acceptForSession" ? "session" : "turn" };
    }
    return { permissions: {}, scope: "turn" };
  }
  return { decision };
}

function legacyReviewDecision(decision: "accept" | "acceptForSession" | "decline" | "cancel"): string {
  switch (decision) {
    case "accept":
      return "approved";
    case "acceptForSession":
      return "approved_for_session";
    case "decline":
      return "denied";
    case "cancel":
      return "abort";
  }
}

type ConversationStatus = "working" | "idle" | "disconnect" | "retrying" | "engine-error";

function getConversationStatus(connected: boolean, enginePhase: string, hasRunningTurn: boolean): ConversationStatus {
  if (!connected) {
    return "disconnect";
  }
  if (enginePhase === "starting" || enginePhase === "idle") {
    return "retrying";
  }
  if (enginePhase !== "ready") {
    return enginePhase === "error" ? "engine-error" : "retrying";
  }
  return hasRunningTurn ? "working" : "idle";
}

function conversationStatusColorFor(status: ConversationStatus): "success" | "error" | "warning" | "primary" | "default" {
  switch (status) {
    case "working":
      return "primary";
    case "idle":
      return "success";
    case "disconnect":
    case "engine-error":
      return "error";
    case "retrying":
      return "warning";
  }
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

function normalizeSshWorkspaceCwd(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "") || "/";
}

function isSshWorkspaceCommand(value: string): boolean {
  return value.trim().startsWith("ssh ") || value.trim() === "ssh";
}

function workspaceDirectoryCacheKey(mode: WorkspaceMode, sshCommand: string, path: string): string {
  return mode === "ssh" ? `ssh:${sshCommand.trim()}:${path}` : path;
}

function addWorkspaceRpcMetadata(params: Record<string, JsonValue>, mode: WorkspaceMode, sshCommand: string, cwd: string): void {
  if (mode !== "ssh") {
    return;
  }
  params.workspace = {
    type: "ssh",
    command: sshCommand.trim(),
    cwd
  };
  params.remoteWorkspace = params.workspace;
}

async function fetchSshDirectory(token: string, command: string, path: string): Promise<JsonValue> {
  const response = await fetch("/api/ssh/list-directory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-ui-token": token
    },
    body: JSON.stringify({ command, path })
  });
  const body = (await response.json().catch(() => ({}))) as JsonValue;
  if (!response.ok) {
    throw new Error(stringValue(asRecord(body).error) ?? `SSH directory read failed: ${response.status}`);
  }
  return body;
}

function syncWorkspaceFromThread(
  thread: ClientState["threads"][number] | null,
  setCwd: (cwd: string) => void,
  setWorkspaceSelectionPending: (pending: boolean) => void
): void {
  const threadCwd = normalizeWorkspaceCwd(thread?.cwd ?? "");
  if (!threadCwd) {
    return;
  }
  setCwd(threadCwd);
  setWorkspaceSelectionPending(false);
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

function AuthLoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
        color: "text.primary"
      }}
    >
      <Stack spacing={2} alignItems="center">
        <CircularProgress size={30} />
        <Typography variant="body2" color="text.secondary">
          Checking session
        </Typography>
      </Stack>
    </Box>
  );
}

function LoginScreen({
  error,
  submitting,
  onSubmit,
  onRegister,
  onLogin2fa
}: {
  error: string | null;
  submitting: boolean;
  onSubmit: (
    email: string,
    password: string,
    captcha?: { captchaId?: string; captchaAnswer?: string }
  ) => Promise<{ requires_2fa?: boolean; pendingToken?: string } | void>;
  onRegister?: (input: {
    email: string;
    password: string;
    username?: string;
    captchaId?: string;
    captchaAnswer?: string;
  }) => Promise<void>;
  onLogin2fa?: (pendingToken: string, totpCode: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | "2fa">("login");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaPrompt, setCaptchaPrompt] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [authConfig, setAuthConfig] = useState<{ registrationEnabled: boolean; captchaEnabled: boolean; totpEnabled: boolean }>({
    registrationEnabled: false,
    captchaEnabled: true,
    totpEnabled: true
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const refreshCaptcha = useCallback(async () => {
    try {
      const challenge = await fetchCaptcha();
      setCaptchaId(challenge.id);
      // Strip accidental XML prologues so inline SVG never renders as a black box.
      setCaptchaSvg(challenge.svg.replace(/^\s*<\?xml[^?]*\?>\s*/i, "").trim());
      setCaptchaPrompt(challenge.prompt ?? "");
      setCaptchaAnswer("");
    } catch {
      setCaptchaId("");
      setCaptchaSvg("");
      setCaptchaPrompt("");
      setCaptchaAnswer("");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setAuthConfig(await fetchPublicAuthConfig());
      } catch {
        /* keep defaults */
      }
      await refreshCaptcha();
    })();
  }, [refreshCaptcha]);

  const captchaPayload = authConfig.captchaEnabled
    ? { captchaId, captchaAnswer: captchaAnswer.trim() }
    : undefined;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 40%), #0b1220"
            : "radial-gradient(circle at top, rgba(14,165,233,0.12), transparent 40%), #f4f7fb"
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            setLocalError(null);
            try {
              if (mode === "2fa") {
                await onLogin2fa?.(pendingToken, totpCode.trim());
                return;
              }
              if (mode === "register") {
                await onRegister?.({
                  email: email.trim(),
                  password,
                  username: username.trim() || undefined,
                  captchaId: captchaPayload?.captchaId,
                  captchaAnswer: captchaPayload?.captchaAnswer
                });
                setMode("login");
                await refreshCaptcha();
                return;
              }
              const result = await onSubmit(email.trim(), password, captchaPayload);
              if (result?.requires_2fa && result.pendingToken) {
                setPendingToken(result.pendingToken);
                setMode("2fa");
                setTotpCode("");
                return;
              }
            } catch (err) {
              setLocalError(err instanceof Error ? err.message : String(err));
              await refreshCaptcha();
            }
          })();
        }}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(15,23,42,0.88)" : "rgba(255,255,255,0.92)"),
          backdropFilter: "blur(16px)",
          boxShadow: 8
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
              Codex React UI
            </Typography>
            <Typography color="text.secondary">
              {mode === "register" ? t("auth.registerTitle") : mode === "2fa" ? t("auth.totpTitle") : t("auth.loginTitle")}
            </Typography>
          </Box>

          {(error || localError) && (
            <Alert severity="error" variant="outlined">
              {localError || error}
            </Alert>
          )}

          {mode === "2fa" ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {t("auth.totpHint")}
              </Typography>
              <TextField
                id="login-totp"
                size="small"
                label={t("auth.totpCode")}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputProps={{ inputMode: "numeric", maxLength: 6, autoComplete: "one-time-code" }}
                autoFocus
              />
              <Button type="submit" variant="contained" disabled={submitting || totpCode.trim().length < 6} sx={{ borderRadius: 999, py: 1.1, fontWeight: 800 }}>
                {submitting ? t("auth.verifying") : t("auth.verify")}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setMode("login");
                  setPendingToken("");
                  setTotpCode("");
                  void refreshCaptcha();
                }}
              >
                {t("auth.backToLogin")}
              </Button>
            </>
          ) : (
            <>
              <TextField id="login-email" size="small" label={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
              <TextField
                id="login-password"
                size="small"
                type="password"
                label={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              {mode === "register" ? (
                <TextField id="login-username" size="small" label={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
              ) : null}

              {authConfig.captchaEnabled ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      role="img"
                      aria-label={captchaPrompt ? t("auth.captchaAria", { prompt: captchaPrompt }) : t("auth.captcha")}
                      onClick={() => void refreshCaptcha()}
                      title={t("auth.refreshCaptcha")}
                      sx={{
                        flex: 1,
                        height: 72,
                        minWidth: 220,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "#0f172a",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        "& svg": {
                          display: "block",
                          width: "100%",
                          height: "100%",
                          maxWidth: 220,
                          maxHeight: 72
                        }
                      }}
                    >
                      {captchaSvg ? (
                        <Box sx={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                      ) : null}
                      {!captchaSvg && captchaPrompt ? (
                        <Typography
                          variant="body2"
                          sx={{
                            position: "absolute",
                            inset: 0,
                            display: "grid",
                            placeItems: "center",
                            color: "#f8fafc",
                            fontWeight: 900,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            letterSpacing: 1
                          }}
                        >
                          {captchaPrompt}
                        </Typography>
                      ) : null}
                      {!captchaSvg && !captchaPrompt ? (
                        <Typography variant="caption" color="rgba(226,232,240,0.72)" sx={{ fontWeight: 800 }}>
                          {t("auth.refreshCaptcha")}
                        </Typography>
                      ) : null}
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => void refreshCaptcha()} sx={{ borderRadius: 999, minWidth: 72 }}>
                      {t("auth.refreshCaptcha")}
                    </Button>
                  </Stack>
                  <TextField
                    id="login-captcha"
                    size="small"
                    label={t("auth.captcha")}
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    required
                    placeholder={t("auth.captchaPlaceholder")}
                  />
                </Stack>
              ) : null}

              <Button type="submit" variant="contained" disabled={submitting} sx={{ borderRadius: 999, py: 1.1, fontWeight: 800 }}>
                {submitting ? t("auth.submitting") : mode === "register" ? t("auth.register") : t("auth.login")}
              </Button>

              {authConfig.registrationEnabled ? (
                <Button
                  size="small"
                  onClick={() => {
                    setMode((current) => (current === "register" ? "login" : "register"));
                    setLocalError(null);
                    void refreshCaptcha();
                  }}
                >
                  {mode === "register" ? t("auth.haveAccount") : t("auth.needAccount")}
                </Button>
              ) : null}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
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

async function loadHistoryThreadById(client: CodexSocketClient, threadId: string): Promise<ClientState["threads"][number] | null> {
  try {
    const response = await client.rpc("thread/read", { threadId, includeTurns: false });
    const record = asRecord(response);
    const thread = asRecord(record.thread ?? record.data ?? record);
    const normalized = normalizeThreads([{ ...thread, id: stringValue(thread.id) ?? threadId }]);
    return normalized[0] ?? null;
  } catch (error) {
    console.warn("[history] direct thread id search failed", threadId, error);
    return null;
  }
}

async function loadAllThreads(
  client: CodexSocketClient,
  options: { searchTerm?: string; includeAutomationHistory?: boolean } = {}
): Promise<ClientState["threads"]> {
  const threads: ClientState["threads"] = [];
  const searchTerm = options.searchTerm?.trim();
  // Always list every interactive + automation source. Codex treats omitted/empty
  // sourceKinds as interactive-only, so name them explicitly. includeAutomationHistory
  // is kept for UI compatibility but no longer reduces sources.
  const sourceKinds: ("cli" | "vscode" | "exec" | "appServer")[] = ["cli", "vscode", "exec", "appServer"];
  void options.includeAutomationHistory;
  for (const archived of [false, true]) {
    let cursor: string | null = null;
    for (let guard = 0; guard < 32; guard += 1) {
      const params: Record<string, JsonValue> = {
        cursor,
        limit: 200,
        archived,
        sourceKinds,
        // Empty modelProviders means ALL providers. Codex defaults to current
        // model_provider only, which would hide CLI/TUI sessions (e.g. code_launch).
        modelProviders: [],
        useStateDbOnly: false,
        sortKey: "recency_at",
        sortDirection: "desc"
      };
      if (searchTerm) {
        params.searchTerm = searchTerm;
      }
      const response = await client.rpc("thread/list", params);
      const record = asRecord(response);
      const batch = Array.isArray(record.data)
        ? normalizeThreads(record.data)
        : Array.isArray(record.threads)
          ? normalizeThreads(record.threads)
          : [];
      for (const thread of batch) {
        // No source/parent filtering: show every thread returned by app-server.
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
  return threads.sort((a, b) => (b.recencyAt ?? b.updatedAt ?? b.createdAt ?? 0) - (a.recencyAt ?? a.updatedAt ?? a.createdAt ?? 0));
}

function mergeThreadLists(...lists: ClientState["threads"][]): ClientState["threads"] {
  const byId = new Map<string, ClientState["threads"][number]>();
  for (const list of lists) {
    for (const thread of list) {
      byId.set(thread.id, { ...byId.get(thread.id), ...thread });
    }
  }
  return Array.from(byId.values()).sort((a, b) => (b.recencyAt ?? b.updatedAt ?? b.createdAt ?? 0) - (a.recencyAt ?? a.updatedAt ?? a.createdAt ?? 0));
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
      title: thread ? displayThreadTitle(thread) : turn.id,
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
