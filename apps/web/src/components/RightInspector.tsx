import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import FolderIcon from "@mui/icons-material/Folder";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import ExtensionIcon from "@mui/icons-material/Extension";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { JsonValue, ProviderConfig } from "@codex-ui/shared";
import type {
  ModelEntry,
  McpResourceContentEntry,
  PluginAppEntry,
  FsDirectoryEntry,
  PendingServerRequest,
  PluginDetailEntry,
  PluginEntry,
  PluginInstallAuthNotice,
  PluginMarketplace,
  SkillEntry,
  TerminalSession,
  ToolingState
} from "../state/codexClient";

loader.config({ monaco });

type Props = {
  account: JsonValue | null;
  models: ModelEntry[];
  providers: ProviderConfig[];
  activeThreadId: string | null;
  pendingRequests: PendingServerRequest[];
  tooling: ToolingState;
  toolingLoading: boolean;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  pluginAuthNotices: Record<string, PluginInstallAuthNotice>;
  skillExtraRoots: string[];
  skillPreviews: Record<string, string>;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  cwd: string;
  fileDirectories: Record<string, FsDirectoryEntry[]>;
  openFile: { path: string; content: string; savedContent: string; loading: boolean; saving: boolean } | null;
  terminalSessions: TerminalSession[];
  onAnswerRequest: (id: string | number, decision: "accept" | "acceptForSession" | "decline" | "cancel") => void;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
  onActivateProvider: (providerId: string, model?: string) => void;
  onReloadTooling: () => void;
  onReloadMcp: () => void;
  onStartMcpOauth: (serverName: string) => void;
  onReadMcpResource: (serverName: string, uri: string) => void;
  onCallMcpTool: (serverName: string, toolName: string, args: JsonValue) => Promise<JsonValue>;
  onToggleSkill: (skill: SkillEntry, enabled: boolean) => void;
  onSaveSkillExtraRoots: (roots: string[]) => void;
  onReadSkillPreview: (skill: SkillEntry) => void;
  onReadPluginDetail: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onReadPluginSkill: (marketplace: PluginMarketplace, plugin: PluginEntry, skillName: string) => void;
  onInsertPluginMention: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onInstallPlugin: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onUninstallPlugin: (plugin: PluginEntry) => void;
  onReadDirectory: (path: string) => void;
  onReadFile: (path: string) => void;
  onChangeOpenFileContent: (content: string) => void;
  onSaveOpenFile: () => void;
  onRunTerminalCommand: (command: string, cwd: string, size: { rows: number; cols: number }) => void;
  onWriteTerminalInput: (processId: string, input: string) => void;
  onTerminateTerminal: (processId: string) => void;
  onResizeTerminal: (processId: string, size: { rows: number; cols: number }) => void;
};

export function RightInspector({
  account,
  models,
  providers,
  activeThreadId,
  pendingRequests,
  tooling,
  toolingLoading,
  pluginDetails,
  pluginSkillPreviews,
  pluginAuthNotices,
  skillExtraRoots,
  skillPreviews,
  mcpResourceContents,
  mcpOauthUrls,
  cwd,
  fileDirectories,
  openFile,
  terminalSessions,
  onAnswerRequest,
  onSaveProvider,
  onActivateProvider,
  onReloadTooling,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onCallMcpTool,
  onToggleSkill,
  onSaveSkillExtraRoots,
  onReadSkillPreview,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin,
  onReadDirectory,
  onReadFile,
  onChangeOpenFileContent,
  onSaveOpenFile,
  onRunTerminalCommand,
  onWriteTerminalInput,
  onTerminateTerminal,
  onResizeTerminal
}: Props) {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ borderLeft: "1px solid", borderColor: "divider", minWidth: 0, minHeight: 0, display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" }}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
        <Tab label="Config" />
        <Tab label="Tools" />
        <Tab label="Files" />
      </Tabs>
      <Box sx={{ overflow: "auto", p: 1.5 }}>
        {tab === 0 && (
          <ConfigTab
            account={account}
            models={models}
            providers={providers}
            onSaveProvider={onSaveProvider}
            onActivateProvider={onActivateProvider}
          />
        )}
        {tab === 1 && (
          <ToolsTab
            activeThreadId={activeThreadId}
            pendingRequests={pendingRequests}
            tooling={tooling}
            toolingLoading={toolingLoading}
            pluginDetails={pluginDetails}
            pluginSkillPreviews={pluginSkillPreviews}
            pluginAuthNotices={pluginAuthNotices}
            skillExtraRoots={skillExtraRoots}
            skillPreviews={skillPreviews}
            mcpResourceContents={mcpResourceContents}
            mcpOauthUrls={mcpOauthUrls}
            onAnswerRequest={onAnswerRequest}
            onReloadTooling={onReloadTooling}
            onReloadMcp={onReloadMcp}
            onStartMcpOauth={onStartMcpOauth}
            onReadMcpResource={onReadMcpResource}
            onCallMcpTool={onCallMcpTool}
            onToggleSkill={onToggleSkill}
            onSaveSkillExtraRoots={onSaveSkillExtraRoots}
            onReadSkillPreview={onReadSkillPreview}
            onReadPluginDetail={onReadPluginDetail}
            onReadPluginSkill={onReadPluginSkill}
            onInsertPluginMention={onInsertPluginMention}
            onInstallPlugin={onInstallPlugin}
            onUninstallPlugin={onUninstallPlugin}
          />
        )}
        {tab === 2 && (
          <FilesTab
            cwd={cwd}
            fileDirectories={fileDirectories}
            openFile={openFile}
            terminalSessions={terminalSessions}
            onReadDirectory={onReadDirectory}
            onReadFile={onReadFile}
            onChangeOpenFileContent={onChangeOpenFileContent}
            onSaveOpenFile={onSaveOpenFile}
            onRunTerminalCommand={onRunTerminalCommand}
            onWriteTerminalInput={onWriteTerminalInput}
            onTerminateTerminal={onTerminateTerminal}
            onResizeTerminal={onResizeTerminal}
          />
        )}
      </Box>
    </Box>
  );
}

