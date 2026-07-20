import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TerminalIcon from "@mui/icons-material/Terminal";
import type { TranslateFn } from "../../i18n";
import { MarkdownMessage } from "../MarkdownMessage";
import type { ChatWaterfallRow } from "./types";

type Props = {
  row: ChatWaterfallRow;
  t: TranslateFn;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export function ChatRow({ row, t, expanded, onToggleExpanded }: Props) {
  switch (row.kind) {
    case "userMessage":
      return <UserMessageRow row={row} />;
    case "assistantMessage":
      return <AssistantMessageRow row={row} t={t} expanded={expanded} onToggleExpanded={onToggleExpanded} />;
    case "reasoningPreview":
      return <ReasoningPreviewRow row={row} t={t} />;
    case "commandExecution":
      return <CommandExecutionRow row={row} expanded={expanded} onToggleExpanded={onToggleExpanded} />;
    case "fileChange":
      return <AuditRow row={row} icon={<InsertDriveFileIcon fontSize="small" />} />;
    case "toolCall":
      return <ToolCallRow row={row} />;
    default:
      return <StatusRow row={row} />;
  }
}

function UserMessageRow({ row }: { row: ChatWaterfallRow }) {
  return (
    <Box data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`} sx={{ display: "flex", justifyContent: "flex-end" }}>
      <Paper
        variant="outlined"
        sx={{
          maxWidth: { xs: "92%", md: "72%" },
          minWidth: 0,
          px: 1.35,
          py: 1,
          borderRadius: "14px 14px 4px 14px",
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.11),
          borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.46 : 0.28),
          boxShadow: (theme) => theme.customShadows?.z1
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: row.text ? 0.25 : 0 }}>
          <PersonIcon fontSize="small" color="primary" />
          <Typography variant="caption" sx={{ fontWeight: 850, color: "primary.main" }}>
            {row.title}
          </Typography>
        </Stack>
        {row.text && <MarkdownMessage text={row.text} />}
        <ImageAttachments row={row} />
      </Paper>
    </Box>
  );
}

function AssistantMessageRow({
  row,
  t,
  expanded,
  onToggleExpanded
}: {
  row: ChatWaterfallRow;
  t: TranslateFn;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const reasoningContent = row.reasoning?.trim() ?? "";
  return (
    <Box
      data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`}
      sx={{
        display: "flex",
        justifyContent: "flex-start"
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: row.width === "wide" ? { xs: "100%", xl: "min(86vw, 1600px)" } : { xs: "100%", lg: 920 },
          minWidth: 0
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4, color: "text.secondary" }}>
          <SmartToyIcon sx={{ fontSize: 17 }} />
          <Typography variant="caption" sx={{ fontWeight: 850 }}>
            {row.title}
          </Typography>
          {row.item.agentName && <Chip size="small" label={row.item.agentName} />}
          {row.status && <Chip size="small" label={row.status} />}
          {reasoningContent && (
            <Button
              size="small"
              variant="text"
              startIcon={<SmartToyIcon fontSize="small" />}
              aria-label={expanded ? "Collapse thinking" : "Expand thinking"}
              onClick={onToggleExpanded}
              sx={{ borderRadius: 1, ml: "auto" }}
            >
              {t("chat.thinking")}
            </Button>
          )}
        </Stack>
        {reasoningContent && expanded && (
          <Paper
            data-testid="completed-thinking-panel"
            variant="outlined"
            sx={{
              mb: 1,
              p: 1,
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.5 : 0.64),
              borderColor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.16 : 0.12)
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5, color: "text.secondary" }}>
              <SmartToyIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 850 }}>
                {t("chat.thinking")}
              </Typography>
            </Stack>
            <Box sx={{ maxHeight: "min(42vh, 420px)", overflow: "auto", pr: 0.5 }}>
              <MarkdownMessage text={reasoningContent} />
            </Box>
          </Paper>
        )}
        <Box
          sx={{
            px: { xs: 0.25, sm: 0.5 },
            py: 0.25,
            "& .code-block": {
              maxWidth: "100%"
            }
          }}
        >
          {row.text && <MarkdownMessage text={row.text} />}
          <ImageAttachments row={row} />
        </Box>
      </Box>
    </Box>
  );
}

