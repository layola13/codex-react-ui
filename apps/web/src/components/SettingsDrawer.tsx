import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
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
  Paper,
  Radio,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import type { ChannelGroupConfig, DangerousPermissionAuditEvent, JsonValue, ProviderConfig, StationType, TieredContextRatio } from "@codex-ui/shared";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import ComputerIcon from "@mui/icons-material/Computer";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import ExtensionIcon from "@mui/icons-material/Extension";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LayersIcon from "@mui/icons-material/Layers";
import MemoryIcon from "@mui/icons-material/Memory";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PsychologyIcon from "@mui/icons-material/Psychology";
import PetsIcon from "@mui/icons-material/Pets";
import LightModeIcon from "@mui/icons-material/LightMode";
import RefreshIcon from "@mui/icons-material/Refresh";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HubIcon from "@mui/icons-material/Hub";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import StorageIcon from "@mui/icons-material/Storage";
import TokenIcon from "@mui/icons-material/Token";
import TuneIcon from "@mui/icons-material/Tune";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import WavesIcon from "@mui/icons-material/Waves";
import { permissionPresets, type AuthUser, type PermissionPresetId } from "@codex-ui/shared";
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
import {
  REFERENCE_BACKGROUND_TUNING,
  clampThemeBlur,
  isHexColor,
  percentToUnit,
  themePlugins,
  themeVisualTuning,
  unitToPercent,
  type ThemeBackgroundScene,
  type ThemeId,
  type ThemeMode,
  type ThemePlugin
} from "../theme";
import type {
  FsDirectoryEntry,
  McpResourceContentEntry,
  PluginDetailEntry,
  PluginEntry,
  PluginInstallAuthNotice,
  PluginMarketplace,
  SkillEntry,
  ToolingState
} from "../state/codexClient";
import { fetchProviderModels, testProviderChat } from "../state/codexClient";
import { CodexPluginSettingsPanel, type CodexPluginSettingsTab } from "./CodexPluginSettingsPanel";
import { PetDock } from "./PetDock";
import { WorkspaceFilesSettingsPanel, type OpenWorkspaceFile } from "./WorkspaceFilesSettingsPanel";
import { MembersPermissionsPanel } from "./MembersPermissionsPanel";
import { CodeLaunchRelayBanner, LaunchAdaptersCatalog, ProviderCodeLaunchHint } from "./LaunchAdaptersPanel";
import { relayLikelyNeedsCodeLaunch } from "../launchAdapters";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import { UsageBillingPanel } from "./UsageBillingPanel";
import type { TranslateFn, TranslationKey } from "../i18n";

export type ReasoningOption = {
  value: string;
  label: string;
  description?: string;
};

export type SettingsSectionId =
  | "assistant"
  | "codex"
  | "appearance"
  | "layout"
  | "workspace"
  | "session"
  | "relay"
  | "launch"
  | "skills"
  | "plugins"
  | "pet"
  | "members"
  | "usage"
  | "security"
  | "privacy";

