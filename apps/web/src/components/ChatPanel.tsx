import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TerminalIcon from "@mui/icons-material/Terminal";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PersonIcon from "@mui/icons-material/Person";
import type { WorkbenchTurn } from "../state/codexClient";
import { MarkdownMessage } from "./MarkdownMessage";

type Props = {
  turns: WorkbenchTurn[];
  activeThreadId: string | null;
  errors: string[];
};

export function ChatPanel({ turns, activeThreadId, errors }: Props) {
  const visibleTurns = activeThreadId ? turns.filter((turn) => turn.threadId === activeThreadId) : turns;
  return (
    <Box sx={{ minHeight: 0, overflow: "auto", p: { xs: 1.5, sm: 2.5, lg: 3 } }}>
      <Stack spacing={1.75} sx={{ maxWidth: 1120, mx: "auto" }}>
        {errors.map((error, index) => (
          error ? <Alert key={`${error}-${index}`} severity="error">{error}</Alert> : null
        ))}
        {visibleTurns.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.58 : 0.74),
              boxShadow: (theme) => theme.customShadows?.card
            }}
          >
            <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 750 }}>
              Ready for a Codex task
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Select a model, choose permissions, then send a coding task. Tool calls, diffs, command output, and approvals will appear inline.
            </Typography>
          </Paper>
        )}
        {visibleTurns.map((turn) => (
          <Paper
            key={turn.id}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.58 : 0.72),
              boxShadow: (theme) => theme.customShadows?.z4
            }}
          >
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
                    p: 1.35,
                    borderRadius: 1,
                    bgcolor:
                      item.type === "agentMessage"
                        ? (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.82 : 0.86)
                        : item.type === "userMessage"
                          ? "action.selected"
                          : (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.66 : 0.6)
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
                  {item.text && item.type === "commandExecution" && (
                    <Typography
                      component="pre"
                      sx={{
                        mt: 1,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 12,
                        m: 0,
                        pt: 1
                      }}
                    >
                      {item.text}
                      </Typography>
                    )}
                  {item.text && item.type !== "commandExecution" && <MarkdownMessage text={item.text} />}
                  {item.type === "mcpToolCall" && renderMcpToolCall(item)}
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

function renderMcpToolCall(item: { payload?: unknown }) {
  const payload = isRecord(item.payload) ? item.payload : null;
  if (!payload) {
    return null;
  }
  const server = stringValue(payload.server);
  const tool = stringValue(payload.tool);
  const args = "arguments" in payload ? payload.arguments : undefined;
  const result = isRecord(payload.result) ? payload.result : null;
  const errorMessage = stringValue(isRecord(payload.error) ? payload.error.message : undefined);

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
        {server && <Chip size="small" label={server} />}
        {tool && <Chip size="small" label={tool} />}
        {stringValue(payload.status) && <Chip size="small" label={stringValue(payload.status)} />}
        {typeof payload.durationMs === "number" && <Chip size="small" label={`${payload.durationMs}ms`} />}
      </Stack>
      {args != null && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Arguments
          </Typography>
          <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, m: 0, mt: 0.5 }}>
            {prettyJson(args)}
          </Typography>
        </Box>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {errorMessage}
        </Alert>
      )}
      {result && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Result
          </Typography>
          {result.content != null && (
            <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, m: 0, mt: 0.5 }}>
              {prettyJson(result.content)}
            </Typography>
          )}
          {result.structuredContent != null && (
            <Typography component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, m: 0, mt: 0.5 }}>
              {prettyJson(result.structuredContent)}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
