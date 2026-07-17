import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import ExtensionIcon from "@mui/icons-material/Extension";
import MemoryIcon from "@mui/icons-material/Memory";
import PetsIcon from "@mui/icons-material/Pets";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import TuneIcon from "@mui/icons-material/Tune";
import { permissionPresets, type PermissionPresetId, type ProviderConfig } from "@codex-ui/shared";
import { themePlugins, type ThemeId, type ThemeMode } from "../theme";
import { PetDock } from "./PetDock";

export type ReasoningOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  open: boolean;
  themeMode: ThemeMode;
  installedThemePluginIds: ThemeId[];
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
  onClose: () => void;
  onThemeModeChange: (mode: ThemeMode) => void;
  onInstallThemePlugin: (id: ThemeId) => void;
  onUninstallThemePlugin: (id: ThemeId) => void;
  onLeftPanelVisibleChange: (visible: boolean) => void;
  onInspectorVisibleChange: (visible: boolean) => void;
  onPetDockEnabledChange: (enabled: boolean) => void;
  onCwdChange: (cwd: string) => void;
  onPermissionChange: (permission: PermissionPresetId) => void;
  onReasoningEffortChange: (effort: string) => void;
};

export function SettingsDrawer({
  open,
  themeMode,
  installedThemePluginIds,
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
  onClose,
  onThemeModeChange,
  onInstallThemePlugin,
  onUninstallThemePlugin,
  onLeftPanelVisibleChange,
  onInspectorVisibleChange,
  onPetDockEnabledChange,
  onCwdChange,
  onPermissionChange,
  onReasoningEffortChange
}: Props) {
  const activeProvider = providers.find((provider) => provider.id === activeProviderId);
  const selectedReasoning = reasoningOptions.find((option) => option.value === reasoningEffort);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 460 },
          bgcolor: "background.paper",
          borderLeft: "1px solid",
          borderColor: "divider"
        }
      }}
    >
      <Box sx={{ height: "100%", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <SettingsSuggestIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontSize: 17 }}>
              Settings
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Workbench, provider, theme, plugin and model preferences
            </Typography>
          </Box>
          <Button size="small" startIcon={<CloseIcon />} onClick={onClose}>
            Close
          </Button>
        </Stack>
        <Box sx={{ overflow: "auto", px: 2, pb: 2 }}>
          <SettingsSection icon={<ColorLensIcon fontSize="small" />} title="Appearance">
            <SettingRow title="Active skin" description="Official themes are always installed. Local/customer skins can be installed and switched here.">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Skin</InputLabel>
                <Select
                  value={themeMode}
                  label="Skin"
                  inputProps={{ "aria-label": "Skin theme" }}
                  onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
                >
                  {themePlugins
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
              activeThemeId={themeMode}
              installedThemePluginIds={installedThemePluginIds}
              onThemeModeChange={onThemeModeChange}
              onInstallThemePlugin={onInstallThemePlugin}
              onUninstallThemePlugin={onUninstallThemePlugin}
            />
            <SettingRow title="Skin safety boundary" description="Theme plugins and API relay providers are independent. Restoring Light/Black never rewrites provider keys or base URLs.">
              <Chip size="small" label="Separated" color="success" variant="outlined" />
            </SettingRow>
          </SettingsSection>

          <SettingsSection icon={<DashboardCustomizeIcon fontSize="small" />} title="Layout">
            <SettingRow title="History panel" description="Show or hide the left conversation panel. Width is draggable on desktop.">
              <Switch checked={leftPanelVisible} onChange={(event) => onLeftPanelVisibleChange(event.target.checked)} />
            </SettingRow>
            <SettingRow title="Inspector panel" description="Show or hide the right config/tools/files panel. Width is draggable on desktop.">
              <Switch checked={inspectorVisible} onChange={(event) => onInspectorVisibleChange(event.target.checked)} />
            </SettingRow>
            <SettingRow title="Workspace cwd" description="Used for new threads, file tools, skills and permission roots.">
              <TextField size="small" value={cwd} onChange={(event) => onCwdChange(event.target.value)} sx={{ minWidth: 220 }} />
            </SettingRow>
          </SettingsSection>

          <SettingsSection icon={<TuneIcon fontSize="small" />} title="Model And Reasoning">
            <SettingRow title="Selected model" description="Model switching is also pinned to the top-left toolbar.">
              <Chip size="small" label={selectedModel || "Not selected"} />
            </SettingRow>
            <SettingRow title="Reasoning strength" description={selectedReasoning?.description || "Sends the selected effort as turn/start.effort."}>
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
            <SettingRow title="Permission preset" description="Controls sandbox and approval policy for new turns.">
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

          <SettingsSection icon={<MemoryIcon fontSize="small" />} title="Third-Party Relay">
            <SettingRow title="Active provider" description={activeProvider?.baseUrl || "Official Codex provider or no relay activated."}>
              <Chip size="small" label={activeProvider?.name ?? "Official/default"} color={activeProvider ? "primary" : "default"} />
            </SettingRow>
            <SettingRow title="Saved providers" description="Provider API keys stay in keyring or process memory, not in UI profiles.">
              <Chip size="small" label={`${providers.length} configured`} />
            </SettingRow>
          </SettingsSection>

          <SettingsSection icon={<ExtensionIcon fontSize="small" />} title="Plugins">
            <SettingRow title="Customer customization" description="Theme plugins, Skills and MCP-backed apps share this customization surface.">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label="Skills ready" />
                <Chip size="small" label="Plugin marketplace ready" />
                <Chip size="small" label="Theme slot reserved" variant="outlined" />
              </Stack>
            </SettingRow>
          </SettingsSection>

          <SettingsSection icon={<PetsIcon fontSize="small" />} title="Pet Dock">
            <SettingRow title="Three.js pet dock" description="A small independent scene can be enabled for a companion/status surface.">
              <FormControlLabel
                control={<Switch checked={petDockEnabled} onChange={(event) => onPetDockEnabledChange(event.target.checked)} />}
                label="Enabled"
              />
            </SettingRow>
            <PetDock enabled={petDockEnabled} />
          </SettingsSection>

          <SettingsSection icon={<SecurityIcon fontSize="small" />} title="Privacy And Safety">
            <SettingRow title="Provider key handling" description="Keys are masked in the UI and excluded from exported profiles.">
              <Chip size="small" label="Masked" color="success" variant="outlined" />
            </SettingRow>
            <SettingRow title="Dangerous mode audit" description="Critical bypass turns are written to the local audit log.">
              <Chip size="small" label="Enabled" color="warning" variant="outlined" />
            </SettingRow>
          </SettingsSection>
        </Box>
      </Box>
    </Drawer>
  );
}

function SettingsSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>{children}</Box>
    </Box>
  );
}

function ThemePluginManager({
  activeThemeId,
  installedThemePluginIds,
  onThemeModeChange,
  onInstallThemePlugin,
  onUninstallThemePlugin
}: {
  activeThemeId: ThemeId;
  installedThemePluginIds: ThemeId[];
  onThemeModeChange: (mode: ThemeMode) => void;
  onInstallThemePlugin: (id: ThemeId) => void;
  onUninstallThemePlugin: (id: ThemeId) => void;
}) {
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      {themePlugins.map((plugin) => {
        const installed = installedThemePluginIds.includes(plugin.id);
        const active = activeThemeId === plugin.id;
        const removable = plugin.source !== "official" && installed && !active;
        return (
          <Stack
            key={plugin.id}
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ p: 1.25, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.25} sx={{ flex: "0 0 auto" }} aria-hidden>
                {[plugin.preview.primary, plugin.preview.secondary, plugin.preview.background].map((color) => (
                  <Box
                    key={color}
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
                  <Chip size="small" label={plugin.source === "official" ? "official" : plugin.source === "customer-slot" ? "customer" : "local"} />
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
            </Stack>
          </Stack>
        );
      })}
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
        sx={{ p: 1.25 }}
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
