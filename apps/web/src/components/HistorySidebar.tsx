import { Avatar, Box, Button, Chip, Divider, IconButton, List, ListItemButton, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";
import { alpha } from "@mui/material/styles";
import type { ThreadEntry } from "../state/codexClient";
import type { TranslateFn } from "../i18n";

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  providerLabel: string;
  installAvailable?: boolean;
  backgroundImage?: string;
  t: TranslateFn;
  onSelect: (threadId: string) => void;
  onInstallApp?: () => void;
  onOpenSettings: () => void;
};

export function HistorySidebar({ threads, activeThreadId, providerLabel, installAvailable = false, backgroundImage, t, onSelect, onInstallApp, onOpenSettings }: Props) {
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
      </Stack>
      <Divider />
      <List dense sx={{ overflow: "auto", flex: "1 1 0", minHeight: 0, p: 1.25 }}>
        {threads.map((thread) => (
          <ListItemButton
            key={thread.id}
            selected={activeThreadId === thread.id}
            onClick={() => onSelect(thread.id)}
            sx={{
              border: "1px solid",
              borderColor: activeThreadId === thread.id ? "primary.main" : "divider",
              bgcolor: activeThreadId === thread.id ? "action.selected" : "background.paper",
              "& + &": { mt: 1 },
              "&::before": {
                content: '""',
                width: 6,
                height: 6,
                mr: 1,
                borderRadius: 999,
                bgcolor: activeThreadId === thread.id ? "primary.main" : "transparent",
                flexShrink: 0
              }
            }}
          >
            <ListItemText
              primary={thread.preview || thread.id}
              secondary={
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                  <Chip size="small" label={threadSourceLabel(thread, t)} variant="outlined" />
                  <Chip size="small" label={thread.status ?? t("history.stored")} />
                  {thread.model && <Chip size="small" label={thread.model} variant="outlined" />}
                  {thread.modelProvider && <Typography variant="caption">{thread.modelProvider}</Typography>}
                </Stack>
              }
              primaryTypographyProps={{ noWrap: true, fontWeight: activeThreadId === thread.id ? 700 : 500 }}
            />
          </ListItemButton>
        ))}
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
  return t("history.source.main");
}
