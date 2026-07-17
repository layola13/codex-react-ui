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
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import ExtensionIcon from "@mui/icons-material/Extension";
import MemoryIcon from "@mui/icons-material/Memory";
import PetsIcon from "@mui/icons-material/Pets";
import RefreshIcon from "@mui/icons-material/Refresh";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import StorageIcon from "@mui/icons-material/Storage";
import TuneIcon from "@mui/icons-material/Tune";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { permissionPresets, type PermissionPresetId, type ProviderConfig } from "@codex-ui/shared";
import {
  CODEX_CONFIG_FIELD_META,
  type CodexConfigFieldKey,
  type CodexUserConfigView
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
  onCodexConfigFieldChange
}: Props) {
  const [section, setSection] = useState<SettingsSectionId>("codex");
  const activeProvider = providers.find((provider) => provider.id === activeProviderId);
  const selectedReasoning = reasoningOptions.find((option) => option.value === reasoningEffort);
  const allThemePlugins = useMemo(
    () => [...themePlugins, ...customThemePlugins.filter((plugin) => !themePlugins.some((entry) => entry.id === plugin.id))],
    [customThemePlugins]
  );

  useEffect(() => {
    if (open) {
      setSection("codex");
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
                      Reload
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
                <SettingRow title="Config source" description="Engine-owned keys only. Provider secrets use keyring; skins use local theme plugins.">
                  <Chip size="small" label="config/read" color="primary" variant="outlined" />
                </SettingRow>
              </SettingsSection>
            )}

            {section === "appearance" && (
              <SettingsSection icon={<ColorLensIcon fontSize="small" />} title="Appearance" subtitle="Official skins plus installable and user-defined theme plugins">
                <SettingRow title="Active skin" description="Official themes are always installed. Local/customer skins can be installed and switched here.">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Skin</InputLabel>
                    <Select
                      value={themeMode}
                      label="Skin"
                      inputProps={{ "aria-label": "Skin theme" }}
                      onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
                    >
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
              <SettingsSection icon={<MemoryIcon fontSize="small" />} title="Third-Party Relay" subtitle="Provider activation stays separate from Codex config.toml">
                <SettingRow title="Active provider" description={activeProvider?.baseUrl || "Official Codex provider or no relay activated."}>
                  <Chip size="small" label={activeProvider?.name ?? "Official/default"} color={activeProvider ? "primary" : "default"} />
                </SettingRow>
                <SettingRow title="Saved providers" description="Provider API keys stay in keyring or process memory, not in UI profiles or Codex config.toml.">
                  <Chip size="small" label={`${providers.length} configured`} />
                </SettingRow>
              </SettingsSection>
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
  kind: "text" | "select";
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
  activeThemeId: ThemeId;
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
  title: string;
  description: string;
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
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {description}
          </Typography>
        </Box>
        <Box sx={{ flex: "0 0 auto" }}>{children}</Box>
      </Stack>
      <Divider />
    </>
  );
}
