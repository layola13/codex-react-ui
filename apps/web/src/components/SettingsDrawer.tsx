import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Radio,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import type { JsonValue } from "@codex-ui/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import ComputerIcon from "@mui/icons-material/Computer";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import ExtensionIcon from "@mui/icons-material/Extension";
import MemoryIcon from "@mui/icons-material/Memory";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PsychologyIcon from "@mui/icons-material/Psychology";
import PetsIcon from "@mui/icons-material/Pets";
import LightModeIcon from "@mui/icons-material/LightMode";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import StorageIcon from "@mui/icons-material/Storage";
import TokenIcon from "@mui/icons-material/Token";
import TuneIcon from "@mui/icons-material/Tune";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import WavesIcon from "@mui/icons-material/Waves";
import { permissionPresets, type PermissionPresetId, type ProviderConfig } from "@codex-ui/shared";
import {
  CODEX_CONFIG_FIELD_META,
  formatConfigValueForField,
  getConfigValueAtPath,
  getDynamicCodexConfigFields,
  parseDynamicConfigFieldValue,
  type CodexConfigFieldKey,
  type CodexUserConfigView,
  type DynamicCodexConfigField
} from "../state/codexConfigSettings";
import { themePlugins, type ThemeId, type ThemeMode, type ThemePlugin } from "../theme";
import { PetDock } from "./PetDock";

export type ReasoningOption = {
  value: string;
  label: string;
  description?: string;
};

type SettingsSectionId =
  | "codex"
  | "appearance"
  | "layout"
  | "session"
  | "relay"
  | "plugins"
  | "pet"
  | "privacy";

type Props = {
  open: boolean;
  themeMode: ThemeMode;
  installedThemePluginIds: ThemeId[];
  customThemePlugins: ThemePlugin[];
  leftPanelVisible: boolean;
  inspectorVisible: boolean;
  petDockEnabled: boolean;
  cwd: string;
  permission: PermissionPresetId;
  providers: ProviderConfig[];
  activeProviderId: string | null;
  selectedModel: string;
  reasoningEffort: string;
  reasoningOptions: ReasoningOption[];
  codexConfig: CodexUserConfigView | null;
  codexConfigLoading: boolean;
  codexConfigSaving: boolean;
  codexConfigError: string | null;
  onClose: () => void;
  onThemeModeChange: (mode: ThemeMode) => void;
  onInstallThemePlugin: (id: ThemeId) => void;
  onUninstallThemePlugin: (id: ThemeId) => void;
  onSaveCustomThemePlugin: (plugin: ThemePlugin) => void;
  onRemoveCustomThemePlugin: (id: ThemeId) => void;
  onLeftPanelVisibleChange: (visible: boolean) => void;
  onInspectorVisibleChange: (visible: boolean) => void;
  onPetDockEnabledChange: (enabled: boolean) => void;
  onCwdChange: (cwd: string) => void;
  onPermissionChange: (permission: PermissionPresetId) => void;
  onReasoningEffortChange: (effort: string) => void;
  onReloadCodexConfig: () => void;
  onCodexConfigFieldChange: (field: CodexConfigFieldKey, value: string) => void;
  onCodexConfigValueChange: (keyPath: string, value: JsonValue) => void;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
  onActivateProvider: (providerId: string, model?: string) => void;
};

const NAV_ITEMS: Array<{ id: SettingsSectionId; label: string; icon: ReactNode }> = [
  { id: "codex", label: "Codex Engine", icon: <StorageIcon fontSize="small" /> },
  { id: "appearance", label: "Appearance", icon: <ColorLensIcon fontSize="small" /> },
  { id: "layout", label: "Layout", icon: <DashboardCustomizeIcon fontSize="small" /> },
  { id: "session", label: "Session", icon: <TuneIcon fontSize="small" /> },
  { id: "relay", label: "Relay", icon: <MemoryIcon fontSize="small" /> },
  { id: "plugins", label: "Plugins", icon: <ExtensionIcon fontSize="small" /> },
  { id: "pet", label: "Pet Dock", icon: <PetsIcon fontSize="small" /> },
  { id: "privacy", label: "Privacy", icon: <SecurityIcon fontSize="small" /> }
];