function ConfigTab({
  account,
  models,
  providers,
  onSaveProvider,
  onActivateProvider
}: {
  account: JsonValue | null;
  models: ModelEntry[];
  providers: ProviderConfig[];
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
  onActivateProvider: (providerId: string, model?: string) => void;
}) {
  const [providerModels, setProviderModels] = useState<Record<string, string>>({});

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SecurityIcon fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
            Account
          </Typography>
        </Stack>
        <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere", mt: 1 }}>
          {JSON.stringify(account, null, 2)}
        </Typography>
      </Paper>
      <ProviderForm models={models} onSaveProvider={onSaveProvider} />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1 }}>
          Saved providers
        </Typography>
        <Stack spacing={1}>
          {providers.length === 0 && <Typography color="text.secondary">No third-party relay configured yet.</Typography>}
          {providers.map((provider) => {
            const fallbackModels = provider.defaultModel ? [provider.defaultModel] : [];
            const nativeModelOptions = provider.nativeModels.length > 0 ? provider.nativeModels : fallbackModels;
            const modelOptions = [
              ...provider.modelAliases.map((entry) => ({ value: entry.alias, label: `${entry.alias} -> ${entry.model}` })),
              ...nativeModelOptions.map((model) => ({ value: model, label: model }))
            ].filter((entry, index, entries) => entries.findIndex((candidate) => candidate.value === entry.value) === index);
            const selectedModel = providerModels[provider.id] ?? provider.defaultModel ?? modelOptions[0]?.value ?? "";
            return (
              <Paper key={provider.id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 700, flex: 1 }}>{provider.name}</Typography>
                  <Chip size="small" label={provider.apiKeyStorage ?? (provider.apiKeyRef ? "memory" : "no key")} color={provider.apiKeyStorage === "keyring" ? "success" : "default"} />
                  <Chip size="small" label={provider.kind} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {provider.baseUrl || "managed provider"} {provider.apiKeyPreview ? `- ${provider.apiKeyPreview}` : ""}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                    <InputLabel>Model</InputLabel>
                    <Select
                      value={selectedModel}
                      label="Model"
                      onChange={(event) =>
                        setProviderModels((current) => ({ ...current, [provider.id]: event.target.value }))
                      }
                    >
                      {modelOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onActivateProvider(provider.id, selectedModel || undefined)}
                  >
                    Activate
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}

function ProviderForm({
  models,
  onSaveProvider
}: {
  models: ModelEntry[];
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
}) {
  const [kind, setKind] = useState<ProviderConfig["kind"]>("responsesRelay");
  const [name, setName] = useState("Responses Relay");
  const [baseUrl, setBaseUrl] = useState("https://example.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [nativeModels, setNativeModels] = useState("gpt-5.6-sol");
  const [modelAliases, setModelAliases] = useState("codex=gpt-5.6-sol");
  const defaultModel = useMemo(() => models[0]?.model ?? models[0]?.id ?? "gpt-5.6-sol", [models]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <ExtensionIcon fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          Third-party relay
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <FormControl size="small">
          <InputLabel>Provider type</InputLabel>
          <Select value={kind} label="Provider type" onChange={(event) => applyProviderTemplate(event.target.value as ProviderConfig["kind"])}>
            <MenuItem value="chatgpt">ChatGPT official</MenuItem>
            <MenuItem value="openai">OpenAI API key</MenuItem>
            <MenuItem value="responsesRelay">Responses relay</MenuItem>
            <MenuItem value="ollama">Ollama</MenuItem>
            <MenuItem value="lmstudio">LM Studio</MenuItem>
            <MenuItem value="bedrock">Bedrock experimental</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" label="Display name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextField size="small" label="Base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        <TextField size="small" label="API key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
        <TextField
          size="small"
          label="Native models, comma-separated"
          value={nativeModels}
          onChange={(event) => setNativeModels(event.target.value)}
        />
        <TextField
          size="small"
          label="Model aliases, comma-separated alias=model"
          value={modelAliases}
          onChange={(event) => setModelAliases(event.target.value)}
        />
        <Button
          startIcon={<SaveIcon />}
          variant="outlined"
          onClick={() => {
            const nativeModelList = parseCsv(nativeModels);
            onSaveProvider(
              {
                id: "",
                kind,
                name,
                baseUrl: baseUrl || undefined,
                defaultModel: nativeModelList[0] ?? defaultModel,
                nativeModels: nativeModelList,
                modelAliases: parseAliases(modelAliases),
                createdAt: Date.now(),
                updatedAt: Date.now()
              },
              apiKey || undefined
            );
          }}
        >
          Save provider
        </Button>
      </Stack>
    </Paper>
  );

  function applyProviderTemplate(nextKind: ProviderConfig["kind"]): void {
    setKind(nextKind);
    const template = providerTemplate(nextKind);
    setName(template.name);
    setBaseUrl(template.baseUrl);
    setNativeModels(template.nativeModels);
    setModelAliases(template.modelAliases);
  }
}

function providerTemplate(kind: ProviderConfig["kind"]): {
  name: string;
  baseUrl: string;
  nativeModels: string;
  modelAliases: string;
} {
  switch (kind) {
    case "chatgpt":
      return { name: "ChatGPT official", baseUrl: "", nativeModels: "gpt-5.6-sol,gpt-5.5", modelAliases: "codex=gpt-5.6-sol" };
    case "openai":
      return { name: "OpenAI API", baseUrl: "https://api.openai.com/v1", nativeModels: "gpt-5.6-sol,gpt-5.5", modelAliases: "codex=gpt-5.6-sol" };
    case "ollama":
      return { name: "Ollama local", baseUrl: "http://127.0.0.1:11434/v1", nativeModels: "gpt-oss:20b", modelAliases: "codex=gpt-oss:20b" };
    case "lmstudio":
      return { name: "LM Studio local", baseUrl: "http://127.0.0.1:1234/v1", nativeModels: "local-model", modelAliases: "codex=local-model" };
    case "bedrock":
      return { name: "Amazon Bedrock", baseUrl: "https://bedrock-mantle.us-east-1.api.aws/openai/v1", nativeModels: "openai.gpt-5.6-sol", modelAliases: "codex=openai.gpt-5.6-sol" };
    case "responsesRelay":
      return { name: "Responses Relay", baseUrl: "https://example.com/v1", nativeModels: "gpt-5.6-sol", modelAliases: "codex=gpt-5.6-sol" };
  }
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseAliases(value: string): ProviderConfig["modelAliases"] {
  return parseCsv(value)
    .map((entry) => {
      const [alias, model] = entry.split("=").map((part) => part.trim());
      return alias && model ? { alias, model } : null;
    })
    .filter((entry): entry is { alias: string; model: string } => Boolean(entry));
}

function toolCallKey(serverName: string, toolName: string): string {
  return `${serverName}:${toolName}`;
}

function parseToolArgumentsPreview(schema: JsonValue): string {
  return prettyJson(defaultToolArguments(schema));
}

function defaultToolArguments(schema: JsonValue): JsonValue {
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    const record = schema as Record<string, unknown>;
    if ("default" in record) {
      return record.default as JsonValue;
    }
  }
  return {};
}

function parseToolArguments(rawArgs: string): JsonValue {
  const trimmed = rawArgs.trim();
  if (!trimmed) {
    return {};
  }
  return JSON.parse(trimmed) as JsonValue;
}

function ToolsTab({
  activeThreadId,
  pendingRequests,
  tooling,
  toolingLoading,
  pluginDetails,
  pluginSkillPreviews,
  pluginAuthNotices,
  skillExtraRoots,
  skillPreviews,
  mcpResourceContents,
  mcpOauthUrls,
  onAnswerRequest,
  onReloadTooling,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onCallMcpTool,
  onToggleSkill,
  onSaveSkillExtraRoots,
  onReadSkillPreview,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
}: {
  activeThreadId: string | null;
  pendingRequests: PendingServerRequest[];
  tooling: ToolingState;
  toolingLoading: boolean;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  pluginAuthNotices: Record<string, PluginInstallAuthNotice>;
  skillExtraRoots: string[];
  skillPreviews: Record<string, string>;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  onAnswerRequest: Props["onAnswerRequest"];
  onReloadTooling: Props["onReloadTooling"];
  onReloadMcp: Props["onReloadMcp"];
  onStartMcpOauth: Props["onStartMcpOauth"];
  onReadMcpResource: Props["onReadMcpResource"];
  onCallMcpTool: Props["onCallMcpTool"];
  onToggleSkill: Props["onToggleSkill"];
  onSaveSkillExtraRoots: Props["onSaveSkillExtraRoots"];
  onReadSkillPreview: Props["onReadSkillPreview"];
  onReadPluginDetail: Props["onReadPluginDetail"];
  onReadPluginSkill: Props["onReadPluginSkill"];
  onInsertPluginMention: Props["onInsertPluginMention"];
  onInstallPlugin: Props["onInstallPlugin"];
  onUninstallPlugin: Props["onUninstallPlugin"];
}) {
  const [toolTab, setToolTab] = useState(0);
  const skillCount = tooling.skillGroups.reduce((count, group) => count + group.skills.length, 0);
  const pluginCount = tooling.pluginMarketplaces.reduce((count, marketplace) => count + marketplace.plugins.length, 0);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" sx={{ fontWeight: 750, flex: 1 }}>
          Tooling
        </Typography>
        {toolingLoading && <CircularProgress size={16} />}
        <Button size="small" startIcon={<RefreshIcon />} onClick={onReloadTooling}>
          Refresh
        </Button>
      </Stack>

      <ApprovalsPanel pendingRequests={pendingRequests} onAnswerRequest={onAnswerRequest} />

      {tooling.marketplaceErrors.map((message) => (
        <Alert key={message} severity="warning">
          {message}
        </Alert>
      ))}

      <Tabs value={toolTab} onChange={(_, value) => setToolTab(value)} variant="scrollable" scrollButtons="auto">
        <Tab label={`MCP ${tooling.mcpServers.length}`} />
        <Tab label={`Skills ${skillCount}`} />
        <Tab label={`Plugins ${pluginCount}`} />
      </Tabs>

      {toolTab === 0 && (
        <McpPanel
          tooling={tooling}
          mcpResourceContents={mcpResourceContents}
          mcpOauthUrls={mcpOauthUrls}
          activeThreadId={activeThreadId}
          onReloadMcp={onReloadMcp}
          onStartMcpOauth={onStartMcpOauth}
          onReadMcpResource={onReadMcpResource}
          onCallMcpTool={onCallMcpTool}
        />
      )}
      {toolTab === 1 && (
        <SkillsPanel
          tooling={tooling}
          extraRoots={skillExtraRoots}
          previews={skillPreviews}
          onToggleSkill={onToggleSkill}
          onSaveExtraRoots={onSaveSkillExtraRoots}
          onReadPreview={onReadSkillPreview}
        />
      )}
      {toolTab === 2 && (
        <PluginsPanel
          tooling={tooling}
          pluginDetails={pluginDetails}
          pluginSkillPreviews={pluginSkillPreviews}
          pluginAuthNotices={pluginAuthNotices}
          onReadPluginDetail={onReadPluginDetail}
          onReadPluginSkill={onReadPluginSkill}
          onInsertPluginMention={onInsertPluginMention}
          onInstallPlugin={onInstallPlugin}
          onUninstallPlugin={onUninstallPlugin}
        />
      )}
    </Stack>
  );
}

function ApprovalsPanel({
  pendingRequests,
  onAnswerRequest
}: {
  pendingRequests: PendingServerRequest[];
  onAnswerRequest: Props["onAnswerRequest"];
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: pendingRequests.length ? 1 : 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750, flex: 1 }}>
          Approvals
        </Typography>
        <Chip size="small" label={pendingRequests.length} color={pendingRequests.length ? "warning" : "default"} />
      </Stack>
      {pendingRequests.length === 0 && <Typography color="text.secondary">No pending requests.</Typography>}
      <Stack spacing={1}>
        {pendingRequests.map((request) => (
          <Box key={String(request.id)} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
              {request.method}
            </Typography>
            <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere", my: 1 }}>
              {JSON.stringify(request.params, null, 2)}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="contained" onClick={() => onAnswerRequest(request.id, "accept")}>
                Accept
              </Button>
              <Button size="small" onClick={() => onAnswerRequest(request.id, "acceptForSession")}>
                Session
              </Button>
              <Button size="small" color="warning" onClick={() => onAnswerRequest(request.id, "decline")}>
                Decline
              </Button>
              <Button size="small" color="error" onClick={() => onAnswerRequest(request.id, "cancel")}>
                Cancel
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function McpPanel({
  tooling,
  mcpResourceContents,
  mcpOauthUrls,
  activeThreadId,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onCallMcpTool
}: {
  tooling: ToolingState;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  activeThreadId: string | null;
  onReloadMcp: Props["onReloadMcp"];
  onStartMcpOauth: Props["onStartMcpOauth"];
  onReadMcpResource: Props["onReadMcpResource"];
  onCallMcpTool: Props["onCallMcpTool"];
}) {
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [toolResults, setToolResults] = useState<Record<string, string>>({});
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({});
  const [toolStatuses, setToolStatuses] = useState<Record<string, string>>({});
  const [callingTool, setCallingTool] = useState<string | null>(null);

  const submitToolCall = async (serverName: string, toolName: string, rawArgs: string): Promise<void> => {
    const key = toolCallKey(serverName, toolName);
    if (!activeThreadId) {
      setToolErrors((current) => ({ ...current, [key]: "Select a conversation before calling an MCP tool." }));
      return;
    }
    setCallingTool(key);
    setToolErrors((current) => ({ ...current, [key]: "" }));
    setToolStatuses((current) => ({ ...current, [key]: "Calling tool..." }));
    try {
      const parsedArgs = parseToolArguments(rawArgs);
      const result = await onCallMcpTool(serverName, toolName, parsedArgs);
      setToolResults((current) => ({ ...current, [key]: prettyJson(result) }));
      setToolStatuses((current) => ({ ...current, [key]: "Tool call completed." }));
    } catch (error) {
      setToolErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : String(error) }));
      setToolStatuses((current) => ({ ...current, [key]: "Tool call failed." }));
    } finally {
      setCallingTool(null);
    }
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750, flex: 1 }}>
          MCP servers
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={onReloadMcp}>
          Reload
        </Button>
      </Stack>
      {!activeThreadId && (
        <Alert severity="info">
          Select a conversation to enable MCP tool calls.
        </Alert>
      )}
      {tooling.mcpServers.length === 0 && <Typography color="text.secondary">No MCP servers discovered.</Typography>}
      {tooling.mcpServers.map((server) => {
        const authUrl = mcpOauthUrls[server.name];
        return (
          <Paper key={server.name} variant="outlined" sx={{ p: 1.25 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {server.name}
              </Typography>
              <Chip size="small" label={server.authStatus} color={server.authStatus === "notLoggedIn" ? "warning" : "default"} />
            </Stack>
            {server.serverInfo && (
              <Typography variant="caption" color="text.secondary">
                {server.serverInfo}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip size="small" label={`tools ${server.tools.length}`} />
              <Chip size="small" label={`resources ${server.resources.length}`} />
              <Chip size="small" label={`templates ${server.resourceTemplates.length}`} />
            </Stack>
            {server.tools.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {server.tools.slice(0, 8).map((tool) => {
                  const key = toolCallKey(server.name, tool.name);
                  const value = toolArgs[key] ?? parseToolArgumentsPreview(tool.inputSchema);
                  const disabled = !activeThreadId || callingTool === key;
                  return (
                    <Box key={tool.name} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                            {tool.title ?? tool.name}
                          </Typography>
                          {tool.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                              {tool.description}
                            </Typography>
                          )}
                        </Box>
                        <Chip size="small" label={tool.name} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                        Input schema
                      </Typography>
                      <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, m: 0, mt: 0.5, maxHeight: 120, overflow: "auto" }}>
                        {prettyJson(tool.inputSchema)}
                      </Typography>
                      <TextField
                        size="small"
                        label="Arguments JSON"
                        multiline
                        minRows={4}
                        fullWidth
                        sx={{ mt: 1 }}
                        value={value}
                        onChange={(event) => setToolArgs((current) => ({ ...current, [key]: event.target.value }))}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PlayArrowIcon />}
                          disabled={disabled}
                          onClick={() => void submitToolCall(server.name, tool.name, value)}
                        >
                          Call tool
                        </Button>
                        <Chip size="small" label={disabled ? "select conversation" : "ready"} color={disabled ? "warning" : "success"} />
                      </Stack>
                      {toolStatuses[key] && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          {toolStatuses[key]}
                        </Alert>
                      )}
                      {toolErrors[key] && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {toolErrors[key]}
                        </Alert>
                      )}
                      {toolResults[key] && (
                        <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, mt: 1, m: 0, maxHeight: 220, overflow: "auto" }}>
                          {toolResults[key]}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
                {server.tools.length > 8 && <Chip size="small" variant="outlined" label={`+${server.tools.length - 8}`} />}
              </Stack>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => onStartMcpOauth(server.name)}>
                OAuth
              </Button>
              {authUrl && (
                <Button size="small" href={authUrl} target="_blank" rel="noreferrer">
                  Auth URL
                </Button>
              )}
            </Stack>
            {server.resources.length > 0 && (
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {server.resources.slice(0, 4).map((resource) => {
                  const uri = resource.uri;
                  const contents = uri ? mcpResourceContents[`${server.name}:${uri}`] : undefined;
                  return (
                    <Box key={resource.uri ?? resource.name} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.75 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ flex: 1, overflowWrap: "anywhere" }}>
                          {resource.title ?? resource.name}
                        </Typography>
                        <Button size="small" disabled={!uri} onClick={() => uri && onReadMcpResource(server.name, uri)}>
                          Read
                        </Button>
                      </Stack>
                      {contents && (
                        <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere", mt: 0.75, maxHeight: 180, overflow: "auto" }}>
                          {contents.map((content) => content.text ?? `[blob ${content.mimeType ?? "application/octet-stream"}]`).join("\n\n")}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}

function SkillsPanel({
  tooling,
  extraRoots,
  previews,
  onToggleSkill,
  onSaveExtraRoots,
  onReadPreview
}: {
  tooling: ToolingState;
  extraRoots: string[];
  previews: Record<string, string>;
  onToggleSkill: Props["onToggleSkill"];
  onSaveExtraRoots: (roots: string[]) => void;
  onReadPreview: (skill: SkillEntry) => void;
}) {
  const [extraRootsText, setExtraRootsText] = useState(extraRoots.join("\n"));

  return (
    <Stack spacing={1}>
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          Skill roots
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Add one extra root per line. These roots are sent to `skills/extraRoots/set` and then reloaded into the inventory.
        </Typography>
        <TextField
          sx={{ mt: 1 }}
          size="small"
          fullWidth
          multiline
          minRows={3}
          label="Extra roots"
          value={extraRootsText}
          onChange={(event) => setExtraRootsText(event.target.value)}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={() => onSaveExtraRoots(parseLines(extraRootsText))}>
            Save roots
          </Button>
          <Chip size="small" label={`${extraRoots.length} saved`} />
        </Stack>
      </Paper>
      {tooling.skillGroups.length === 0 && <Typography color="text.secondary">No skills discovered.</Typography>}
      {tooling.skillGroups.map((group) => (
        <Paper key={group.cwd} variant="outlined" sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
            {group.cwd}
          </Typography>
          {group.errors.map((error) => (
            <Alert key={`${error.path}:${error.message}`} severity="warning" sx={{ mt: 1 }}>
              {error.path}: {error.message}
            </Alert>
          ))}
          <Stack spacing={1} sx={{ mt: 1 }}>
            {group.skills.map((skill) => (
              <Box key={skill.path || skill.name} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                      {skill.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                      {skill.shortDescription || skill.description || skill.path}
                    </Typography>
                  </Box>
                  <Chip size="small" label={skill.scope} />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, overflowWrap: "anywhere" }}>
                    {skill.path}
                  </Typography>
                  <FormControlLabel
                    sx={{ mr: 0 }}
                    control={<Switch size="small" checked={skill.enabled} onChange={(event) => onToggleSkill(skill, event.target.checked)} />}
                    label={skill.enabled ? "Enabled" : "Disabled"}
                  />
                </Stack>
                {skill.path && (
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => onReadPreview(skill)}>
                      Preview markdown
                    </Button>
                    {previews[skill.path] && (
                      <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere", m: 0, maxHeight: 240, overflow: "auto" }}>
                        {previews[skill.path]}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function PluginsPanel({
  tooling,
  pluginDetails,
  pluginSkillPreviews,
  pluginAuthNotices,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
}: {
  tooling: ToolingState;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  pluginAuthNotices: Record<string, PluginInstallAuthNotice>;
  onReadPluginDetail: Props["onReadPluginDetail"];
  onReadPluginSkill: Props["onReadPluginSkill"];
  onInsertPluginMention: Props["onInsertPluginMention"];
  onInstallPlugin: Props["onInstallPlugin"];
  onUninstallPlugin: Props["onUninstallPlugin"];
}) {
  const installedMentionPlugins = useMemo(() => {
    const entries: Array<{ key: string; marketplace: PluginMarketplace; plugin: PluginEntry }> = [];
    const seen = new Set<string>();
    const sourceMarketplaces = tooling.installedPluginMarketplaces.length > 0 ? tooling.installedPluginMarketplaces : tooling.pluginMarketplaces;
    for (const marketplace of sourceMarketplaces) {
      for (const plugin of marketplace.plugins) {
        if (!plugin.installed || !plugin.enabled || seen.has(plugin.id)) {
          continue;
        }
        seen.add(plugin.id);
        entries.push({ key: `${marketplace.name}:${plugin.id}`, marketplace, plugin });
      }
    }
    return entries;
  }, [tooling.installedPluginMarketplaces, tooling.pluginMarketplaces]);
  const [selectedMentionKey, setSelectedMentionKey] = useState("");
  const selectedMention = installedMentionPlugins.find((entry) => entry.key === selectedMentionKey) ?? installedMentionPlugins[0];

  return (
    <Stack spacing={1}>
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          Installed mentions
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Composer mentions are limited to plugins that are installed and enabled.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
            <InputLabel>Installed plugin</InputLabel>
            <Select
              value={selectedMention?.key ?? ""}
              label="Installed plugin"
              onChange={(event) => setSelectedMentionKey(event.target.value)}
              disabled={installedMentionPlugins.length === 0}
            >
              {installedMentionPlugins.map((entry) => (
                <MenuItem key={entry.key} value={entry.key}>
                  {entry.plugin.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            disabled={!selectedMention}
            onClick={() => selectedMention && onInsertPluginMention(selectedMention.marketplace, selectedMention.plugin)}
          >
            Insert mention
          </Button>
        </Stack>
        {installedMentionPlugins.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            No installed plugins are available for mention insertion.
          </Typography>
        )}
      </Paper>
      {tooling.apps.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
            Apps
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {tooling.apps.slice(0, 6).map((app) => (
              <AppSummaryRow key={app.id} app={app} />
            ))}
          </Stack>
        </Paper>
      )}
      {tooling.pluginMarketplaces.length === 0 && <Typography color="text.secondary">No plugin marketplaces discovered.</Typography>}
      {tooling.pluginMarketplaces.map((marketplace) => (
        <Paper key={`${marketplace.name}:${marketplace.path ?? "remote"}`} variant="outlined" sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
            {marketplace.displayName ?? marketplace.name}
          </Typography>
          {marketplace.path && (
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {marketplace.path}
            </Typography>
          )}
          <Stack spacing={1} sx={{ mt: 1 }}>
            {marketplace.plugins.length === 0 && <Typography color="text.secondary">No plugins in this marketplace.</Typography>}
            {marketplace.plugins.map((plugin) => {
              const unavailable = plugin.availability !== "AVAILABLE";
              const featured = tooling.featuredPluginIds.includes(plugin.id);
              const detail = pluginDetails[plugin.id];
              const authNotice = pluginAuthNotices[plugin.id];
              return (
                <Box key={plugin.id} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                        {plugin.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                        {plugin.description || plugin.source}
                      </Typography>
                    </Box>
                    {plugin.installed ? (
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onUninstallPlugin(plugin)}>
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        disabled={unavailable}
                        onClick={() => onInstallPlugin(marketplace, plugin)}
                      >
                        Install
                      </Button>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => onReadPluginDetail(marketplace, plugin)}>
                      Details
                    </Button>
                    <Button size="small" disabled={!plugin.installed || !plugin.enabled} onClick={() => onInsertPluginMention(marketplace, plugin)}>
                      Mention
                    </Button>
                    {plugin.websiteUrl && (
                      <Button size="small" href={plugin.websiteUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />}>
                        Website
                      </Button>
                    )}
                    {detail?.shareUrl && (
                      <Button size="small" href={detail.shareUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />}>
                        Share
                      </Button>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    <Chip size="small" label={plugin.installed ? "installed" : "available"} color={plugin.installed ? "success" : "default"} />
                    {plugin.installed && <Chip size="small" label={plugin.enabled ? "enabled" : "disabled"} />}
                    {featured && <Chip size="small" label="featured" color="primary" />}
                    {unavailable && <Chip size="small" label={plugin.availability} color="warning" />}
                    <Chip size="small" label={`auth ${plugin.authPolicy}`} variant="outlined" />
                    <Chip size="small" label={`install ${plugin.installPolicy}`} variant="outlined" />
                    {plugin.category && <Chip size="small" label={plugin.category} />}
                    {(plugin.localVersion || plugin.version) && <Chip size="small" label={plugin.localVersion ?? plugin.version} />}
                  </Stack>
                  {plugin.defaultPrompt.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {plugin.defaultPrompt.map((prompt) => (
                        <Typography key={prompt} variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                          {prompt}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  {plugin.capabilities.length > 0 && (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {plugin.capabilities.slice(0, 5).map((capability) => (
                        <Chip key={capability} size="small" variant="outlined" label={capability} />
                      ))}
                    </Stack>
                  )}
                  {authNotice && authNotice.apps.length > 0 && (
                    <Box sx={{ mt: 1, borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 750 }}>
                        Authentication needed after install
                      </Typography>
                      <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                        {authNotice.apps.map((app) => (
                          <AppSummaryRow key={app.id} app={app} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {detail && (
                    <Box sx={{ mt: 1, borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                      {detail.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                          {detail.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Chip size="small" label={`skills ${detail.skills.length}`} />
                        <Chip size="small" label={`hooks ${detail.hooks.length}`} />
                        <Chip size="small" label={`apps ${detail.apps.length}`} />
                        <Chip size="small" label={`templates ${detail.appTemplates.length}`} />
                        <Chip size="small" label={`mcp ${detail.mcpServers.length}`} />
                        {detail.scheduledTaskCount != null && <Chip size="small" label={`tasks ${detail.scheduledTaskCount}`} />}
                      </Stack>
                      {detail.apps.length > 0 && (
                        <Stack spacing={0.75} sx={{ mt: 1 }}>
                          {detail.apps.map((app) => (
                            <AppSummaryRow key={app.id} app={app} />
                          ))}
                        </Stack>
                      )}
                      {detail.appTemplates.length > 0 && (
                        <Stack spacing={0.75} sx={{ mt: 1 }}>
                          {detail.appTemplates.map((template) => (
                            <Box key={template.templateId} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.75 }}>
                              <Typography variant="caption" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                                {template.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                {[template.category, template.reason && `unavailable ${template.reason}`].filter(Boolean).join(" / ")}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                      {detail.skills.length > 0 && (
                        <Stack spacing={0.75} sx={{ mt: 1 }}>
                          {detail.skills.map((skill) => {
                            const previewKey = `${plugin.id}:${skill.name}`;
                            return (
                              <Box key={skill.name} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.75 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="caption" sx={{ flex: 1, overflowWrap: "anywhere" }}>
                                    {skill.name} {skill.enabled ? "" : "(disabled)"}
                                  </Typography>
                                  <Button size="small" disabled={!skill.remoteReadable} onClick={() => onReadPluginSkill(marketplace, plugin, skill.name)}>
                                    Preview
                                  </Button>
                                </Stack>
                                {pluginSkillPreviews[previewKey] && (
                                  <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere", mt: 0.75, maxHeight: 180, overflow: "auto" }}>
                                    {pluginSkillPreviews[previewKey]}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function AppSummaryRow({ app }: { app: PluginAppEntry }) {
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.75 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
            {app.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
            {[app.category, app.developer, app.isEnabled === false ? "disabled" : null, app.isAccessible === false ? "needs access" : null]
              .filter(Boolean)
              .join(" / ")}
          </Typography>
        </Box>
        {app.installUrl && (
          <Button size="small" href={app.installUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />}>
            Connect
          </Button>
        )}
      </Stack>
      {app.description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, overflowWrap: "anywhere" }}>
          {app.description}
        </Typography>
      )}
    </Box>
  );
}

function FilesTab({
  cwd,
  fileDirectories,
  openFile,
  terminalSessions,
  onReadDirectory,
  onReadFile,
  onChangeOpenFileContent,
  onSaveOpenFile,
  onRunTerminalCommand,
  onWriteTerminalInput,
  onTerminateTerminal,
  onResizeTerminal
}: {
  cwd: string;
  fileDirectories: Record<string, FsDirectoryEntry[]>;
  openFile: Props["openFile"];
  terminalSessions: TerminalSession[];
  onReadDirectory: Props["onReadDirectory"];
  onReadFile: Props["onReadFile"];
  onChangeOpenFileContent: Props["onChangeOpenFileContent"];
  onSaveOpenFile: Props["onSaveOpenFile"];
  onRunTerminalCommand: Props["onRunTerminalCommand"];
  onWriteTerminalInput: Props["onWriteTerminalInput"];
  onTerminateTerminal: Props["onTerminateTerminal"];
  onResizeTerminal: Props["onResizeTerminal"];
}) {
  const [rootPath, setRootPath] = useState(cwd);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [terminalCommand, setTerminalCommand] = useState("pwd");
  const [terminalCwd, setTerminalCwd] = useState(cwd);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalSize, setTerminalSize] = useState({ rows: 24, cols: 80 });
  const dirty = openFile ? openFile.content !== openFile.savedContent : false;
  const activeTerminal = terminalSessions.find((session) => session.status === "running") ?? null;

  useEffect(() => {
    setRootPath(cwd);
    setTerminalCwd(cwd);
  }, [cwd]);

  useEffect(() => {
    if (rootPath && !fileDirectories[rootPath]) {
      onReadDirectory(rootPath);
    }
  }, [fileDirectories, onReadDirectory, rootPath]);

  return (
    <Stack spacing={1.25}>
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Root path" value={rootPath} onChange={(event) => setRootPath(event.target.value)} sx={{ flex: 1 }} />
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => onReadDirectory(rootPath)}>
            Load
          </Button>
        </Stack>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(150px, 0.9fr) minmax(0, 1.4fr)" },
          gap: 1,
          minHeight: 430
        }}
      >
        <Paper variant="outlined" sx={{ p: 1, minWidth: 0, maxHeight: 520, overflow: "auto" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
            Explorer
          </Typography>
          <Box sx={{ mt: 1 }}>
            {renderDirectory(rootPath, 0)}
          </Box>
        </Paper>
        <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                {openFile?.path ?? "No file selected"}
              </Typography>
              {openFile && (
                <Typography variant="caption" color="text.secondary">
                  {dirty ? "Unsaved changes" : "Saved"}
                </Typography>
              )}
            </Box>
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!openFile || openFile.loading || openFile.saving || !dirty}
              onClick={onSaveOpenFile}
            >
              {openFile?.saving ? "Saving" : "Save"}
            </Button>
          </Stack>
          <Box sx={{ minHeight: 360 }}>
            {openFile ? (
              <Editor
                height="100%"
                path={openFile.path}
                language={languageForPath(openFile.path)}
                value={openFile.content}
                loading="Loading editor..."
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  wordWrap: "on",
                  automaticLayout: true
                }}
                onChange={(value) => onChangeOpenFileContent(value ?? "")}
              />
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">Select a file to edit.</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          Terminal
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Command"
            value={terminalCommand}
            onChange={(event) => setTerminalCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                onRunTerminalCommand(terminalCommand, terminalCwd, terminalSize);
              }
            }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" label="Command cwd" value={terminalCwd} onChange={(event) => setTerminalCwd(event.target.value)} sx={{ flex: 1 }} />
            <TextField
              size="small"
              label="Rows"
              type="number"
              value={terminalSize.rows}
              onChange={(event) => setTerminalSize((current) => ({ ...current, rows: Math.max(1, Number(event.target.value) || current.rows) }))}
              sx={{ width: 90 }}
            />
            <TextField
              size="small"
              label="Cols"
              type="number"
              value={terminalSize.cols}
              onChange={(event) => setTerminalSize((current) => ({ ...current, cols: Math.max(1, Number(event.target.value) || current.cols) }))}
              sx={{ width: 90 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => onRunTerminalCommand(terminalCommand, terminalCwd, terminalSize)}>
              Run
            </Button>
            <Button size="small" disabled={!activeTerminal} onClick={() => activeTerminal && onResizeTerminal(activeTerminal.processId, terminalSize)}>
              Resize
            </Button>
            <Button size="small" color="error" disabled={!activeTerminal} startIcon={<DeleteIcon />} onClick={() => activeTerminal && onTerminateTerminal(activeTerminal.processId)}>
              Terminate
            </Button>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Stdin"
              value={terminalInput}
              onChange={(event) => setTerminalInput(event.target.value)}
              disabled={!activeTerminal}
              sx={{ flex: 1 }}
            />
            <Button
              size="small"
              disabled={!activeTerminal}
              onClick={() => {
                if (!activeTerminal) {
                  return;
                }
                onWriteTerminalInput(activeTerminal.processId, terminalInput.endsWith("\n") ? terminalInput : `${terminalInput}\n`);
                setTerminalInput("");
              }}
            >
              Send stdin
            </Button>
          </Stack>
          <Stack spacing={1}>
            {terminalSessions.length === 0 && <Typography color="text.secondary">No terminal sessions yet.</Typography>}
            {terminalSessions.map((session) => (
              <Box key={session.processId} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ flex: 1, overflowWrap: "anywhere" }}>
                    {session.command}
                  </Typography>
                  <Chip size="small" label={session.exitCode == null ? session.status : `${session.status} ${session.exitCode}`} color={terminalStatusColor(session.status)} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                  {session.cwd} / {session.cols}x{session.rows}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    mt: 0.75,
                    p: 1,
                    bgcolor: "#101418",
                    color: "#e7edf2",
                    borderRadius: 1,
                    minHeight: 120,
                    maxHeight: 260,
                    overflow: "auto",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere"
                  }}
                >
                  {session.output || "Waiting for output..."}
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );

  function renderDirectory(path: string, depth: number): ReactNode {
    const entries = fileDirectories[path];
    if (!entries) {
      return (
        <Button size="small" startIcon={<FolderIcon />} onClick={() => onReadDirectory(path)} sx={{ justifyContent: "flex-start", pl: 1 + depth }}>
          Load {path === rootPath ? "root" : path.split("/").pop()}
        </Button>
      );
    }
    if (entries.length === 0) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", pl: 1 + depth }}>
          Empty directory
        </Typography>
      );
    }
    return entries.map((entry) => (
      <Box key={entry.path}>
        <Button
          size="small"
          startIcon={entry.isDirectory ? <FolderIcon /> : <DescriptionIcon />}
          onClick={() => {
            if (entry.isDirectory) {
              setExpandedDirs((current) => ({ ...current, [entry.path]: !current[entry.path] }));
              if (!fileDirectories[entry.path]) {
                onReadDirectory(entry.path);
              }
              return;
            }
            if (entry.isFile) {
              onReadFile(entry.path);
            }
          }}
          sx={{ justifyContent: "flex-start", textAlign: "left", width: "100%", pl: 1 + depth * 1.5 }}
        >
          <Typography component="span" variant="caption" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.name}
          </Typography>
        </Button>
        {entry.isDirectory && expandedDirs[entry.path] && <Box>{renderDirectory(entry.path, depth + 1)}</Box>}
      </Box>
    ));
  }
}

function languageForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    case "py":
      return "python";
    case "rs":
      return "rust";
    case "toml":
      return "toml";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
}

function terminalStatusColor(status: TerminalSession["status"]): "default" | "success" | "error" | "warning" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "terminated":
      return "warning";
    default:
      return "default";
  }
}

function prettyJson(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}
