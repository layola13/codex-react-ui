import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import ExtensionIcon from "@mui/icons-material/Extension";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { JsonValue, ProviderConfig } from "@codex-ui/shared";
import type { ModelEntry, PendingServerRequest } from "../state/codexClient";

type Props = {
  account: JsonValue | null;
  models: ModelEntry[];
  providers: ProviderConfig[];
  pendingRequests: PendingServerRequest[];
  onAnswerRequest: (id: string | number, decision: "accept" | "acceptForSession" | "decline" | "cancel") => void;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
  onActivateProvider: (providerId: string, model?: string) => void;
};

export function RightInspector({ account, models, providers, pendingRequests, onAnswerRequest, onSaveProvider, onActivateProvider }: Props) {
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
        {tab === 1 && <ToolsTab pendingRequests={pendingRequests} onAnswerRequest={onAnswerRequest} />}
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
            const modelOptions = provider.nativeModels.length > 0 ? provider.nativeModels : fallbackModels;
            const selectedModel = providerModels[provider.id] ?? provider.defaultModel ?? modelOptions[0] ?? "";
            return (
              <Paper key={provider.id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 700, flex: 1 }}>{provider.name}</Typography>
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
                      {modelOptions.map((model) => (
                        <MenuItem key={model} value={model}>
                          {model}
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
  onAnswerRequest
}: {
  pendingRequests: PendingServerRequest[];
  onAnswerRequest: Props["onAnswerRequest"];
}) {
  return (
    <Stack spacing={1.5}>
      <Alert severity="info">
        MCP, Skills, Plugins and command/file approvals are surfaced here. Plugin and skill management calls are wired through app-server in the next pass.
      </Alert>
      {pendingRequests.length === 0 && (
        <Typography color="text.secondary">No pending approval or elicitation requests.</Typography>
      )}
      {pendingRequests.map((request) => (
        <Paper key={String(request.id)} variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
            {request.method}
          </Typography>
          <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere" }}>
            {JSON.stringify(request.params, null, 2)}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button size="small" variant="contained" onClick={() => onAnswerRequest(request.id, "accept")}>
              Accept
            </Button>
            <Button size="small" onClick={() => onAnswerRequest(request.id, "acceptForSession")}>
              For session
            </Button>
            <Button size="small" color="warning" onClick={() => onAnswerRequest(request.id, "decline")}>
              Decline
            </Button>
            <Button size="small" color="error" onClick={() => onAnswerRequest(request.id, "cancel")}>
              Cancel
            </Button>
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
