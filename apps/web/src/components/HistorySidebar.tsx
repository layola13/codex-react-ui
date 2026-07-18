import { Box, Chip, Divider, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { PermissionPresetId } from "@codex-ui/shared";
import type { ThreadEntry } from "../state/codexClient";
import { NewChatButton } from "./NewChatButton";

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  currentPermission: PermissionPresetId;
  onSelect: (threadId: string) => void;
  onNew: (permission: PermissionPresetId) => void;
};

export function HistorySidebar({ threads, activeThreadId, currentPermission, onSelect, onNew }: Props) {
  return (
    <Box
      sx={{
        borderRight: "1px solid",
        borderColor: "divider",
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
        <NewChatButton currentPermission={currentPermission} label="New" onNew={onNew} />
      </Stack>
      <Divider />
      <List dense sx={{ overflow: "auto", flex: 1, p: 1.25 }}>
        <ListItemButton
          selected={activeThreadId === null}
          onClick={() => onNew(currentPermission)}
          sx={{
            mb: 1,
            border: "1px solid",
            borderColor: activeThreadId === null ? "primary.main" : "divider",
            bgcolor: activeThreadId === null ? "action.selected" : "background.paper",
            boxShadow: (theme) => (activeThreadId === null ? theme.customShadows?.z4 : "none")
          }}
        >
          <ListItemText primary="New conversation" secondary="Use New Chat menu for full access modes" />
        </ListItemButton>
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
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip size="small" label={thread.status ?? "stored"} />
                  {thread.model && <Typography variant="caption">{thread.model}</Typography>}
                </Stack>
              }
              primaryTypographyProps={{ noWrap: true, fontWeight: activeThreadId === thread.id ? 700 : 500 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
