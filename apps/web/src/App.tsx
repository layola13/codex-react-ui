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
  threadReadToTurns,
  type ClientState,
  type ComposerImageAttachment
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
  | { type: "notification"; message: Extract<ServerToClientMessage, { type: "codex.notification" }>["message"] }
  | { type: "serverRequest"; message: Extract<ServerToClientMessage, { type: "codex.serverRequest" }>["message"] }
  | { type: "serverRequestResolved"; id: string | number }
  | { type: "error"; message: string };

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
  }, [client, state.providers]);

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
          onAnswerRequest={answerRequest}
          onSaveProvider={(provider, apiKey) => void saveProvider(provider, apiKey)}
          onActivateProvider={(providerId, model) => void activateProvider(providerId, model)}
        />
      </Box>
      <Snackbar
        open={state.errors.length > 0}
        autoHideDuration={6000}
        onClose={() => dispatch({ type: "error", message: "" })}
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
