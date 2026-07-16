import { useMemo, useState } from "react";
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
import DownloadIcon from "@mui/icons-material/Download";
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
  PendingServerRequest,
  PluginDetailEntry,
  PluginEntry,
  PluginMarketplace,
  SkillEntry,
  ToolingState
} from "../state/codexClient";

type Props = {
  account: JsonValue | null;
  models: ModelEntry[];
  providers: ProviderConfig[];
  pendingRequests: PendingServerRequest[];
  tooling: ToolingState;
  toolingLoading: boolean;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  onAnswerRequest: (id: string | number, decision: "accept" | "acceptForSession" | "decline" | "cancel") => void;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
  onActivateProvider: (providerId: string, model?: string) => void;
  onReloadTooling: () => void;
  onReloadMcp: () => void;
  onStartMcpOauth: (serverName: string) => void;
  onReadMcpResource: (serverName: string, uri: string) => void;
  onToggleSkill: (skill: SkillEntry, enabled: boolean) => void;
  onReadPluginDetail: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onReadPluginSkill: (marketplace: PluginMarketplace, plugin: PluginEntry, skillName: string) => void;
  onInsertPluginMention: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onInstallPlugin: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onUninstallPlugin: (plugin: PluginEntry) => void;
};

export function RightInspector({
  account,
  models,
  providers,
  pendingRequests,
  tooling,
  toolingLoading,
  pluginDetails,
  pluginSkillPreviews,
  mcpResourceContents,
  mcpOauthUrls,
  onAnswerRequest,
  onSaveProvider,
  onActivateProvider,
  onReloadTooling,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onToggleSkill,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
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
            pendingRequests={pendingRequests}
            tooling={tooling}
            toolingLoading={toolingLoading}
            pluginDetails={pluginDetails}
            pluginSkillPreviews={pluginSkillPreviews}
            mcpResourceContents={mcpResourceContents}
            mcpOauthUrls={mcpOauthUrls}
            onAnswerRequest={onAnswerRequest}
            onReloadTooling={onReloadTooling}
            onReloadMcp={onReloadMcp}
            onStartMcpOauth={onStartMcpOauth}
            onReadMcpResource={onReadMcpResource}
            onToggleSkill={onToggleSkill}
            onReadPluginDetail={onReadPluginDetail}
            onReadPluginSkill={onReadPluginSkill}
            onInsertPluginMention={onInsertPluginMention}
            onInstallPlugin={onInstallPlugin}
            onUninstallPlugin={onUninstallPlugin}
          />
        )}
        {tab === 2 && <FilesTab />}
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

function parseAliases(value: string): ProviderConfig["modelAliases"] {
  return parseCsv(value)
    .map((entry) => {
      const [alias, model] = entry.split("=").map((part) => part.trim());
      return alias && model ? { alias, model } : null;
    })
    .filter((entry): entry is { alias: string; model: string } => Boolean(entry));
}

function ToolsTab({
  pendingRequests,
  tooling,
  toolingLoading,
  pluginDetails,
  pluginSkillPreviews,
  mcpResourceContents,
  mcpOauthUrls,
  onAnswerRequest,
  onReloadTooling,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onToggleSkill,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
}: {
  pendingRequests: PendingServerRequest[];
  tooling: ToolingState;
  toolingLoading: boolean;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  onAnswerRequest: Props["onAnswerRequest"];
  onReloadTooling: Props["onReloadTooling"];
  onReloadMcp: Props["onReloadMcp"];
  onStartMcpOauth: Props["onStartMcpOauth"];
  onReadMcpResource: Props["onReadMcpResource"];
  onToggleSkill: Props["onToggleSkill"];
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
          onReloadMcp={onReloadMcp}
          onStartMcpOauth={onStartMcpOauth}
          onReadMcpResource={onReadMcpResource}
        />
      )}
      {toolTab === 1 && <SkillsPanel tooling={tooling} onToggleSkill={onToggleSkill} />}
      {toolTab === 2 && (
        <PluginsPanel
          tooling={tooling}
          pluginDetails={pluginDetails}
          pluginSkillPreviews={pluginSkillPreviews}
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
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource
}: {
  tooling: ToolingState;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  onReloadMcp: Props["onReloadMcp"];
  onStartMcpOauth: Props["onStartMcpOauth"];
  onReadMcpResource: Props["onReadMcpResource"];
}) {
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
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {server.tools.slice(0, 8).map((tool) => (
                <Chip key={tool.name} size="small" variant="outlined" label={tool.title ?? tool.name} />
              ))}
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

function SkillsPanel({ tooling, onToggleSkill }: { tooling: ToolingState; onToggleSkill: Props["onToggleSkill"] }) {
  return (
    <Stack spacing={1}>
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
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
}: {
  tooling: ToolingState;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  onReadPluginDetail: Props["onReadPluginDetail"];
  onReadPluginSkill: Props["onReadPluginSkill"];
  onInsertPluginMention: Props["onInsertPluginMention"];
  onInstallPlugin: Props["onInstallPlugin"];
  onUninstallPlugin: Props["onUninstallPlugin"];
}) {
  return (
    <Stack spacing={1}>
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
                    <Button size="small" onClick={() => onInsertPluginMention(marketplace, plugin)}>
                      Mention
                    </Button>
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
                    {(plugin.localVersion || plugin.version) && <Chip size="small" label={plugin.localVersion ?? plugin.version} />}
                  </Stack>
                  {plugin.capabilities.length > 0 && (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {plugin.capabilities.slice(0, 5).map((capability) => (
                        <Chip key={capability} size="small" variant="outlined" label={capability} />
                      ))}
                    </Stack>
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
                        <Chip size="small" label={`mcp ${detail.mcpServers.length}`} />
                        {detail.scheduledTaskCount != null && <Chip size="small" label={`tasks ${detail.scheduledTaskCount}`} />}
                      </Stack>
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

function FilesTab() {
  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          File workspace
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          The app-server filesystem APIs and Monaco editor surface are planned for the next implementation slice. Current turns still render file changes and diffs as tool items.
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          Terminal
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          PTY-backed terminals will use the app-server command/process APIs. Command output from Codex tool calls already appears in the chat stream.
        </Typography>
      </Paper>
    </Stack>
  );
}
