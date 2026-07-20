import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { alpha } from "@mui/material/styles";
import type { ThreadEntry } from "../state/codexClient";
import {
  fetchEngineHistory,
  fetchEngineTranscript,
  type EngineHistoryItem,
  type EngineId,
  type EngineMeta,
  type EngineTranscript
} from "../state/codexClient";
import type { TranslateFn } from "../i18n";

export type HistoryThreadUsageSummary = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  estimatedCostUsd?: number;
};

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  providerLabel: string;
  threadUsage?: Record<string, HistoryThreadUsageSummary>;
  searchTerm: string;
  loading?: boolean;
  installAvailable?: boolean;
  backgroundImage?: string;
  /** Session token for host multi-engine history scanners */
  sessionToken?: string | null;
  t: TranslateFn;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSelect: (threadId: string) => void;
  onRename: (threadId: string, name: string) => void | Promise<void>;
  onArchive: (threadId: string) => void | Promise<void>;
  onDelete: (threadId: string) => void | Promise<void>;
  onInstallApp?: () => void;
  onOpenSettings: () => void;
};

type EngineTab = "all" | EngineId;

export function HistorySidebar({
  threads,
  activeThreadId,
  providerLabel,
  threadUsage = {},
  searchTerm,
  loading = false,
  installAvailable = false,
  backgroundImage,
  sessionToken = null,
  t,
  onSearchChange,
  onRefresh,
  onSelect,
  onRename,
  onArchive,
  onDelete,
  onInstallApp,
  onOpenSettings
}: Props) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);
  const [engineTab, setEngineTab] = useState<EngineTab>("all");
  const [engines, setEngines] = useState<EngineMeta[]>([]);
  const [engineItems, setEngineItems] = useState<EngineHistoryItem[]>([]);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<EngineTranscript | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const loadEngineHistory = useCallback(async () => {
    if (!sessionToken) {
      setEngineItems([]);
      return;
    }
    setEngineLoading(true);
    setEngineError(null);
    try {
      const engine = engineTab === "all" || engineTab === "codex" ? "all" : engineTab;
      const data = await fetchEngineHistory(sessionToken, {
        engine,
        q: searchTerm.trim() || undefined,
        limit: 250
      });
      setEngines(data.engines);
      setEngineItems(data.items);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    } finally {
      setEngineLoading(false);
    }
  }, [sessionToken, engineTab, searchTerm]);

  useEffect(() => {
    void loadEngineHistory();
  }, [loadEngineHistory]);

  const engineMetaById = useMemo(() => {
    const map = new Map<string, EngineMeta>();
    for (const e of engines) map.set(e.id, e);
    return map;
  }, [engines]);

  const filteredEngineItems = useMemo(() => {
    if (engineTab === "codex") return [] as EngineHistoryItem[];
    if (engineTab === "all") return engineItems.filter((i) => i.engine !== "codex");
    return engineItems.filter((i) => i.engine === engineTab);
  }, [engineItems, engineTab]);

  const showCodexThreads = engineTab === "all" || engineTab === "codex";

  const openEngineItem = async (item: EngineHistoryItem) => {
    if (!sessionToken) return;
    if (item.engine === "codex" && item.canResume) {
      onSelect(item.id);
      return;
    }
    setTranscriptLoading(true);
    setTranscriptError(null);
    setTranscript(null);
    try {
      const data = await fetchEngineTranscript(sessionToken, item.engine, item.id);
      setTranscript(data);
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : String(err));
      setTranscript({
        engine: item.engine,
        id: item.id,
        title: item.title,
        messages: item.preview ? [{ role: "other", text: item.preview }] : [],
        sourcePath: item.sourcePath
      });
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleRefreshAll = () => {
    onRefresh();
    void loadEngineHistory();
  };

  const beginRename = (thread: ThreadEntry) => {
    setEditingThreadId(thread.id);
    setRenameDraft(threadTitle(thread));
  };

  const saveRename = async (threadId: string) => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      return;
    }
    setBusyThreadId(threadId);
    try {
      await onRename(threadId, nextName);
      setEditingThreadId(null);
      setRenameDraft("");
    } catch {
      // App owns the visible error surface.
    } finally {
      setBusyThreadId(null);
    }
  };

  const archiveThread = async (threadId: string) => {
    setBusyThreadId(threadId);
    try {
      await onArchive(threadId);
    } catch {
      // App owns the visible error surface.
    } finally {
      setBusyThreadId(null);
    }
  };

  const deleteThread = async (thread: ThreadEntry) => {
    if (!window.confirm(t("history.deleteConfirm", { title: threadTitle(thread) }))) {
      return;
    }
    setBusyThreadId(thread.id);
    try {
      await onDelete(thread.id);
    } catch {
      // App owns the visible error surface.
    } finally {
      setBusyThreadId(null);
    }
  };

  return (
    <Box
      data-testid="history-sidebar"
      sx={{
        borderRight: "1px solid",
        borderColor: "divider",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.46 : 0.36),
        backgroundImage: backgroundImage
          ? (theme) =>
              [
                `linear-gradient(${alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.68 : 0.72)}, ${alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.68 : 0.72)})`,
                `url("${backgroundImage}")`
              ].join(", ")
          : undefined,
        backgroundSize: backgroundImage ? "cover" : undefined,
        backgroundPosition: backgroundImage ? "center" : undefined
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 800 }}>
          {t("history.conversations")}
        </Typography>
        <Button size="small" onClick={handleRefreshAll} disabled={loading || engineLoading}>
          {loading || engineLoading ? t("history.loading") : t("history.refresh")}
        </Button>
      </Stack>
      <Divider />
      <Box sx={{ px: 0.5, pt: 0.5 }}>
        <Tabs
          value={engineTab}
          onChange={(_, v) => setEngineTab(v as EngineTab)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 36,
            "& .MuiTab-root": { minHeight: 36, minWidth: 52, px: 1, py: 0.5, fontSize: 11, fontWeight: 800, textTransform: "none" }
          }}
        >
          <Tab value="all" label={t("history.engineTabAll")} id="history-tab-all" />
          {(engines.length
            ? engines
            : ([
                { id: "codex", label: "Codex", mark: "Cx", color: "#14b8a6", launchId: "code-launch" },
                { id: "claude", label: "Claude", mark: "Cl", color: "#f59e0b", launchId: "claude-launch" },
                { id: "agy", label: "AGY", mark: "Ag", color: "#8b5cf6", launchId: "agy-launch" },
                { id: "gemini", label: "Gemini", mark: "Gm", color: "#3b82f6", launchId: "gemini-launch" },
                { id: "crush", label: "Crush", mark: "Cr", color: "#ec4899", launchId: "crush-launch" },
                { id: "auggie", label: "Auggie", mark: "Au", color: "#06b6d4", launchId: "auggie-launch" },
                { id: "grok", label: "Grok", mark: "X", color: "#64748b", launchId: "grok-launch" },
                { id: "freebuff", label: "Freebuff", mark: "Fb", color: "#22c55e", launchId: "freebuff-launch" },
                { id: "coderabbit", label: "CodeRabbit", mark: "Rb", color: "#f97316", launchId: "coderabbit-launch" }
              ] as EngineMeta[])
          ).map((eng) => (
            <Tab
              key={eng.id}
              value={eng.id}
              id={`history-tab-${eng.id}`}
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: 0.75,
                      bgcolor: eng.color,
                      color: "#fff",
                      fontSize: 8,
                      fontWeight: 900,
                      display: "grid",
                      placeItems: "center",
                      lineHeight: 1
                    }}
                  >
                    {eng.mark}
                  </Box>
                  <span>{eng.label}</span>
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ px: 1.25, py: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("history.search")}
          inputProps={{ "aria-label": t("history.search") }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" color="disabled" sx={{ mr: 0.75 }} />
          }}
        />
        {engineError ? (
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
            {engineError}
          </Typography>
        ) : null}
        {!sessionToken ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {t("history.engineNeedToken")}
          </Typography>
        ) : null}
      </Box>
      <List dense sx={{ overflow: "auto", flex: "1 1 0", minHeight: 0, p: 1.25 }}>
        {showCodexThreads && threads.length === 0 && filteredEngineItems.length === 0 && (
          <Box sx={{ p: 1.25, color: "text.secondary" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {loading || engineLoading ? t("history.loading") : t("history.empty")}
            </Typography>
            <Typography variant="caption">{searchTerm ? t("history.emptySearch") : t("history.emptyDescription")}</Typography>
          </Box>
        )}
        {!showCodexThreads && filteredEngineItems.length === 0 && (
          <Box sx={{ p: 1.25, color: "text.secondary" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {engineLoading ? t("history.loading") : t("history.engineEmpty")}
            </Typography>
            <Typography variant="caption">{t("history.engineEmptyDescription")}</Typography>
          </Box>
        )}
        {showCodexThreads && threads.map((thread) => {
          const title = threadTitle(thread);
          const usage = threadUsage[thread.id];
          const isEditing = editingThreadId === thread.id;
          const disabled = busyThreadId === thread.id;
          return (
            <ListItemButton
              key={thread.id}
              selected={activeThreadId === thread.id}
              onClick={() => {
                if (!isEditing) {
                  onSelect(thread.id);
                }
              }}
              aria-label={t("history.openAria", { title })}
              sx={{
                border: "1px solid",
                borderColor: activeThreadId === thread.id ? "primary.main" : "divider",
                bgcolor: activeThreadId === thread.id ? "action.selected" : "background.paper",
                alignItems: "flex-start",
                gap: 0.75,
                "& + &": { mt: 1 },
                "&::before": {
                  content: '""',
                  width: 6,
                  height: 6,
                  mt: 1.5,
                  borderRadius: 999,
                  bgcolor: activeThreadId === thread.id ? "primary.main" : "transparent",
                  flexShrink: 0
                }
              }}
            >
              {isEditing ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ minWidth: 0, flex: 1 }}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveRename(thread.id);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setEditingThreadId(null);
                      setRenameDraft("");
                    }
                  }}
                >
                  <TextField
                    size="small"
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    inputProps={{ "aria-label": t("history.renameLabel") }}
                    autoFocus
                    fullWidth
                  />
                  <Tooltip title={t("history.saveRename")}>
                    <span>
                      <IconButton size="small" aria-label={t("history.saveRename")} disabled={!renameDraft.trim() || disabled} onClick={() => void saveRename(thread.id)}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t("history.cancelRename")}>
                    <IconButton
                      size="small"
                      aria-label={t("history.cancelRename")}
                      disabled={disabled}
                      onClick={() => {
                        setEditingThreadId(null);
                        setRenameDraft("");
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : (
                <>
                  <ListItemText
                    primary={title}
                    secondary={
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                        <Chip size="small" label={threadSourceLabel(thread, t)} variant="outlined" />
                        <VisibleStatusChip status={thread.status} fallback={t("history.stored")} />
                        <Tooltip title={historyCostTooltip(usage, t)}>
                          <Chip size="small" label={historyCostLabel(usage, t)} color="success" variant="outlined" />
                        </Tooltip>
                        {thread.model && <Chip size="small" label={thread.model} variant="outlined" />}
                        {thread.modelProvider && <Typography variant="caption">{thread.modelProvider}</Typography>}
                        {thread.cwd && <Typography variant="caption" title={thread.cwd}>{shortCwd(thread.cwd)}</Typography>}
                      </Stack>
                    }
                    primaryTypographyProps={{ noWrap: true, fontWeight: activeThreadId === thread.id ? 700 : 500 }}
                    sx={{ minWidth: 0, flex: 1 }}
                  />
                  <Stack direction="row" spacing={0.25} onClick={(event) => event.stopPropagation()} sx={{ flexShrink: 0 }}>
                    <Tooltip title={t("history.rename")}>
                      <IconButton size="small" aria-label={t("history.renameAria", { title })} disabled={disabled} onClick={() => beginRename(thread)}>
                        <DriveFileRenameOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("history.archive")}>
                      <IconButton size="small" aria-label={t("history.archiveAria", { title })} disabled={disabled} onClick={() => void archiveThread(thread.id)}>
                        <ArchiveOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("history.delete")}>
                      <IconButton size="small" aria-label={t("history.deleteAria", { title })} disabled={disabled} onClick={() => void deleteThread(thread)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </>
              )}
            </ListItemButton>
          );
        })}
        {filteredEngineItems.map((item) => {
          const meta = engineMetaById.get(item.engine);
          const color = meta?.color ?? "#64748b";
          const mark = meta?.mark ?? item.engine.slice(0, 2).toUpperCase();
          const key = `${item.engine}:${item.id}`;
          return (
            <ListItemButton
              key={key}
              onClick={() => void openEngineItem(item)}
              aria-label={t("history.engineOpenAria", { engine: meta?.label ?? item.engine, title: item.title })}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                alignItems: "flex-start",
                gap: 0.75,
                "& + &": { mt: 1 }
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  bgcolor: color,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 900,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  mt: 0.25
                }}
              >
                {mark}
              </Box>
              <ListItemText
                primary={item.title}
                secondary={
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                    <Chip size="small" label={meta?.label ?? item.engine} sx={{ bgcolor: alpha(color, 0.15), color, borderColor: alpha(color, 0.35) }} variant="outlined" />
                    <Chip size="small" label={t("history.readOnly")} variant="outlined" />
                    {item.messageCount != null ? (
                      <Chip size="small" label={t("history.messageCount", { count: String(item.messageCount) })} variant="outlined" />
                    ) : null}
                    {item.model ? <Chip size="small" label={item.model} variant="outlined" /> : null}
                    {item.cwd ? (
                      <Typography variant="caption" title={item.cwd}>
                        {shortCwd(item.cwd)}
                      </Typography>
                    ) : null}
                    {item.updatedAt ? (
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(item.updatedAt)}
                      </Typography>
                    ) : null}
                  </Stack>
                }
                primaryTypographyProps={{ noWrap: true, fontWeight: 600 }}
                sx={{ minWidth: 0, flex: 1 }}
              />
              <Tooltip title={t("history.viewTranscript")}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); void openEngineItem(item); }}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemButton>
          );
        })}
      </List>
      <Dialog
        open={Boolean(transcript) || transcriptLoading}
        onClose={() => {
          setTranscript(null);
          setTranscriptError(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap>
              {transcript?.title || t("history.transcriptTitle")}
            </Typography>
            {transcript ? (
              <Typography variant="caption" color="text.secondary">
                {transcript.engine} · {transcript.id}
                {transcript.sourcePath ? ` · ${transcript.sourcePath}` : ""}
              </Typography>
            ) : null}
          </Box>
          <IconButton
            aria-label={t("history.closeTranscript")}
            onClick={() => {
              setTranscript(null);
              setTranscriptError(null);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {transcriptLoading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : null}
          {transcriptError ? (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {transcriptError}
            </Typography>
          ) : null}
          {transcript && transcript.messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("history.transcriptEmpty")}
            </Typography>
          ) : null}
          <Stack spacing={1.25}>
            {(transcript?.messages ?? []).map((msg, idx) => (
              <Box
                key={`${idx}-${msg.role}`}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: msg.role === "user" ? "action.hover" : "background.paper"
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                  {msg.role}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                  {msg.text}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
      <Divider />
      <Box data-testid="left-bottom-account-area" sx={{ p: 1.25, flex: "0 0 auto" }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            p: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "background.paper"
          }}
        >
          <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 850 }}>CU</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.25 }} noWrap>
              Codex UI
            </Typography>
            <Typography variant="caption" color="text.secondary" title={providerLabel} sx={{ display: "block" }} noWrap>
              {providerLabel}
            </Typography>
          </Box>
          {installAvailable && (
            <Tooltip title={t("history.installApp")}>
              <IconButton size="small" onClick={onInstallApp} aria-label={t("history.installApp")}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Button size="small" fullWidth startIcon={<SettingsIcon />} onClick={onOpenSettings} aria-label={t("history.openSettings")} sx={{ mt: 1, justifyContent: "flex-start" }}>
          {t("history.settings")}
        </Button>
      </Box>
    </Box>
  );
}

function threadSourceLabel(thread: ThreadEntry, t: TranslateFn): string {
  if (thread.parentThreadId) {
    return t("history.source.agent");
  }
  if (thread.agentNickname || thread.agentRole) {
    return t("history.source.sidechat");
  }
  if (thread.source) {
    return thread.source;
  }
  return t("history.source.main");
}

function historyCostLabel(usage: HistoryThreadUsageSummary | undefined, t: TranslateFn): string {
  if (usage?.estimatedCostUsd != null) {
    return t("history.cost", { value: formatUsd(usage.estimatedCostUsd) });
  }
  return t("history.cost", { value: "$0.0000" });
}

function historyCostTooltip(usage: HistoryThreadUsageSummary | undefined, t: TranslateFn): string {
  if (!usage || usage.totalTokens <= 0) {
    return t("history.costNoUsage");
  }
  return [
    t("history.costTotalTokens", { value: formatNumber(usage.totalTokens) }),
    t("history.costInputTokens", { value: formatNumber(usage.inputTokens) }),
    t("history.costOutputTokens", { value: formatNumber(usage.outputTokens) }),
    t("history.costCachedTokens", { value: formatNumber(usage.cachedInputTokens) }),
    t("history.costCacheWriteTokens", { value: formatNumber(usage.cacheWriteInputTokens) })
  ].join("\n");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatUsd(value: number): string {
  if (value <= 0) {
    return "$0.0000";
  }
  return `$${value.toFixed(value < 0.01 ? 6 : 4)}`;
}

function threadTitle(thread: ThreadEntry): string {
  const title = thread.title || thread.name || thread.preview;
  if (title?.trim()) {
    return title.trim();
  }
  const stamp = thread.recencyAt ?? thread.updatedAt ?? thread.createdAt;
  const date = stamp ? new Date(stamp * 1000).toISOString().slice(0, 10) : "Stored thread";
  return `${date} ${thread.id.slice(0, 8)}`;
}

function formatRelativeTime(ms: number): string {
  const delta = Date.now() - ms;
  if (!Number.isFinite(delta)) return "";
  const sec = Math.round(delta / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  const day = Math.round(hr / 24);
  return `${day}d`;
}

function shortCwd(cwd: string): string {
  const normalized = cwd.replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 2) {
    return normalized || cwd;
  }
  return `.../${parts.slice(-2).join("/")}`;
}

function VisibleStatusChip({ status, fallback }: { status?: string; fallback: string }) {
  if (status && isSilentStatus(status)) {
    return null;
  }
  return <Chip size="small" label={status ?? fallback} />;
}

function isSilentStatus(status: string): boolean {
  return ["completed", "complete", "done", "success", "shutdown"].includes(status.trim().toLowerCase());
}