export function SettingsDrawer({
  open,
  themeMode,
  installedThemePluginIds,
  customThemePlugins,
  leftPanelVisible,
  inspectorVisible,
  petDockEnabled,
  cwd,
  permission,
  providers,
  activeProviderId,
  selectedModel,
  reasoningEffort,
  reasoningOptions,
  codexConfig,
  codexConfigLoading,
  codexConfigSaving,
  codexConfigError,
  onClose,
  onThemeModeChange,
  onInstallThemePlugin,
  onUninstallThemePlugin,
  onSaveCustomThemePlugin,
  onRemoveCustomThemePlugin,
  onLeftPanelVisibleChange,
  onInspectorVisibleChange,
  onPetDockEnabledChange,
  onCwdChange,
  onPermissionChange,
  onReasoningEffortChange,
  onReloadCodexConfig,
  onCodexConfigFieldChange,
  onCodexConfigValueChange,
  onSaveProvider,
  onActivateProvider
}: Props) {
  const [section, setSection] = useState<SettingsSectionId>("codex");
  const [codexConfigMode, setCodexConfigMode] = useState<"quick" | "all">("quick");
  const [codexConfigSearch, setCodexConfigSearch] = useState("");
  const activeProvider = providers.find((provider) => provider.id === activeProviderId);
  const selectedReasoning = reasoningOptions.find((option) => option.value === reasoningEffort);
  const allThemePlugins = useMemo(
    () => [...themePlugins, ...customThemePlugins.filter((plugin) => !themePlugins.some((entry) => entry.id === plugin.id))],
    [customThemePlugins]
  );
  const dynamicCodexConfigFields = useMemo(() => getDynamicCodexConfigFields(codexConfig?.rawConfig), [codexConfig?.rawConfig]);
  const groupedDynamicCodexConfigFields = useMemo(() => {
    const needle = codexConfigSearch.trim().toLowerCase();
    const filtered = dynamicCodexConfigFields.filter((field) => {
      if (!needle) {
        return true;
      }
      return (
        field.keyPath.toLowerCase().includes(needle) ||
        field.label.toLowerCase().includes(needle) ||
        field.description.toLowerCase().includes(needle)
      );
    });
    return filtered.reduce<Array<{ group: string; fields: DynamicCodexConfigField[] }>>((groups, field) => {
      const existing = groups.find((entry) => entry.group === field.group);
      if (existing) {
        existing.fields.push(field);
      } else {
        groups.push({ group: field.group, fields: [field] });
      }
      return groups;
    }, []);
  }, [codexConfigSearch, dynamicCodexConfigFields]);

  useEffect(() => {
    if (open) {
      setSection("codex");
      setCodexConfigMode("quick");
      setCodexConfigSearch("");
    }
  }, [open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: "min(960px, 100vw)" },
          maxWidth: "100vw",
          bgcolor: "background.default",
          borderLeft: "1px solid",
          borderColor: "divider"
        }
      }}
    >
      <Box sx={{ height: "100%", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" }}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: (theme) =>
              theme.palette.mode === "light"
                ? "0 0 2px 0 rgba(145 158 171 / 0.2), 0 8px 16px -8px rgba(145 158 171 / 0.16)"
                : "none"
          }}
        >
          <SettingsSuggestIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 800 }}>
              Settings
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Live Codex user config, theme plugins, and resizable workbench preferences
            </Typography>
          </Box>
          <Button size="small" startIcon={<CloseIcon />} onClick={onClose} aria-label="Close settings">
            Close
          </Button>
        </Stack>

        <Box
          sx={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" }
          }}
        >
          <Box
            sx={{
              borderRight: { md: "1px solid" },
              borderBottom: { xs: "1px solid", md: 0 },
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "auto"
            }}
          >
            <List dense disablePadding sx={{ py: 1 }}>
              {NAV_ITEMS.map((item) => (
                <ListItemButton
                  key={item.id}
                  selected={section === item.id}
                  onClick={() => setSection(item.id)}
                  aria-label={`Open ${item.label} settings`}
                  sx={{ mx: 1, borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: "body2", fontWeight: section === item.id ? 700 : 600 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Box sx={{ overflow: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2, bgcolor: "background.default" }}>
            {section === "codex" && (
              <SettingsSection icon={<StorageIcon fontSize="small" />} title="Codex Engine Config" subtitle="Synced through config/read and config/batchWrite">
                <SettingRow
                  title="User config sync"
                  description="Curated fields write into the real Codex user config.toml with reloadUserConfig. Theme skins and API keys never enter this path."
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {codexConfigLoading || codexConfigSaving ? <CircularProgress size={18} /> : null}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={onReloadCodexConfig}
                      disabled={codexConfigLoading || codexConfigSaving}
                      aria-label="Reload Codex config"
                    >
                      Reload Codex config
                    </Button>
                  </Stack>
                </SettingRow>
                {codexConfigError ? (
                  <Box sx={{ px: 1.5, pb: 1.5 }}>
                    <Alert severity="error" variant="outlined">
                      {codexConfigError}
                    </Alert>
                  </Box>
                ) : null}
                {!codexConfig && !codexConfigLoading ? (
                  <Box sx={{ px: 1.5, pb: 1.5 }}>
                    <Alert severity="info" variant="outlined">
                      Open Settings while the engine is ready to load live user config.
                    </Alert>
                  </Box>
                ) : null}
                <SettingRow
                  title="Config coverage"
                  description="Quick settings keep the common controls compact. All config is generated from Codex's bundled JSON schema and includes runtime keys from config/read."
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant={codexConfigMode === "quick" ? "contained" : "outlined"}
                      onClick={() => setCodexConfigMode("quick")}
                    >
                      Quick settings
                    </Button>
                    <Button
                      size="small"
                      variant={codexConfigMode === "all" ? "contained" : "outlined"}
                      onClick={() => setCodexConfigMode("all")}
                    >
                      All config
                    </Button>
                  </Stack>
                </SettingRow>
                {codexConfigMode === "quick" ? (
                  <>
                    {CODEX_CONFIG_FIELD_META.map((field) => (
                      <CodexConfigFieldRow
                        key={field.key}
                        fieldKey={field.key}
                        label={field.label}
                        description={field.description}
                        kind={field.kind}
                        options={field.options}
                        readOnly={field.readOnly}
                        value={codexConfig?.[field.key] ?? ""}
                        disabled={!codexConfig || Boolean(field.readOnly) || codexConfigSaving}
                        onCommit={(next) => onCodexConfigFieldChange(field.key, next)}
                      />
                    ))}
                  </>
                ) : (
                  <Box>
                    <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Search all Codex config"
                        value={codexConfigSearch}
                        onChange={(event) => setCodexConfigSearch(event.target.value)}
                        inputProps={{ "aria-label": "Search all Codex config" }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                        {groupedDynamicCodexConfigFields.reduce((count, group) => count + group.fields.length, 0)} schema/runtime settings
                      </Typography>
                    </Box>
                    {groupedDynamicCodexConfigFields.map((group) => (
                      <Box key={group.group} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1, bgcolor: "background.default" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {group.group}
                          </Typography>
                          <Chip size="small" label={group.fields.length} variant="outlined" />
                        </Stack>
                        {group.fields.map((field) => (
                          <DynamicCodexConfigFieldRow
                            key={field.keyPath}
                            field={field}
                            value={getConfigValueAtPath(codexConfig?.rawConfig ?? {}, field.keyPath)}
                            disabled={!codexConfig || codexConfigSaving}
                            onCommit={(next) => onCodexConfigValueChange(field.keyPath, next)}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                )}
                <SettingRow title="Config source" description="Engine-owned keys only. Provider secrets use keyring; skins use local theme plugins.">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label="config/read" color="primary" variant="outlined" />
                    <Chip size="small" label="Codex JSON schema" color="primary" variant="outlined" />
                  </Stack>
                </SettingRow>
              </SettingsSection>
            )}

            {section === "appearance" && (
              <SettingsSection icon={<ColorLensIcon fontSize="small" />} title="Appearance" subtitle="Official skins plus installable and user-defined theme plugins">
                <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 850 }}>
                    Theme
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Select your preferred color scheme.
                  </Typography>
                  <ThemeModeCards themeMode={themeMode} onThemeModeChange={onThemeModeChange} />
                </Box>
                <SettingRow title="Active skin" description="Official themes are always installed. Local/customer skins can be installed and switched here.">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Skin</InputLabel>
                    <Select
                      value={themeMode}
                      label="Skin"
                      inputProps={{ "aria-label": "Skin theme" }}
                      onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
                    >
                      <MenuItem value="system">System</MenuItem>
                      {allThemePlugins
                        .filter((plugin) => installedThemePluginIds.includes(plugin.id))
                        .map((plugin) => (
                          <MenuItem key={plugin.id} value={plugin.id}>
                            {plugin.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </SettingRow>
                <ThemePluginManager
                  plugins={allThemePlugins}
                  activeThemeId={themeMode}
                  installedThemePluginIds={installedThemePluginIds}
                  onThemeModeChange={onThemeModeChange}
                  onInstallThemePlugin={onInstallThemePlugin}
                  onUninstallThemePlugin={onUninstallThemePlugin}
                  onRemoveCustomThemePlugin={onRemoveCustomThemePlugin}
                />
                <CustomThemePluginEditor onSave={onSaveCustomThemePlugin} />
                <SettingRow title="Skin safety boundary" description="Theme plugins and API relay providers are independent. Restoring Light/Black never rewrites provider keys or base URLs.">
                  <Chip size="small" label="Separated" color="success" variant="outlined" />
                </SettingRow>
              </SettingsSection>
            )}

            {section === "layout" && (
              <SettingsSection icon={<DashboardCustomizeIcon fontSize="small" />} title="Layout" subtitle="All desktop workbench windows stay resizable like VS Code">
                <SettingRow title="History panel" description="Show or hide the left conversation panel. Width is draggable on desktop.">
                  <Switch
                    checked={leftPanelVisible}
                    onChange={(event) => onLeftPanelVisibleChange(event.target.checked)}
                    inputProps={{ "aria-label": "History panel" }}
                  />
                </SettingRow>
                <SettingRow title="Inspector panel" description="Show or hide the right config/tools/files panel. Width is draggable on desktop.">
                  <Switch
                    checked={inspectorVisible}
                    onChange={(event) => onInspectorVisibleChange(event.target.checked)}
                    inputProps={{ "aria-label": "Inspector panel" }}
                  />
                </SettingRow>
                <SettingRow title="Nested pane splits" description="Files explorer, editor, and terminal use nested resizable splits with layout persistence.">
                  <Chip size="small" label="VS Code style" color="primary" variant="outlined" />
                </SettingRow>
                <SettingRow title="Workspace cwd" description="Used for new threads, file tools, skills and permission roots.">
                  <TextField size="small" value={cwd} onChange={(event) => onCwdChange(event.target.value)} sx={{ minWidth: 240 }} />
                </SettingRow>
              </SettingsSection>
            )}

            {section === "session" && (
              <SettingsSection icon={<TuneIcon fontSize="small" />} title="Session Model And Reasoning" subtitle="Per-session overrides used by the next turn">
                <SettingRow title="Selected model" description="Session model for the next turn (toolbar). Engine default is managed in Codex Engine Config.">
                  <Chip size="small" label={selectedModel || "Not selected"} />
                </SettingRow>
                <SettingRow title="Reasoning strength" description={selectedReasoning?.description || "Sends the selected effort as turn/start.effort for this session."}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Effort</InputLabel>
                    <Select
                      value={reasoningEffort}
                      label="Effort"
                      inputProps={{ "aria-label": "Reasoning effort" }}
                      onChange={(event) => onReasoningEffortChange(event.target.value)}
                    >
                      {reasoningOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </SettingRow>
                <SettingRow title="Permission preset" description="Controls sandbox and approval policy for new turns in this UI session.">
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Permissions</InputLabel>
                    <Select value={permission} label="Permissions" onChange={(event) => onPermissionChange(event.target.value as PermissionPresetId)}>
                      {permissionPresets.map((preset) => (
                        <MenuItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </SettingRow>
              </SettingsSection>
            )}

            {section === "relay" && (
              <RelaySettingsPanel
                providers={providers}
                activeProviderId={activeProviderId}
                activeProvider={activeProvider}
                selectedModel={selectedModel}
                onSaveProvider={onSaveProvider}
                onActivateProvider={onActivateProvider}
              />
            )}

            {section === "plugins" && (
              <SettingsSection icon={<ExtensionIcon fontSize="small" />} title="Plugins" subtitle="Skills, MCP apps, and theme plugins share the customization surface">
                <SettingRow title="Customer customization" description="Theme plugins, Skills and MCP-backed apps share this customization surface.">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label="Skills ready" />
                    <Chip size="small" label="Plugin marketplace ready" />
                    <Chip size="small" label="Theme plugins" variant="outlined" />
                  </Stack>
                </SettingRow>
              </SettingsSection>
            )}

            {section === "pet" && (
              <SettingsSection icon={<PetsIcon fontSize="small" />} title="Pet Dock" subtitle="Optional companion surface independent of chat layout">
                <SettingRow title="Three.js pet dock" description="A small independent scene can be enabled for a companion/status surface.">
                  <FormControlLabel
                    control={<Switch checked={petDockEnabled} onChange={(event) => onPetDockEnabledChange(event.target.checked)} />}
                    label="Enabled"
                  />
                </SettingRow>
                <PetDock enabled={petDockEnabled} />
              </SettingsSection>
            )}

            {section === "privacy" && (
              <SettingsSection icon={<SecurityIcon fontSize="small" />} title="Privacy And Safety" subtitle="Secrets and dangerous mode stay audited">
                <SettingRow title="Provider key handling" description="Keys are masked in the UI and excluded from exported profiles and Codex config writes.">
                  <Chip size="small" label="Masked" color="success" variant="outlined" />
                </SettingRow>
                <SettingRow title="Dangerous mode audit" description="Critical bypass turns are written to the local audit log.">
                  <Chip size="small" label="Enabled" color="warning" variant="outlined" />
                </SettingRow>
              </SettingsSection>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

type RelayTemplateId = "openai" | "deepseek" | "gemini" | "anthropic" | "moonshot" | "zhipu" | "minimax";

const RELAY_PROVIDER_TEMPLATES: Array<{
  id: RelayTemplateId;
  label: string;
  icon: ReactNode;
  kind: ProviderConfig["kind"];
  apiFormat: ProviderConfig["kind"];
  baseUrl: string;
  nativeModels: string;
  modelAliases: string;
}> = [
  {
    id: "openai",
    label: "OpenAI",
    icon: <TokenIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.openai.com/v1",
    nativeModels: "gpt-5.6-sol,gpt-5.5",
    modelAliases: "codex=gpt-5.6-sol"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    icon: <SearchIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.deepseek.com/v1",
    nativeModels: "deepseek-chat",
    modelAliases: "codex=deepseek-chat"
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: <AutoAwesomeIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    nativeModels: "gemini-2.5-pro",
    modelAliases: "codex=gemini-2.5-pro"
  },
  {
    id: "anthropic",
    label: "Anthropic",
    icon: <ViewInArIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.anthropic.com/v1",
    nativeModels: "claude-opus-4-6",
    modelAliases: "codex=claude-opus-4-6"
  },
  {
    id: "moonshot",
    label: "Moonshot",
    icon: <DarkModeIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.moonshot.cn/v1",
    nativeModels: "kimi-k2",
    modelAliases: "codex=kimi-k2"
  },
  {
    id: "zhipu",
    label: "Zhipu",
    icon: <PsychologyIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    nativeModels: "glm-4.5",
    modelAliases: "codex=glm-4.5"
  },
  {
    id: "minimax",
    label: "Minimax",
    icon: <WavesIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.minimax.chat/v1",
    nativeModels: "minimax-m1",
    modelAliases: "codex=minimax-m1"
  }
];

const DEFAULT_RELAY_PROVIDER_TEMPLATE = RELAY_PROVIDER_TEMPLATES[0]!;

function RelaySettingsPanel({
  providers,
  activeProviderId,
  activeProvider,
  selectedModel,
  onSaveProvider,
  onActivateProvider
}: {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  activeProvider?: ProviderConfig;
  selectedModel: string;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => void;
  onActivateProvider: (providerId: string, model?: string) => void;
}) {
  const [templateId, setTemplateId] = useState<RelayTemplateId>("openai");
  const template = RELAY_PROVIDER_TEMPLATES.find((entry) => entry.id === templateId) ?? DEFAULT_RELAY_PROVIDER_TEMPLATE;
  const [apiFormat, setApiFormat] = useState<ProviderConfig["kind"]>(template.apiFormat);
  const [name, setName] = useState("My Channel");
  const [baseUrl, setBaseUrl] = useState(template.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [nativeModels, setNativeModels] = useState(template.nativeModels);
  const [modelAliases, setModelAliases] = useState(template.modelAliases);
  const [providerModels, setProviderModels] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const filteredProviders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return providers;
    }
    return providers.filter((provider) =>
      [provider.name, provider.kind, provider.baseUrl, provider.defaultModel, ...provider.nativeModels]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [providers, search]);

  const saveChannel = () => {
    const nativeModelList = parseCsv(nativeModels);
    const kind = apiFormat === "openai" ? "openai" : template.kind;
    onSaveProvider(
      {
        id: "",
        kind,
        name: name.trim() || template.label,
        baseUrl: baseUrl.trim() || undefined,
        defaultModel: nativeModelList[0] ?? selectedModel,
        nativeModels: nativeModelList,
        modelAliases: parseAliases(modelAliases),
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      apiKey || undefined
    );
  };

  return (
    <SettingsSection icon={<MemoryIcon fontSize="small" />} title="Model Channels" subtitle="Create, save, and activate third-party relay providers from Settings">
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "230px minmax(0, 1fr)" },
          minHeight: 430
        }}
      >
        <Box sx={{ borderRight: { lg: "1px solid" }, borderBottom: { xs: "1px solid", lg: 0 }, borderColor: "divider", bgcolor: "background.default" }}>
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Service Provider
            </Typography>
          </Box>
          <Stack spacing={1} sx={{ p: 1.25 }}>
            {RELAY_PROVIDER_TEMPLATES.map((entry) => {
              const selected = entry.id === templateId;
              return (
                <Button
                  key={entry.id}
                  color={selected ? "primary" : "inherit"}
                  variant={selected ? "outlined" : "text"}
                  onClick={() => {
                    setTemplateId(entry.id);
                    setApiFormat(entry.apiFormat);
                    setName(entry.label === "OpenAI" ? "My Channel" : `${entry.label} Relay`);
                    setBaseUrl(entry.baseUrl);
                    setNativeModels(entry.nativeModels);
                    setModelAliases(entry.modelAliases);
                  }}
                  startIcon={<Radio checked={selected} size="small" />}
                  sx={{
                    justifyContent: "flex-start",
                    borderColor: selected ? "primary.main" : "divider",
                    bgcolor: selected ? "action.selected" : "background.paper",
                    py: 1.05,
                    gap: 0.5,
                    "& .MuiButton-startIcon": { mr: 0.5 }
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    {entry.icon}
                    <Typography variant="body2" sx={{ fontWeight: selected ? 800 : 600 }}>
                      {entry.label}
                    </Typography>
                  </Stack>
                </Button>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: "background.paper" }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 850, color: "primary.main" }}>
                  Add Channel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a new AI model channel backed by a relay provider.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={activeProvider?.name ?? "Official/default"} color={activeProvider ? "primary" : "default"} />
                <Chip size="small" label={`${providers.length} saved`} variant="outlined" />
              </Stack>
            </Stack>

            <Stack spacing={1.5}>
              <RelayFormRow label="API Format">
                <Stack spacing={1}>
                  <FormControl size="small" sx={{ maxWidth: 360 }}>
                    <InputLabel>API Format</InputLabel>
                    <Select
                      value={apiFormat}
                      label="API Format"
                      inputProps={{ "aria-label": "API Format" }}
                      onChange={(event) => setApiFormat(event.target.value as ProviderConfig["kind"])}
                    >
                      <MenuItem value="responsesRelay">OpenAI (Responses relay)</MenuItem>
                      <MenuItem value="openai">OpenAI API key</MenuItem>
                      <MenuItem value="ollama">Ollama compatible</MenuItem>
                      <MenuItem value="lmstudio">LM Studio compatible</MenuItem>
                      <MenuItem value="bedrock">Bedrock experimental</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                    {["OpenAI (Responses)", "OpenAI (Chat Completions)", "OpenAI-compatible relay"].map((label, index) => (
                      <FormControlLabel
                        key={label}
                        control={<Switch size="small" checked={index === 0 || apiFormat === "openai"} />}
                        label={label}
                        sx={{ mr: 0 }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </RelayFormRow>
              <RelayFormRow label="Channel Name">
                <TextField size="small" fullWidth label="Channel Name" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ "aria-label": "Channel Name" }} />
              </RelayFormRow>
              <RelayFormRow label="Base URL">
                <TextField size="small" fullWidth label="Base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} inputProps={{ "aria-label": "Base URL" }} />
              </RelayFormRow>
              <RelayFormRow label="API Key">
                <TextField size="small" fullWidth label="API Key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} inputProps={{ "aria-label": "Relay API key" }} />
              </RelayFormRow>
              <RelayFormRow label="Supported Models">
                <TextField
                  size="small"
                  fullWidth
                  label="Native models, comma-separated"
                  value={nativeModels}
                  onChange={(event) => setNativeModels(event.target.value)}
                />
              </RelayFormRow>
              <RelayFormRow label="Model Aliases">
                <TextField
                  size="small"
                  fullWidth
                  label="Model aliases, comma-separated alias=model"
                  value={modelAliases}
                  onChange={(event) => setModelAliases(event.target.value)}
                />
              </RelayFormRow>
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 0.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setName(template.label === "OpenAI" ? "My Channel" : `${template.label} Relay`);
                    setBaseUrl(template.baseUrl);
                    setNativeModels(template.nativeModels);
                    setModelAliases(template.modelAliases);
                    setApiKey("");
                  }}
                >
                  Cancel
                </Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={saveChannel}>
                  Create
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} sx={{ p: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 850 }}>
              Channels
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Saved relay providers, model aliases, activation state, and health.
            </Typography>
          </Box>
          <TextField
            size="small"
            label="Search channels"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, color: "text.secondary" }} /> }}
            sx={{ minWidth: { sm: 260 } }}
          />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ px: 1.5, pb: 1.5 }}>
          <Chip size="small" label={`All ${providers.length}`} color="primary" />
          {Object.entries(providerCounts(providers)).map(([kind, count]) => (
            <Chip key={kind} size="small" label={`${providerKindLabel(kind)} ${count}`} variant="outlined" />
          ))}
        </Stack>
        <Stack spacing={1.25} sx={{ px: 1.5, pb: 1.5 }}>
          {filteredProviders.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
              No relay channels saved yet.
            </Typography>
          ) : (
            filteredProviders.map((provider) => {
              const active = provider.id === activeProviderId;
              const modelOptions = providerModelOptions(provider);
              const selectedProviderModel = providerModels[provider.id] ?? provider.defaultModel ?? modelOptions[0]?.value ?? "";
              const visibleModels = modelOptions.slice(0, 4);
              return (
                <Box
                  key={provider.id}
                  sx={{
                    p: 1.25,
                    border: "1px solid",
                    borderColor: active ? "primary.main" : "divider",
                    borderRadius: 1,
                    bgcolor: active ? "action.selected" : "background.paper",
                    boxShadow: active ? "0 0 0 1px rgba(24,119,242,0.14)" : "none"
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }} justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                          {provider.name}
                        </Typography>
                        <Chip size="small" label={active ? "active" : "saved"} color={active ? "primary" : "default"} />
                        <Chip size="small" label={providerKindLabel(provider.kind)} variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, overflowWrap: "anywhere" }}>
                        {provider.baseUrl || "managed provider"} {provider.apiKeyPreview ? `- ${provider.apiKeyPreview}` : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main", boxShadow: "0 0 8px rgba(34,197,94,0.45)" }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        healthy
                      </Typography>
                      <Chip size="small" label="weight 0" variant="outlined" />
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {visibleModels.map((option) => (
                      <Chip key={option.value} size="small" label={option.value} variant="outlined" sx={{ maxWidth: "100%" }} />
                    ))}
                    {modelOptions.length > visibleModels.length && <Chip size="small" label={`+${modelOptions.length - visibleModels.length}`} variant="outlined" />}
                  </Stack>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 1.25 }}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: { xs: 0, sm: 180 } }}>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={selectedProviderModel}
                        label="Model"
                        onChange={(event) => setProviderModels((current) => ({ ...current, [provider.id]: event.target.value }))}
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
                      variant={active ? "outlined" : "contained"}
                      startIcon={<PlayArrowIcon />}
                      onClick={() => onActivateProvider(provider.id, selectedProviderModel || undefined)}
                      sx={{ minWidth: { xs: "100%", sm: 132 } }}
                    >
                      Activate
                    </Button>
                  </Stack>
                </Box>
              );
            })
          )}
        </Stack>
      </Box>
    </SettingsSection>
  );
}

function RelayFormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "170px minmax(0, 1fr)" },
        gap: { xs: 0.75, md: 2 },
        alignItems: "start"
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, pt: { md: 1 } }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

function providerModelOptions(provider: ProviderConfig): Array<{ value: string; label: string }> {
  const fallbackModels = provider.defaultModel ? [provider.defaultModel] : [];
  const nativeModelOptions = provider.nativeModels.length > 0 ? provider.nativeModels : fallbackModels;
  return [
    ...provider.modelAliases.map((entry) => ({ value: entry.alias, label: `${entry.alias} -> ${entry.model}` })),
    ...nativeModelOptions.map((model) => ({ value: model, label: model }))
  ].filter((entry, index, entries) => entries.findIndex((candidate) => candidate.value === entry.value) === index);
}

function providerCounts(providers: ProviderConfig[]): Record<string, number> {
  return providers.reduce<Record<string, number>>((counts, provider) => {
    counts[provider.kind] = (counts[provider.kind] ?? 0) + 1;
    return counts;
  }, {});
}

function providerKindLabel(kind: string): string {
  switch (kind) {
    case "responsesRelay":
      return "Responses";
    case "chatgpt":
      return "ChatGPT";
    case "openai":
      return "OpenAI";
    case "ollama":
      return "Ollama";
    case "lmstudio":
      return "LM Studio";
    case "bedrock":
      return "Bedrock";
    default:
      return kind;
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

function CodexConfigFieldRow({
  fieldKey,
  label,
  description,
  kind,
  options,
  readOnly,
  value,
  disabled,
  onCommit
}: {
  fieldKey: CodexConfigFieldKey;
  label: string;
  description: string;
  kind: "text" | "select" | "textarea";
  options?: Array<{ value: string; label: string }>;
  readOnly?: boolean;
  value: string;
  disabled: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value, fieldKey]);

  if (kind === "textarea") {
    return (
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, mb: 1 }}>
          {description}
        </Typography>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          label={label}
          value={draft}
          disabled={disabled}
          inputProps={{ "aria-label": label, readOnly: Boolean(readOnly) }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (!readOnly && draft !== value) {
              onCommit(draft);
            }
          }}
        />
      </Box>
    );
  }

  return (
    <SettingRow title={label} description={description}>
      {kind === "select" ? (
        <FormControl size="small" sx={{ minWidth: 180 }} disabled={disabled}>
          <InputLabel id={`codex-config-${fieldKey}-label`}>{label}</InputLabel>
          <Select
            labelId={`codex-config-${fieldKey}-label`}
            label={label}
            value={value || ""}
            inputProps={{ "aria-label": label }}
            onChange={(event) => onCommit(event.target.value)}
          >
            {!value ? (
              <MenuItem value="">
                <em>Unset</em>
              </MenuItem>
            ) : null}
            {(options ?? []).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField
          size="small"
          label={label}
          value={draft}
          disabled={disabled}
          inputProps={{ "aria-label": label, readOnly: Boolean(readOnly) }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (!readOnly && draft !== value) {
              onCommit(draft);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !readOnly && draft !== value) {
              onCommit(draft);
            }
          }}
          sx={{ minWidth: 180 }}
        />
      )}
    </SettingRow>
  );
}

function DynamicCodexConfigFieldRow({
  field,
  value,
  disabled,
  onCommit
}: {
  field: DynamicCodexConfigField;
  value: unknown;
  disabled: boolean;
  onCommit: (value: JsonValue) => void;
}) {
  const formattedValue = useMemo(() => formatConfigValueForField(field, value), [field, value]);
  const [draft, setDraft] = useState(formattedValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(formattedValue);
    setError(null);
  }, [formattedValue, field.keyPath]);

  const commitTextValue = () => {
    if (draft === formattedValue) {
      return;
    }
    const parsed = parseDynamicConfigFieldValue(field, draft);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onCommit(parsed.value);
  };

  const fieldCaption = (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {field.label}
        </Typography>
        <Chip size="small" label={field.keyPath} variant="outlined" />
        {field.source === "runtime" ? <Chip size="small" label="runtime" color="warning" variant="outlined" /> : null}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {field.description}
      </Typography>
      {field.defaultValue !== undefined ? (
        <Typography variant="caption" color="text.secondary">
          Default: {formatDefaultValue(field.defaultValue)}
        </Typography>
      ) : null}
    </Stack>
  );

  if (field.kind === "boolean") {
    return (
      <SettingRow title={fieldCaption} description={null}>
        <Switch
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => {
            const parsed = parseDynamicConfigFieldValue(field, event.target.checked);
            if (!("error" in parsed)) {
              onCommit(parsed.value);
            }
          }}
          inputProps={{ "aria-label": field.label }}
        />
      </SettingRow>
    );
  }

  if (field.kind === "select") {
    return (
      <SettingRow title={fieldCaption} description={null}>
        <FormControl size="small" sx={{ minWidth: 220 }} disabled={disabled}>
          <InputLabel id={`dynamic-codex-config-${field.keyPath}-label`}>{field.label}</InputLabel>
          <Select
            labelId={`dynamic-codex-config-${field.keyPath}-label`}
            label={field.label}
            value={formattedValue}
            inputProps={{ "aria-label": field.label }}
            onChange={(event) => {
              const parsed = parseDynamicConfigFieldValue(field, event.target.value);
              if (!("error" in parsed)) {
                onCommit(parsed.value);
              }
            }}
          >
            {!formattedValue ? (
              <MenuItem value="">
                <em>Unset</em>
              </MenuItem>
            ) : null}
            {(field.options ?? []).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </SettingRow>
    );
  }

  if (field.kind === "textarea" || field.kind === "json") {
    return (
      <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        {fieldCaption}
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={field.kind === "json" ? 4 : 3}
          maxRows={10}
          label={field.kind === "json" ? `${field.label} JSON` : field.label}
          value={draft}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error ?? (field.kind === "json" ? "Edit as JSON and blur to save." : "Blur to save.")}
          inputProps={{ "aria-label": field.label }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitTextValue}
          sx={{ mt: 1 }}
        />
      </Box>
    );
  }

  return (
    <SettingRow title={fieldCaption} description={null}>
      <TextField
        size="small"
        label={field.label}
        type={field.kind === "number" ? "number" : "text"}
        value={draft}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error}
        inputProps={{ "aria-label": field.label }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitTextValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitTextValue();
          }
        }}
        sx={{ minWidth: 220 }}
      />
    </SettingRow>
  );
}

