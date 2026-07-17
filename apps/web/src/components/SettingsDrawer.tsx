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
import type { ThemeMode } from "../theme";
import { PetDock } from "./PetDock";

export type ReasoningOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  open: boolean;
  themeMode: ThemeMode;
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
            <SettingRow title="Official theme" description="Light and Black are built in defaults. Theme plugins can extend this later.">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={themeMode}
                  label="Theme"
                  inputProps={{ "aria-label": "Theme mode" }}
                  onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="black">Black</MenuItem>
                </Select>
              </FormControl>
            </SettingRow>
            <SettingRow title="Theme plugin slot" description="Reserved install and switch surface for customer-specific themes.">
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" label="Built-in active" color="primary" variant="outlined" />
                <Chip size="small" label="Rose concept" variant="outlined" />
                <Chip size="small" label="Studio black-gold" variant="outlined" />
                <Chip size="small" label="Dream Skin compatible" variant="outlined" />
                <Button size="small" variant="outlined" startIcon={<ExtensionIcon />} disabled>
                  Install theme plugin
                </Button>
              </Stack>
            </SettingRow>
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
