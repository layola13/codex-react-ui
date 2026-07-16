import { Box, Button, Chip, Divider, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { ThreadEntry } from "../state/codexClient";

type Props = {
  threads: ThreadEntry[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onNew: () => void;
};

export function HistorySidebar({ threads, activeThreadId, onSelect, onNew }: Props) {
  return (
    <Box sx={{ borderRight: "1px solid", borderColor: "divider", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 750 }}>
          Conversations
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onNew}>
          New
        </Button>
      </Stack>
      <Divider />
      <List dense sx={{ overflow: "auto", flex: 1 }}>
        <ListItemButton selected={activeThreadId === null} onClick={onNew}>
          <ListItemText primary="New conversation" secondary="Choose model and permissions below" />
        </ListItemButton>
        {threads.map((thread) => (
          <ListItemButton key={thread.id} selected={activeThreadId === thread.id} onClick={() => onSelect(thread.id)}>
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

