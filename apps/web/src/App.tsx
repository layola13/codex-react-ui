import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  Toolbar,
  Typography
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  permissionToTurnOverrides,
  type JsonValue,
  type PermissionPresetId,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";
import {
  CodexSocketClient,
  applyNotification,
  composerInputToUserInput,
  fetchProviders,
  fetchSessionToken,
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
import { RightInspector } from "./components/RightInspector";

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
    case "notification":
      return applyNotification(state, action.message);
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

export function App() {
  const [state, dispatch] = useReducer(reducer, initialClientState);
  const [permission, setPermission] = useState<PermissionPresetId>("workspaceAsk");
  const [selectedModel, setSelectedModel] = useState("");
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [cwd, setCwd] = useState("/root/projects");
  const [pendingMention, setPendingMention] = useState<ComposerMention | null>(null);
  const [pluginDetails, setPluginDetails] = useState<Record<string, PluginDetailEntry>>({});
  const [pluginSkillPreviews, setPluginSkillPreviews] = useState<Record<string, string>>({});
  const [pluginAuthNotices, setPluginAuthNotices] = useState<Record<string, PluginInstallAuthNotice>>({});
  const [skillExtraRoots, setSkillExtraRoots] = useState<string[]>([]);
  const [skillPreviews, setSkillPreviews] = useState<Record<string, string>>({});
  const [fileDirectories, setFileDirectories] = useState<Record<string, FsDirectoryEntry[]>>({});
  const [openFile, setOpenFile] = useState<{ path: string; content: string; savedContent: string; loading: boolean; saving: boolean } | null>(null);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [mcpResourceContents, setMcpResourceContents] = useState<Record<string, McpResourceContentEntry[]>>({});
  const [mcpOauthUrls, setMcpOauthUrls] = useState<Record<string, string>>({});
  const clientRef = useRef<CodexSocketClient | null>(null);

  const client = useMemo(() => {
    const socketClient = new CodexSocketClient();
    clientRef.current = socketClient;
    return socketClient;
  }, []);

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
          approvalPolicy: permissionOverrides.approvalPolicy
        };
        if (effectiveModel) {
          turnParams.model = effectiveModel;
        }
        await client.rpc("turn/start", turnParams);
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [activeProviderId, client, cwd, permission, selectedModel, state.activeThreadId, state.providers]
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

  const statusColor =
    state.engine.phase === "ready" ? "success" : state.engine.phase === "error" ? "error" : "warning";

  return (
    <Box sx={{ height: "100vh", display: "grid", gridTemplateRows: "56px minmax(0, 1fr)" }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar variant="dense" sx={{ gap: 1.5 }}>
          <PlayArrowIcon color="primary" />
          <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 750, flex: 1 }}>
            Codex React UI
          </Typography>
          <Chip size="small" color={statusColor} label={state.engine.phase} />
          <Typography variant="body2" color="text.secondary">
            {state.engine.codexVersion ?? state.engine.message ?? "initializing"}
          </Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => void loadBasics()}>
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "300px minmax(0, 1fr) 390px",
            xl: "330px minmax(0, 1fr) 440px"
          },
          gap: 0,
          overflow: "hidden"
        }}
      >
        <HistorySidebar
          threads={state.threads}
          activeThreadId={state.activeThreadId}
          onSelect={(threadId) => void loadThread(threadId)}
          onNew={() => dispatch({ type: "activeThread", threadId: null })}
        />
        <Box sx={{ minWidth: 0, minHeight: 0, display: "grid", gridTemplateRows: "minmax(0, 1fr) auto" }}>
          {state.engine.phase === "starting" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Starting Codex engine...</Typography>
            </Box>
          )}
          <ChatPanel turns={state.turns} activeThreadId={state.activeThreadId} errors={state.errors} />
          <Divider />
          <Composer
            cwd={cwd}
            model={selectedModel}
            models={composerModels}
            permission={permission}
            disabled={!state.connected || state.engine.phase !== "ready"}
            pendingMention={pendingMention}
            onCwdChange={setCwd}
            onModelChange={setSelectedModel}
            onPermissionChange={setPermission}
            onMentionConsumed={() => setPendingMention(null)}
            onSend={(text, images, mentions) => void sendPrompt(text, images, mentions)}
          />
        </Box>
        <RightInspector
          account={state.account}
          models={state.models}
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
          onAnswerRequest={answerRequest}
          onSaveProvider={(provider, apiKey) => void saveProvider(provider, apiKey)}
          onActivateProvider={(providerId, model) => void activateProvider(providerId, model)}
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
      </Box>
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
