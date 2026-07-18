import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ExtensionIcon from "@mui/icons-material/Extension";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import type { JsonValue } from "@codex-ui/shared";
import type {
  HookGroup,
  McpResourceContentEntry,
  PluginAppEntry,
  PluginDetailEntry,
  PluginEntry,
  PluginInstallAuthNotice,
  PluginMarketplace,
  ToolingState
} from "../state/codexClient";

export type CodexPluginSettingsTab = "marketplace" | "installed" | "mcp" | "hooks" | "apps";

type Props = {
  activeThreadId: string | null;
  tooling: ToolingState;
  toolingLoading: boolean;
  initialTab?: CodexPluginSettingsTab;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  pluginAuthNotices: Record<string, PluginInstallAuthNotice>;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  onReloadTooling: () => void;
  onReloadMcp: () => void;
  onStartMcpOauth: (serverName: string) => void;
  onReadMcpResource: (serverName: string, uri: string) => void;
  onCallMcpTool: (serverName: string, toolName: string, args: JsonValue) => Promise<JsonValue>;
  onReadPluginDetail: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onReadPluginSkill: (marketplace: PluginMarketplace, plugin: PluginEntry, skillName: string) => void;
  onInsertPluginMention: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onInstallPlugin: (marketplace: PluginMarketplace, plugin: PluginEntry) => void;
  onUninstallPlugin: (plugin: PluginEntry) => void;
};

