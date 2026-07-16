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
  parsePluginMarketplaces,
  parseSkillGroups,
  threadReadToTurns,
  type ClientState,
  type ComposerImageAttachment,
  type PluginEntry,
  type PluginMarketplace,
  type SkillEntry
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
  const [cwd, setCwd] = useState("/root/projects");
  const clientRef = useRef<CodexSocketClient | null>(null);

  const client = useMemo(() => {
    const socketClient = new CodexSocketClient();
    clientRef.current = socketClient;
    return socketClient;
  }, []);

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
    async (options?: { forceSkillReload?: boolean }) => {
      dispatch({ type: "toolingLoading", loading: true });
      const [mcpResult, skillResult, pluginResult] = await Promise.allSettled([
        client.rpc("mcpServerStatus/list", { detail: "full" }),
        client.rpc("skills/list", { cwds: [cwd], forceReload: options?.forceSkillReload ?? false }),
        client.rpc("plugin/list", {
          cwds: [cwd],
          marketplaceKinds: ["local", "workspace-directory", "vertical", "shared-with-me", "created-by-me-remote"]
        })
      ]);

      const nextTooling: ClientState["tooling"] = {
        mcpServers: [],
        skillGroups: [],
        pluginMarketplaces: [],
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

      dispatch({ type: "tooling", tooling: nextTooling });
      for (const message of errors) {
        dispatch({ type: "error", message });
      }
    },
    [client, cwd]
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
  }, [client, loadTooling, state.providers]);

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
    async (text: string, images: ComposerImageAttachment[]) => {
      const input = composerInputToUserInput(text, images);
      if (input.length === 0) {
        return;
      }
      try {
        let threadId = state.activeThreadId;
        const permissionOverrides = permissionToTurnOverrides(permission, cwd);
        if (!threadId) {
          const startParams: Record<string, JsonValue> = {
            cwd,
            sandbox: permissionOverrides.sandbox,
            approvalPolicy: permissionOverrides.approvalPolicy,
            sessionStartSource: "startup"
          };
          if (selectedModel) {
            startParams.model = selectedModel;
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
        if (selectedModel) {
          turnParams.model = selectedModel;
        }
        await client.rpc("turn/start", turnParams);
      } catch (error) {
        dispatch({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    },
    [client, cwd, permission, selectedModel, state.activeThreadId]
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

  const installPlugin = useCallback(
    async (marketplace: PluginMarketplace, plugin: PluginEntry) => {
      try {
        await client.rpc("plugin/install", {
          marketplacePath: marketplace.path ?? null,
          remoteMarketplaceName: marketplace.path ? null : marketplace.name,
          pluginName: plugin.name
        });
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
            models={state.models}
            permission={permission}
            disabled={!state.connected || state.engine.phase !== "ready"}
            onCwdChange={setCwd}
            onModelChange={setSelectedModel}
            onPermissionChange={setPermission}
            onSend={(text, images) => void sendPrompt(text, images)}
          />
        </Box>
        <RightInspector
          account={state.account}
          models={state.models}
          providers={state.providers}
          pendingRequests={state.pendingRequests}
          tooling={state.tooling}
          toolingLoading={state.toolingLoading}
          onAnswerRequest={answerRequest}
          onSaveProvider={(provider, apiKey) => void saveProvider(provider, apiKey)}
          onActivateProvider={(providerId, model) => void activateProvider(providerId, model)}
          onReloadTooling={() => void loadTooling({ forceSkillReload: true })}
          onReloadMcp={() => void reloadMcp()}
          onToggleSkill={(skill, enabled) => void toggleSkill(skill, enabled)}
          onInstallPlugin={(marketplace, plugin) => void installPlugin(marketplace, plugin)}
          onUninstallPlugin={(plugin) => void uninstallPlugin(plugin)}
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