function ReasoningPreviewRow({ row, t }: { row: ChatWaterfallRow; t: TranslateFn }) {
  const preview = row.text.split(/\r?\n/).slice(0, 3).join("\n").trim();
  if (!preview) {
    return null;
  }
  return (
    <Box data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`} sx={{ display: "flex", justifyContent: "flex-start" }}>
      <Paper
        variant="outlined"
        data-testid="thinking-preview"
        sx={{
          width: { xs: "96%", md: "min(84%, 920px)" },
          p: 1,
          borderRadius: 1,
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.5 : 0.66),
          borderColor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.16 : 0.12),
          boxShadow: (theme) => theme.customShadows?.z1
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <SmartToyIcon fontSize="small" sx={{ mt: 0.2, color: "text.secondary" }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.secondary" }}>
              {t("chat.thinking")}
            </Typography>
            <Typography
              component="pre"
              variant="caption"
              color="text.secondary"
              sx={{
                m: 0,
                mt: 0.25,
                fontFamily: "inherit",
                whiteSpace: "pre-wrap",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical"
              }}
            >
              {preview}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

function CommandExecutionRow({ row, expanded, onToggleExpanded }: { row: ChatWaterfallRow; expanded: boolean; onToggleExpanded: () => void }) {
  const [copied, setCopied] = useState(false);
  const commandOutput = commandOutputPreview(row.text, expanded);
  async function copyOutput() {
    await navigator.clipboard.writeText(row.text.trimEnd());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <AuditRow
      row={row}
      icon={<TerminalIcon fontSize="small" />}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          {commandOutput.collapsible && (
            <Button size="small" variant="text" onClick={onToggleExpanded} sx={{ borderRadius: 1 }}>
              {expanded ? "Collapse" : `Show full (${commandOutput.totalLines} lines)`}
            </Button>
          )}
          {row.text ? (
            <Tooltip title={copied ? "Copied" : "Copy output"}>
              <IconButton size="small" aria-label="Copy command output" onClick={() => void copyOutput()}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      }
    >
      {row.text && (
        <Box sx={{ position: "relative", mt: 1, pt: 1 }}>
          <Typography
            component="pre"
            data-testid="command-output"
            sx={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              m: 0
            }}
          >
            {commandOutput.text}
          </Typography>
          {commandOutput.collapsible && !expanded && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              {commandOutput.omittedLines} lines hidden. Expand to inspect the full terminal output.
            </Typography>
          )}
        </Box>
      )}
    </AuditRow>
  );
}

function ToolCallRow({ row }: { row: ChatWaterfallRow }) {
  return (
    <AuditRow row={row} icon={<AccountTreeIcon fontSize="small" />}>
      {renderToolPayload(row)}
    </AuditRow>
  );
}

function AuditRow({ row, icon, action, children }: { row: ChatWaterfallRow; icon: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <Box data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`} sx={{ display: "flex", justifyContent: "stretch" }}>
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", xl: "min(86vw, 1600px)" },
          mx: row.width === "wide" ? 0 : "auto",
          p: 1.15,
          borderRadius: 1,
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.62 : 0.68),
          borderColor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.14 : 0.12),
          boxShadow: (theme) => theme.customShadows?.z1
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
            {row.title}
          </Typography>
          {row.item.agentName && <Chip size="small" label={row.item.agentName} />}
          {row.status && <Chip size="small" label={row.status} />}
          {action}
        </Stack>
        {children ?? (row.text ? <MarkdownMessage text={row.text} /> : null)}
        <ImageAttachments row={row} />
      </Paper>
    </Box>
  );
}

function StatusRow({ row }: { row: ChatWaterfallRow }) {
  return (
    <Box data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`} sx={{ display: "flex", justifyContent: "center" }}>
      <Paper
        variant="outlined"
        sx={{
          maxWidth: 760,
          px: 1,
          py: 0.65,
          borderRadius: 1,
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.44 : 0.58),
          color: "text.secondary"
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            {row.title}
          </Typography>
          {row.status && <Chip size="small" label={row.status} />}
          {row.text && <Typography variant="caption">{row.text}</Typography>}
        </Stack>
      </Paper>
    </Box>
  );
}

function ImageAttachments({ row }: { row: ChatWaterfallRow }) {
  const images = row.item.images ?? [];
  if (images.length === 0) {
    return null;
  }
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: "auto" }}>
      {images.map((image, index) => (
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
  );
}

function renderToolPayload(row: ChatWaterfallRow) {
  const payload = isRecord(row.item.payload) ? row.item.payload : null;
  if (!payload) {
    return row.text ? <MarkdownMessage text={row.text} /> : null;
  }
  const server = stringValue(payload.server);
  const tool = stringValue(payload.tool);
  const args = "arguments" in payload ? payload.arguments : undefined;
  const result = isRecord(payload.result) ? payload.result : null;
  const errorMessage = payload.error == null ? undefined : formatErrorText(payload.error);

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
      {row.text && <MarkdownMessage text={row.text} />}
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

function sanitizeTestId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-");
}

function isRenderableImageUrl(url: string): boolean {
  return url.startsWith("data:image/") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://");
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

function formatErrorText(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error)) {
    for (const key of ["message", "error", "detail", "reason"]) {
      const value = error[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
      if (isRecord(value)) {
        return formatErrorText(value);
      }
    }
    return prettyJson(error);
  }
  return String(error);
}

function commandOutputPreview(text: string, expanded: boolean): { text: string; collapsible: boolean; totalLines: number; omittedLines: number } {
  const normalized = text.trimEnd();
  const lines = normalized ? normalized.split(/\r?\n/) : [];
  const previewLineCount = 14;
  const collapsible = lines.length > previewLineCount + 4 || normalized.length > 1800;
  if (!collapsible || expanded) {
    return {
      text: normalized,
      collapsible,
      totalLines: Math.max(1, lines.length),
      omittedLines: 0
    };
  }
  const previewLines = lines.slice(0, previewLineCount);
  return {
    text: previewLines.join("\n"),
    collapsible,
    totalLines: lines.length,
    omittedLines: Math.max(0, lines.length - previewLines.length)
  };
}
