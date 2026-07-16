import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TerminalIcon from "@mui/icons-material/Terminal";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PersonIcon from "@mui/icons-material/Person";
import type { WorkbenchTurn } from "../state/codexClient";

type Props = {
  turns: WorkbenchTurn[];
  activeThreadId: string | null;
  errors: string[];
};

export function ChatPanel({ turns, activeThreadId, errors }: Props) {
  const visibleTurns = activeThreadId ? turns.filter((turn) => turn.threadId === activeThreadId) : turns;
  return (
    <Box sx={{ minHeight: 0, overflow: "auto", p: 2.5 }}>
      <Stack spacing={1.5}>
        {errors.map((error, index) => (
          error ? <Alert key={`${error}-${index}`} severity="error">{error}</Alert> : null
        ))}
        {visibleTurns.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 750 }}>
              Ready for a Codex task
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Select a model, choose permissions, then send a coding task. Tool calls, diffs, command output, and approvals will appear inline.
            </Typography>
          </Paper>
        )}
        {visibleTurns.map((turn) => (
          <Paper key={turn.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Chip size="small" label={turn.status} color={turn.status === "failed" ? "error" : "default"} />
              <Typography variant="caption" color="text.secondary">
                {turn.id}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {turn.items.map((item) => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    bgcolor:
                      item.type === "agentMessage"
                        ? "background.paper"
                        : item.type === "userMessage"
                          ? "#f4f8fb"
                          : "#fafafa"
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {item.type === "commandExecution" ? (
                      <TerminalIcon fontSize="small" />
                    ) : item.type === "fileChange" ? (
                      <InsertDriveFileIcon fontSize="small" />
                    ) : item.type === "userMessage" ? (
                      <PersonIcon fontSize="small" />
                    ) : (
                      <SmartToyIcon fontSize="small" />
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 750, flex: 1 }}>
                      {item.title}
                    </Typography>
                    {item.status && <Chip size="small" label={item.status} />}
                  </Stack>
                  {item.text && (
                    <Typography
                      component="pre"
                      sx={{
                        mt: 1,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        fontFamily: item.type === "commandExecution" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
                        fontSize: item.type === "commandExecution" ? 12 : 14,
                        m: 0,
                        pt: 1
                      }}
                    >
                      {item.text}
                    </Typography>
                  )}
                  {item.images && item.images.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: "auto" }}>
                      {item.images.map((image, index) => (
                        <Paper key={`${image.url}-${index}`} variant="outlined" sx={{ width: 160, flex: "0 0 auto", overflow: "hidden" }}>
                          {isRenderableImageUrl(image.url) ? (
                            <Box
                              component="img"
                              src={image.url}
                              alt={image.name ?? `Attached image ${index + 1}`}
                              sx={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <Box sx={{ p: 1.25 }}>
                              <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
                                {image.name ?? image.url}
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

function isRenderableImageUrl(url: string): boolean {
  return url.startsWith("data:image/") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://");
}
