import { Box, Button, Chip, Divider, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { alpha } from "@mui/material/styles";
import type { ThreadEntry } from "../state/codexClient";

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onNew: () => void;
};

export function HistorySidebar({ threads, activeThreadId, onSelect, onNew }: Props) {
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
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onNew}>
          New
        </Button>
      </Stack>
      <Divider />
      <List dense sx={{ overflow: "auto", flex: 1, p: 1.25 }}>
        <ListItemButton
          selected={activeThreadId === null}
          onClick={onNew}
          sx={{
            mb: 1,
            border: "1px solid",
            borderColor: activeThreadId === null ? "primary.main" : "divider",
            bgcolor: activeThreadId === null ? "action.selected" : "background.paper",
            boxShadow: (theme) => (activeThreadId === null ? theme.customShadows?.z4 : "none")
          }}
        >
          <ListItemText primary="New conversation" secondary="Choose model and permissions below" />
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