export function CodexPluginSettingsPanel({
  activeThreadId,
  tooling,
  toolingLoading,
  initialTab = "marketplace",
  pluginDetails,
  pluginSkillPreviews,
  pluginAuthNotices,
  mcpResourceContents,
  mcpOauthUrls,
  onReloadTooling,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onCallMcpTool,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
}: Props) {
  const [tab, setTab] = useState<CodexPluginSettingsTab>(initialTab);
  const pluginCount = tooling.pluginMarketplaces.reduce((count, marketplace) => count + marketplace.plugins.length, 0);
  const installedPlugins = useMemo(() => installedPluginEntries(tooling), [tooling]);
  const authAppCount = tooling.apps.filter((app) => app.isAccessible === false || app.installUrl).length;
  const hookCount = tooling.hookGroups.reduce((count, group) => count + group.hooks.length, 0);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 850 }}>
            Codex plugin settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Codex plugins, hooks, plugin apps, and MCP servers discovered by the local Codex engine.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<RefreshIcon />} onClick={onReloadTooling}>
            Refresh
          </Button>
          {toolingLoading && <CircularProgress size={18} />}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`${installedPlugins.length} installed`} color={installedPlugins.length ? "success" : "default"} />
        <Chip size="small" label={`${pluginCount} available`} variant="outlined" />
        <Chip size="small" label={`${tooling.mcpServers.length} MCP servers`} variant="outlined" />
        <Chip size="small" label={`${hookCount} hooks`} variant="outlined" />
        <Chip size="small" label={`${authAppCount} app auth`} color={authAppCount ? "warning" : "default"} variant="outlined" />
      </Stack>

      {tooling.marketplaceErrors.map((message) => (
        <Alert key={message} severity="warning">
          {message}
        </Alert>
      ))}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Codex plugin settings tabs"
          sx={{ px: 1, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab value="marketplace" label={`Marketplace ${pluginCount}`} />
          <Tab value="installed" label={`Installed ${installedPlugins.length}`} />
          <Tab value="mcp" label={`MCP ${tooling.mcpServers.length}`} />
          <Tab value="hooks" label={`Hooks ${hookCount}`} />
          <Tab value="apps" label={`Apps ${tooling.apps.length}`} />
        </Tabs>
        <Box sx={{ p: { xs: 1.25, sm: 1.5 } }}>
          {tab === "marketplace" && (
            <PluginMarketplaceSettings
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
          {tab === "installed" && (
            <InstalledPluginSettings
              installedPlugins={installedPlugins}
              pluginDetails={pluginDetails}
              pluginSkillPreviews={pluginSkillPreviews}
              onReadPluginDetail={onReadPluginDetail}
              onReadPluginSkill={onReadPluginSkill}
              onInsertPluginMention={onInsertPluginMention}
              onUninstallPlugin={onUninstallPlugin}
            />
          )}
          {tab === "mcp" && (
            <McpSettings
              activeThreadId={activeThreadId}
              tooling={tooling}
              mcpResourceContents={mcpResourceContents}
              mcpOauthUrls={mcpOauthUrls}
              onReloadMcp={onReloadMcp}
              onStartMcpOauth={onStartMcpOauth}
              onReadMcpResource={onReadMcpResource}
              onCallMcpTool={onCallMcpTool}
            />
          )}
          {tab === "hooks" && <HooksSettings hookGroups={tooling.hookGroups} />}
          {tab === "apps" && <PluginAppsSettings apps={tooling.apps} />}
        </Box>
      </Paper>
    </Stack>
  );
}

function PluginMarketplaceSettings({
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
  const [search, setSearch] = useState("");
  const filteredMarketplaces = useMemo(() => filterMarketplaces(tooling.pluginMarketplaces, search), [tooling.pluginMarketplaces, search]);

  return (
    <Stack spacing={1.25}>
      <TextField
        size="small"
        label="Search Codex plugins"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, color: "text.secondary" }} /> }}
      />
      {filteredMarketplaces.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          No Codex plugins match the current inventory and search.
        </Typography>
      )}
      {filteredMarketplaces.map((marketplace) => (
        <Paper key={marketplaceKey(marketplace)} variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
          <MarketplaceHeader marketplace={marketplace} />
          <Stack spacing={1} sx={{ mt: 1 }}>
            {marketplace.plugins.length === 0 && <Typography color="text.secondary">No plugins in this marketplace.</Typography>}
            {marketplace.plugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                marketplace={marketplace}
                plugin={plugin}
                featured={tooling.featuredPluginIds.includes(plugin.id)}
                detail={pluginDetails[plugin.id]}
                authNotice={pluginAuthNotices[plugin.id]}
                skillPreviewByKey={pluginSkillPreviews}
                onReadPluginDetail={onReadPluginDetail}
                onReadPluginSkill={onReadPluginSkill}
                onInsertPluginMention={onInsertPluginMention}
                onInstallPlugin={onInstallPlugin}
                onUninstallPlugin={onUninstallPlugin}
              />
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function InstalledPluginSettings({
  installedPlugins,
  pluginDetails,
  pluginSkillPreviews,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onUninstallPlugin
}: {
  installedPlugins: Array<{ key: string; marketplace: PluginMarketplace; plugin: PluginEntry }>;
  pluginDetails: Record<string, PluginDetailEntry>;
  pluginSkillPreviews: Record<string, string>;
  onReadPluginDetail: Props["onReadPluginDetail"];
  onReadPluginSkill: Props["onReadPluginSkill"];
  onInsertPluginMention: Props["onInsertPluginMention"];
  onUninstallPlugin: Props["onUninstallPlugin"];
}) {
  const [selectedMentionKey, setSelectedMentionKey] = useState("");
  const selectedMention = installedPlugins.find((entry) => entry.key === selectedMentionKey) ?? installedPlugins[0];

  return (
    <Stack spacing={1.25}>
      <Paper variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Composer plugin mentions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Insert an installed and enabled Codex plugin mention into the main composer.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
            <InputLabel>Installed plugin</InputLabel>
            <Select
              value={selectedMention?.key ?? ""}
              label="Installed plugin"
              onChange={(event) => setSelectedMentionKey(event.target.value)}
              disabled={installedPlugins.length === 0}
            >
              {installedPlugins.map((entry) => (
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
      </Paper>
      {installedPlugins.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          No installed Codex plugins are enabled for this workspace.
        </Typography>
      )}
      {installedPlugins.map((entry) => (
        <PluginCard
          key={entry.key}
          marketplace={entry.marketplace}
          plugin={entry.plugin}
          featured={false}
          detail={pluginDetails[entry.plugin.id]}
          skillPreviewByKey={pluginSkillPreviews}
          onReadPluginDetail={onReadPluginDetail}
          onReadPluginSkill={onReadPluginSkill}
          onInsertPluginMention={onInsertPluginMention}
          onInstallPlugin={() => undefined}
          onUninstallPlugin={onUninstallPlugin}
        />
      ))}
    </Stack>
  );
}

function PluginCard({
  marketplace,
  plugin,
  featured,
  detail,
  authNotice,
  skillPreviewByKey,
  onReadPluginDetail,
  onReadPluginSkill,
  onInsertPluginMention,
  onInstallPlugin,
  onUninstallPlugin
}: {
  marketplace: PluginMarketplace;
  plugin: PluginEntry;
  featured: boolean;
  detail?: PluginDetailEntry;
  authNotice?: PluginInstallAuthNotice;
  skillPreviewByKey: Record<string, string>;
  onReadPluginDetail: Props["onReadPluginDetail"];
  onReadPluginSkill: Props["onReadPluginSkill"];
  onInsertPluginMention: Props["onInsertPluginMention"];
  onInstallPlugin: Props["onInstallPlugin"];
  onUninstallPlugin: Props["onUninstallPlugin"];
}) {
  const unavailable = plugin.availability !== "AVAILABLE";

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "flex-start" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
          <PluginLogo plugin={plugin} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
              {plugin.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
              {plugin.description || plugin.source}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, overflowWrap: "anywhere" }}>
              {[marketplace.displayName ?? marketplace.name, plugin.developerName].filter(Boolean).join(" / ")}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
          {plugin.installed ? (
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onUninstallPlugin(plugin)}>
              Uninstall
            </Button>
          ) : (
            <Button size="small" variant="contained" startIcon={<DownloadIcon />} disabled={unavailable} onClick={() => onInstallPlugin(marketplace, plugin)}>
              Install
            </Button>
          )}
          <Button size="small" onClick={() => onReadPluginDetail(marketplace, plugin)}>
            Details
          </Button>
          <Button size="small" disabled={!plugin.installed || !plugin.enabled} onClick={() => onInsertPluginMention(marketplace, plugin)}>
            Mention
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        <Chip size="small" label={plugin.installed ? "installed" : "available"} color={plugin.installed ? "success" : "default"} />
        {plugin.installed && <Chip size="small" label={plugin.enabled ? "enabled" : "disabled"} />}
        {featured && <Chip size="small" label="featured" color="primary" />}
        {unavailable && <Chip size="small" label={plugin.availability} color="warning" />}
        <Chip size="small" label={`auth ${plugin.authPolicy}`} variant="outlined" />
        <Chip size="small" label={`install ${plugin.installPolicy}`} variant="outlined" />
        {plugin.installPolicySource && <Chip size="small" label={plugin.installPolicySource} variant="outlined" />}
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
          {plugin.capabilities.slice(0, 6).map((capability) => (
            <Chip key={capability} size="small" variant="outlined" label={capability} />
          ))}
        </Stack>
      )}

      {plugin.websiteUrl && (
        <Button size="small" href={plugin.websiteUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />} sx={{ mt: 1 }}>
          Website
        </Button>
      )}

      {authNotice && authNotice.apps.length > 0 && (
        <Box sx={{ mt: 1, borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
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
        <PluginDetailView
          marketplace={marketplace}
          plugin={plugin}
          detail={detail}
          skillPreviewByKey={skillPreviewByKey}
          onReadPluginSkill={onReadPluginSkill}
        />
      )}
    </Box>
  );
}

function PluginDetailView({
  marketplace,
  plugin,
  detail,
  skillPreviewByKey,
  onReadPluginSkill
}: {
  marketplace: PluginMarketplace;
  plugin: PluginEntry;
  detail: PluginDetailEntry;
  skillPreviewByKey: Record<string, string>;
  onReadPluginSkill: Props["onReadPluginSkill"];
}) {
  return (
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
      {detail.shareUrl && (
        <Button size="small" href={detail.shareUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />} sx={{ mt: 1 }}>
          Share
        </Button>
      )}
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
              <Typography variant="caption" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
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
                {skillPreviewByKey[previewKey] && (
                  <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere", mt: 0.75, maxHeight: 180, overflow: "auto" }}>
                    {skillPreviewByKey[previewKey]}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

function McpSettings({
  activeThreadId,
  tooling,
  mcpResourceContents,
  mcpOauthUrls,
  onReloadMcp,
  onStartMcpOauth,
  onReadMcpResource,
  onCallMcpTool
}: {
  activeThreadId: string | null;
  tooling: ToolingState;
  mcpResourceContents: Record<string, McpResourceContentEntry[]>;
  mcpOauthUrls: Record<string, string>;
  onReloadMcp: Props["onReloadMcp"];
  onStartMcpOauth: Props["onStartMcpOauth"];
  onReadMcpResource: Props["onReadMcpResource"];
  onCallMcpTool: Props["onCallMcpTool"];
}) {
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [toolResults, setToolResults] = useState<Record<string, string>>({});
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({});
  const [callingTool, setCallingTool] = useState<string | null>(null);

  const submitToolCall = async (serverName: string, toolName: string, rawArgs: string): Promise<void> => {
    const key = toolCallKey(serverName, toolName);
    if (!activeThreadId) {
      setToolErrors((current) => ({ ...current, [key]: "Select a conversation before calling an MCP tool." }));
      return;
    }
    setCallingTool(key);
    setToolErrors((current) => ({ ...current, [key]: "" }));
    try {
      const result = await onCallMcpTool(serverName, toolName, parseToolArguments(rawArgs));
      setToolResults((current) => ({ ...current, [key]: prettyJson(result) }));
    } catch (error) {
      setToolErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : String(error) }));
    } finally {
      setCallingTool(null);
    }
  };

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            MCP servers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Servers are resolved from Codex config and enabled plugin selections.
          </Typography>
        </Box>
        <Button size="small" startIcon={<RefreshIcon />} onClick={onReloadMcp}>
          Reload MCP
        </Button>
      </Stack>
      {!activeThreadId && <Alert severity="info">Select a conversation to enable direct MCP tool calls.</Alert>}
      {tooling.mcpServers.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          No MCP servers are currently configured or contributed by enabled plugins.
        </Typography>
      )}
      {tooling.mcpServers.map((server) => {
        const authUrl = mcpOauthUrls[server.name];
        return (
          <Paper key={server.name} variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                  {server.name}
                </Typography>
                {server.serverInfo && (
                  <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                    {server.serverInfo}
                  </Typography>
                )}
              </Box>
              <Chip size="small" label={server.authStatus} color={server.authStatus === "notLoggedIn" ? "warning" : "default"} />
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip size="small" label={`tools ${server.tools.length}`} />
              <Chip size="small" label={`resources ${server.resources.length}`} />
              <Chip size="small" label={`templates ${server.resourceTemplates.length}`} />
            </Stack>
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
            {server.tools.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {server.tools.slice(0, 8).map((tool) => {
                  const key = toolCallKey(server.name, tool.name);
                  const value = toolArgs[key] ?? parseToolArgumentsPreview(tool.inputSchema);
                  const disabled = !activeThreadId || callingTool === key;
                  return (
                    <Box key={tool.name} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
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
                      <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, m: 0, mt: 0.75, maxHeight: 120, overflow: "auto" }}>
                        {prettyJson(tool.inputSchema)}
                      </Typography>
                      <TextField
                        size="small"
                        label="Arguments JSON"
                        multiline
                        minRows={3}
                        fullWidth
                        sx={{ mt: 1 }}
                        value={value}
                        onChange={(event) => setToolArgs((current) => ({ ...current, [key]: event.target.value }))}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} disabled={disabled} onClick={() => void submitToolCall(server.name, tool.name, value)}>
                          Call tool
                        </Button>
                        <Chip size="small" label={disabled ? "select conversation" : "ready"} color={disabled ? "warning" : "success"} />
                      </Stack>
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
            {server.resources.length > 0 && (
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {server.resources.slice(0, 6).map((resource) => {
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

function HooksSettings({ hookGroups }: { hookGroups: HookGroup[] }) {
  const hookCount = hookGroups.reduce((count, group) => count + group.hooks.length, 0);

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Codex hooks
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Hooks are resolved from Codex config and installed plugin contributions for the current workspace.
          </Typography>
        </Box>
        <Chip size="small" label={`${hookCount} hooks`} />
      </Stack>
      {hookCount === 0 && (
        <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          No Codex hooks are currently returned by the local engine for this workspace.
        </Typography>
      )}
      {hookGroups.map((group) => (
        <Paper key={group.cwd} variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                {group.cwd}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {group.hooks.length} hooks / {group.warnings.length} warnings / {group.errors.length} errors
              </Typography>
            </Box>
            <Chip size="small" label={group.hooks.length} color={group.hooks.length ? "primary" : "default"} />
          </Stack>

          {group.warnings.map((warning) => (
            <Alert key={warning} severity="warning" sx={{ mt: 1 }}>
              {warning}
            </Alert>
          ))}
          {group.errors.map((error) => (
            <Alert key={`${error.path}:${error.message}`} severity="error" sx={{ mt: 1 }}>
              {[error.path, error.message].filter(Boolean).join(": ")}
            </Alert>
          ))}

          {group.hooks.map((hook) => (
            <Box key={hook.key} sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1, mt: 1 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                    {hook.eventName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                    {hook.key}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                  <Chip size="small" label={hook.enabled ? "enabled" : "disabled"} color={hook.enabled ? "success" : "default"} />
                  <Chip
                    size="small"
                    label={hook.trustStatus}
                    color={hook.trustStatus === "trusted" ? "success" : hook.trustStatus === "untrusted" ? "warning" : "default"}
                    variant="outlined"
                  />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip size="small" label={hook.handlerType} />
                <Chip size="small" label={hook.isManaged ? "managed" : "user"} variant="outlined" />
                <Chip size="small" label={`source ${hook.source}`} variant="outlined" />
                {hook.matcher && <Chip size="small" label={`matcher ${hook.matcher}`} variant="outlined" />}
                {hook.timeoutSec != null && <Chip size="small" label={`timeout ${hook.timeoutSec}s`} variant="outlined" />}
                {hook.pluginId && <Chip size="small" label={`plugin ${hook.pluginId}`} variant="outlined" />}
              </Stack>

              {hook.statusMessage && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, overflowWrap: "anywhere" }}>
                  {hook.statusMessage}
                </Typography>
              )}
              {hook.command && (
                <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, m: 0, mt: 0.75, maxHeight: 140, overflow: "auto" }}>
                  {hook.command}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, overflowWrap: "anywhere" }}>
                {hook.sourcePath}
              </Typography>
              {hook.currentHash && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                  {hook.currentHash}
                </Typography>
              )}
            </Box>
          ))}
        </Paper>
      ))}
    </Stack>
  );
}

function PluginAppsSettings({ apps }: { apps: PluginAppEntry[] }) {
  return (
    <Stack spacing={1.25}>
      {apps.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
          No plugin apps are currently exposed by installed Codex plugins.
        </Typography>
      )}
      {apps.map((app) => (
        <Paper key={app.id} variant="outlined" sx={{ p: 1.25, bgcolor: "background.default" }}>
          <AppSummaryRow app={app} />
        </Paper>
      ))}
    </Stack>
  );
}

function MarketplaceHeader({ marketplace }: { marketplace: PluginMarketplace }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
          {marketplace.displayName ?? marketplace.name}
        </Typography>
        {marketplace.path && (
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {marketplace.path}
          </Typography>
        )}
      </Box>
      <Chip size="small" label={`${marketplace.plugins.length} plugins`} />
    </Stack>
  );
}

function PluginLogo({ plugin }: { plugin: PluginEntry }) {
  if (plugin.logoUrl) {
    return (
      <Box
        component="img"
        src={plugin.logoUrl}
        alt=""
        sx={{ width: 36, height: 36, objectFit: "cover", borderRadius: 1, bgcolor: "action.selected", flex: "0 0 auto" }}
      />
    );
  }
  return (
    <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: "action.selected", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
      <ExtensionIcon fontSize="small" color="primary" />
    </Box>
  );
}

function AppSummaryRow({ app }: { app: PluginAppEntry }) {
  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.75 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
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

function installedPluginEntries(tooling: ToolingState): Array<{ key: string; marketplace: PluginMarketplace; plugin: PluginEntry }> {
  const entries: Array<{ key: string; marketplace: PluginMarketplace; plugin: PluginEntry }> = [];
  const seen = new Set<string>();
  const sourceMarketplaces = tooling.installedPluginMarketplaces.length > 0 ? tooling.installedPluginMarketplaces : tooling.pluginMarketplaces;
  for (const marketplace of sourceMarketplaces) {
    for (const plugin of marketplace.plugins) {
      if (!plugin.installed || !plugin.enabled || seen.has(plugin.id)) {
        continue;
      }
      seen.add(plugin.id);
      entries.push({ key: `${marketplaceKey(marketplace)}:${plugin.id}`, marketplace, plugin });
    }
  }
  return entries;
}

function filterMarketplaces(marketplaces: PluginMarketplace[], search: string): PluginMarketplace[] {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return marketplaces;
  }
  return marketplaces
    .map((marketplace) => ({
      ...marketplace,
      plugins: marketplace.plugins.filter((plugin) =>
        [
          plugin.name,
          plugin.displayName,
          plugin.description,
          plugin.category,
          plugin.developerName,
          plugin.source,
          ...plugin.capabilities,
          ...plugin.keywords
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      )
    }))
    .filter((marketplace) => marketplace.plugins.length > 0);
}

function marketplaceKey(marketplace: PluginMarketplace): string {
  return `${marketplace.name}:${marketplace.path ?? "remote"}`;
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
