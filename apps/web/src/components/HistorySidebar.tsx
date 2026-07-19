import { Avatar, Box, Button, Chip, Divider, IconButton, List, ListItemButton, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";
import { alpha } from "@mui/material/styles";
import type { ThreadEntry } from "../state/codexClient";

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  providerLabel: string;
  installAvailable?: boolean;
  onSelect: (threadId: string) => void;
  onInstallApp?: () => void;
  onOpenSettings: () => void;
};

export function HistorySidebar({ threads, activeThreadId, providerLabel, installAvailable = false, onSelect, onInstallApp, onOpenSettings }: Props) {
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
        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.46 : 0.36)
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 800 }}>
          Conversations
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
                  <Chip size="small" label={threadSourceLabel(thread)} variant="outlined" />
                  <Chip size="small" label={thread.status ?? "stored"} />
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
            <Tooltip title="Install app">
              <IconButton size="small" onClick={onInstallApp} aria-label="Install app">
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Button size="small" fullWidth startIcon={<SettingsIcon />} onClick={onOpenSettings} aria-label="Open settings" sx={{ mt: 1, justifyContent: "flex-start" }}>
          Settings
        </Button>
      </Box>
    </Box>
  );
}

function threadSourceLabel(thread: ThreadEntry): string {
  if (thread.parentThreadId) {
    return "agent";
  }
  if (thread.agentNickname || thread.agentRole) {
    return "sidechat";
  }
  return "main";
}