type Props = {
  open: boolean;
  initialSection?: SettingsSectionId;
  initialPluginTab?: CodexPluginSettingsTab;
  themeMode: ThemeMode;
  installedThemePluginIds: ThemeId[];
  customThemePlugins: ThemePlugin[];
  leftPanelVisible: boolean;
  showAssistantUsageDetails: boolean;
  showLaunchHistory?: boolean;
  petDockEnabled: boolean;
  cwd: string;
  permission: PermissionPresetId;
  providers: ProviderConfig[];
  activeProviderId: string | null;
  selectedModel: string;
  settingAssistantProviderId: string;
  settingAssistantModel: string;
  settingAssistantReady: boolean;
  settingAssistantEffectiveModel: string;
  reasoningEffort: string;
  reasoningOptions: ReasoningOption[];
  codexConfig: CodexUserConfigView | null;
  codexConfigLoading: boolean;
  codexConfigSaving: boolean;
  codexConfigError: string | null;
  tooling: ToolingState;
  toolingLoading: boolean;
  skillExtraRoots: string[];
  skillPreviews: Record<string, string>;
  fileDirectories: Record<string, FsDirectoryEntry[]>;
  openFile: OpenWorkspaceFile | null;
  filesPanelLayout?: Record<string, number>;
  activeThreadId: string | null;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  pluginAuthNotices: Record<string, PluginInstallAuthNotice>;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  auditEvents: DangerousPermissionAuditEvent[];
  currentUser: AuthUser | null;
  members: AuthUser[];
  membersLoading: boolean;
  membersError: string | null;
  allowedPermissions: PermissionPresetId[];
  t: TranslateFn;
  onClose: () => void;
  onThemeModeChange: (mode: ThemeMode) => void;
  onInstallThemePlugin: (id: ThemeId) => void;
  onUninstallThemePlugin: (id: ThemeId) => void;
  onSaveCustomThemePlugin: (plugin: ThemePlugin) => void;
  onRemoveCustomThemePlugin: (id: ThemeId) => void;
  onLeftPanelVisibleChange: (visible: boolean) => void;
  onShowAssistantUsageDetailsChange: (visible: boolean) => void;
  onShowLaunchHistoryChange?: (enabled: boolean) => void;
  onPetDockEnabledChange: (enabled: boolean) => void;
  onCwdChange: (cwd: string) => void;
  onPermissionChange: (permission: PermissionPresetId) => void;
  onReasoningEffortChange: (effort: string) => void;
  onSettingAssistantProviderChange: (providerId: string) => void;
  onSettingAssistantModelChange: (model: string) => void;
  onOpenOfficialLogin: () => void;
  onReloadCodexConfig: () => void;
  onCodexConfigFieldChange: (field: CodexConfigFieldKey, value: string) => void;
  onCodexConfigValueChange: (keyPath: string, value: JsonValue) => void;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => Promise<void>;
  onActivateProvider: (providerId: string, model?: string) => Promise<void>;
  onDeleteProvider: (providerId: string) => Promise<void>;
  onReloadTooling: () => void;
  onReloadMcp: () => void;
  onExportProfile: () => Promise<void>;
  onImportProfile: (file: File) => Promise<number>;
  onReloadAuditEvents: () => Promise<void>;
  onStartMcpOauth: (serverName: string) => void;
  onReadMcpResource: (serverName: string, uri: string) => void;
  onCallMcpTool: (serverName: string, toolName: string, args: JsonValue) => Promise<JsonValue>;
  onToggleSkill: (skill: SkillEntry, enabled: boolean) => void;
  onSaveSkillExtraRoots: (roots: string[]) => void;
  onReadSkillPreview: (skill: SkillEntry) => void;
  onFilesPanelLayoutChange?: (layout: Record<string, number>) => void;
  onReadDirectory: (path: string) => void;
  onReadFile: (path: string) => void;
  onChangeOpenFileContent: (content: string) => void;
  onSaveOpenFile: () => void;
  onReadPluginDetail: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onReadPluginSkill: (marketplace: PluginMarketplace, plugin: PluginEntry, skillName: string) => void;
  onInsertPluginMention: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onInstallPlugin: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onUninstallPlugin: (plugin: PluginEntry) => void;
  onReloadMembers: () => Promise<void>;
  onCreateMember: (input: {
    email: string;
    password: string;
    username?: string;
    role?: "admin" | "user";
    maxPermission?: PermissionPresetId;
    allowWrite?: boolean;
    allowNetwork?: boolean;
    allowDangerBypass?: boolean;
    balance?: number;
    concurrency?: number;
    notes?: string;
    allowedProviderIds?: string[];
  }) => Promise<void>;
  onUpdateMember: (id: string, input: Record<string, unknown>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onAllocateMemberBalance?: (id: string, amount: number, operation?: "set" | "add" | "subtract", notes?: string) => Promise<void>;
  sessionToken?: string | null;
};

const NAV_ITEMS: Array<{ id: SettingsSectionId; labelKey: TranslationKey; icon: ReactNode }> = [
  { id: "assistant", labelKey: "settings.nav.assistant", icon: <SettingsSuggestIcon fontSize="small" /> },
  { id: "codex", labelKey: "settings.nav.codex", icon: <StorageIcon fontSize="small" /> },
  { id: "appearance", labelKey: "settings.nav.appearance", icon: <ColorLensIcon fontSize="small" /> },
  { id: "layout", labelKey: "settings.nav.layout", icon: <DashboardCustomizeIcon fontSize="small" /> },
  { id: "workspace", labelKey: "settings.nav.workspace", icon: <StorageIcon fontSize="small" /> },
  { id: "session", labelKey: "settings.nav.session", icon: <TuneIcon fontSize="small" /> },
  { id: "relay", labelKey: "settings.nav.relay", icon: <MemoryIcon fontSize="small" /> },
  { id: "launch", labelKey: "settings.nav.launch", icon: <RocketLaunchIcon fontSize="small" /> },
  { id: "skills", labelKey: "settings.nav.skills", icon: <PsychologyIcon fontSize="small" /> },
  { id: "plugins", labelKey: "settings.nav.plugins", icon: <ExtensionIcon fontSize="small" /> },
  { id: "pet", labelKey: "settings.nav.pet", icon: <PetsIcon fontSize="small" /> },
  { id: "members", labelKey: "settings.nav.permissions", icon: <SecurityIcon fontSize="small" /> },
  { id: "usage", labelKey: "settings.nav.usage", icon: <AssessmentIcon fontSize="small" /> },
  { id: "security", labelKey: "settings.nav.security", icon: <SecurityIcon fontSize="small" /> },
  { id: "privacy", labelKey: "settings.nav.privacy", icon: <SecurityIcon fontSize="small" /> }
];

export function SettingsDrawer({
  open,
  initialSection = "codex",
  initialPluginTab = "marketplace",
  themeMode,
  installedThemePluginIds,
  customThemePlugins,
  leftPanelVisible,
  showAssistantUsageDetails,
  showLaunchHistory = false,
  petDockEnabled,
  cwd,
  permission,
  providers,
  activeProviderId,
  selectedModel,
  settingAssistantProviderId,
  settingAssistantModel,
  settingAssistantReady,
  settingAssistantEffectiveModel,
  reasoningEffort,
  reasoningOptions,
  codexConfig,
  codexConfigLoading,
  codexConfigSaving,
  codexConfigError,
  tooling,
  toolingLoading,
  skillExtraRoots,
  skillPreviews,
  fileDirectories,
  openFile,
  filesPanelLayout,
  activeThreadId,
  pluginDetails,
  pluginSkillPreviews,
  pluginAuthNotices,
  mcpResourceContents,
  mcpOauthUrls,
  auditEvents,
  currentUser,
  sessionToken,
  members,
  membersLoading,
  membersError,
  allowedPermissions,
  t,
  onClose,
  onThemeModeChange,
  onInstallThemePlugin,
  onUninstallThemePlugin,
  onSaveCustomThemePlugin,
  onRemoveCustomThemePlugin,
  onLeftPanelVisibleChange,
  onShowAssistantUsageDetailsChange,
  onShowLaunchHistoryChange,
  onPetDockEnabledChange,
  onCwdChange,
  onPermissionChange,
  onReasoningEffortChange,
  onSettingAssistantProviderChange,
  onSettingAssistantModelChange,
  onOpenOfficialLogin,
  onReloadCodexConfig,
  onCodexConfigFieldChange,
  onCodexConfigValueChange,
  onSaveProvider,
  onActivateProvider,
  onDeleteProvider,
  onReloadTooling,
  onReloadMcp,
  onExportProfile,
  onImportProfile,
  onReloadAuditEvents,
  onStartMcpOauth,
  onReadMcpResource,
  onCallMcpTool,
  onToggleSkill,
  onSaveSkillExtraRoots,
  onReadSkillPreview,
  onFilesPanelLayoutChange,
  onReadDirectory,
  onReadFile,
  onChangeOpenFileContent,
  onSaveOpenFile,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin,
  onReloadMembers,
  onCreateMember,
  onUpdateMember,
  onDeleteMember,
  onAllocateMemberBalance
}: Props) {
  const [section, setSection] = useState<SettingsSectionId>("codex");
  const [codexConfigMode, setCodexConfigMode] = useState<"quick" | "all">("quick");
  const [codexConfigSearch, setCodexConfigSearch] = useState("");
  const [editingThemePlugin, setEditingThemePlugin] = useState<ThemePlugin | null>(null);
  const activeProvider = providers.find((provider) => provider.id === activeProviderId);
  const settingAssistantProvider = providers.find((provider) => provider.id === settingAssistantProviderId) ?? null;
  const settingAssistantModelOptions = settingAssistantProvider ? providerModelOptions(settingAssistantProvider) : [];
  const selectedReasoning = reasoningOptions.find((option) => option.value === reasoningEffort);
  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.id !== "members" || currentUser?.role === "admin"),
    [currentUser?.role]
  );
  const permissionChoices = useMemo(
    () => permissionPresets.filter((preset) => allowedPermissions.includes(preset.id)),
    [allowedPermissions]
  );
  const isAdmin = currentUser?.role === "admin";
  const canEditCodexConfig = isAdmin || !currentUser; // local-token mode: full access
  const canManageRelay = isAdmin || !currentUser;

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
      setSection(initialSection);
      setCodexConfigMode("quick");
      setCodexConfigSearch("");
      if (initialSection === "members" && currentUser?.role === "admin") {
        void onReloadMembers();
      }
    }
  }, [currentUser?.role, initialSection, onReloadMembers, open]);

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
          bgcolor: "background.default",
          borderRight: "1px solid",
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
              {t("settings.title")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("settings.subtitle")}
            </Typography>
          </Box>
          <Button size="small" startIcon={<CloseIcon />} onClick={onClose} aria-label={t("settings.closeSettings")}>
            {t("settings.closeSettings")}
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
              {visibleNavItems.map((item) => {
                const label = t(item.labelKey);
                return (
                <ListItemButton
                  key={item.id}
                  selected={section === item.id}
                  onClick={() => {
                    setSection(item.id);
                    if (item.id === "members") {
                      void onReloadMembers();
                    }
                  }}
                  aria-label={t("settings.openSection", { section: label })}
                  sx={{ mx: 1, borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ variant: "body2", fontWeight: section === item.id ? 700 : 600 }}
                  />
                </ListItemButton>
                );
              })}
            </List>
          </Box>

          <Box sx={{ overflow: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2, bgcolor: "background.default" }}>
            <SettingAssistantSetupBanner
              providers={providers}
              ready={settingAssistantReady}
              provider={settingAssistantProvider}
              model={settingAssistantEffectiveModel}
              t={t}
              onOpenAssistant={() => setSection("assistant")}
              onOpenSession={() => setSection("session")}
              onOpenRelay={() => setSection("relay")}
              onOpenOfficialLogin={onOpenOfficialLogin}
            />
            {section === "assistant" && (
              <SettingsSection icon={<AutoAwesomeIcon fontSize="small" />} title={t("settings.section.assistant")} subtitle={t("settings.assistant.modelDescription")}>
                <Stack spacing={1.25}>
                  <Alert severity={settingAssistantReady ? "success" : "warning"} variant="outlined">
                    {settingAssistantReady
                      ? t("settings.assistant.readyDescription", { provider: settingAssistantProvider?.name ?? "-", model: settingAssistantEffectiveModel || "-" })
                      : t("settings.assistant.chooseModelDescription")}
                  </Alert>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="contained" startIcon={<TuneIcon />} onClick={() => setSection("session")}>
                      {t("settings.assistant.configureModel")}
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<MemoryIcon />} onClick={() => setSection("relay")}>
                      {t("settings.assistant.setupRelay")}
                    </Button>
                  </Stack>
                </Stack>
              </SettingsSection>
            )}
            {section === "codex" && (
              <SettingsSection icon={<StorageIcon fontSize="small" />} title={t("settings.section.codex")} subtitle={t("settings.codex.subtitle")}>
                {!canEditCodexConfig ? (
                  <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Alert severity="info" variant="outlined">
                      {t("settings.codex.memberReadOnly")}
                    </Alert>
                  </Box>
                ) : null}
                <SettingRow
                  title={t("settings.codex.userConfigSync")}
                  description={t("settings.codex.userConfigSyncDescription")}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {codexConfigLoading || codexConfigSaving ? <CircularProgress size={18} /> : null}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={onReloadCodexConfig}
                      disabled={codexConfigLoading || codexConfigSaving}
                      aria-label={t("settings.codex.reloadConfig")}
                    >
                      {t("settings.codex.reloadConfig")}
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
                      {t("settings.codex.engineReadyNotice")}
                    </Alert>
                  </Box>
                ) : null}
                <SettingRow
                  title={t("settings.codex.configCoverage")}
                  description={t("settings.codex.configCoverageDescription")}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant={codexConfigMode === "quick" ? "contained" : "outlined"}
                      onClick={() => setCodexConfigMode("quick")}
                    >
                      {t("settings.codex.quickSettings")}
                    </Button>
                    <Button
                      size="small"
                      variant={codexConfigMode === "all" ? "contained" : "outlined"}
                      onClick={() => setCodexConfigMode("all")}
                    >
                      {t("settings.codex.allConfig")}
                    </Button>
                  </Stack>
                </SettingRow>
                {codexConfigMode === "quick" ? (
                  <>
                    {CODEX_CONFIG_FIELD_META.map((field) => {
                      const localizedField = localizeQuickCodexConfigField(field, t);
                      return (
                        <CodexConfigFieldRow
                          key={field.key}
                          fieldKey={field.key}
                          label={localizedField.label}
                          description={localizedField.description}
                          kind={field.kind}
                          options={localizedField.options}
                          readOnly={field.readOnly}
                          value={codexConfig?.[field.key] ?? ""}
                          disabled={!codexConfig || Boolean(field.readOnly) || codexConfigSaving || !canEditCodexConfig}
                          unsetLabel={t("settings.codex.unset")}
                          onCommit={(next) => onCodexConfigFieldChange(field.key, next)}
                        />
                      );
                    })}
                  </>
                ) : (
                  <Box>
                    <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
                      <TextField
                        size="small"
                        fullWidth
                        label={t("settings.codex.searchAllConfig")}
                        value={codexConfigSearch}
                        onChange={(event) => setCodexConfigSearch(event.target.value)}
                        inputProps={{ "aria-label": t("settings.codex.searchAllConfig") }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                        {t("settings.codex.schemaRuntimeSettings", { count: groupedDynamicCodexConfigFields.reduce((count, group) => count + group.fields.length, 0) })}
                      </Typography>
                    </Box>
                    {groupedDynamicCodexConfigFields.map((group) => (
                      <Box key={group.group} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1, bgcolor: "background.default" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {localizeCodexConfigSegment(group.group, t)}
                          </Typography>
                          <Chip size="small" label={group.fields.length} variant="outlined" />
                        </Stack>
                        {group.fields.map((field) => (
                          <DynamicCodexConfigFieldRow
                            key={field.keyPath}
                            field={field}
                            value={getConfigValueAtPath(codexConfig?.rawConfig ?? {}, field.keyPath)}
                            disabled={!codexConfig || codexConfigSaving || !canEditCodexConfig}
                            t={t}
                            onCommit={(next) => onCodexConfigValueChange(field.keyPath, next)}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                )}
                <SettingRow title={t("settings.codex.configSource")} description={t("settings.codex.configSourceDescription")}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label="config/read" color="primary" variant="outlined" />
                    <Chip size="small" label="Codex JSON schema" color="primary" variant="outlined" />
                  </Stack>
                </SettingRow>
              </SettingsSection>
            )}

            {section === "appearance" && (
              <SettingsSection icon={<ColorLensIcon fontSize="small" />} title={t("settings.section.appearance")} subtitle={t("settings.appearance.subtitle")}>
                <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 850 }}>
                    {t("settings.appearance.theme")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {t("settings.appearance.themeDescription")}
                  </Typography>
                  <ThemeModeCards themeMode={themeMode} onThemeModeChange={onThemeModeChange} t={t} />
                </Box>
                <SettingRow title={t("settings.appearance.activeSkin")} description={t("settings.appearance.activeSkinDescription")}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t("settings.appearance.skin")}</InputLabel>
                    <Select
                      value={themeMode}
                      label={t("settings.appearance.skin")}
                      inputProps={{ "aria-label": t("settings.appearance.skin") }}
                      onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
                    >
                      <MenuItem value="system">{t("settings.appearance.system")}</MenuItem>
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
                  onEditCustomThemePlugin={setEditingThemePlugin}
                  t={t}
                  onRemoveCustomThemePlugin={(id) => {
                    onRemoveCustomThemePlugin(id);
                    setEditingThemePlugin((current) => (current?.id === id ? null : current));
                  }}
                />
                <CustomThemePluginEditor
                  editingPlugin={editingThemePlugin}
                  onCancelEdit={() => setEditingThemePlugin(null)}
                  t={t}
                  onSave={(plugin) => {
                    onSaveCustomThemePlugin(plugin);
                    setEditingThemePlugin(null);
                  }}
                />
                <SettingRow title={t("settings.appearance.skinSafety")} description={t("settings.appearance.skinSafetyDescription")}>
                  <Chip size="small" label={t("settings.appearance.separated")} color="success" variant="outlined" />
                </SettingRow>
              </SettingsSection>
            )}

            {section === "layout" && (
              <SettingsSection icon={<DashboardCustomizeIcon fontSize="small" />} title={t("settings.section.layout")} subtitle={t("settings.layout.subtitle")}>
                <SettingRow title={t("settings.layout.historyPanel")} description={t("settings.layout.historyPanelDescription")}>
                  <Switch
                    checked={leftPanelVisible}
                    onChange={(event) => onLeftPanelVisibleChange(event.target.checked)}
                    inputProps={{ "aria-label": t("settings.layout.historyPanel") }}
                  />
                </SettingRow>
                <SettingRow title={t("settings.layout.assistantUsageDetails")} description={t("settings.layout.assistantUsageDetailsDescription")}>
                  <Switch
                    checked={showAssistantUsageDetails}
                    onChange={(event) => onShowAssistantUsageDetailsChange(event.target.checked)}
                    inputProps={{ "aria-label": t("settings.layout.assistantUsageDetails") }}
                  />
                </SettingRow>
                <SettingRow title={t("settings.layout.rightWorkspace")} description={t("settings.layout.rightWorkspaceDescription")}>
                  <Chip size="small" label={t("settings.layout.toolbarControlled")} color="primary" variant="outlined" />
                </SettingRow>
                <SettingRow title={t("settings.layout.workspaceCwd")} description={t("settings.layout.workspaceCwdDescription")}>
                  <TextField
                    size="small"
                    value={cwd}
                    onChange={(event) => onCwdChange(event.target.value)}
                    disabled={Boolean(currentUser) && currentUser?.role !== "admin"}
                    helperText={currentUser && currentUser.role !== "admin" ? currentUser.workspaceRoot : undefined}
                    sx={{ minWidth: 240 }}
                  />
                </SettingRow>
              </SettingsSection>
            )}

            {section === "workspace" && (
              <SettingsSection icon={<StorageIcon fontSize="small" />} title={t("settings.section.workspace")} subtitle={t("settings.workspace.subtitle")}>
                <WorkspaceFilesSettingsPanel
                  cwd={cwd}
                  fileDirectories={fileDirectories}
                  openFile={openFile}
                  filesPanelLayout={filesPanelLayout}
                  t={t}
                  onFilesPanelLayoutChange={onFilesPanelLayoutChange}
                  onReadDirectory={onReadDirectory}
                  onReadFile={onReadFile}
                  onChangeOpenFileContent={onChangeOpenFileContent}
                  onSaveOpenFile={onSaveOpenFile}
                />
              </SettingsSection>
            )}

            {section === "session" && (
              <SettingsSection icon={<TuneIcon fontSize="small" />} title={t("settings.section.session")} subtitle={t("settings.session.subtitle")}>
                <SettingRow title={t("settings.session.selectedModel")} description={t("settings.session.selectedModelDescription")}>
                  <Chip size="small" label={selectedModel || t("settings.session.notSelected")} />
                </SettingRow>
                <SettingRow title={t("settings.session.reasoningStrength")} description={selectedReasoning?.description || t("settings.session.reasoningStrengthDescription")}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>{t("settings.session.effort")}</InputLabel>
                    <Select
                      value={reasoningEffort}
                      label={t("settings.session.effort")}
                      inputProps={{ "aria-label": t("settings.session.reasoningStrength") }}
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
                <SettingRow title={t("settings.assistant.modelTitle")} description={t("settings.assistant.modelDescription")}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: { xs: "100%", sm: 420 } }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>{t("settings.assistant.provider")}</InputLabel>
                      <Select
                        value={settingAssistantProviderId}
                        label={t("settings.assistant.provider")}
                        onChange={(event) => {
                          onSettingAssistantProviderChange(event.target.value);
                          onSettingAssistantModelChange("");
                        }}
                      >
                        <MenuItem value="">{t("settings.assistant.selectProvider")}</MenuItem>
                        {providers.map((provider) => (
                          <MenuItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180 }} disabled={!settingAssistantProvider}>
                      <InputLabel>{t("settings.assistant.model")}</InputLabel>
                      <Select
                        value={settingAssistantModel}
                        label={t("settings.assistant.model")}
                        onChange={(event) => onSettingAssistantModelChange(event.target.value)}
                      >
                        <MenuItem value="">{t("settings.assistant.defaultModel")}</MenuItem>
                        {settingAssistantModelOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </SettingRow>
                <SettingRow title={t("settings.session.permissionPreset")} description={t("settings.session.permissionPresetDescription")}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>{t("settings.session.permissions")}</InputLabel>
                    <Select value={permission} label={t("settings.session.permissions")} onChange={(event) => onPermissionChange(event.target.value as PermissionPresetId)}>
                      {permissionChoices.map((preset) => (
                        <MenuItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </SettingRow>
                {currentUser ? (
                  <SettingRow title={t("settings.members.yourCaps")} description={t("settings.members.yourCapsDescription")}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={currentUser.maxPermission} color="primary" variant="outlined" />
                      <Chip size="small" label={currentUser.allowWrite ? "write" : "no-write"} variant="outlined" />
                      <Chip size="small" label={currentUser.allowDangerBypass ? "danger-ok" : "no-danger"} color={currentUser.allowDangerBypass ? "warning" : "default"} variant="outlined" />
                      <Chip size="small" label={`${t("settings.members.balance")}: ${Number(currentUser.balance).toFixed(2)}`} color="secondary" variant="outlined" />
                    </Stack>
                  </SettingRow>
                ) : null}
              </SettingsSection>
            )}

            {section === "relay" && (
              <RelaySettingsPanel
                providers={providers}
                activeProviderId={activeProviderId}
                activeProvider={activeProvider}
                selectedModel={selectedModel}
                canManage={canManageRelay}
                sessionToken={sessionToken}
                t={t}
                onSaveProvider={onSaveProvider}
                onActivateProvider={onActivateProvider}
                onDeleteProvider={onDeleteProvider}
              />
            )}

            {section === "launch" && (
              <SettingsSection icon={<RocketLaunchIcon fontSize="small" />} title={t("settings.section.launch")} subtitle={t("settings.launch.subtitle")}>
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <LaunchAdaptersCatalog
                    t={t}
                    fullPage
                    token={sessionToken}
                    isAdmin={!currentUser || currentUser.role === "admin"}
                    showLaunchHistory={showLaunchHistory}
                    onShowLaunchHistoryChange={onShowLaunchHistoryChange}
                  />
                </Box>
              </SettingsSection>
            )}

            {section === "skills" && (
              <SettingsSection icon={<PsychologyIcon fontSize="small" />} title={t("settings.section.skills")} subtitle={t("settings.skills.subtitle")}>
                <SkillsSettingsPanel
                  tooling={tooling}
                  extraRoots={skillExtraRoots}
                  previews={skillPreviews}
                  onToggleSkill={onToggleSkill}
                  onSaveExtraRoots={onSaveSkillExtraRoots}
                  onReadPreview={onReadSkillPreview}
                />
              </SettingsSection>
            )}

            {section === "plugins" && (
              <SettingsSection icon={<ExtensionIcon fontSize="small" />} title={t("settings.section.plugins")} subtitle={t("settings.plugins.subtitle")}>
                <CodexPluginSettingsPanel
                  key={`${open ? "open" : "closed"}:${initialPluginTab}`}
                  activeThreadId={activeThreadId}
                  tooling={tooling}
                  toolingLoading={toolingLoading}
                  t={t}
                  initialTab={initialPluginTab}
                  pluginDetails={pluginDetails}
                  pluginSkillPreviews={pluginSkillPreviews}
                  pluginAuthNotices={pluginAuthNotices}
                  mcpResourceContents={mcpResourceContents}
                  mcpOauthUrls={mcpOauthUrls}
                  onReloadTooling={onReloadTooling}
                  onReloadMcp={onReloadMcp}
                  onStartMcpOauth={onStartMcpOauth}
                  onReadMcpResource={onReadMcpResource}
                  onCallMcpTool={onCallMcpTool}
                  onReadPluginDetail={onReadPluginDetail}
                  onReadPluginSkill={onReadPluginSkill}
                  onInsertPluginMention={onInsertPluginMention}
                  onInstallPlugin={onInstallPlugin}
                  onUninstallPlugin={onUninstallPlugin}
                />
              </SettingsSection>
            )}

            {section === "pet" && (
              <SettingsSection icon={<PetsIcon fontSize="small" />} title={t("settings.section.pet")} subtitle={t("settings.pet.subtitle")}>
                <SettingRow title={t("settings.pet.threeDock")} description={t("settings.pet.threeDockDescription")}>
                  <FormControlLabel
                    control={<Switch checked={petDockEnabled} onChange={(event) => onPetDockEnabledChange(event.target.checked)} />}
                    label={t("settings.pet.enabled")}
                  />
                </SettingRow>
                <PetDock enabled={petDockEnabled} />
              </SettingsSection>
            )}

            {section === "members" && currentUser?.role === "admin" && (
              <MembersPermissionsPanel
                members={members}
                providers={providers}
                loading={membersLoading}
                error={membersError}
                t={t}
                onReload={onReloadMembers}
                onCreate={onCreateMember}
                onUpdate={onUpdateMember}
                onDelete={onDeleteMember}
                onAllocateBalance={onAllocateMemberBalance}
              />
            )}

            {section === "usage" && sessionToken ? (
              <UsageBillingPanel
                token={sessionToken}
                currentUser={currentUser}
                members={members}
                t={t}
                onBalanceChanged={() => void onReloadMembers()}
              />
            ) : null}

            {section === "security" && sessionToken ? (
              <SecuritySettingsPanel token={sessionToken} isAdmin={currentUser?.role === "admin"} t={t} />
            ) : null}

            {section === "privacy" && (
              <SettingsSection icon={<SecurityIcon fontSize="small" />} title={t("settings.section.privacy")} subtitle={t("settings.privacy.subtitle")}>
                <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Stack spacing={1.25}>
                    <ProfileSettingsPanel providerCount={providers.length} onExportProfile={onExportProfile} onImportProfile={onImportProfile} />
                    <AuditSettingsPanel events={auditEvents} onReload={onReloadAuditEvents} />
                  </Stack>
                </Box>
                <SettingRow title={t("settings.privacy.providerKeyHandling")} description={t("settings.privacy.providerKeyHandlingDescription")}>
                  <Chip size="small" label={t("settings.privacy.masked")} color="success" variant="outlined" />
                </SettingRow>
                <SettingRow title={t("settings.privacy.dangerousModeAudit")} description={t("settings.privacy.dangerousModeAuditDescription")}>
                  <Chip size="small" label={t("settings.pet.enabled")} color="warning" variant="outlined" />
                </SettingRow>
              </SettingsSection>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

type RelayTemplateId =
  | "openai"
  | "deepseek"
  | "gemini"
  | "anthropic"
  | "moonshot"
  | "zhipu"
  | "minimax"
  | "mistral"
  | "nvidia"
  | "groq"
  | "openrouter"
  | "siliconflow"
  | "xai"
  | "cohere"
  | "together"
  | "fireworks"
  | "cerebras"
  | "github-models"
  | "huggingface"
  | "modelscope"
  | "ppio"
  | "aihubmix"
  | "dmxapi"
  | "302ai"
  | "baichuan"
  | "stepfun"
  | "dashscope"
  | "perplexity"
  | "yi"
  | "infini"
  | "ollama"
  | "lmstudio";

const CHAT_COMPLETIONS_MODEL_RATES = "";

type ModelRateDraft = {
  model: string;
  inputUsdPerMillion: string;
  cachedInputUsdPerMillion: string;
  cacheWriteUsdPerMillion: string;
  outputUsdPerMillion: string;
  inputMultiplier: string;
  cacheReadMultiplier: string;
  cacheWriteMultiplier: string;
  outputMultiplier: string;
};

const DEFAULT_MODEL_RATE_DRAFT = {
  inputUsdPerMillion: "",
  cachedInputUsdPerMillion: "",
  cacheWriteUsdPerMillion: "",
  outputUsdPerMillion: "",
  inputMultiplier: "1",
  cacheReadMultiplier: "1",
  cacheWriteMultiplier: "1",
  outputMultiplier: "1"
};

const RELAY_PROVIDER_TEMPLATES: Array<{
  id: RelayTemplateId;
  label: string;
  icon: ReactNode;
  kind: ProviderConfig["kind"];
  apiFormat: ProviderConfig["kind"];
  baseUrl: string;
  nativeModels: string;
  modelAliases: string;
  modelRates: string;
}> = [
  {
    id: "openai",
    label: "OpenAI",
    icon: <TokenIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.openai.com/v1",
    nativeModels: "gpt-5.6-sol,gpt-5.5",
    modelAliases: "codex=gpt-5.6-sol",
    modelRates: "gpt-5.5=5/0.5/5/30/1\ngpt-5.4=2.5/0.25/2.5/15/1\ngpt-5.6-sol=5/0.5/5/30/1"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    icon: <SearchIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    nativeModels: "deepseek-chat,deepseek-reasoner",
    modelAliases: "codex=deepseek-chat",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: <AutoAwesomeIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    nativeModels: "gemini-2.5-pro,gemini-2.5-flash",
    modelAliases: "codex=gemini-2.5-pro",
    modelRates: ""
  },
  {
    id: "anthropic",
    label: "Anthropic",
    icon: <ViewInArIcon fontSize="small" />,
    kind: "responsesRelay",
    apiFormat: "responsesRelay",
    baseUrl: "https://api.anthropic.com/v1",
    nativeModels: "claude-opus-4-6,claude-sonnet-4-5",
    modelAliases: "codex=claude-sonnet-4-5",
    modelRates: ""
  },
  {
    id: "moonshot",
    label: "Moonshot",
    icon: <DarkModeIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.moonshot.cn/v1",
    nativeModels: "kimi-k2,kimi-latest",
    modelAliases: "codex=kimi-k2",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "zhipu",
    label: "Zhipu",
    icon: <PsychologyIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    nativeModels: "glm-4.5,glm-4.5-air,glm-4-plus",
    modelAliases: "codex=glm-4.5",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "minimax",
    label: "MiniMax",
    icon: <WavesIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.minimax.chat/v1",
    nativeModels: "minimax-m1,abab6.5s-chat",
    modelAliases: "codex=minimax-m1",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "mistral",
    label: "Mistral",
    icon: <AutoAwesomeIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    nativeModels: "mistral-large-latest,codestral-latest,ministral-8b-latest",
    modelAliases: "codex=mistral-large-latest",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    icon: <MemoryIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    nativeModels: "meta/llama-3.1-405b-instruct,nvidia/llama-3.1-nemotron-70b-instruct",
    modelAliases: "codex=meta/llama-3.1-405b-instruct",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "groq",
    label: "Groq",
    icon: <RocketLaunchIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    nativeModels: "llama-3.3-70b-versatile,moonshotai/kimi-k2-instruct",
    modelAliases: "codex=llama-3.3-70b-versatile",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    icon: <LayersIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    nativeModels: "openai/gpt-5,anthropic/claude-sonnet-4.5,google/gemini-2.5-pro",
    modelAliases: "codex=openai/gpt-5",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    icon: <HubIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.siliconflow.cn/v1",
    nativeModels: "deepseek-ai/DeepSeek-V3.2,Qwen/Qwen3-Coder-480B-A35B-Instruct",
    modelAliases: "codex=deepseek-ai/DeepSeek-V3.2",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "xai",
    label: "xAI",
    icon: <PsychologyIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.x.ai/v1",
    nativeModels: "grok-4,grok-code-fast-1",
    modelAliases: "codex=grok-code-fast-1",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "cohere",
    label: "Cohere",
    icon: <TokenIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.cohere.com/compatibility/v1",
    nativeModels: "command-a-03-2025,command-r-plus-08-2024",
    modelAliases: "codex=command-a-03-2025",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "together",
    label: "Together",
    icon: <HubIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.together.xyz/v1",
    nativeModels: "meta-llama/Llama-3.3-70B-Instruct-Turbo,Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
    modelAliases: "codex=meta-llama/Llama-3.3-70B-Instruct-Turbo",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "fireworks",
    label: "Fireworks",
    icon: <RocketLaunchIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    nativeModels: "accounts/fireworks/models/llama-v3p1-405b-instruct,accounts/fireworks/models/qwen3-coder-480b-a35b-instruct",
    modelAliases: "codex=accounts/fireworks/models/llama-v3p1-405b-instruct",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "cerebras",
    label: "Cerebras",
    icon: <MemoryIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    nativeModels: "llama3.1-8b,llama-4-scout-17b-16e-instruct",
    modelAliases: "codex=llama-4-scout-17b-16e-instruct",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "github-models",
    label: "GitHub Models",
    icon: <ExtensionIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://models.github.ai/inference/v1",
    nativeModels: "openai/gpt-4.1,meta/llama-4-scout-17b-16e-instruct",
    modelAliases: "codex=openai/gpt-4.1",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    icon: <StorageIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://router.huggingface.co/v1",
    nativeModels: "Qwen/Qwen3-Coder-480B-A35B-Instruct,meta-llama/Llama-3.3-70B-Instruct",
    modelAliases: "codex=Qwen/Qwen3-Coder-480B-A35B-Instruct",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "modelscope",
    label: "ModelScope",
    icon: <StorageIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api-inference.modelscope.cn/v1",
    nativeModels: "Qwen/Qwen3-Coder-480B-A35B-Instruct,deepseek-ai/DeepSeek-V3.2",
    modelAliases: "codex=Qwen/Qwen3-Coder-480B-A35B-Instruct",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "ppio",
    label: "PPIO",
    icon: <MemoryIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.ppinfra.com/v3/openai/v1",
    nativeModels: "deepseek/deepseek-v3.1,qwen/qwen3-coder",
    modelAliases: "codex=deepseek/deepseek-v3.1",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "aihubmix",
    label: "AiHubMix",
    icon: <HubIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://aihubmix.com/v1",
    nativeModels: "gpt-4o,claude-sonnet-4-5,gemini-2.5-pro",
    modelAliases: "codex=gpt-4o",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "dmxapi",
    label: "DMXAPI",
    icon: <HubIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://www.dmxapi.cn/v1",
    nativeModels: "gpt-4o,claude-sonnet-4-5,gemini-2.5-pro",
    modelAliases: "codex=gpt-4o",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "302ai",
    label: "302.AI",
    icon: <HubIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.302.ai/v1",
    nativeModels: "gpt-4o,claude-sonnet-4-5,gemini-2.5-pro",
    modelAliases: "codex=gpt-4o",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "baichuan",
    label: "Baichuan",
    icon: <AutoAwesomeIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.baichuan-ai.com/v1",
    nativeModels: "Baichuan4-Turbo,Baichuan4-Air",
    modelAliases: "codex=Baichuan4-Turbo",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "stepfun",
    label: "StepFun",
    icon: <KeyboardArrowRightIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.stepfun.com/v1",
    nativeModels: "step-2-mini,step-2-16k,step-1-8k",
    modelAliases: "codex=step-2-mini",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "dashscope",
    label: "DashScope",
    icon: <AutoAwesomeIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    nativeModels: "qwen3-coder-plus,qwen-plus,qwen-max",
    modelAliases: "codex=qwen3-coder-plus",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "perplexity",
    label: "Perplexity",
    icon: <SearchIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.perplexity.ai/v1",
    nativeModels: "sonar-pro,sonar-reasoning-pro",
    modelAliases: "codex=sonar-pro",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "yi",
    label: "LingYiWanWu",
    icon: <PsychologyIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://api.lingyiwanwu.com/v1",
    nativeModels: "yi-large,yi-lightning",
    modelAliases: "codex=yi-large",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "infini",
    label: "Infini",
    icon: <HubIcon fontSize="small" />,
    kind: "openai",
    apiFormat: "openai",
    baseUrl: "https://cloud.infini-ai.com/maas/v1",
    nativeModels: "deepseek-v3.1,qwen3-coder",
    modelAliases: "codex=deepseek-v3.1",
    modelRates: CHAT_COMPLETIONS_MODEL_RATES
  },
  {
    id: "ollama",
    label: "Ollama",
    icon: <ComputerIcon fontSize="small" />,
    kind: "ollama",
    apiFormat: "ollama",
    baseUrl: "http://localhost:11434/v1",
    nativeModels: "llama3.3,qwen3-coder",
    modelAliases: "codex=llama3.3",
    modelRates: ""
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    icon: <ComputerIcon fontSize="small" />,
    kind: "lmstudio",
    apiFormat: "lmstudio",
    baseUrl: "http://localhost:1234/v1",
    nativeModels: "local-model",
    modelAliases: "codex=local-model",
    modelRates: ""
  }
];

const DEFAULT_RELAY_PROVIDER_TEMPLATE = RELAY_PROVIDER_TEMPLATES[0]!;

type RelayProviderTemplate = (typeof RELAY_PROVIDER_TEMPLATES)[number];

function normalizeTemplateBaseUrl(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/\/+$/, "").replace(/\/v1$/, "");
}

function findRelayProviderTemplate(provider: ProviderConfig): RelayProviderTemplate {
  const providerBaseUrl = normalizeTemplateBaseUrl(provider.baseUrl);
  if (providerBaseUrl) {
    const baseMatch = RELAY_PROVIDER_TEMPLATES.find((entry) => normalizeTemplateBaseUrl(entry.baseUrl) === providerBaseUrl);
    if (baseMatch) {
      return baseMatch;
    }
  }
  return RELAY_PROVIDER_TEMPLATES.find((entry) => entry.kind === provider.kind) ?? DEFAULT_RELAY_PROVIDER_TEMPLATE;
}

function RelaySettingsPanel({
  providers,
  activeProviderId,
  activeProvider,
  selectedModel,
  canManage = true,
  sessionToken,
  t,
  onSaveProvider,
  onActivateProvider,
  onDeleteProvider
}: {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  activeProvider?: ProviderConfig;
  selectedModel: string;
  canManage?: boolean;
  sessionToken?: string | null;
  t: TranslateFn;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => Promise<void>;
  onActivateProvider: (providerId: string, model?: string) => Promise<void>;
  onDeleteProvider: (providerId: string) => Promise<void>;
}) {
  type RelayView = "list" | "form";
  type TestStatus = { state: "passed" | "failed"; message: string };

  const [relayView, setRelayView] = useState<RelayView>("list");
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<RelayTemplateId>("openai");
  const template = RELAY_PROVIDER_TEMPLATES.find((entry) => entry.id === templateId) ?? DEFAULT_RELAY_PROVIDER_TEMPLATE;
  const [apiFormat, setApiFormat] = useState<ProviderConfig["kind"]>(template.apiFormat);
  const [name, setName] = useState(t("settings.relay.defaultChannelName"));
  const [baseUrl, setBaseUrl] = useState(template.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [nativeModels, setNativeModels] = useState(template.nativeModels);
  const [modelAliases, setModelAliases] = useState(template.modelAliases);
  const [modelRateDrafts, setModelRateDrafts] = useState<ModelRateDraft[]>(() =>
    modelRateDraftsForModels(parseCsv(template.nativeModels), parseModelRates(template.modelRates))
  );
  const [remark, setRemark] = useState("");
  const [quotaUsd, setQuotaUsd] = useState<string>("");
  const [stationType, setStationType] = useState<StationType>("third_party");
  const [enableCheckin, setEnableCheckin] = useState<boolean>(true);
  const [remindCheckin, setRemindCheckin] = useState<boolean>(true);
  const [channelMode, setChannelMode] = useState<"fast" | "advanced">("fast");
  const [groups, setGroups] = useState<ChannelGroupConfig[]>([
    {
      id: "group-default",
      name: "default",
      groupRatio: 1.0,
      priority: 1,
      keys: [],
      enableFallback: true,
      fallbackGroupName: "fallback",
      tieredContextRatios: [
        { minTokens: 0, maxTokens: 4000, ratio: 1.0 },
        { minTokens: 4000, maxTokens: 32000, ratio: 1.2 },
        { minTokens: 32000, maxTokens: 128000, ratio: 1.5 },
        { minTokens: 128000, maxTokens: null, ratio: 2.0 }
      ]
    }
  ]);
  const [providerModels, setProviderModels] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyProviderId, setBusyProviderId] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);

  // axonhub-style fetch models panel state
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [selectedFetchedModels, setSelectedFetchedModels] = useState<string[]>([]);
  const [showFetchedModelsPanel, setShowFetchedModelsPanel] = useState(false);
  const [fetchedModelsSearch, setFetchedModelsSearch] = useState("");
  const [showNotAddedModelsOnly, setShowNotAddedModelsOnly] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsMessage, setFetchModelsMessage] = useState<string | null>(null);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage && relayView === "form") {
      setRelayView("list");
    }
  }, [canManage, relayView]);

  const activeModelList = useMemo(() => parseCsv(nativeModels), [nativeModels]);
  const modelRateRows = useMemo(
    () => modelRateDraftRowsForModels(activeModelList, modelRateDrafts),
    [activeModelList, modelRateDrafts]
  );
  const tieredContextEnabled = channelMode === "advanced" && groups.some((group) => group.enableTieredContext === true);

  const filteredProviders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return providers;
    }
    return providers.filter((provider, index) =>
      [
        providerTableId(provider, index),
        provider.name,
        provider.kind,
        provider.baseUrl,
        provider.defaultModel,
        provider.remark,
        ...provider.nativeModels,
        ...providerTags(provider, provider.id === activeProviderId)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [activeProviderId, providers, search]);

  const filteredFetchedModels = useMemo(() => {
    let models = fetchedModels;
    if (showNotAddedModelsOnly) {
      models = models.filter((model) => !activeModelList.includes(model));
    }
    const needle = fetchedModelsSearch.trim().toLowerCase();
    if (needle) {
      models = models.filter((model) => model.toLowerCase().includes(needle));
    }
    return models;
  }, [activeModelList, fetchedModels, fetchedModelsSearch, showNotAddedModelsOnly]);

  const filteredRelayProviderTemplates = useMemo(() => {
    const needle = templateSearch.trim().toLowerCase();
    if (!needle) {
      return RELAY_PROVIDER_TEMPLATES;
    }
    return RELAY_PROVIDER_TEMPLATES.filter((entry) =>
      [entry.id, entry.label, entry.kind, entry.apiFormat, entry.baseUrl, entry.nativeModels, entry.modelAliases]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [templateSearch]);

  const clearFetchedModelsState = () => {
    setFetchedModels([]);
    setSelectedFetchedModels([]);
    setShowFetchedModelsPanel(false);
    setFetchedModelsSearch("");
    setShowNotAddedModelsOnly(false);
    setFetchModelsMessage(null);
    setFetchModelsError(null);
  };

  const defaultGroupTemplate = (): ChannelGroupConfig => ({
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "default",
    groupRatio: 1.0,
    priority: 1,
    keys: [],
    enableFallback: true,
    fallbackGroupName: "fallback",
    enableTieredContext: false,
    tieredContextRatios: [
      { minTokens: 0, maxTokens: 250000, ratio: 1.0 },
      { minTokens: 250000, maxTokens: 1000000, ratio: 1.5 }
    ]
  });

  const resetFormFromTemplate = (entry: (typeof RELAY_PROVIDER_TEMPLATES)[number]) => {
    setTemplateId(entry.id);
    setApiFormat(entry.apiFormat);
    setName(entry.label === "OpenAI" ? t("settings.relay.defaultChannelName") : t("settings.relay.templateChannelName", { provider: entry.label }));
    setBaseUrl(entry.baseUrl);
    setNativeModels(entry.nativeModels);
    setModelAliases(entry.modelAliases);
    setModelRateDrafts(modelRateDraftsForModels(parseCsv(entry.nativeModels), parseModelRates(entry.modelRates)));
    setRemark("");
    setQuotaUsd("");
    setStationType("third_party");
    setEnableCheckin(true);
    setRemindCheckin(true);
    setApiKey("");
    setChannelMode("fast");
    setGroups([defaultGroupTemplate()]);
    clearFetchedModelsState();
  };

  const startAddChannel = () => {
    if (!canManage) {
      return;
    }
    setEditingProviderId(null);
    resetFormFromTemplate(DEFAULT_RELAY_PROVIDER_TEMPLATE);
    setRelayView("form");
  };

  const startEditChannel = (provider: ProviderConfig) => {
    if (!canManage) {
      return;
    }
    const matchingTemplate = findRelayProviderTemplate(provider);
    setTemplateId(matchingTemplate.id);
    setApiFormat(provider.kind);
    setName(provider.name);
    setBaseUrl(provider.baseUrl ?? "");
    setNativeModels(provider.nativeModels.join(", "));
    setModelAliases(provider.modelAliases.map((entry) => `${entry.alias}=${entry.model}`).join(", "));
    setModelRateDrafts(modelRateDraftsForModels(provider.nativeModels, provider.modelRates ?? defaultRatesForProvider(provider)));
    setRemark(provider.remark ?? "");
    setQuotaUsd(provider.quotaUsd != null ? String(provider.quotaUsd) : "");
    setStationType(provider.stationType ?? "third_party");
    setEnableCheckin(provider.enableCheckin ?? true);
    setRemindCheckin(provider.remindCheckin ?? true);
    setApiKey("");
    setChannelMode(provider.channelMode ?? "fast");
    if (provider.groups && provider.groups.length > 0) {
      setGroups(provider.groups);
    } else {
      setGroups([defaultGroupTemplate()]);
    }
    setEditingProviderId(provider.id);
    clearFetchedModelsState();
    setRelayView("form");
  };

  const editingProviderEarly = providers.find((provider) => provider.id === editingProviderId);
  const canFetchModels = Boolean(baseUrl.trim()) && (Boolean(apiKey.trim()) || Boolean(editingProviderEarly?.apiKeyPreview) || Boolean(editingProviderId));

  const handleFetchModels = async () => {
    if (!canManage || fetchingModels) {
      return;
    }
    if (!baseUrl.trim()) {
      setFetchModelsError(t("settings.relay.fetchModelsNeedBaseUrl"));
      return;
    }
    if (!apiKey.trim() && !editingProviderId && !editingProviderEarly?.apiKeyPreview) {
      setFetchModelsError(t("settings.relay.fetchModelsNeedKey"));
      return;
    }
    if (!sessionToken) {
      setFetchModelsError(t("settings.relay.fetchModelsFailed"));
      return;
    }

    setFetchingModels(true);
    setFetchModelsError(null);
    setFetchModelsMessage(null);
    try {
      const result = await fetchProviderModels(sessionToken, {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
        kind: apiFormat,
        providerId: editingProviderId ?? undefined
      });
      if (result.error && result.models.length === 0) {
        setFetchModelsError(result.error || t("settings.relay.fetchModelsFailed"));
        return;
      }
      const models = result.models.map((entry) => entry.id).filter(Boolean);
      setFetchedModels(models);
      setSelectedFetchedModels([]);
      setShowFetchedModelsPanel(true);
      setFetchedModelsSearch("");
      setShowNotAddedModelsOnly(false);
      const count = models.length;
      setFetchModelsMessage(
        count > 100
          ? t("settings.relay.fetchModelsSuccessLarge", { count })
          : t("settings.relay.fetchModelsSuccess", { count })
      );
      if (result.error) {
        setFetchModelsError(result.error);
      }
    } catch (error) {
      setFetchModelsError(formatRelayErrorText(error) || t("settings.relay.fetchModelsFailed"));
    } finally {
      setFetchingModels(false);
    }
  };

  const toggleFetchedModelSelection = (model: string) => {
    setSelectedFetchedModels((prev) => (prev.includes(model) ? prev.filter((entry) => entry !== model) : [...prev, model]));
  };

  const selectAllFilteredModels = () => {
    setSelectedFetchedModels(filteredFetchedModels);
  };

  const deselectAllFetchedModels = () => {
    setSelectedFetchedModels([]);
  };

  // Toggle semantics from axonhub: selected already-active models are removed; others are added.
  const applySelectedFetchedModels = () => {
    if (selectedFetchedModels.length === 0) {
      return;
    }
    const current = parseCsv(nativeModels);
    const toRemove = new Set(selectedFetchedModels.filter((model) => current.includes(model)));
    const toAdd = selectedFetchedModels.filter((model) => !current.includes(model));
    const next = [...current.filter((model) => !toRemove.has(model)), ...toAdd];
    setNativeModels(next.join(", "));
    setSelectedFetchedModels([]);
  };

  const saveChannel = async () => {
    if (!canManage || saving) {
      return;
    }
    const nativeModelList = parseCsv(nativeModels);
    const editingProvider = providers.find((provider) => provider.id === editingProviderId);
    const now = Date.now();
    setSaving(true);
    try {
      await onSaveProvider(
        {
          id: editingProvider?.id ?? "",
          kind: apiFormat,
          name: name.trim() || template.label,
          baseUrl: baseUrl.trim() || undefined,
          apiKeyRef: editingProvider?.apiKeyRef,
          apiKeyPreview: editingProvider?.apiKeyPreview,
          apiKeyStorage: editingProvider?.apiKeyStorage,
          defaultModel: nativeModelList[0] ?? editingProvider?.defaultModel ?? selectedModel,
          nativeModels: nativeModelList,
          modelAliases: parseAliases(modelAliases),
          modelRates: modelRateDraftsToProviderRates(modelRateRows, channelMode === "advanced"),
          channelMode,
          groups: channelMode === "advanced" ? groups : undefined,
          quotaUsd: quotaUsd.trim() ? parseFloat(quotaUsd) : undefined,
          stationType,
          enableCheckin: stationType === "charity" ? enableCheckin : undefined,
          remindCheckin: stationType === "charity" ? remindCheckin : undefined,
          remark: remark.trim() || undefined,
          createdAt: editingProvider?.createdAt ?? now,
          updatedAt: now
        },
        apiKey || undefined
      );
      setRelayView("list");
      setEditingProviderId(null);
      setApiKey("");
      clearFetchedModelsState();
    } finally {
      setSaving(false);
    }
  };

  const activateChannel = async (provider: ProviderConfig, model?: string) => {
    setBusyProviderId(provider.id);
    try {
      await onActivateProvider(provider.id, model || undefined);
    } finally {
      setBusyProviderId(null);
    }
  };

  const testChannel = async (provider: ProviderConfig, model?: string) => {
    setBusyProviderId(provider.id);
    setTestStatuses((current) => ({ ...current, [provider.id]: { state: "passed", message: t("settings.relay.testingChat") } }));
    try {
      if (!sessionToken) {
        throw new Error(t("settings.relay.testChatFailed"));
      }
      const result = await testProviderChat(sessionToken, {
        baseUrl: provider.baseUrl ?? "",
        kind: provider.kind,
        providerId: provider.id,
        model: model || provider.defaultModel || provider.nativeModels[0]
      });
      setTestStatuses((current) => ({
        ...current,
        [provider.id]: {
          state: result.ok ? "passed" : "failed",
          message: result.ok ? t("settings.relay.testChatPassed", { model: result.model ?? model ?? "-", ms: result.elapsedMs ?? 0 }) : result.message
        }
      }));
    } catch (error) {
      setTestStatuses((current) => ({
        ...current,
        [provider.id]: { state: "failed", message: formatRelayErrorText(error) }
      }));
    } finally {
      setBusyProviderId(null);
    }
  };

  const deleteChannel = async (provider: ProviderConfig) => {
    if (!canManage) {
      return;
    }
    if (!window.confirm(t("settings.relay.deleteConfirm", { name: provider.name }))) {
      return;
    }
    setBusyProviderId(provider.id);
    try {
      await onDeleteProvider(provider.id);
      setTestStatuses((current) => {
        const next = { ...current };
        delete next[provider.id];
        return next;
      });
      if (expandedProviderId === provider.id) {
        setExpandedProviderId(null);
      }
    } finally {
      setBusyProviderId(null);
    }
  };

  const editingProvider = providers.find((provider) => provider.id === editingProviderId);
  const formTitle = editingProvider ? t("settings.relay.editChannel") : t("settings.relay.addChannel");
  const selectionIncludesActive = selectedFetchedModels.some((model) => activeModelList.includes(model));

  return (
    <SettingsSection
      icon={<MemoryIcon fontSize="small" />}
      title={relayView === "form" ? t("settings.relay.modelChannel") : t("settings.relay.channels")}
      subtitle={relayView === "form" ? t("settings.relay.formSubtitle", { title: formTitle }) : t("settings.relay.channelsSubtitle")}
    >
      {!canManage ? (
        <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Alert severity="info" variant="outlined">
            {t("settings.relay.memberReadOnly")}
          </Alert>
        </Box>
      ) : null}
      {relayView === "form" && canManage ? (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: showFetchedModelsPanel ? "210px minmax(0, 1fr) minmax(280px, 360px)" : "230px minmax(0, 1fr)"
          },
          minHeight: 430
        }}
      >
        <Box sx={{ borderRight: { lg: "1px solid" }, borderBottom: { xs: "1px solid", lg: 0 }, borderColor: "divider", bgcolor: "background.default" }}>
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t("settings.relay.serviceProvider")}
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search providers"
                inputProps={{ "aria-label": "Search service providers" }}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, color: "text.secondary" }} /> }}
              />
            </Stack>
          </Box>
          <Stack spacing={1} sx={{ p: 1.25, maxHeight: { lg: "calc(100vh - 270px)" }, overflowY: "auto" }}>
            {filteredRelayProviderTemplates.map((entry) => {
              const selected = entry.id === templateId;
              return (
                <Button
                  key={entry.id}
                  color={selected ? "primary" : "inherit"}
                  variant={selected ? "outlined" : "text"}
                  onClick={() => resetFormFromTemplate(entry)}
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
                  {formTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {editingProvider ? t("settings.relay.editDescription") : t("settings.relay.addDescription")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={activeProvider?.name ?? t("settings.relay.officialDefault")} color={activeProvider ? "primary" : "default"} />
                <Chip size="small" label={t("settings.relay.savedCount", { count: providers.length })} variant="outlined" />
              </Stack>
            </Stack>

            <Stack spacing={1.5}>
              <RelayFormRow label={t("settings.relay.apiFormat")}>
                <Stack spacing={1}>
                  <FormControl size="small" sx={{ maxWidth: 360 }}>
                    <InputLabel>{t("settings.relay.apiFormat")}</InputLabel>
                    <Select
                      value={apiFormat}
                      label={t("settings.relay.apiFormat")}
                      inputProps={{ "aria-label": t("settings.relay.apiFormat") }}
                      onChange={(event) => setApiFormat(event.target.value as ProviderConfig["kind"])}
                    >
                      <MenuItem value="responsesRelay">{t("settings.relay.apiFormat.responsesRelay")}</MenuItem>
                      <MenuItem value="openai">{t("settings.relay.apiFormat.openai")}</MenuItem>
                      <MenuItem value="ollama">{t("settings.relay.apiFormat.ollama")}</MenuItem>
                      <MenuItem value="lmstudio">{t("settings.relay.apiFormat.lmstudio")}</MenuItem>
                      <MenuItem value="bedrock">{t("settings.relay.apiFormat.bedrock")}</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                    {[
                      t("settings.relay.compat.responses"),
                      t("settings.relay.compat.chatCompletions"),
                      t("settings.relay.compat.openaiRelay")
                    ].map((label, index) => (
                      <FormControlLabel
                        key={label}
                        control={<Switch size="small" checked={index === 0 || apiFormat === "openai"} />}
                        label={label}
                        sx={{ mr: 0 }}
                      />
                    ))}
                  </Stack>
                  {apiFormat !== "responsesRelay" ? <CodeLaunchRelayBanner t={t} /> : null}
                </Stack>
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.channelMode")}>
                <Stack spacing={1.25} sx={{ width: "100%" }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={channelMode}
                    onChange={(_, v) => v && setChannelMode(v)}
                    sx={{
                      "& .MuiToggleButton-root": {
                        px: 2,
                        py: 0.75,
                        fontWeight: 800,
                        textTransform: "none",
                        borderRadius: "999px !important"
                      }
                    }}
                  >
                    <ToggleButton value="fast">
                      ⚡ {t("settings.relay.modeFast")}
                    </ToggleButton>
                    <ToggleButton value="advanced">
                      ⚙️ {t("settings.relay.modeAdvanced")}
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Alert severity={channelMode === "fast" ? "info" : "success"} variant="outlined" sx={{ borderRadius: 2 }}>
                    {channelMode === "fast"
                      ? t("settings.relay.modeFastHint")
                      : t("settings.relay.modeAdvancedHint")}
                  </Alert>
                </Stack>
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.channelName")}>
                <TextField size="small" fullWidth label={t("settings.relay.channelName")} value={name} onChange={(event) => setName(event.target.value)} inputProps={{ "aria-label": t("settings.relay.channelName") }} />
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.baseUrl")}>
                <TextField size="small" fullWidth label={t("settings.relay.baseUrl")} value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} inputProps={{ "aria-label": t("settings.relay.baseUrl") }} />
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.apiKey")}>
                <TextField
                  size="small"
                  fullWidth
                  label={editingProvider?.apiKeyPreview ? t("settings.relay.apiKeyWithPreview", { preview: editingProvider.apiKeyPreview }) : t("settings.relay.apiKey")}
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  inputProps={{ "aria-label": t("settings.relay.relayApiKey") }}
                />
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.stationType")}>
                <Stack spacing={1.25} sx={{ width: "100%" }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={stationType}
                    onChange={(_, v) => v && setStationType(v as StationType)}
                    sx={{
                      flexWrap: "wrap",
                      gap: 0.5,
                      "& .MuiToggleButton-root": {
                        px: 1.75,
                        py: 0.75,
                        fontWeight: 800,
                        borderRadius: "999px !important",
                        border: "1px solid",
                        borderColor: "divider"
                      }
                    }}
                  >
                    <ToggleButton value="third_party">
                      {t("settings.relay.stationType.third_party")}
                    </ToggleButton>
                    <ToggleButton value="rich" sx={{ color: "#d97706 !important" }}>
                      {t("settings.relay.stationType.rich")}
                    </ToggleButton>
                    <ToggleButton value="charity" sx={{ color: "#16a34a !important" }}>
                      {t("settings.relay.stationType.charity")}
                    </ToggleButton>
                    <ToggleButton value="official" sx={{ color: "#2563eb !important" }}>
                      {t("settings.relay.stationType.official")}
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {stationType === "rich" && (
                    <Alert severity="warning" variant="outlined" icon={<Box component="span" sx={{ fontSize: 18 }}>🪙</Box>} sx={{ borderRadius: 2 }}>
                      已设为【富可敌国】中转站！节点将带有专属金币 Icon 🪙 与尊贵标识。
                    </Alert>
                  )}

                  {stationType === "charity" && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(22,101,52,0.15)" : "rgba(240,253,244,0.9)", borderColor: "success.main" }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "success.main" }}>
                          💚 公益站专属扩展功能
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={enableCheckin}
                                onChange={(e) => setEnableCheckin(e.target.checked)}
                              />
                            }
                            label={t("settings.relay.enableCheckin")}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={remindCheckin}
                                onChange={(e) => setRemindCheckin(e.target.checked)}
                              />
                            }
                            label={t("settings.relay.remindCheckin")}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {t("settings.relay.charityNotice")}
                        </Typography>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.quotaUsd")}>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  inputProps={{ step: "0.01", min: 0 }}
                  label={t("settings.relay.quotaUsd")}
                  placeholder={t("settings.relay.quotaUsdPlaceholder")}
                  value={quotaUsd}
                  onChange={(event) => setQuotaUsd(event.target.value)}
                  helperText={t("settings.relay.quotaUsdHelp")}
                />
              </RelayFormRow>
              {channelMode === "advanced" && (
                <RelayFormRow label={t("settings.relay.groups")}>
                  <Stack spacing={2} sx={{ width: "100%" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {t("settings.relay.groups")} ({groups.length})
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          const newGroup: ChannelGroupConfig = {
                            id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            name: `vip_${groups.length + 1}`,
                            groupRatio: 0.8,
                            priority: groups.length + 1,
                            keys: [],
                            enableFallback: true,
                            fallbackGroupName: "default",
                            tieredContextRatios: [
                              { minTokens: 0, maxTokens: 4000, ratio: 1.0 },
                              { minTokens: 4000, maxTokens: 32000, ratio: 1.2 },
                              { minTokens: 32000, maxTokens: 128000, ratio: 1.5 },
                              { minTokens: 128000, maxTokens: null, ratio: 2.0 }
                            ]
                          };
                          setGroups([...groups, newGroup]);
                        }}
                        sx={{ borderRadius: 999, fontWeight: 800 }}
                      >
                        {t("settings.relay.addGroup")}
                      </Button>
                    </Stack>

                    {groups.map((group, groupIdx) => {
                      const keyText = (group.keys || []).join("\n");
                      return (
                        <Paper
                          key={group.id}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            borderColor: "primary.main",
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(15,23,42,0.6)" : "rgba(248,250,252,0.9)")
                          }}
                        >
                          <Stack spacing={1.75}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip size="small" color="primary" label={`Group #${groupIdx + 1}`} sx={{ fontWeight: 800 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                                  {group.name}
                                </Typography>
                                <Chip size="small" variant="outlined" label={`Ratio: ${group.groupRatio}x`} />
                              </Stack>
                              {groups.length > 1 && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setGroups(groups.filter((g) => g.id !== group.id))}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                              <TextField
                                size="small"
                                fullWidth
                                label={t("settings.relay.groupName")}
                                value={group.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroups(groups.map((g) => (g.id === group.id ? { ...g, name: val } : g)));
                                }}
                                placeholder="default / vip / svip / fallback"
                              />
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                inputProps={{ step: "0.01" }}
                                label={t("settings.relay.groupRatio")}
                                value={group.groupRatio}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 1.0;
                                  setGroups(groups.map((g) => (g.id === group.id ? { ...g, groupRatio: val } : g)));
                                }}
                                helperText={t("settings.relay.groupRatioHelp")}
                              />
                            </Stack>

                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.paper" }}>
                              <Stack spacing={1}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        size="small"
                                        checked={group.enableFallback !== false}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setGroups(groups.map((g) => (g.id === group.id ? { ...g, enableFallback: checked } : g)));
                                        }}
                                      />
                                    }
                                    label={t("settings.relay.enableFallback")}
                                  />
                                  <TextField
                                    size="small"
                                    label={t("settings.relay.fallbackGroup")}
                                    value={group.fallbackGroupName ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGroups(groups.map((g) => (g.id === group.id ? { ...g, fallbackGroupName: val } : g)));
                                    }}
                                    placeholder="fallback-group / default"
                                    sx={{ maxWidth: 260 }}
                                  />
                                </Stack>
                              </Stack>
                            </Paper>

                            <TextField
                              size="small"
                              fullWidth
                              multiline
                              minRows={2}
                              maxRows={5}
                              label={t("settings.relay.keyPool")}
                              value={keyText}
                              onChange={(e) => {
                                const lines = e.target.value
                                  .split(/\r?\n/)
                                  .map((k) => k.trim())
                                  .filter(Boolean);
                                setGroups(groups.map((g) => (g.id === group.id ? { ...g, keys: lines } : g)));
                              }}
                              placeholder="sk-key1&#10;sk-key2&#10;sk-key3"
                              helperText={`${t("settings.relay.keyPoolHelp")} — 当前包含 ${group.keys?.length ?? 0} 个轮询 Key`}
                            />

                            <Accordion variant="outlined" sx={{ borderRadius: "8px !important", overflow: "hidden" }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: "100%", pr: 1 }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <LayersIcon fontSize="small" color={group.enableTieredContext ? "primary" : "action"} />
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                      {t("settings.relay.tieredContext")}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      color={group.enableTieredContext ? "primary" : "default"}
                                      variant={group.enableTieredContext ? "filled" : "outlined"}
                                      label={group.enableTieredContext ? `已开启 (${(group.tieredContextRatios || []).length} 个区间)` : "已关闭"}
                                      sx={{ height: 20, fontSize: 11 }}
                                    />
                                  </Stack>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        size="small"
                                        checked={group.enableTieredContext === true}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setGroups(groups.map((g) => (g.id === group.id ? { ...g, enableTieredContext: checked } : g)));
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    }
                                    label={t("settings.relay.enableTieredContext")}
                                    sx={{ mr: 0 }}
                                  />
                                </Stack>
                              </AccordionSummary>
                              <AccordionDetails sx={{ p: 1.5 }}>
                                {group.enableTieredContext ? (
                                  <Stack spacing={1.25}>
                                    <Typography variant="caption" color="text.secondary">
                                      {t("settings.relay.enableTieredContextHelp")}
                                    </Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Min Token</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Max Token</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>{t("settings.relay.tierRatio")}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>操作</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {(group.tieredContextRatios || []).map((interval, ivIdx) => (
                                            <TableRow key={ivIdx}>
                                              <TableCell sx={{ py: 0.5 }}>
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  value={interval.minTokens}
                                                  onChange={(e) => {
                                                    const val = parseInt(e.target.value, 10) || 0;
                                                    const nextIvs = (group.tieredContextRatios || []).map((iv, idx) =>
                                                      idx === ivIdx ? { ...iv, minTokens: val } : iv
                                                    );
                                                    setGroups(groups.map((g) => (g.id === group.id ? { ...g, tieredContextRatios: nextIvs } : g)));
                                                  }}
                                                  sx={{ width: 100 }}
                                                />
                                              </TableCell>
                                              <TableCell sx={{ py: 0.5 }}>
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  placeholder="∞ 无上限"
                                                  value={interval.maxTokens ?? ""}
                                                  onChange={(e) => {
                                                    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                                    const nextIvs = (group.tieredContextRatios || []).map((iv, idx) =>
                                                      idx === ivIdx ? { ...iv, maxTokens: val } : iv
                                                    );
                                                    setGroups(groups.map((g) => (g.id === group.id ? { ...g, tieredContextRatios: nextIvs } : g)));
                                                  }}
                                                  sx={{ width: 120 }}
                                                />
                                              </TableCell>
                                              <TableCell sx={{ py: 0.5 }}>
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  inputProps={{ step: "0.1" }}
                                                  value={interval.ratio}
                                                  onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 1.0;
                                                    const nextIvs = (group.tieredContextRatios || []).map((iv, idx) =>
                                                      idx === ivIdx ? { ...iv, ratio: val } : iv
                                                    );
                                                    setGroups(groups.map((g) => (g.id === group.id ? { ...g, tieredContextRatios: nextIvs } : g)));
                                                  }}
                                                  sx={{ width: 85 }}
                                                />
                                              </TableCell>
                                              <TableCell align="right" sx={{ py: 0.5 }}>
                                                <IconButton
                                                  size="small"
                                                  color="error"
                                                  onClick={() => {
                                                    const nextIvs = (group.tieredContextRatios || []).filter((_, idx) => idx !== ivIdx);
                                                    setGroups(groups.map((g) => (g.id === group.id ? { ...g, tieredContextRatios: nextIvs } : g)));
                                                  }}
                                                >
                                                  <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<AddIcon />}
                                      onClick={() => {
                                        const currentIvs = group.tieredContextRatios || [];
                                        const lastIv = currentIvs[currentIvs.length - 1];
                                        const lastMax = lastIv ? (lastIv.maxTokens ?? 1000000) : 0;
                                        const nextIvs: TieredContextRatio[] = [
                                          ...currentIvs,
                                          { minTokens: lastMax, maxTokens: lastMax + 1000000, ratio: 1.5 }
                                        ];
                                        setGroups(groups.map((g) => (g.id === group.id ? { ...g, tieredContextRatios: nextIvs } : g)));
                                      }}
                                      sx={{ borderRadius: 999, alignSelf: "flex-start" }}
                                    >
                                      {t("settings.relay.addTierInterval")}
                                    </Button>
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" color="text.secondary" sx={{ py: 0.5, display: "block" }}>
                                    阶梯倍率默认关闭。启用开关后将自动启用 Token 上下文区间计费（默认区间：0 ~ 250K、250K ~ 1M）。
                                  </Typography>
                                )}
                              </AccordionDetails>
                            </Accordion>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </RelayFormRow>
              )}
              <RelayFormRow label={t("settings.relay.supportedModels")}>
                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                    <TextField
                      size="small"
                      fullWidth
                      label={t("settings.relay.activeModels")}
                      value={nativeModels}
                      onChange={(event) => setNativeModels(event.target.value)}
                      helperText={t("settings.relay.activeModelsHelp")}
                    />
                    <Button
                      variant="outlined"
                      startIcon={fetchingModels ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                      onClick={() => void handleFetchModels()}
                      disabled={!canFetchModels || fetchingModels || !sessionToken}
                      sx={{ whiteSpace: "nowrap", minWidth: { sm: 148 } }}
                    >
                      {t("settings.relay.fetchModels")}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t("settings.relay.manualModelsHint")}
                  </Typography>
                  {fetchModelsMessage ? (
                    <Alert severity="success" variant="outlined" onClose={() => setFetchModelsMessage(null)}>
                      {fetchModelsMessage}
                    </Alert>
                  ) : null}
                  {fetchModelsError ? (
                    <Alert severity="error" variant="outlined" onClose={() => setFetchModelsError(null)}>
                      {fetchModelsError}
                    </Alert>
                  ) : null}
                  {activeModelList.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {activeModelList.slice(0, 12).map((model) => (
                        <Chip
                          key={model}
                          size="small"
                          label={model}
                          onDelete={() => setNativeModels(activeModelList.filter((entry) => entry !== model).join(", "))}
                          sx={{ maxWidth: 220, borderRadius: 1 }}
                        />
                      ))}
                      {activeModelList.length > 12 ? <Chip size="small" variant="outlined" label={t("settings.relay.moreModels", { count: activeModelList.length - 12 })} /> : null}
                    </Stack>
                  ) : null}
                </Stack>
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.modelAliases")}>
                <TextField
                  size="small"
                  fullWidth
                  label={t("settings.relay.modelAliasesHelp")}
                  value={modelAliases}
                  onChange={(event) => setModelAliases(event.target.value)}
                />
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.modelRates")}>
                <Stack spacing={1.25} sx={{ width: "100%" }}>
                  <Alert severity={tieredContextEnabled ? "warning" : "info"} variant="outlined" sx={{ borderRadius: 2 }}>
                    {tieredContextEnabled ? t("settings.relay.modelRatesTieredHint") : t("settings.relay.modelRatesListHelp")}
                  </Alert>
                  {modelRateRows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("settings.relay.modelRatesNoModels")}
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.model")}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.inputMultiplier")}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.cacheReadMultiplier")}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.cacheWriteMultiplier")}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.outputMultiplier")}</TableCell>
                            {channelMode === "advanced" ? (
                              <>
                                <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.inputPrice")}</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.cacheReadPrice")}</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.cacheWritePrice")}</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>{t("settings.relay.outputPrice")}</TableCell>
                              </>
                            ) : null}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {modelRateRows.map((rate) => (
                            <TableRow key={rate.model}>
                              <TableCell sx={{ maxWidth: 220 }}>
                                <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", overflowWrap: "anywhere" }}>
                                  {rate.model}
                                </Typography>
                              </TableCell>
                              {(["inputMultiplier", "cacheReadMultiplier", "cacheWriteMultiplier", "outputMultiplier"] as const).map((field) => (
                                <TableCell key={field} sx={{ minWidth: 92 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={rate[field]}
                                    inputProps={{ step: "0.01", min: 0 }}
                                    onChange={(event) =>
                                      setModelRateDrafts((current) => updateModelRateDraft(current, rate.model, field, event.target.value))
                                    }
                                  />
                                </TableCell>
                              ))}
                              {channelMode === "advanced" ? (
                                <>
                                  {(["inputUsdPerMillion", "cachedInputUsdPerMillion", "cacheWriteUsdPerMillion", "outputUsdPerMillion"] as const).map((field) => (
                                    <TableCell key={field} sx={{ minWidth: 104 }}>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={rate[field]}
                                        inputProps={{ step: "0.01", min: 0 }}
                                        onChange={(event) =>
                                          setModelRateDrafts((current) => updateModelRateDraft(current, rate.model, field, event.target.value))
                                        }
                                      />
                                    </TableCell>
                                  ))}
                                </>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {channelMode === "advanced" ? t("settings.relay.modelRatesAdvancedHelp") : t("settings.relay.modelRatesFastHelp")}
                  </Typography>
                </Stack>
              </RelayFormRow>
              <RelayFormRow label={t("settings.relay.remark")}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  label={t("settings.relay.remark")}
                  placeholder={t("settings.relay.remarkPlaceholder")}
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  helperText={t("settings.relay.remarkHelp")}
                  inputProps={{ "aria-label": t("settings.relay.remark") }}
                />
              </RelayFormRow>
              <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ pt: 0.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setRelayView("list");
                    clearFetchedModelsState();
                  }}
                >
                  {t("settings.relay.backToChannels")}
                </Button>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (editingProvider) {
                        startEditChannel(editingProvider);
                      } else {
                        resetFormFromTemplate(template);
                      }
                    }}
                    disabled={saving}
                  >
                    {t("settings.relay.reset")}
                  </Button>
                  <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={() => void saveChannel()} disabled={saving}>
                    {editingProvider ? t("settings.relay.save") : t("settings.relay.create")}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        {showFetchedModelsPanel ? (
          <Box
            sx={{
              borderLeft: { lg: "1px solid" },
              borderTop: { xs: "1px solid", lg: 0 },
              borderColor: "divider",
              bgcolor: "background.default",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              minHeight: 360,
              maxHeight: { lg: 640 }
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t("settings.relay.fetchedModels")}
              </Typography>
              <IconButton size="small" aria-label={t("settings.relay.closeFetchedPanel")} onClick={() => clearFetchedModelsState()}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <TextField
              size="small"
              fullWidth
              placeholder={t("settings.relay.fetchedModelsSearch")}
              value={fetchedModelsSearch}
              onChange={(event) => setFetchedModelsSearch(event.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, color: "text.secondary" }} /> }}
              sx={{ mb: 1 }}
            />
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
              <FormControlLabel
                control={<Checkbox size="small" checked={showNotAddedModelsOnly} onChange={(event) => setShowNotAddedModelsOnly(event.target.checked)} />}
                label={<Typography variant="caption">{t("settings.relay.showNotAddedOnly")}</Typography>}
                sx={{ mr: 0 }}
              />
              <Stack direction="row" spacing={0.5}>
                <Button size="small" variant="outlined" onClick={selectAllFilteredModels} disabled={filteredFetchedModels.length === 0}>
                  {t("settings.relay.selectAll")}
                </Button>
                <Button size="small" variant="outlined" onClick={deselectAllFetchedModels} disabled={selectedFetchedModels.length === 0}>
                  {t("settings.relay.deselectAll")}
                </Button>
              </Stack>
            </Stack>
            <Box sx={{ flex: 1, overflow: "auto", minHeight: 180, pr: 0.5 }}>
              {filteredFetchedModels.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  {fetchedModels.length === 0 ? t("settings.relay.noModelsFetched") : t("settings.relay.noChannels")}
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {filteredFetchedModels.map((model) => {
                    const isAdded = activeModelList.includes(model);
                    const isSelected = selectedFetchedModels.includes(model);
                    return (
                      <Box
                        key={model}
                        onClick={() => toggleFetchedModelSelection(model)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1,
                          py: 0.75,
                          borderRadius: 1,
                          cursor: "pointer",
                          border: "1px solid",
                          borderColor: isSelected ? "primary.main" : "divider",
                          bgcolor: isSelected ? "action.selected" : isAdded ? "action.hover" : "background.paper"
                        }}
                      >
                        <Checkbox size="small" checked={isSelected} tabIndex={-1} disableRipple />
                        <Tooltip title={model}>
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace" }}>
                            {model}
                          </Typography>
                        </Tooltip>
                        {isAdded && !isSelected ? <Chip size="small" label={t("settings.relay.alreadyAdded")} sx={{ height: 20 }} /> : null}
                        {isAdded && isSelected ? <Chip size="small" color="error" label={t("settings.relay.willRemove")} sx={{ height: 20 }} /> : null}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
            <Stack spacing={1} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider", mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("settings.relay.selectedCount", { count: selectedFetchedModels.length })}
                {selectionIncludesActive ? ` · ${t("settings.relay.removeSelectedFromActive")}` : ""}
              </Typography>
              <Button variant="contained" size="small" onClick={applySelectedFetchedModels} disabled={selectedFetchedModels.length === 0}>
                {selectionIncludesActive
                  ? t("settings.relay.confirmSelection")
                  : t("settings.relay.addSelected", { count: selectedFetchedModels.length })}
              </Button>
            </Stack>
          </Box>
        ) : null}
      </Box>
      ) : null}

      {relayView === "list" ? (
      <Box sx={{ bgcolor: "background.default", p: { xs: 1.25, sm: 2 } }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "flex-end" }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 36 }, lineHeight: 1.1 }}>
                {t("settings.relay.channels")}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
                {t("settings.relay.channelsSubtitle")}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
              {canManage ? (
                <>
                  <Button size="small" variant="outlined" startIcon={<SettingsSuggestIcon />} sx={{ borderRadius: 999 }}>
                    {t("settings.relay.settings")}
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} sx={{ borderRadius: 999 }}>
                    {t("settings.relay.batchImport")}
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<TuneIcon />} sx={{ borderRadius: 999 }}>
                    {t("settings.relay.batchAdjustWeight")}
                  </Button>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ borderRadius: 999 }} onClick={startAddChannel}>
                    {t("settings.relay.addChannel")}
                  </Button>
                </>
              ) : (
                <Chip size="small" label={t("settings.relay.viewOnly")} color="default" variant="outlined" sx={{ borderRadius: 999, fontWeight: 700 }} />
              )}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={t("settings.relay.allCount", { count: providers.length })} color="primary" sx={{ borderRadius: 999, fontWeight: 800 }} />
              {Object.entries(providerCounts(providers)).map(([kind, count]) => (
                <Chip
                  key={kind}
                  size="small"
                  label={`${providerKindLabel(kind)} ${count}`}
                  variant="outlined"
                  avatar={<Box component="span">{providerKindInitial(kind)}</Box>}
                  sx={{ borderRadius: 999, bgcolor: "background.paper" }}
                />
              ))}
            </Stack>

            <Stack direction={{ xs: "column", xl: "row" }} spacing={1.25} alignItems={{ xs: "stretch", xl: "center" }} justifyContent="space-between">
              <TextField
                size="small"
                placeholder={t("settings.relay.searchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, color: "text.secondary" }} /> }}
                sx={{
                  maxWidth: { xl: 620 },
                  "& .MuiOutlinedInput-root": { borderRadius: 999, bgcolor: "background.paper" }
                }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[
                  t("settings.relay.status"),
                  t("settings.relay.tag"),
                  t("settings.relay.model"),
                  t("settings.relay.provider")
                ].map((label) => (
                  <Button key={label} size="small" variant="outlined" startIcon={<AddIcon />} sx={{ borderRadius: 999, color: "text.secondary" }}>
                    {label}
                  </Button>
                ))}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
                <Button size="small" variant="outlined" startIcon={<TuneIcon />} sx={{ borderRadius: 1.5, color: "text.secondary" }}>
                  {t("settings.relay.columns")}
                </Button>
              </Stack>
            </Stack>
          </Stack>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(17, 24, 39, 0.72)" : "rgba(255, 255, 255, 0.72)",
              backdropFilter: "blur(18px)",
              overflowX: "auto"
            }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 1180 }}>
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(31, 41, 55, 0.92)" : "rgba(231, 233, 228, 0.92)",
                      fontWeight: 850,
                      color: "text.secondary",
                      borderColor: "divider",
                      py: 1.5
                    }
                  }}
                >
                  <TableCell sx={{ width: 40 }} />
                  <TableCell padding="checkbox">
                    <Checkbox size="small" disabled />
                  </TableCell>
                  <TableCell>{t("settings.relay.name")}</TableCell>
                  <TableCell>{t("settings.relay.provider")}</TableCell>
                  <TableCell>{t("settings.relay.status")}</TableCell>
                  <TableCell>{t("settings.relay.tags")}</TableCell>
                  <TableCell>{t("settings.relay.supportedModels")}</TableCell>
                  <TableCell>{t("settings.relay.remark")}</TableCell>
                  <TableCell align="center">{t("settings.relay.health")}</TableCell>
                  <TableCell align="center">{t("settings.relay.orderingWeight")}</TableCell>
                  <TableCell align="center">{t("settings.relay.createdAt")}</TableCell>
                  <TableCell align="right">{t("settings.relay.action")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProviders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        {t("settings.relay.noChannels")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProviders.map((provider, index) => {
                    const active = provider.id === activeProviderId;
                    const modelOptions = providerModelOptions(provider);
                    const selectedProviderModel = providerModels[provider.id] ?? provider.defaultModel ?? modelOptions[0]?.value ?? "";
                    const visibleModels = modelOptions.slice(0, 3);
                    const testStatus = testStatuses[provider.id];
                    const expanded = expandedProviderId === provider.id;
                    return (
                      <Fragment key={provider.id}>
                        <TableRow
                          hover
                          sx={{
                            bgcolor: active ? "action.selected" : "transparent",
                            "& td": { borderColor: "divider", py: 1.25 }
                          }}
                        >
                          <TableCell>
                            <IconButton
                              size="small"
                              aria-label={t("settings.relay.expandProvider", { name: provider.name })}
                              onClick={() => setExpandedProviderId(expanded ? null : provider.id)}
                            >
                              {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell padding="checkbox">
                            <Checkbox size="small" checked={active} onChange={() => void activateChannel(provider, selectedProviderModel)} />
                          </TableCell>
                          <TableCell sx={{ minWidth: 190 }}>
                            <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                                  {provider.name}
                                </Typography>
                                {provider.stationType === "rich" && (
                                  <Chip size="small" label="🪙 富可敌国" sx={{ height: 20, bgcolor: "rgba(245,158,11,0.18)", color: "#d97706", fontWeight: 800, border: "1px solid #f59e0b" }} />
                                )}
                                {provider.stationType === "charity" && (
                                  <Chip size="small" label="💚 公益站 (每日签到提醒)" sx={{ height: 20, bgcolor: "rgba(34,197,94,0.18)", color: "#16a34a", fontWeight: 800, border: "1px solid #22c55e" }} />
                                )}
                                {provider.stationType === "official" && (
                                  <Chip size="small" label="🔷 官方" sx={{ height: 20, bgcolor: "rgba(59,130,246,0.18)", color: "#2563eb", fontWeight: 800, border: "1px solid #3b82f6" }} />
                                )}
                                {(provider.stationType === "third_party" || !provider.stationType) && (
                                  <Chip size="small" variant="outlined" label="第三方" sx={{ height: 20 }} />
                                )}
                                {active ? <Chip size="small" color="primary" label={t("settings.relay.active")} sx={{ height: 20, borderRadius: 1 }} /> : null}
                              </Stack>
                              <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", color: "text.secondary" }}>
                                {providerTableId(provider, index)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere", display: "block" }}>
                                {provider.baseUrl || t("settings.relay.managedProvider")} {provider.apiKeyPreview ? `- ${provider.apiKeyPreview}` : ""} • {t("settings.relay.quotaUsd")}: {provider.quotaUsd != null ? `$${provider.quotaUsd}` : t("settings.relay.unlimitedQuota")}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={providerKindLabel(provider.kind)}
                              avatar={<Box component="span">{providerKindInitial(provider.kind)}</Box>}
                              variant="outlined"
                              sx={{ bgcolor: "background.paper", borderRadius: 999 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch size="small" checked={active} onChange={() => void activateChannel(provider, selectedProviderModel)} />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ minWidth: 150 }}>
                              {providerTags(provider, active).map((tag) => (
                                <Chip key={tag} size="small" label={translateProviderTag(tag, t)} variant="outlined" sx={{ height: 22, borderRadius: 1 }} />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {visibleModels.map((option) => (
                                <Chip key={option.value} size="small" label={option.value} sx={{ maxWidth: 160, borderRadius: 1 }} />
                              ))}
                              {modelOptions.length > visibleModels.length && <Chip size="small" label={`+${modelOptions.length - visibleModels.length}`} variant="outlined" />}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 180 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={provider.remark || undefined}>
                              {provider.remark?.trim() || t("settings.relay.noRemark")}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack spacing={0.5} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: active ? "primary.main" : "success.main", mx: "auto", boxShadow: "0 0 8px rgba(34,197,94,0.42)" }} />
                              <Typography variant="caption" color="text.secondary">
                                {active ? t("settings.relay.activeHealth") : t("settings.relay.readyHealth")}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontFamily: "JetBrains Mono, monospace" }}>
                              {providerRateSummary(provider)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {formatProviderCreatedAt(provider.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ minWidth: 238 }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                              <FormControl size="small" sx={{ minWidth: 112 }}>
                                <InputLabel>{t("settings.relay.model")}</InputLabel>
                                <Select
                                  value={selectedProviderModel}
                                  label={t("settings.relay.model")}
                                  onChange={(event) => setProviderModels((current) => ({ ...current, [provider.id]: event.target.value }))}
                                >
                                  {modelOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <ProviderCodeLaunchHint t={t} needsCodeLaunch={relayLikelyNeedsCodeLaunch(provider)} />
                              <Button
                                size="small"
                                variant={active ? "outlined" : "contained"}
                                startIcon={<PlayArrowIcon />}
                                onClick={() => void activateChannel(provider, selectedProviderModel)}
                                disabled={busyProviderId === provider.id}
                                sx={{ minWidth: 104 }}
                              >
                                {t("settings.relay.activate")}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={busyProviderId === provider.id ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
                                onClick={() => void testChannel(provider, selectedProviderModel)}
                                disabled={busyProviderId === provider.id}
                              >
                                {t("settings.relay.test")}
                              </Button>
                              {canManage ? (
                                <>
                                  <IconButton size="small" aria-label={t("settings.relay.editProvider", { name: provider.name })} onClick={() => startEditChannel(provider)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" color="error" aria-label={t("settings.relay.deleteProvider", { name: provider.name })} onClick={() => void deleteChannel(provider)} disabled={busyProviderId === provider.id}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ) : null}
                            </Stack>
                            {testStatus ? (
                              <Typography
                                variant="caption"
                                color={testStatus.state === "failed" ? "error.main" : "success.main"}
                                sx={{ display: "block", mt: 0.75, maxWidth: 360, overflowWrap: "anywhere" }}
                              >
                                {testStatus.message}
                              </Typography>
                            ) : null}
                          </TableCell>
                        </TableRow>
                        {expanded ? (
                          <TableRow key={`${provider.id}-expanded`}>
                            <TableCell colSpan={12} sx={{ bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(15,23,42,0.55)" : "rgba(248,250,252,0.92)", py: 2 }}>
                              <Box sx={{ px: { xs: 0.5, sm: 1.5 } }}>
                                <Stack spacing={2}>
                                  <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                        {t("settings.relay.basicInfo")}
                                      </Typography>
                                      <Stack spacing={0.75}>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.baseUrl")}</Typography>
                                          <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", textAlign: "right", overflowWrap: "anywhere", maxWidth: "70%" }}>
                                            {provider.baseUrl || t("settings.relay.managedProvider")}
                                          </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.apiFormat")}</Typography>
                                          <Typography variant="caption">{providerKindLabel(provider.kind)}</Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.createdAt")}</Typography>
                                          <Typography variant="caption">{formatProviderDateTime(provider.createdAt)}</Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.updatedAt")}</Typography>
                                          <Typography variant="caption">{formatProviderDateTime(provider.updatedAt)}</Typography>
                                        </Stack>
                                      </Stack>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                        {t("settings.relay.additionalInfo")}
                                      </Typography>
                                      <Stack spacing={0.75}>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.orderingWeight")}</Typography>
                                          <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace" }}>
                                            {providerRateSummary(provider)}
                                          </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.remark")}</Typography>
                                          <Typography variant="caption" sx={{ textAlign: "right", maxWidth: "70%", overflowWrap: "anywhere" }} title={provider.remark || undefined}>
                                            {provider.remark?.trim() || t("settings.relay.noRemark")}
                                          </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="space-between">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.keyStorage")}</Typography>
                                          <Typography variant="caption">{provider.apiKeyStorage ?? "none"}</Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                                          <Typography variant="caption" color="text.secondary">{t("settings.relay.tags")}</Typography>
                                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                                            {providerTags(provider, active).map((tag) => (
                                              <Chip key={tag} size="small" label={translateProviderTag(tag, t)} variant="outlined" sx={{ height: 20 }} />
                                            ))}
                                          </Stack>
                                        </Stack>
                                      </Stack>
                                    </Box>
                                  </Stack>
                                  {provider.nativeModels.length > 0 ? (
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                        {t("settings.relay.supportedModels")}
                                      </Typography>
                                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                        {provider.nativeModels.slice(0, 8).map((model) => (
                                          <Chip key={model} size="small" label={model} sx={{ fontFamily: "JetBrains Mono, monospace", borderRadius: 1 }} />
                                        ))}
                                        {provider.nativeModels.length > 8 ? (
                                          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                                            {t("settings.relay.moreModels", { count: provider.nativeModels.length - 8 })}
                                          </Typography>
                                        ) : null}
                                      </Stack>
                                    </Box>
                                  ) : null}
                                </Stack>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("settings.relay.showingEntries", { start: filteredProviders.length === 0 ? 0 : 1, end: filteredProviders.length, total: providers.length })}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" variant="outlined" disabled>
                {t("settings.relay.previous")}
              </Button>
              <Button size="small" variant="outlined" disabled>
                {t("settings.relay.next")}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>
      ) : null}
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

function formatRelayErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "reason"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    try {
      return JSON.stringify(record);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function providerModelOptions(provider: ProviderConfig): Array<{ value: string; label: string }> {
  const fallbackModels = provider.defaultModel ? [provider.defaultModel] : [];
  const nativeModelOptions = provider.nativeModels.length > 0 ? provider.nativeModels : fallbackModels;
  return [
    ...provider.modelAliases.map((entry) => ({ value: entry.alias, label: `${entry.alias} -> ${entry.model}` })),
    ...nativeModelOptions.map((model) => ({ value: model, label: model }))
  ].filter((entry, index, entries) => entries.findIndex((candidate) => candidate.value === entry.value) === index);
}

const OPENAI_DEFAULT_MODEL_RATES: NonNullable<ProviderConfig["modelRates"]> = [
  { model: "gpt-5.5", inputUsdPerMillion: 5, cachedInputUsdPerMillion: 0.5, cacheWriteUsdPerMillion: 5, outputUsdPerMillion: 30, multiplier: 1, inputMultiplier: 1, cacheReadMultiplier: 1, cacheWriteMultiplier: 1, outputMultiplier: 1 },
  { model: "gpt-5.4", inputUsdPerMillion: 2.5, cachedInputUsdPerMillion: 0.25, cacheWriteUsdPerMillion: 2.5, outputUsdPerMillion: 15, multiplier: 1, inputMultiplier: 1, cacheReadMultiplier: 1, cacheWriteMultiplier: 1, outputMultiplier: 1 },
  { model: "gpt-5.6-sol", inputUsdPerMillion: 5, cachedInputUsdPerMillion: 0.5, cacheWriteUsdPerMillion: 5, outputUsdPerMillion: 30, multiplier: 1, inputMultiplier: 1, cacheReadMultiplier: 1, cacheWriteMultiplier: 1, outputMultiplier: 1 }
];

function defaultRatesForProvider(provider: ProviderConfig): ProviderConfig["modelRates"] {
  const models = new Set([provider.defaultModel, ...provider.nativeModels, ...provider.modelAliases.flatMap((entry) => [entry.alias, entry.model])].filter(Boolean));
  const rates = OPENAI_DEFAULT_MODEL_RATES.filter((rate) => models.has(rate.model));
  return rates.length > 0 ? rates : undefined;
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

function providerKindInitial(kind: string): string {
  return providerKindLabel(kind).slice(0, 1).toUpperCase();
}

function providerTableId(provider: ProviderConfig, index: number): string {
  let hash = 0;
  for (const char of provider.id || provider.name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return `#${String(hash || index + 1).padStart(5, "0")}`;
}

function providerTags(provider: ProviderConfig, active: boolean): string[] {
  return [provider.kind === "responsesRelay" ? "relay" : provider.kind, active ? "active" : "saved"].filter(Boolean);
}

function providerRateSummary(provider: ProviderConfig): string {
  const rates = provider.modelRates ?? [];
  if (rates.length === 0) {
    return "1x";
  }
  const multipliers = rates.flatMap((rate) => rateMultipliers(rate));
  const unique = [...new Set(multipliers.map((value) => formatMultiplier(value)))];
  if (unique.length === 1) {
    return `${unique[0]}x`;
  }
  const min = Math.min(...multipliers);
  const max = Math.max(...multipliers);
  return `${rates.length} models ${formatMultiplier(min)}-${formatMultiplier(max)}x`;
}

function rateMultipliers(rate: NonNullable<ProviderConfig["modelRates"]>[number]): number[] {
  const legacyMultiplier = rate.multiplier || 1;
  return [
    rate.inputMultiplier ?? legacyMultiplier,
    rate.cacheReadMultiplier ?? legacyMultiplier,
    rate.cacheWriteMultiplier ?? legacyMultiplier,
    rate.outputMultiplier ?? legacyMultiplier
  ];
}

function formatMultiplier(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(4)).toString() : "1";
}

function translateProviderTag(tag: string, t: TranslateFn): string {
  return translateWithFallback(t, `settings.relay.tag.${tag}`, tag);
}

function formatProviderCreatedAt(createdAt?: number): string {
  if (!createdAt) {
    return "-";
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toISOString().slice(0, 10);
}

function formatProviderDateTime(value?: number): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function parseModelRates(value: string): ProviderConfig["modelRates"] {
  const rates: NonNullable<ProviderConfig["modelRates"]> = [];
  for (const entry of value.split(/\r?\n|,/)) {
    const [model, rawRates] = entry.split("=").map((part) => part.trim());
    if (!model || !rawRates) {
      continue;
    }
    const parts = rawRates.split("/").map((part) => Number(part.trim()));
    if (parts.some((part) => Number.isNaN(part))) {
      continue;
    }
    if (parts.length >= 5 && parts[0] != null && parts[3] != null) {
      const multiplier = parts[4] || 1;
      rates.push({
        model,
        inputUsdPerMillion: parts[0],
        cachedInputUsdPerMillion: parts[1],
        cacheWriteUsdPerMillion: parts[2],
        outputUsdPerMillion: parts[3],
        multiplier,
        inputMultiplier: multiplier,
        cacheReadMultiplier: multiplier,
        cacheWriteMultiplier: multiplier,
        outputMultiplier: multiplier
      });
    } else if (parts.length >= 3 && parts[0] != null && parts[1] != null) {
      const multiplier = parts[2] || 1;
      rates.push({
        model,
        inputUsdPerMillion: parts[0],
        cachedInputUsdPerMillion: parts[0],
        cacheWriteUsdPerMillion: parts[0],
        outputUsdPerMillion: parts[1],
        multiplier,
        inputMultiplier: multiplier,
        cacheReadMultiplier: multiplier,
        cacheWriteMultiplier: multiplier,
        outputMultiplier: multiplier
      });
    }
  }
  return rates.length > 0 ? rates : undefined;
}

function modelRateDraftsForModels(models: string[], rates: ProviderConfig["modelRates"]): ModelRateDraft[] {
  const byModel = new Map((rates ?? []).map((rate) => [rate.model, rate]));
  return models.map((model) => {
    const rate = byModel.get(model);
    const multiplier = rate?.multiplier ?? 1;
    return {
      model,
      inputUsdPerMillion: formatOptionalNumberInput(rate?.inputUsdPerMillion),
      cachedInputUsdPerMillion: formatOptionalNumberInput(rate?.cachedInputUsdPerMillion ?? rate?.inputUsdPerMillion),
      cacheWriteUsdPerMillion: formatOptionalNumberInput(rate?.cacheWriteUsdPerMillion ?? rate?.inputUsdPerMillion),
      outputUsdPerMillion: formatOptionalNumberInput(rate?.outputUsdPerMillion),
      inputMultiplier: formatNumberInput(rate?.inputMultiplier ?? multiplier),
      cacheReadMultiplier: formatNumberInput(rate?.cacheReadMultiplier ?? multiplier),
      cacheWriteMultiplier: formatNumberInput(rate?.cacheWriteMultiplier ?? multiplier),
      outputMultiplier: formatNumberInput(rate?.outputMultiplier ?? multiplier)
    };
  });
}

function modelRateDraftRowsForModels(models: string[], drafts: ModelRateDraft[]): ModelRateDraft[] {
  const byModel = new Map(drafts.map((draft) => [draft.model, draft]));
  return models.map((model) => byModel.get(model) ?? { model, ...DEFAULT_MODEL_RATE_DRAFT });
}

function updateModelRateDraft(drafts: ModelRateDraft[], model: string, field: keyof Omit<ModelRateDraft, "model">, value: string): ModelRateDraft[] {
  const seen = new Set<string>();
  const next = drafts.map((draft) => {
    if (draft.model !== model) {
      return draft;
    }
    seen.add(model);
    return { ...draft, [field]: value };
  });
  if (!seen.has(model)) {
    next.push({ model, ...DEFAULT_MODEL_RATE_DRAFT, [field]: value });
  }
  return next;
}

function modelRateDraftsToProviderRates(drafts: ModelRateDraft[], includePrices: boolean): ProviderConfig["modelRates"] {
  const rates: NonNullable<ProviderConfig["modelRates"]> = [];
  for (const draft of drafts) {
    const model = draft.model.trim();
    if (!model) {
      continue;
    }
    const inputMultiplier = parsePositiveNumber(draft.inputMultiplier, 1);
    const cacheReadMultiplier = parsePositiveNumber(draft.cacheReadMultiplier, 1);
    const cacheWriteMultiplier = parsePositiveNumber(draft.cacheWriteMultiplier, 1);
    const outputMultiplier = parsePositiveNumber(draft.outputMultiplier, 1);
    const rate: NonNullable<ProviderConfig["modelRates"]>[number] = {
      model,
      multiplier: 1,
      inputMultiplier,
      cacheReadMultiplier,
      cacheWriteMultiplier,
      outputMultiplier
    };
    if (includePrices) {
      rate.inputUsdPerMillion = parseOptionalPositiveNumber(draft.inputUsdPerMillion);
      rate.cachedInputUsdPerMillion = parseOptionalPositiveNumber(draft.cachedInputUsdPerMillion);
      rate.cacheWriteUsdPerMillion = parseOptionalPositiveNumber(draft.cacheWriteUsdPerMillion);
      rate.outputUsdPerMillion = parseOptionalPositiveNumber(draft.outputUsdPerMillion);
    }
    rates.push(rate);
  }
  return rates.length > 0 ? rates : undefined;
}

function parsePositiveNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatNumberInput(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function parseOptionalPositiveNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatOptionalNumberInput(value: number | undefined): string {
  return value != null && Number.isFinite(value) ? String(value) : "";
}

type QuickCodexConfigField = (typeof CODEX_CONFIG_FIELD_META)[number];

function localizeQuickCodexConfigField(
  field: QuickCodexConfigField,
  t: TranslateFn
): Pick<QuickCodexConfigField, "label" | "description" | "options"> {
  return {
    label: translateWithFallback(t, `settings.codex.quick.${field.key}.label`, field.label),
    description: translateWithFallback(t, `settings.codex.quick.${field.key}.description`, field.description),
    options: localizeCodexConfigOptions(field.options, t)
  };
}

function localizeCodexConfigOptions(
  options: Array<{ value: string; label: string }> | undefined,
  t: TranslateFn
): Array<{ value: string; label: string }> | undefined {
  return options?.map((option) => ({
    ...option,
    label: translateWithFallback(t, `settings.codex.option.${option.value}`, option.label)
  }));
}

function localizeDynamicCodexConfigLabel(field: DynamicCodexConfigField, t: TranslateFn): string {
  const direct = translateWithFallback(t, `settings.codex.dynamic.${field.keyPath}.label`, "");
  if (direct) {
    return direct;
  }
  return field.keyPath
    .split(".")
    .map((segment) => localizeCodexConfigSegment(segment, t))
    .join(" / ");
}

function localizeCodexConfigSegment(segment: string, t: TranslateFn): string {
  const words = segment.split(/[_-]+/).filter(Boolean);
  if (words.length === 0) {
    return segment;
  }
  return words.map((word) => translateWithFallback(t, `settings.codex.segment.${word.toLowerCase()}`, labelFromRawConfigWord(word))).join(" ");
}

function labelFromRawConfigWord(word: string): string {
  return word.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function translateWithFallback(t: TranslateFn, key: string, fallback: string): string {
  const translated = t(key as TranslationKey);
  return translated === key ? fallback : translated;
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
  unsetLabel,
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
  unsetLabel: string;
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
                <em>{unsetLabel}</em>
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
  t,
  onCommit
}: {
  field: DynamicCodexConfigField;
  value: unknown;
  disabled: boolean;
  t: TranslateFn;
  onCommit: (value: JsonValue) => void;
}) {
  const localizedLabel = localizeDynamicCodexConfigLabel(field, t);
  const localizedDescription = t("settings.codex.dynamicGenericDescription", { keyPath: field.keyPath });
  const localizedOptions = localizeCodexConfigOptions(field.options, t);
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
          {localizedLabel}
        </Typography>
        <Chip size="small" label={field.keyPath} variant="outlined" />
        {field.source === "runtime" ? <Chip size="small" label={t("settings.codex.runtime")} color="warning" variant="outlined" /> : null}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {localizedDescription}
      </Typography>
      {field.defaultValue !== undefined ? (
        <Typography variant="caption" color="text.secondary">
          {t("settings.codex.defaultValue", { value: formatDefaultValue(field.defaultValue) })}
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
          inputProps={{ "aria-label": localizedLabel }}
        />
      </SettingRow>
    );
  }

  if (field.kind === "select") {
    return (
      <SettingRow title={fieldCaption} description={null}>
        <FormControl size="small" sx={{ minWidth: 220 }} disabled={disabled}>
          <InputLabel id={`dynamic-codex-config-${field.keyPath}-label`}>{localizedLabel}</InputLabel>
          <Select
            labelId={`dynamic-codex-config-${field.keyPath}-label`}
            label={localizedLabel}
            value={formattedValue}
            inputProps={{ "aria-label": localizedLabel }}
            onChange={(event) => {
              const parsed = parseDynamicConfigFieldValue(field, event.target.value);
              if (!("error" in parsed)) {
                onCommit(parsed.value);
              }
            }}
          >
            {!formattedValue ? (
              <MenuItem value="">
                <em>{t("settings.codex.unset")}</em>
              </MenuItem>
            ) : null}
            {(localizedOptions ?? []).map((option) => (
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
          label={field.kind === "json" ? `${localizedLabel} JSON` : localizedLabel}
          value={draft}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error ?? (field.kind === "json" ? t("settings.codex.editJsonHelp") : t("settings.codex.blurToSave"))}
          inputProps={{ "aria-label": localizedLabel }}
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
        label={localizedLabel}
        type={field.kind === "number" ? "number" : "text"}
        value={draft}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error}
        inputProps={{ "aria-label": localizedLabel }}
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



function ProfileSettingsPanel({
  providerCount,
  onExportProfile,
  onImportProfile
}: {
  providerCount: number;
  onExportProfile: () => Promise<void>;
  onImportProfile: (file: File) => Promise<number>;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <DownloadIcon fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
          UI profile
        </Typography>
        <Chip size="small" label={`${providerCount} providers`} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Export and import provider metadata without API keys.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setStatus("");
            try {
              await onExportProfile();
              setStatus("Profile exported.");
            } catch {
              setStatus("Profile export failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Export profile
        </Button>
        <Button size="small" variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={busy}>
          Import profile
          <input
            aria-label="Import profile file"
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) {
                return;
              }
              void (async () => {
                setBusy(true);
                setStatus("");
                try {
                  const count = await onImportProfile(file);
                  setStatus(`Imported ${count} providers.`);
                } catch {
                  setStatus("Profile import failed.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </Button>
      </Stack>
      {status && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {status}
        </Typography>
      )}
    </Paper>
  );
}

function AuditSettingsPanel({
  events,
  onReload
}: {
  events: DangerousPermissionAuditEvent[];
  onReload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <SecurityIcon fontSize="small" color={events.length ? "warning" : "inherit"} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
          Dangerous permission audit
        </Typography>
        <Chip size="small" label={events.length} color={events.length ? "warning" : "default"} />
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onReload();
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh
        </Button>
      </Stack>
      {events.length === 0 && <Typography color="text.secondary">No dangerous permission sessions recorded.</Typography>}
      <Stack spacing={1}>
        {events.slice(0, 5).map((event) => (
          <Box key={event.id} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color={event.severity === "critical" ? "error" : "warning"} label={event.severity} />
              <Typography variant="caption" sx={{ flex: 1, overflowWrap: "anywhere" }}>
                {event.method} {event.model ? `- ${event.model}` : ""}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, overflowWrap: "anywhere" }}>
              {formatAuditTime(event.createdAt)} {event.cwd ? `- ${event.cwd}` : ""} {event.threadId ? `- ${event.threadId}` : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
              {event.reasons.join(", ")}
              {event.inputSummary ? ` - input ${event.inputSummary.items} items (${event.inputSummary.textItems} text, ${event.inputSummary.imageItems} images, ${event.inputSummary.mentionItems} mentions)` : ""}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function formatAuditTime(value: number): string {
  return new Date(value).toLocaleString();
}

function SkillsSettingsPanel({
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
  onToggleSkill: (skill: SkillEntry, enabled: boolean) => void;
  onSaveExtraRoots: (roots: string[]) => void;
  onReadPreview: (skill: SkillEntry) => void;
}) {
  const [extraRootsText, setExtraRootsText] = useState(extraRoots.join("\n"));

  useEffect(() => {
    setExtraRootsText(extraRoots.join("\n"));
  }, [extraRoots]);

  return (
    <Stack spacing={1.25} sx={{ p: 1.5 }}>
      <Paper variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Skill roots
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Add one extra root per line. Saving writes through `skills/extraRoots/set` and reloads the live inventory.
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

      {tooling.skillGroups.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          No skills discovered by the local Codex engine.
        </Typography>
      )}

      {tooling.skillGroups.map((group) => (
        <Paper key={group.cwd} variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                {group.cwd}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {group.skills.length} skills / {group.errors.length} errors
              </Typography>
            </Box>
            <Chip size="small" label={group.skills.length} />
          </Stack>
          {group.errors.map((error) => (
            <Alert key={`${error.path}:${error.message}`} severity="warning" sx={{ mt: 1 }}>
              {error.path}: {error.message}
            </Alert>
          ))}
          <Stack spacing={1} sx={{ mt: 1 }}>
            {group.skills.map((skill) => (
              <Box key={skill.path || skill.name} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                      {skill.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                      {skill.shortDescription || skill.description || skill.path}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={skill.scope} />
                    <FormControlLabel
                      sx={{ mr: 0 }}
                      control={<Switch size="small" checked={skill.enabled} onChange={(event) => onToggleSkill(skill, event.target.checked)} />}
                      label={skill.enabled ? "Enabled" : "Disabled"}
                    />
                  </Stack>
                </Stack>
                {skill.path && (
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                      {skill.path}
                    </Typography>
                    <Button size="small" onClick={() => onReadPreview(skill)} sx={{ alignSelf: "flex-start" }}>
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

function ThemeModeCards({
  themeMode,
  onThemeModeChange,
  t
}: {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  t: TranslateFn;
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
      label: t("settings.appearance.system"),
      description: t("settings.appearance.systemDescription"),
      icon: <ComputerIcon fontSize="small" />,
      swatches: ["#F8FAF5", "#FFFFFF", "#111827"]
    },
    {
      mode: "official-light",
      label: t("settings.appearance.light"),
      description: t("settings.appearance.lightDescription"),
      icon: <LightModeIcon fontSize="small" />,
      swatches: ["#FFFFFF", "#E5E7EB", "#1877F2"]
    },
    {
      mode: "official-black",
      label: t("settings.appearance.dark"),
      description: t("settings.appearance.darkDescription"),
      icon: <DarkModeIcon fontSize="small" />,
      swatches: ["#070A0E", "#10161D", "#61F3F3"]
    }
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
      {cards.map((card) => {
        const active =
          themeMode === card.mode ||
          (card.mode === "official-light" && (themeMode === "atmospheric-codex" || themeMode === "sakura-pink")) ||
          (card.mode === "official-black" && (themeMode === "studio-black-gold" || themeMode === "developer-leaf"));
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
  onEditCustomThemePlugin,
  onRemoveCustomThemePlugin,
  t
}: {
  plugins: ThemePlugin[];
  activeThemeId: ThemeMode;
  installedThemePluginIds: ThemeId[];
  onThemeModeChange: (mode: ThemeMode) => void;
  onInstallThemePlugin: (id: ThemeId) => void;
  onUninstallThemePlugin: (id: ThemeId) => void;
  onEditCustomThemePlugin: (plugin: ThemePlugin) => void;
  onRemoveCustomThemePlugin: (id: ThemeId) => void;
  t: TranslateFn;
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
                        ? t("settings.theme.source.official")
                        : plugin.source === "customer-slot"
                          ? t("settings.theme.source.customer")
                          : plugin.source === "user-defined"
                            ? t("settings.theme.source.user")
                            : t("settings.theme.source.local")
                    }
                  />
                  {active && <Chip size="small" label={t("settings.theme.active")} color="primary" />}
                  {plugin.assets && <Chip size="small" label={t("settings.theme.media")} variant="outlined" />}
                  {plugin.assets?.petImage && <Chip size="small" label={t("settings.theme.avatar")} variant="outlined" />}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  {plugin.description}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
              {installed ? (
                <Button size="small" variant={active ? "contained" : "outlined"} disabled={active} onClick={() => onThemeModeChange(plugin.id)}>
                  {active ? t("settings.theme.activeButton") : t("settings.theme.switch")}
                </Button>
              ) : (
                <Button size="small" variant="outlined" startIcon={<ExtensionIcon />} onClick={() => onInstallThemePlugin(plugin.id)}>
                  {t("settings.theme.install")}
                </Button>
              )}
              {removable && (
                <Button size="small" color="inherit" onClick={() => onUninstallThemePlugin(plugin.id)}>
                  {t("settings.theme.remove")}
                </Button>
              )}
              {plugin.source === "user-defined" && (
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => onEditCustomThemePlugin(plugin)} aria-label={t("settings.theme.editAria", { name: plugin.name })}>
                  {t("settings.theme.edit")}
                </Button>
              )}
              {deletable && (
                <IconButton size="small" aria-label={t("settings.theme.deleteAria", { name: plugin.name })} onClick={() => onRemoveCustomThemePlugin(plugin.id)}>
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

function CustomThemePluginEditor({
  editingPlugin,
  onCancelEdit,
  onSave,
  t
}: {
  editingPlugin: ThemePlugin | null;
  onCancelEdit: () => void;
  onSave: (plugin: ThemePlugin) => void;
  t: TranslateFn;
}) {
  const [name, setName] = useState(t("settings.theme.myStudio"));
  const [description, setDescription] = useState(t("settings.theme.defaultDescription"));
  const [primary, setPrimary] = useState("#0F766E");
  const [secondary, setSecondary] = useState("#F59E0B");
  const [background, setBackground] = useState("#F8FAFC");
  const [appBackgroundImage, setAppBackgroundImage] = useState("");
  const [appBackgroundVideo, setAppBackgroundVideo] = useState("");
  const [composerBackgroundImage, setComposerBackgroundImage] = useState("");
  const [welcomeBackgroundImage, setWelcomeBackgroundImage] = useState("");
  const [historyBackgroundImage, setHistoryBackgroundImage] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [cornerImage, setCornerImage] = useState("");
  const [petImage, setPetImage] = useState("");
  const [petEnabled, setPetEnabled] = useState(true);
  const [decorationIntensity, setDecorationIntensity] = useState<"none" | "subtle" | "rich">("subtle");
  const [useBackgroundAsHero, setUseBackgroundAsHero] = useState(true);
  const [backgroundLayerOpacity, setBackgroundLayerOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.backgroundLayerOpacity));
  const [backgroundOverlayOpacity, setBackgroundOverlayOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.backgroundOverlayOpacity));
  const [effectsLayerOpacity, setEffectsLayerOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.effectsLayerOpacity));
  const [workspaceSurfaceOpacity, setWorkspaceSurfaceOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.workspaceSurfaceOpacity));
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.heroOverlayOpacity));
  const [panelSurfaceOpacity, setPanelSurfaceOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.panelSurfaceOpacity));
  const [blurStrength, setBlurStrength] = useState(REFERENCE_BACKGROUND_TUNING.blurStrength);
  const [toneColor, setToneColor] = useState(REFERENCE_BACKGROUND_TUNING.toneColor);
  const [toneOpacity, setToneOpacity] = useState(unitToPercent(REFERENCE_BACKGROUND_TUNING.toneOpacity));
  const [sceneRenderer, setSceneRenderer] = useState<"none" | "canvas" | "three">("none");
  const [scenePreset, setScenePreset] = useState<ThemeBackgroundScene["preset"]>("aurora");
  const [sceneColor, setSceneColor] = useState(REFERENCE_BACKGROUND_TUNING.toneColor);
  const [sceneSecondaryColor, setSceneSecondaryColor] = useState("#F8B4C4");
  const [sceneSpeed, setSceneSpeed] = useState(0.65);
  const [sceneDensity, setSceneDensity] = useState(55);
  const [sceneOpacity, setSceneOpacity] = useState(54);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement | null>(null);
  const videoFileRef = useRef<HTMLInputElement | null>(null);
  const themeImportRef = useRef<HTMLInputElement | null>(null);
  const safeBackgroundPreview = isSafeThemeImageUrl(appBackgroundImage) ? appBackgroundImage.trim() : "";
  const safeVideoPreview = isSafeThemeVideoUrl(appBackgroundVideo) ? appBackgroundVideo.trim() : "";
  const editing = Boolean(editingPlugin);

  useEffect(() => {
    if (!editingPlugin) {
      return;
    }
    loadThemeDraft(editingPlugin);
  }, [editingPlugin]);

  function resetDraft() {
    setName(t("settings.theme.myStudio"));
    setDescription(t("settings.theme.defaultDescription"));
    setPrimary("#0F766E");
    setSecondary("#F59E0B");
    setBackground("#F8FAFC");
    setAppBackgroundImage("");
    setAppBackgroundVideo("");
    setComposerBackgroundImage("");
    setWelcomeBackgroundImage("");
    setHistoryBackgroundImage("");
    setHeroImage("");
    setCornerImage("");
    setPetImage("");
    setPetEnabled(true);
    setUseBackgroundAsHero(true);
    setDecorationIntensity("subtle");
    setBackgroundLayerOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.backgroundLayerOpacity));
    setBackgroundOverlayOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.backgroundOverlayOpacity));
    setEffectsLayerOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.effectsLayerOpacity));
    setWorkspaceSurfaceOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.workspaceSurfaceOpacity));
    setHeroOverlayOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.heroOverlayOpacity));
    setPanelSurfaceOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.panelSurfaceOpacity));
    setBlurStrength(REFERENCE_BACKGROUND_TUNING.blurStrength);
    setToneColor(REFERENCE_BACKGROUND_TUNING.toneColor);
    setToneOpacity(unitToPercent(REFERENCE_BACKGROUND_TUNING.toneOpacity));
    setSceneRenderer("none");
    setScenePreset("aurora");
    setSceneColor(REFERENCE_BACKGROUND_TUNING.toneColor);
    setSceneSecondaryColor("#F8B4C4");
    setSceneSpeed(0.65);
    setSceneDensity(55);
    setSceneOpacity(54);
    setDark(false);
    setError(null);
  }

  function buildThemePluginDraft(overrides: Partial<ThemePlugin["assets"]> = {}): ThemePlugin | null {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("settings.theme.errorNameRequired"));
      return null;
    }
    if (![primary, secondary, background].every((value) => isHexColor(value.trim()))) {
      setError(t("settings.theme.errorPreviewHex"));
      return null;
    }
    const nextAppBackgroundImage = overrides.appBackgroundImage ?? appBackgroundImage;
    const nextAppBackgroundVideo = overrides.appBackgroundVideo ?? appBackgroundVideo;
    const nextComposerBackgroundImage = overrides.composerBackgroundImage ?? composerBackgroundImage;
    const nextWelcomeBackgroundImage = overrides.welcomeBackgroundImage ?? welcomeBackgroundImage;
    const nextHistoryBackgroundImage = overrides.historyBackgroundImage ?? historyBackgroundImage;
    const nextHeroImage = overrides.heroImage ?? heroImage;
    const nextCornerImage = overrides.cornerImage ?? cornerImage;
    const nextPetImage = overrides.petImage ?? petImage;
    const imageFields = [nextAppBackgroundImage, nextComposerBackgroundImage, nextWelcomeBackgroundImage, nextHistoryBackgroundImage, nextHeroImage, nextCornerImage, nextPetImage].map((value) => value.trim()).filter(Boolean);
    if (!imageFields.every(isSafeThemeImageUrl)) {
      setError(t("settings.theme.errorImageUrl"));
      return null;
    }
    if (nextAppBackgroundVideo.trim() && !isSafeThemeVideoUrl(nextAppBackgroundVideo)) {
      setError(t("settings.theme.errorVideoUrl"));
      return null;
    }
    if (![toneColor, sceneColor, sceneSecondaryColor].every((value) => isHexColor(value.trim()))) {
      setError(t("settings.theme.errorToneHex"));
      return null;
    }
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28);
    const id = editingPlugin?.id ?? (`user-${slug || "theme"}-${Math.random().toString(36).slice(2, 7)}` as ThemeId);
    const assets = removeEmptyThemeAssets({
      appBackgroundImage: nextAppBackgroundImage.trim(),
      appBackgroundVideo: nextAppBackgroundVideo.trim(),
      composerBackgroundImage: nextComposerBackgroundImage.trim(),
      welcomeBackgroundImage: nextWelcomeBackgroundImage.trim(),
      historyBackgroundImage: nextHistoryBackgroundImage.trim(),
      heroImage: nextHeroImage.trim(),
      cornerImage: nextCornerImage.trim(),
      petImage: nextPetImage.trim()
    });
    const backgroundScene =
      sceneRenderer === "none"
        ? undefined
        : {
            renderer: sceneRenderer,
            preset: scenePreset,
            color: sceneColor.trim(),
            secondaryColor: sceneSecondaryColor.trim(),
            speed: clampDecimal(sceneSpeed, 0.65, 0.1, 3),
            density: percentToUnit(sceneDensity),
            opacity: percentToUnit(sceneOpacity)
          };
    setError(null);
    return {
      id,
      name: trimmed,
      description: description.trim() || t("settings.theme.defaultDescription"),
      source: "user-defined",
      installedByDefault: false,
      preview: {
        primary: primary.trim(),
        secondary: secondary.trim(),
        background: background.trim()
      },
      dark,
      assets,
      layout: {
        heroEnabled: Boolean(nextHeroImage.trim() || nextWelcomeBackgroundImage.trim()) || (useBackgroundAsHero && Boolean(nextAppBackgroundImage.trim())),
        petEnabled,
        decorationIntensity,
        backgroundLayerOpacity: percentToUnit(backgroundLayerOpacity),
        backgroundOverlayOpacity: percentToUnit(backgroundOverlayOpacity),
        effectsLayerOpacity: percentToUnit(effectsLayerOpacity),
        workspaceSurfaceOpacity: percentToUnit(workspaceSurfaceOpacity),
        heroOverlayOpacity: percentToUnit(heroOverlayOpacity),
        panelSurfaceOpacity: percentToUnit(panelSurfaceOpacity),
        blurStrength: clampThemeBlur(blurStrength),
        toneColor: toneColor.trim(),
        toneOpacity: percentToUnit(toneOpacity),
        backgroundScene
      }
    };
  }

  function loadThemeDraft(plugin: ThemePlugin) {
    setName(plugin.name);
    setDescription(plugin.description);
    setPrimary(plugin.preview.primary);
    setSecondary(plugin.preview.secondary);
    setBackground(plugin.preview.background);
    setAppBackgroundImage(plugin.assets?.appBackgroundImage ?? "");
    setAppBackgroundVideo(plugin.assets?.appBackgroundVideo ?? "");
    setComposerBackgroundImage(plugin.assets?.composerBackgroundImage ?? "");
    setWelcomeBackgroundImage(plugin.assets?.welcomeBackgroundImage ?? "");
    setHistoryBackgroundImage(plugin.assets?.historyBackgroundImage ?? "");
    setHeroImage(plugin.assets?.heroImage ?? "");
    setCornerImage(plugin.assets?.cornerImage ?? "");
    setPetImage(plugin.assets?.petImage ?? "");
    setPetEnabled(plugin.layout?.petEnabled !== false);
    setUseBackgroundAsHero(plugin.layout?.heroEnabled !== false);
    setDecorationIntensity(plugin.layout?.decorationIntensity ?? "subtle");
    const tuning = themeVisualTuning(plugin);
    setBackgroundLayerOpacity(unitToPercent(tuning.backgroundLayerOpacity));
    setBackgroundOverlayOpacity(unitToPercent(tuning.backgroundOverlayOpacity));
    setEffectsLayerOpacity(unitToPercent(tuning.effectsLayerOpacity));
    setWorkspaceSurfaceOpacity(unitToPercent(tuning.workspaceSurfaceOpacity));
    setHeroOverlayOpacity(unitToPercent(tuning.heroOverlayOpacity));
    setPanelSurfaceOpacity(unitToPercent(tuning.panelSurfaceOpacity));
    setBlurStrength(tuning.blurStrength);
    setToneColor(tuning.toneColor);
    setToneOpacity(unitToPercent(tuning.toneOpacity));
    const scene = plugin.layout?.backgroundScene;
    setSceneRenderer(scene?.renderer ?? "none");
    setScenePreset(scene?.preset ?? "aurora");
    setSceneColor(scene?.color && isHexColor(scene.color) ? scene.color : tuning.toneColor);
    setSceneSecondaryColor(scene?.secondaryColor && isHexColor(scene.secondaryColor) ? scene.secondaryColor : "#F8B4C4");
    setSceneSpeed(clampDecimal(scene?.speed, 0.65, 0.1, 3));
    setSceneDensity(unitToPercent(scene?.density ?? 0.55));
    setSceneOpacity(unitToPercent(scene?.opacity ?? 0.54));
    setDark(Boolean(plugin.dark));
    setError(null);
  }

  function exportThemeDraft() {
    const plugin = buildThemePluginDraft();
    if (!plugin) {
      return;
    }
    const blob = new Blob([`${JSON.stringify(plugin, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${plugin.id}.theme.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function exportThemeZipDraft() {
    const plugin = buildThemePluginDraft();
    if (!plugin) {
      return;
    }
    try {
      const blob = await createThemeZipBlob(plugin);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${plugin.id}.theme.zip`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (zipError) {
      setError(zipError instanceof Error ? zipError.message : String(zipError));
    }
  }

  return (
    <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <AddIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {editing ? t("settings.theme.editPlugin") : t("settings.theme.definePlugin")}
        </Typography>
        {editing && (
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              resetDraft();
              onCancelEdit();
            }}
          >
            {t("settings.theme.newTheme")}
          </Button>
        )}
      </Stack>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label={t("settings.theme.name")} value={name} onChange={(event) => setName(event.target.value)} sx={{ flex: 1 }} inputProps={{ "aria-label": t("settings.theme.name") }} />
          <TextField
            size="small"
            label={t("settings.theme.description")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            sx={{ flex: 1.4 }}
            inputProps={{ "aria-label": t("settings.theme.description") }}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <TextField size="small" label={t("settings.theme.primary")} value={primary} onChange={(event) => setPrimary(event.target.value)} inputProps={{ "aria-label": t("settings.theme.primary") }} />
          <TextField size="small" label={t("settings.theme.secondary")} value={secondary} onChange={(event) => setSecondary(event.target.value)} inputProps={{ "aria-label": t("settings.theme.secondary") }} />
          <TextField size="small" label={t("settings.theme.background")} value={background} onChange={(event) => setBackground(event.target.value)} inputProps={{ "aria-label": t("settings.theme.background") }} />
          <FormControlLabel control={<Switch checked={dark} onChange={(event) => setDark(event.target.checked)} inputProps={{ "aria-label": t("settings.appearance.dark") }} />} label={t("settings.appearance.dark")} />
        </Stack>
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("settings.theme.mediaAssets")}
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              minHeight: 132,
              borderRadius: 1,
              overflow: "hidden",
              position: "relative",
              bgcolor: "background.paper",
              backgroundImage: safeBackgroundPreview
                ? (theme) =>
                    [
                      `linear-gradient(90deg, rgba(255,255,255,${Math.min(0.9, percentToUnit(heroOverlayOpacity) + 0.14)}) 0%, rgba(255,255,255,${percentToUnit(heroOverlayOpacity)}) 48%, rgba(255,255,255,${Math.max(0, percentToUnit(heroOverlayOpacity) * 0.28)}) 100%)`,
                      `url("${safeBackgroundPreview}")`
                    ].join(", ")
                : (theme) =>
                    [
                      `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
                      `radial-gradient(circle at 82% 20%, ${primary}33, transparent 34%)`
                    ].join(", "),
              backgroundSize: safeBackgroundPreview ? "cover" : "auto",
              backgroundPosition: "center"
            }}
            data-testid="custom-theme-background-preview"
          >
            <Stack spacing={1} sx={{ p: 1.5, maxWidth: 440, position: "relative", zIndex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                {t("settings.theme.previewTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("settings.theme.previewDescription")}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {[primary, secondary, background].map((color) => (
                  <Box key={color} sx={{ width: 28, height: 28, borderRadius: 0.75, bgcolor: color, border: "1px solid", borderColor: "divider" }} />
                ))}
                {safeBackgroundPreview && <Chip size="small" label={appBackgroundImage.startsWith("data:image/") ? t("settings.theme.localImage") : t("settings.theme.remoteImage")} color="primary" />}
                {appBackgroundImage.trim().toLowerCase().includes("gif") && <Chip size="small" label={t("settings.theme.gifReady")} color="primary" variant="outlined" />}
                {safeVideoPreview && <Chip size="small" label={appBackgroundVideo.startsWith("data:video/") ? t("settings.theme.localVideo") : t("settings.theme.remoteVideo")} color="secondary" />}
              </Stack>
            </Stack>
          </Paper>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t("settings.theme.mainChatBackground")}
              value={appBackgroundImage}
              onChange={(event) => setAppBackgroundImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.mainChatBackground") }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => backgroundFileRef.current?.click()}
              aria-label={t("settings.theme.chooseImage")}
              sx={{ flex: "0 0 auto" }}
            >
              {t("settings.theme.chooseImage")}
            </Button>
            <input
              ref={backgroundFileRef}
              type="file"
              aria-label="Background image file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                if (!file) {
                  return;
                }
                void readThemeImageFile(file)
                  .then((url) => {
                    setAppBackgroundImage(url);
                    setAppBackgroundVideo("");
                    const plugin = buildThemePluginDraft({
                      appBackgroundImage: url,
                      appBackgroundVideo: ""
                    });
                    if (plugin) {
                      onSave(plugin);
                    }
                  })
                  .catch((imageError) => {
                    setError(imageError instanceof Error ? imageError.message : String(imageError));
                  });
              }}
            />
            <TextField
              size="small"
              label={t("settings.theme.welcomeBackground")}
              value={welcomeBackgroundImage}
              onChange={(event) => setWelcomeBackgroundImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.welcomeBackground") }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t("settings.theme.composerBackground")}
              value={composerBackgroundImage}
              onChange={(event) => setComposerBackgroundImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.composerBackground") }}
            />
            <TextField
              size="small"
              label={t("settings.theme.historyBackground")}
              value={historyBackgroundImage}
              onChange={(event) => setHistoryBackgroundImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.historyBackground") }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t("settings.theme.legacyHeroImage")}
              value={heroImage}
              onChange={(event) => setHeroImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.legacyHeroImage") }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t("settings.theme.workbenchVideo")}
              value={appBackgroundVideo}
              onChange={(event) => setAppBackgroundVideo(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.workbenchVideo") }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => videoFileRef.current?.click()}
              aria-label={t("settings.theme.chooseVideo")}
              sx={{ flex: "0 0 auto" }}
            >
              {t("settings.theme.chooseVideo")}
            </Button>
            <input
              ref={videoFileRef}
              type="file"
              aria-label="Background video file"
              accept="video/mp4,video/webm"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                if (!file) {
                  return;
                }
                void readThemeVideoFile(file)
                  .then((url) => {
                    setAppBackgroundVideo(url);
                    setError(null);
                  })
                  .catch((videoError) => {
                    setError(videoError instanceof Error ? videoError.message : String(videoError));
                  });
              }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <TextField
              size="small"
              label={t("settings.theme.cornerImage")}
              value={cornerImage}
              onChange={(event) => setCornerImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.cornerImage") }}
            />
            <TextField
              size="small"
              label={t("settings.theme.petImage")}
              value={petImage}
              onChange={(event) => setPetImage(event.target.value)}
              sx={{ flex: 1 }}
              inputProps={{ "aria-label": t("settings.theme.petImage") }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>{t("settings.theme.decorations")}</InputLabel>
              <Select
                value={decorationIntensity}
                label={t("settings.theme.decorations")}
                inputProps={{ "aria-label": t("settings.theme.decorations") }}
                onChange={(event) => setDecorationIntensity(event.target.value as "none" | "subtle" | "rich")}
              >
                <MenuItem value="none">{t("settings.theme.none")}</MenuItem>
                <MenuItem value="subtle">{t("settings.theme.subtle")}</MenuItem>
                <MenuItem value="rich">{t("settings.theme.rich")}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={petEnabled} onChange={(event) => setPetEnabled(event.target.checked)} inputProps={{ "aria-label": t("settings.theme.showPet") }} />}
              label={t("settings.theme.showPet")}
            />
            <FormControlLabel
              control={<Switch checked={useBackgroundAsHero} onChange={(event) => setUseBackgroundAsHero(event.target.checked)} inputProps={{ "aria-label": t("settings.theme.useBackgroundAsHero") }} />}
              label={t("settings.theme.useBackgroundAsHero")}
            />
          </Stack>
          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper" }}>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("settings.theme.backgroundTuning")}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
                <ThemeNumberField label={t("settings.theme.backgroundMediaStrength")} value={backgroundLayerOpacity} onChange={setBackgroundLayerOpacity} min={0} max={100} />
                <ThemeNumberField label={t("settings.theme.backgroundOverlayOpacity")} value={backgroundOverlayOpacity} onChange={setBackgroundOverlayOpacity} min={0} max={100} />
                <ThemeNumberField label={t("settings.theme.effectsLayerOpacity")} value={effectsLayerOpacity} onChange={setEffectsLayerOpacity} min={0} max={100} />
                <ThemeNumberField label={t("settings.theme.workspaceSurfaceOpacity")} value={workspaceSurfaceOpacity} onChange={setWorkspaceSurfaceOpacity} min={0} max={100} />
                <ThemeNumberField label={t("settings.theme.heroOverlayOpacity")} value={heroOverlayOpacity} onChange={setHeroOverlayOpacity} min={0} max={100} />
                <ThemeNumberField label={t("settings.theme.panelOpacity")} value={panelSurfaceOpacity} onChange={setPanelSurfaceOpacity} min={0} max={100} />
                <ThemeNumberField label={t("settings.theme.glassBlur")} value={blurStrength} onChange={setBlurStrength} min={0} max={40} suffix="px" />
                <TextField size="small" label={t("settings.theme.toneColor")} value={toneColor} onChange={(event) => setToneColor(event.target.value)} inputProps={{ "aria-label": t("settings.theme.toneColor") }} />
                <ThemeNumberField label={t("settings.theme.toneOpacity")} value={toneOpacity} onChange={setToneOpacity} min={0} max={100} />
              </Box>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper" }}>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("settings.theme.dynamicBackground")}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <FormControl size="small" sx={{ minWidth: 190 }}>
                  <InputLabel>{t("settings.theme.dynamicBackground")}</InputLabel>
                  <Select
                    value={sceneRenderer}
                    label={t("settings.theme.dynamicBackground")}
                    inputProps={{ "aria-label": t("settings.theme.dynamicBackground") }}
                    onChange={(event) => setSceneRenderer(event.target.value as "none" | "canvas" | "three")}
                  >
                    <MenuItem value="none">{t("settings.theme.none")}</MenuItem>
                    <MenuItem value="canvas">{t("settings.theme.canvasLoop")}</MenuItem>
                    <MenuItem value="three">{t("settings.theme.threeLoop")}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }} disabled={sceneRenderer === "none"}>
                  <InputLabel>{t("settings.theme.scenePreset")}</InputLabel>
                  <Select
                    value={scenePreset}
                    label={t("settings.theme.scenePreset")}
                    inputProps={{ "aria-label": t("settings.theme.scenePreset") }}
                    onChange={(event) => setScenePreset(event.target.value as ThemeBackgroundScene["preset"])}
                  >
                    <MenuItem value="aurora">{t("settings.theme.aurora")}</MenuItem>
                    <MenuItem value="particles">{t("settings.theme.particles")}</MenuItem>
                    <MenuItem value="orbit">{t("settings.theme.orbit")}</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" label={t("settings.theme.sceneColor")} value={sceneColor} disabled={sceneRenderer === "none"} onChange={(event) => setSceneColor(event.target.value)} inputProps={{ "aria-label": t("settings.theme.sceneColor") }} />
                <TextField size="small" label={t("settings.theme.sceneSecondary")} value={sceneSecondaryColor} disabled={sceneRenderer === "none"} onChange={(event) => setSceneSecondaryColor(event.target.value)} inputProps={{ "aria-label": t("settings.theme.sceneSecondary") }} />
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
                <ThemeNumberField label={t("settings.theme.sceneSpeed")} value={sceneSpeed} onChange={setSceneSpeed} min={0.1} max={3} step={0.05} suffix="x" disabled={sceneRenderer === "none"} />
                <ThemeNumberField label={t("settings.theme.sceneDensity")} value={sceneDensity} onChange={setSceneDensity} min={10} max={100} disabled={sceneRenderer === "none"} />
                <ThemeNumberField label={t("settings.theme.sceneOpacity")} value={sceneOpacity} onChange={setSceneOpacity} min={0} max={100} disabled={sceneRenderer === "none"} />
              </Box>
            </Stack>
          </Paper>
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
              const plugin = buildThemePluginDraft();
              if (plugin) {
                onSave(plugin);
              }
            }}
            aria-label={editing ? t("settings.theme.saveChanges") : t("settings.theme.savePlugin")}
          >
            {editing ? t("settings.theme.saveChanges") : t("settings.theme.savePlugin")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportThemeDraft} aria-label={t("settings.theme.exportJson")}>
            {t("settings.theme.exportJson")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => void exportThemeZipDraft()} aria-label={t("settings.theme.exportZip")}>
            {t("settings.theme.exportZip")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} onClick={() => themeImportRef.current?.click()} aria-label={t("settings.theme.importTheme")}>
            {t("settings.theme.importTheme")}
          </Button>
          <input
            ref={themeImportRef}
            type="file"
            aria-label="Custom theme plugin JSON or ZIP file"
            accept="application/json,application/zip,.json,.zip"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              event.currentTarget.value = "";
              if (!file) {
                return;
              }
              void readThemePluginFile(file)
                .then((plugin) => {
                  loadThemeDraft(plugin);
                  onCancelEdit();
                })
                .catch((importError) => {
                  setError(importError instanceof Error ? importError.message : String(importError));
                });
            }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

function ThemeNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled = false
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <TextField
      size="small"
      type="number"
      label={suffix ? `${label} (${suffix})` : `${label} (%)`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(clampDecimal(Number(event.target.value), value, min, max))}
      inputProps={{ min, max, step, "aria-label": `Theme ${label.toLowerCase()}` }}
    />
  );
}

function isSafeThemeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /["'()\\]/.test(trimmed)) {
    return false;
  }
  return trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:image/");
}

function isSafeThemeVideoUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /["'()\\]/.test(trimmed)) {
    return false;
  }
  return trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:video/");
}

const MAX_THEME_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_THEME_VIDEO_BYTES = 6 * 1024 * 1024;
const MAX_THEME_JSON_BYTES = 16 * 1024 * 1024;
const MAX_THEME_ZIP_BYTES = 32 * 1024 * 1024;
const THEME_ZIP_MANIFEST = "theme.json";
const THEME_ASSET_FIELDS = [
  "appBackgroundImage",
  "appBackgroundVideo",
  "composerBackgroundImage",
  "welcomeBackgroundImage",
  "historyBackgroundImage",
  "heroImage",
  "cornerImage",
  "petImage"
] as const satisfies ReadonlyArray<keyof NonNullable<ThemePlugin["assets"]>>;

function readThemeImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Theme background must be an image file."));
  }
  if (file.size > MAX_THEME_IMAGE_BYTES) {
    return Promise.reject(new Error("Theme background image must be smaller than 6 MiB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      if (result.startsWith("data:image/")) {
        resolve(result);
      } else {
        reject(new Error("Theme background could not be converted to a data:image URL."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Theme background image could not be read."));
    reader.readAsDataURL(file);
  });
}

function readThemeVideoFile(file: File): Promise<string> {
  const supported = file.type === "video/mp4" || file.type === "video/webm" || /\.(mp4|webm)$/i.test(file.name);
  if (!supported) {
    return Promise.reject(new Error("Theme background video must be an MP4 or WebM file."));
  }
  if (file.size > MAX_THEME_VIDEO_BYTES) {
    return Promise.reject(new Error("Theme background video must be smaller than 6 MiB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      if (result.startsWith("data:video/")) {
        resolve(result);
      } else {
        reject(new Error("Theme background could not be converted to a data:video URL."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Theme background video could not be read."));
    reader.readAsDataURL(file);
  });
}

async function readThemePluginFile(file: File): Promise<ThemePlugin> {
  if (isThemeZipFile(file)) {
    return readThemePluginZipFile(file);
  }
  if (file.size > MAX_THEME_JSON_BYTES) {
    throw new Error("Theme plugin JSON must be smaller than 16 MiB.");
  }
  const parsed = JSON.parse(await file.text()) as unknown;
  return normalizeImportedThemePlugin(parsed);
}

async function createThemeZipBlob(plugin: ThemePlugin): Promise<Blob> {
  const { manifest, assets } = themePluginToZipManifest(plugin);
  const encoder = new TextEncoder();
  const entries: ZipEntryInput[] = [
    {
      path: THEME_ZIP_MANIFEST,
      data: encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`)
    },
    ...assets
  ];
  return new Blob([uint8ToArrayBuffer(createStoredZip(entries))], { type: "application/zip" });
}

function themePluginToZipManifest(plugin: ThemePlugin): { manifest: ThemePlugin; assets: ZipEntryInput[] } {
  const manifest = structuredClone(plugin) as ThemePlugin;
  const assets: ZipEntryInput[] = [];
  if (!manifest.assets) {
    return { manifest, assets };
  }
  const nextAssets: NonNullable<ThemePlugin["assets"]> = { ...manifest.assets };
  for (const field of THEME_ASSET_FIELDS) {
    const value = nextAssets[field];
    if (!value?.startsWith("data:")) {
      continue;
    }
    const dataUrl = parseThemeDataUrl(value);
    const fieldKind = field === "appBackgroundVideo" ? "video" : "image";
    if (fieldKind === "image" && !dataUrl.mime.startsWith("image/")) {
      throw new Error("Theme ZIP image assets must use data:image URLs.");
    }
    if (fieldKind === "video" && !dataUrl.mime.startsWith("video/")) {
      throw new Error("Theme ZIP video assets must use data:video URLs.");
    }
    const maxBytes = fieldKind === "video" ? MAX_THEME_VIDEO_BYTES : MAX_THEME_IMAGE_BYTES;
    if (dataUrl.data.byteLength > maxBytes) {
      throw new Error(fieldKind === "video" ? "Theme background video must be smaller than 6 MiB." : "Theme background image must be smaller than 6 MiB.");
    }
    const path = `assets/${field}.${extensionForMime(dataUrl.mime, fieldKind)}`;
    assets.push({ path, data: dataUrl.data });
    nextAssets[field] = path;
  }
  manifest.assets = removeEmptyThemeAssets(nextAssets);
  return { manifest, assets };
}

async function readThemePluginZipFile(file: File): Promise<ThemePlugin> {
  if (file.size > MAX_THEME_ZIP_BYTES) {
    throw new Error("Theme ZIP must be smaller than 32 MiB.");
  }
  const files = await readZipEntries(new Uint8Array(await file.arrayBuffer()));
  const manifestBytes = files.get(THEME_ZIP_MANIFEST);
  if (!manifestBytes) {
    throw new Error("Theme ZIP must contain theme.json at the archive root.");
  }
  if (manifestBytes.byteLength > MAX_THEME_JSON_BYTES) {
    throw new Error("Theme plugin JSON must be smaller than 16 MiB.");
  }
  const parsed = JSON.parse(new TextDecoder().decode(manifestBytes)) as unknown;
  return normalizeImportedThemePlugin(resolveThemeZipAssetPaths(parsed, files));
}

function resolveThemeZipAssetPaths(value: unknown, files: Map<string, Uint8Array>): unknown {
  if (!isPlainRecord(value)) {
    return value;
  }
  const rawAssets = isPlainRecord(value.assets) ? value.assets : {};
  const assets: Record<string, unknown> = { ...rawAssets };
  for (const field of THEME_ASSET_FIELDS) {
    const entry = rawAssets[field];
    if (typeof entry !== "string") {
      continue;
    }
    const path = normalizeZipPath(entry);
    if (!path || isExternalThemeAssetPath(path)) {
      continue;
    }
    const data = files.get(path);
    if (!data) {
      throw new Error(`Theme ZIP is missing asset ${path}.`);
    }
    const fieldKind = field === "appBackgroundVideo" ? "video" : "image";
    const maxBytes = fieldKind === "video" ? MAX_THEME_VIDEO_BYTES : MAX_THEME_IMAGE_BYTES;
    if (data.byteLength > maxBytes) {
      throw new Error(fieldKind === "video" ? "Theme background video must be smaller than 6 MiB." : "Theme background image must be smaller than 6 MiB.");
    }
    const mime = mimeForThemeAsset(path, fieldKind);
    assets[field] = `data:${mime};base64,${uint8ToBase64(data)}`;
  }
  return {
    ...value,
    assets
  };
}

type ZipEntryInput = {
  path: string;
  data: Uint8Array;
};

type ZipEntryRecord = ZipEntryInput & {
  crc: number;
  offset: number;
};

function isThemeZipFile(file: File): boolean {
  return file.type === "application/zip" || /\.zip$/i.test(file.name);
}

function isExternalThemeAssetPath(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:") || value.startsWith("data:");
}

function parseThemeDataUrl(value: string): { mime: string; data: Uint8Array } {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(value);
  if (!match) {
    throw new Error("Theme media data URL is invalid.");
  }
  const mime = match[1]?.toLowerCase();
  const payload = match[3];
  if (!mime || typeof payload !== "string") {
    throw new Error("Theme media data URL is invalid.");
  }
  if (match[2]) {
    const binary = atob(payload);
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      data[index] = binary.charCodeAt(index);
    }
    return { mime, data };
  }
  return { mime, data: new TextEncoder().encode(decodeURIComponent(payload)) };
}

function extensionForMime(mime: string, kind: "image" | "video"): string {
  switch (mime.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return kind === "video" ? "bin" : "img";
  }
}

function mimeForThemeAsset(path: string, kind: "image" | "video"): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (lower.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (lower.endsWith(".webm")) {
    return "video/webm";
  }
  return kind === "video" ? "video/mp4" : "image/png";
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < data.byteLength; offset += chunkSize) {
    const chunk = data.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function createStoredZip(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const records: ZipEntryRecord[] = [];
  let offset = 0;
  for (const entry of entries) {
    const path = normalizeZipPath(entry.path);
    if (!path) {
      throw new Error("Theme ZIP entry path is invalid.");
    }
    const nameBytes = encoder.encode(path);
    const crc = crc32(entry.data);
    const localHeader = new Uint8Array(30 + nameBytes.byteLength);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.byteLength, true);
    localView.setUint32(22, entry.data.byteLength, true);
    localView.setUint16(26, nameBytes.byteLength, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, entry.data);
    records.push({ path, data: entry.data, crc, offset });
    offset += localHeader.byteLength + entry.data.byteLength;
  }
  const centralOffset = offset;
  for (const record of records) {
    const nameBytes = encoder.encode(record.path);
    const header = new Uint8Array(46 + nameBytes.byteLength);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint32(16, record.crc, true);
    view.setUint32(20, record.data.byteLength, true);
    view.setUint32(24, record.data.byteLength, true);
    view.setUint16(28, nameBytes.byteLength, true);
    view.setUint32(42, record.offset, true);
    header.set(nameBytes, 46);
    centralParts.push(header);
    offset += header.byteLength;
  }
  const centralSize = offset - centralOffset;
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, records.length, true);
  endView.setUint16(10, records.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  return concatUint8Arrays([...localParts, ...centralParts, end]);
}

async function readZipEntries(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const endOffset = findZipEndOfCentralDirectory(view);
  if (endOffset < 0) {
    throw new Error("Theme ZIP could not be read.");
  }
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const files = new Map<string, Uint8Array>();
  let cursor = centralOffset;
  const decoder = new TextDecoder();
  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (cursor + 46 > data.byteLength || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("Theme ZIP central directory is invalid.");
    }
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    const path = normalizeZipPath(decoder.decode(data.subarray(nameStart, nameStart + fileNameLength)));
    cursor = nameStart + fileNameLength + extraLength + commentLength;
    if (!path || path.endsWith("/")) {
      continue;
    }
    if ((flags & 0x1) !== 0) {
      throw new Error("Encrypted theme ZIP files are not supported.");
    }
    if (localOffset + 30 > data.byteLength || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error("Theme ZIP local file header is invalid.");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const compressedStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressedEnd = compressedStart + compressedSize;
    if (compressedEnd > data.byteLength) {
      throw new Error("Theme ZIP asset data is truncated.");
    }
    const compressed = data.subarray(compressedStart, compressedEnd);
    const fileData = method === 0 ? compressed : await inflateZipEntry(method, compressed);
    files.set(path, fileData);
  }
  return files;
}

function findZipEndOfCentralDirectory(view: DataView): number {
  const minOffset = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}

async function inflateZipEntry(method: number, compressed: Uint8Array): Promise<Uint8Array> {
  if (method !== 8 || typeof DecompressionStream === "undefined") {
    throw new Error("Theme ZIP uses an unsupported compression method.");
  }
  const stream = new Blob([uint8ToArrayBuffer(compressed)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function normalizeZipPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!normalized || normalized.startsWith("/") || normalized.includes("../") || normalized === ".." || normalized.includes("\0")) {
    return null;
  }
  return normalized;
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function uint8ToArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

let crc32Table: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  const table = getCrc32Table();
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (table[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getCrc32Table(): Uint32Array {
  if (crc32Table) {
    return crc32Table;
  }
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crc32Table = table;
  return table;
}

function normalizeImportedThemePlugin(value: unknown): ThemePlugin {
  if (!isPlainRecord(value)) {
    throw new Error("Theme plugin JSON must be an object.");
  }
  const preview = isPlainRecord(value.preview) ? value.preview : null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const primary = typeof preview?.primary === "string" ? preview.primary.trim() : "";
  const secondary = typeof preview?.secondary === "string" ? preview.secondary.trim() : "";
  const background = typeof preview?.background === "string" ? preview.background.trim() : "";
  if (!name || !primary || !secondary || !background) {
    throw new Error("Theme plugin JSON requires name and preview colors.");
  }
  if (![primary, secondary, background].every(isHexColor)) {
    throw new Error("Imported theme preview colors must be hex colors.");
  }
  const rawAssets = isPlainRecord(value.assets) ? value.assets : {};
  const assets = removeEmptyThemeAssets({
    appBackgroundImage: typeof rawAssets.appBackgroundImage === "string" ? rawAssets.appBackgroundImage.trim() : "",
    appBackgroundVideo: typeof rawAssets.appBackgroundVideo === "string" ? rawAssets.appBackgroundVideo.trim() : "",
    composerBackgroundImage: typeof rawAssets.composerBackgroundImage === "string" ? rawAssets.composerBackgroundImage.trim() : "",
    welcomeBackgroundImage: typeof rawAssets.welcomeBackgroundImage === "string" ? rawAssets.welcomeBackgroundImage.trim() : "",
    historyBackgroundImage: typeof rawAssets.historyBackgroundImage === "string" ? rawAssets.historyBackgroundImage.trim() : "",
    heroImage: typeof rawAssets.heroImage === "string" ? rawAssets.heroImage.trim() : "",
    cornerImage: typeof rawAssets.cornerImage === "string" ? rawAssets.cornerImage.trim() : "",
    petImage: typeof rawAssets.petImage === "string" ? rawAssets.petImage.trim() : ""
  });
  if (assets?.appBackgroundImage && !isSafeThemeImageUrl(assets.appBackgroundImage)) {
    throw new Error("Imported theme background image must be http(s), blob, or data:image.");
  }
  if (assets?.appBackgroundVideo && !isSafeThemeVideoUrl(assets.appBackgroundVideo)) {
    throw new Error("Imported theme background video must be http(s), blob, or data:video.");
  }
  if ([assets?.composerBackgroundImage, assets?.welcomeBackgroundImage, assets?.historyBackgroundImage, assets?.heroImage, assets?.cornerImage, assets?.petImage].some((entry) => entry && !isSafeThemeImageUrl(entry))) {
    throw new Error("Imported theme image media must be http(s), blob, or data:image.");
  }
  const rawLayout = isPlainRecord(value.layout) ? value.layout : {};
  const decorationIntensity =
    rawLayout.decorationIntensity === "none" || rawLayout.decorationIntensity === "rich" || rawLayout.decorationIntensity === "subtle"
      ? rawLayout.decorationIntensity
      : "subtle";
  const backgroundScene = normalizeThemeBackgroundScene(rawLayout.backgroundScene, primary, secondary);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return {
    id: `user-${slug || "theme"}-import` as ThemeId,
    name,
    description: description || "Imported user theme plugin.",
    source: "user-defined",
    installedByDefault: false,
    preview: { primary, secondary, background },
    dark: Boolean(value.dark),
    assets,
    layout: {
      heroEnabled: rawLayout.heroEnabled !== false,
      petEnabled: rawLayout.petEnabled !== false,
      decorationIntensity,
      backgroundLayerOpacity: clampUnitNumber(rawLayout.backgroundLayerOpacity, REFERENCE_BACKGROUND_TUNING.backgroundLayerOpacity),
      backgroundOverlayOpacity: clampUnitNumber(rawLayout.backgroundOverlayOpacity, REFERENCE_BACKGROUND_TUNING.backgroundOverlayOpacity),
      effectsLayerOpacity: clampUnitNumber(rawLayout.effectsLayerOpacity, REFERENCE_BACKGROUND_TUNING.effectsLayerOpacity),
      workspaceSurfaceOpacity: clampUnitNumber(rawLayout.workspaceSurfaceOpacity, REFERENCE_BACKGROUND_TUNING.workspaceSurfaceOpacity),
      heroOverlayOpacity: clampUnitNumber(rawLayout.heroOverlayOpacity, REFERENCE_BACKGROUND_TUNING.heroOverlayOpacity),
      panelSurfaceOpacity: clampUnitNumber(rawLayout.panelSurfaceOpacity, REFERENCE_BACKGROUND_TUNING.panelSurfaceOpacity),
      blurStrength: clampThemeBlur(readNumber(rawLayout.blurStrength), REFERENCE_BACKGROUND_TUNING.blurStrength),
      toneColor: typeof rawLayout.toneColor === "string" && isHexColor(rawLayout.toneColor) ? rawLayout.toneColor : primary,
      toneOpacity: clampUnitNumber(rawLayout.toneOpacity, REFERENCE_BACKGROUND_TUNING.toneOpacity),
      backgroundScene
    }
  };
}

function normalizeThemeBackgroundScene(value: unknown, fallbackColor: string, fallbackSecondaryColor: string): ThemeBackgroundScene | undefined {
  if (!isPlainRecord(value)) {
    return undefined;
  }
  const renderer = value.renderer === "canvas" || value.renderer === "three" ? value.renderer : null;
  const preset = value.preset === "aurora" || value.preset === "particles" || value.preset === "orbit" ? value.preset : null;
  if (!renderer || !preset) {
    return undefined;
  }
  const color = typeof value.color === "string" && isHexColor(value.color) ? value.color : fallbackColor;
  const secondaryColor = typeof value.secondaryColor === "string" && isHexColor(value.secondaryColor) ? value.secondaryColor : fallbackSecondaryColor;
  return {
    renderer,
    preset,
    color,
    secondaryColor,
    speed: clampDecimal(readNumber(value.speed), 0.65, 0.1, 3),
    density: clampUnitNumber(value.density, 0.55),
    opacity: clampUnitNumber(value.opacity, 0.54)
  };
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function clampUnitNumber(value: unknown, fallback: number): number {
  return clampDecimal(readNumber(value), fallback, 0, 1);
}

function clampDecimal(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numberValue));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function removeEmptyThemeAssets(assets: NonNullable<ThemePlugin["assets"]>): ThemePlugin["assets"] | undefined {
  const entries = Object.entries(assets).filter(([, value]) => typeof value === "string" && value.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function SettingAssistantSetupBanner({
  providers,
  ready,
  provider,
  model,
  t,
  onOpenAssistant,
  onOpenSession,
  onOpenRelay,
  onOpenOfficialLogin
}: {
  providers: ProviderConfig[];
  ready: boolean;
  provider: ProviderConfig | null;
  model: string;
  t: TranslateFn;
  onOpenAssistant: () => void;
  onOpenSession: () => void;
  onOpenRelay: () => void;
  onOpenOfficialLogin: () => void;
}) {
  const hasProviders = providers.length > 0;
  return (
    <Paper variant="outlined" sx={{ mb: 1.5, p: 1.25, borderRadius: 2, bgcolor: ready ? "background.paper" : "background.default" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
            <SettingsSuggestIcon color={ready ? "success" : "warning"} fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
              {t("settings.assistant.title")}
            </Typography>
            <Chip size="small" color={ready ? "success" : "warning"} label={ready ? t("settings.assistant.ready") : t("settings.assistant.needsSetup")} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {ready
              ? t("settings.assistant.readyDescription", { provider: provider?.name ?? "-", model: model || "-" })
              : hasProviders
              ? t("settings.assistant.chooseModelDescription")
              : t("settings.assistant.noProviderDescription")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant={ready ? "contained" : "outlined"} startIcon={<AutoAwesomeIcon />} onClick={onOpenAssistant}>
            {t("settings.assistant.open")}
          </Button>
          <Button size="small" variant={ready ? "outlined" : "contained"} startIcon={<TuneIcon />} onClick={onOpenSession}>
            {t("settings.assistant.configureModel")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<MemoryIcon />} onClick={onOpenRelay}>
            {t("settings.assistant.setupRelay")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<HubIcon />} onClick={onOpenOfficialLogin}>
            {t("settings.assistant.loginOfficial")}
          </Button>
        </Stack>
      </Stack>
    </Paper>
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

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