function formatDefaultValue(value: unknown): string {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function SettingsSection({
  icon,
  title,
  subtitle,
  children
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ pb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
          {subtitle}
        </Typography>
      ) : null}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "background.paper",
          boxShadow: (theme) =>
            theme.palette.mode === "light"
              ? "0 0 2px 0 rgba(145 158 171 / 0.2), 0 12px 24px -4px rgba(145 158 171 / 0.12)"
              : "0 0 0 1px rgba(255,255,255,0.04)"
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function ThemeModeCards({
  themeMode,
  onThemeModeChange
}: {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}) {
  const cards: Array<{
    mode: ThemeMode;
    label: string;
    description: string;
    icon: ReactNode;
    swatches: string[];
  }> = [
    {
      mode: "system",
      label: "System",
      description: "Follow OS light/dark preference.",
      icon: <ComputerIcon fontSize="small" />,
      swatches: ["#F8FAF5", "#FFFFFF", "#111827"]
    },
    {
      mode: "official-light",
      label: "Light",
      description: "Bright VS Code-style workspace.",
      icon: <LightModeIcon fontSize="small" />,
      swatches: ["#FFFFFF", "#E5E7EB", "#1877F2"]
    },
    {
      mode: "official-black",
      label: "Dark",
      description: "Black editor-style workspace.",
      icon: <DarkModeIcon fontSize="small" />,
      swatches: ["#070A0E", "#10161D", "#61F3F3"]
    }
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
      {cards.map((card) => {
        const active =
          themeMode === card.mode ||
          (card.mode === "official-light" && themeMode === "atmospheric-codex") ||
          (card.mode === "official-black" && themeMode === "studio-black-gold");
        return (
          <Button
            key={card.mode}
            variant="outlined"
            color={active ? "primary" : "inherit"}
            onClick={() => onThemeModeChange(card.mode)}
            sx={{
              p: 1,
              minHeight: 132,
              borderColor: active ? "primary.main" : "divider",
              bgcolor: active ? "action.selected" : "background.default",
              justifyContent: "stretch",
              textAlign: "left"
            }}
          >
            <Stack spacing={1} sx={{ width: "100%" }}>
              <Box
                sx={{
                  height: 58,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  display: "grid",
                  gridTemplateColumns: "1fr 1.45fr"
                }}
              >
                <Box sx={{ bgcolor: card.swatches[0], borderRight: "1px solid", borderColor: "divider", p: 0.75 }}>
                  <Box sx={{ height: 8, width: "70%", bgcolor: card.swatches[1], borderRadius: 0.5, mb: 0.75 }} />
                  <Box sx={{ height: 7, width: "52%", bgcolor: card.swatches[2], opacity: 0.5, borderRadius: 0.5 }} />
                </Box>
                <Box sx={{ bgcolor: card.swatches[1], p: 0.75 }}>
                  <Box sx={{ height: 10, width: "35%", bgcolor: card.swatches[2], borderRadius: 0.5, mb: 0.75 }} />
                  <Box sx={{ height: 16, width: "100%", bgcolor: card.mode === "official-black" ? "#252A3A" : "#E5E7EB", borderRadius: 0.75 }} />
                </Box>
              </Box>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {card.icon}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {card.description}
                  </Typography>
                </Box>
                {active ? <CheckCircleIcon fontSize="small" color="primary" /> : <Radio size="small" checked={false} />}
              </Stack>
            </Stack>
          </Button>
        );
      })}
    </Box>
  );
}

function ThemePluginManager({
  plugins,
  activeThemeId,
  installedThemePluginIds,
  onThemeModeChange,
  onInstallThemePlugin,
  onUninstallThemePlugin,
  onRemoveCustomThemePlugin
}: {
  plugins: ThemePlugin[];
  activeThemeId: ThemeMode;
  installedThemePluginIds: ThemeId[];
  onThemeModeChange: (mode: ThemeMode) => void;
  onInstallThemePlugin: (id: ThemeId) => void;
  onUninstallThemePlugin: (id: ThemeId) => void;
  onRemoveCustomThemePlugin: (id: ThemeId) => void;
}) {
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      {plugins.map((plugin) => {
        const installed = installedThemePluginIds.includes(plugin.id);
        const active = activeThemeId === plugin.id;
        const removable = plugin.source !== "official" && installed && !active;
        const deletable = plugin.source === "user-defined" && !active;
        return (
          <Stack
            key={plugin.id}
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.25} sx={{ flex: "0 0 auto" }} aria-hidden>
                {[plugin.preview.primary, plugin.preview.secondary, plugin.preview.background].map((color) => (
                  <Box
                    key={`${plugin.id}-${color}`}
                    sx={{
                      width: 18,
                      height: 28,
                      bgcolor: color,
                      borderRadius: 0.75,
                      border: "1px solid",
                      borderColor: "divider"
                    }}
                  />
                ))}
              </Stack>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {plugin.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      plugin.source === "official"
                        ? "official"
                        : plugin.source === "customer-slot"
                          ? "customer"
                          : plugin.source === "user-defined"
                            ? "user"
                            : "local"
                    }
                  />
                  {active && <Chip size="small" label="active" color="primary" />}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  {plugin.description}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
              {installed ? (
                <Button size="small" variant={active ? "contained" : "outlined"} disabled={active} onClick={() => onThemeModeChange(plugin.id)}>
                  {active ? "Active" : "Switch"}
                </Button>
              ) : (
                <Button size="small" variant="outlined" startIcon={<ExtensionIcon />} onClick={() => onInstallThemePlugin(plugin.id)}>
                  Install
                </Button>
              )}
              {removable && (
                <Button size="small" color="inherit" onClick={() => onUninstallThemePlugin(plugin.id)}>
                  Remove
                </Button>
              )}
              {deletable && (
                <IconButton size="small" aria-label={`Delete theme ${plugin.name}`} onClick={() => onRemoveCustomThemePlugin(plugin.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Stack>
        );
      })}
    </Box>
  );
}

function CustomThemePluginEditor({ onSave }: { onSave: (plugin: ThemePlugin) => void }) {
  const [name, setName] = useState("My Studio");
  const [description, setDescription] = useState("User-defined skin for this workbench.");
  const [primary, setPrimary] = useState("#0F766E");
  const [secondary, setSecondary] = useState("#F59E0B");
  const [background, setBackground] = useState("#F8FAFC");
  const [dark, setDark] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <AddIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Define theme plugin
        </Typography>
      </Stack>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Name" value={name} onChange={(event) => setName(event.target.value)} sx={{ flex: 1 }} inputProps={{ "aria-label": "Custom theme name" }} />
          <TextField
            size="small"
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            sx={{ flex: 1.4 }}
            inputProps={{ "aria-label": "Custom theme description" }}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <TextField size="small" label="Primary" value={primary} onChange={(event) => setPrimary(event.target.value)} inputProps={{ "aria-label": "Custom theme primary" }} />
          <TextField size="small" label="Secondary" value={secondary} onChange={(event) => setSecondary(event.target.value)} inputProps={{ "aria-label": "Custom theme secondary" }} />
          <TextField size="small" label="Background" value={background} onChange={(event) => setBackground(event.target.value)} inputProps={{ "aria-label": "Custom theme background" }} />
          <FormControlLabel control={<Switch checked={dark} onChange={(event) => setDark(event.target.checked)} inputProps={{ "aria-label": "Custom theme dark mode" }} />} label="Dark" />
        </Stack>
        {error ? (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center">
          <Stack direction="row" spacing={0.5} aria-hidden>
            {[primary, secondary, background].map((color) => (
              <Box key={color} sx={{ width: 22, height: 22, borderRadius: 0.75, bgcolor: color, border: "1px solid", borderColor: "divider" }} />
            ))}
          </Stack>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Theme name is required.");
                return;
              }
              if (![primary, secondary, background].every((value) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim()))) {
                setError("Primary, secondary, and background must be hex colors.");
                return;
              }
              const slug = trimmed
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 28);
              const id = `user-${slug || "theme"}-${Math.random().toString(36).slice(2, 7)}` as ThemeId;
              onSave({
                id,
                name: trimmed,
                description: description.trim() || "User-defined theme plugin.",
                source: "user-defined",
                installedByDefault: false,
                preview: {
                  primary: primary.trim(),
                  secondary: secondary.trim(),
                  background: background.trim()
                },
                dark
              });
              setError(null);
            }}
            aria-label="Save custom theme plugin"
          >
            Save plugin
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function SettingRow({
  title,
  description,
  children
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ p: 1.5, bgcolor: "background.paper" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {typeof title === "string" ? (
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          ) : (
            title
          )}
          {description ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ flex: "0 0 auto" }}>{children}</Box>
      </Stack>
      <Divider />
    </>
  );
}
