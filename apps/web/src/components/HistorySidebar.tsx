import { useState } from "react";
import { Avatar, Box, Button, Chip, Divider, IconButton, List, ListItemButton, ListItemText, Stack, TextField, Tooltip, Typography } from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { alpha } from "@mui/material/styles";
import type { ThreadEntry } from "../state/codexClient";
import type { TranslateFn } from "../i18n";

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  providerLabel: string;
  searchTerm: string;
  loading?: boolean;
  installAvailable?: boolean;
  backgroundImage?: string;
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

export function HistorySidebar({
  threads,
  activeThreadId,
  providerLabel,
  searchTerm,
  loading = false,
  installAvailable = false,
  backgroundImage,
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
        <Button size="small" onClick={onRefresh} disabled={loading}>
          {loading ? t("history.loading") : t("history.refresh")}
        </Button>
      </Stack>
      <Divider />
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
      </Box>
      <List dense sx={{ overflow: "auto", flex: "1 1 0", minHeight: 0, p: 1.25 }}>
        {threads.length === 0 && (
          <Box sx={{ p: 1.25, color: "text.secondary" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {loading ? t("history.loading") : t("history.empty")}
            </Typography>
            <Typography variant="caption">{searchTerm ? t("history.emptySearch") : t("history.emptyDescription")}</Typography>
          </Box>
        )}
        {threads.map((thread) => {
          const title = threadTitle(thread);
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
      </List>
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

function threadTitle(thread: ThreadEntry): string {
  const title = thread.title || thread.name || thread.preview;
  if (title?.trim()) {
    return title.trim();
  }
  const stamp = thread.recencyAt ?? thread.updatedAt ?? thread.createdAt;
  const date = stamp ? new Date(stamp * 1000).toISOString().slice(0, 10) : "Stored thread";
  return `${date} ${thread.id.slice(0, 8)}`;
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
