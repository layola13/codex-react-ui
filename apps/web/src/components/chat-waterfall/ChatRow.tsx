import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { generateDiffFile } from "@git-diff-view/file";
import { DiffModeEnum, DiffView } from "@git-diff-view/react";
import "@git-diff-view/react/styles/diff-view.css";
import { Alert, Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import type { TranslateFn } from "../../i18n";
import { MarkdownMessage } from "../MarkdownMessage";
import type { AssistantUsageDisplayMode, ChatWaterfallRow } from "./types";

type Props = {
  row: ChatWaterfallRow;
  t: TranslateFn;
  expanded: boolean;
  onToggleExpanded: () => void;
  assistantUsageDisplay?: AssistantUsageDisplayMode;
};

export function ChatRow({ row, t, expanded, onToggleExpanded, assistantUsageDisplay = "summary" }: Props) {
  switch (row.kind) {
    case "userMessage":
      return <UserMessageRow row={row} />;
    case "assistantMessage":
      return <AssistantMessageRow row={row} t={t} expanded={expanded} onToggleExpanded={onToggleExpanded} assistantUsageDisplay={assistantUsageDisplay} />;
    case "reasoningPreview":
      return <ReasoningPreviewRow row={row} t={t} />;
    case "commandExecution":
      return <CommandExecutionRow row={row} expanded={expanded} onToggleExpanded={onToggleExpanded} />;
    case "commandGroup":
      return <CommandGroupRow row={row} expanded={expanded} onToggleExpanded={onToggleExpanded} />;
    case "fileChange":
      return <FileChangeRow row={row} expanded={expanded} onToggleExpanded={onToggleExpanded} />;
    case "toolCall":
      return <ToolCallRow row={row} expanded={expanded} onToggleExpanded={onToggleExpanded} />;
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
        <FileAttachments row={row} />
      </Paper>
    </Box>
  );
}

function AssistantMessageRow({
  row,
  t,
  expanded,
  onToggleExpanded,
  assistantUsageDisplay
}: {
  row: ChatWaterfallRow;
  t: TranslateFn;
  expanded: boolean;
  onToggleExpanded: () => void;
  assistantUsageDisplay: AssistantUsageDisplayMode;
}) {
  const reasoningContent = row.reasoning?.trim() ?? "";
  const tinted = row.assistantTone === "tinted";
  const startedAtLabel = formatStartedAt(row.startedAt);
  const firstTokenLabel = formatFirstToken(row.startedAt, row.firstTokenAt);
  const usageLabel = formatAssistantUsageSummary(row);
  return (
    <Box
      data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`}
      data-assistant-tone={row.assistantTone ?? "plain"}
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        mx: { xs: -0.75, sm: -1 },
        px: { xs: 0.75, sm: 1 },
        py: 0.75,
        borderRadius: 1,
        bgcolor: tinted
          ? (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.07 : 0.045)
          : (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.18 : 0.58)
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: row.width === "wide" ? { xs: "100%", xl: "min(86vw, 1600px)" } : { xs: "100%", lg: 920 },
          minWidth: 0
        }}
      >
        {(!row.hideHeader || reasoningContent || startedAtLabel || firstTokenLabel || usageLabel) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: row.hideHeader ? 0.15 : 0.4, color: "text.secondary" }}>
            {!row.hideHeader && (
              <>
                <SmartToyIcon
                  data-testid="assistant-message-header"
                  data-live={row.isLive ? "true" : "false"}
                  sx={{
                    fontSize: 17,
                    color: row.isLive ? "primary.main" : "inherit",
                    transformOrigin: "50% 55%",
                    animation: row.isLive ? "assistantAvatarHeartbeat 1300ms ease-in-out infinite" : "none",
                    "@keyframes assistantAvatarHeartbeat": {
                      "0%": { transform: "scale(1)", opacity: 0.72, filter: "drop-shadow(0 0 0 rgba(0, 0, 0, 0))" },
                      "35%": { transform: "scale(1.16)", opacity: 1, filter: (theme) => `drop-shadow(0 0 5px ${alpha(theme.palette.primary.main, 0.42)})` },
                      "62%": { transform: "scale(0.96)", opacity: 0.86, filter: "drop-shadow(0 0 0 rgba(0, 0, 0, 0))" },
                      "100%": { transform: "scale(1)", opacity: 0.72, filter: "drop-shadow(0 0 0 rgba(0, 0, 0, 0))" }
                    }
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 850 }}>
                  {row.title}
                </Typography>
                {row.item.agentName && <Chip size="small" label={row.item.agentName} />}
                <StatusChip status={row.status} />
              </>
            )}
            {startedAtLabel && (
              <Typography variant="caption" data-testid="assistant-message-started-at" sx={{ fontWeight: 750, color: "text.primary" }}>
                {startedAtLabel}
              </Typography>
            )}
            {firstTokenLabel && (
              <Typography variant="caption" data-testid="assistant-first-token" sx={{ fontWeight: 650, color: "text.disabled" }}>
                {firstTokenLabel}
              </Typography>
            )}
            {usageLabel && (
              <Typography variant="caption" data-testid="assistant-token-usage" sx={{ fontWeight: 650, color: "text.disabled" }}>
                {usageLabel}
              </Typography>
            )}
            {reasoningContent && (
              <Button
                size="small"
                variant="text"
                startIcon={<SmartToyIcon fontSize="small" />}
                aria-label={expanded ? "Collapse thinking" : "Expand thinking"}
                onClick={onToggleExpanded}
                sx={{ borderRadius: 1, ml: row.hideHeader ? 0 : "auto" }}
              >
                {t("chat.thinking")}
              </Button>
            )}
          </Stack>
        )}
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
          <FileAttachments row={row} />
          {assistantUsageDisplay === "details" && <AssistantUsageDetails row={row} />}
        </Box>
      </Box>
    </Box>
  );
}

function AssistantUsageDetails({ row }: { row: ChatWaterfallRow }) {
  const details = assistantUsageDetails(row);
  if (!details) {
    return null;
  }
  return (
    <Stack
      data-testid="assistant-usage-details"
      direction="row"
      spacing={0.75}
      flexWrap="wrap"
      useFlexGap
      sx={{
        mt: 1,
        pt: 0.75,
        borderTop: "1px solid",
        borderColor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.12 : 0.1)
      }}
    >
      {details.map((detail) => (
        <Chip key={detail} size="small" variant="outlined" label={detail} sx={{ height: 22, borderRadius: 1, bgcolor: "background.paper" }} />
      ))}
    </Stack>
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

function CommandGroupRow({ row, expanded, onToggleExpanded }: { row: ChatWaterfallRow; expanded: boolean; onToggleExpanded: () => void }) {
  const groupedRows = row.groupedRows ?? [];
  const first = groupedRows[0];
  const last = groupedRows[groupedRows.length - 1];
  const firstSummary = first ? activitySummary(first).detail : undefined;
  const lastSummary = last ? activitySummary(last).detail : undefined;
  const range = firstSummary && lastSummary && firstSummary !== lastSummary ? `${firstSummary} ... ${lastSummary}` : firstSummary ?? lastSummary;

  return (
    <Box data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`} sx={{ width: "100%" }}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={expanded ? "Collapse folded Bash commands" : "Expand folded Bash commands"}
        onClick={onToggleExpanded}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleExpanded();
          }
        }}
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(24px, 1fr) auto minmax(24px, 1fr)",
          alignItems: "center",
          gap: 1,
          minHeight: 24,
          py: 0.15,
          color: "text.secondary",
          cursor: "pointer",
          userSelect: "none",
          "&:hover .command-group-label": {
            color: "primary.main"
          }
        }}
      >
        <DashedRule />
        <Stack direction="row" spacing={0.75} alignItems="center" className="command-group-label" sx={{ minWidth: 0, transition: "color 120ms ease" }}>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: "success.main",
              flex: "0 0 auto"
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>
            {expanded ? "collapse" : `${groupedRows.length} old Bash command${groupedRows.length === 1 ? "" : "s"} folded`}
          </Typography>
          {range && (
            <Typography variant="caption" sx={{ maxWidth: { xs: 160, sm: 420 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ({range})
            </Typography>
          )}
        </Stack>
        <DashedRule />
      </Box>
      {expanded && (
        <Stack spacing={0.5} sx={{ mt: 0.35, ml: 1.25, pl: 1.25, borderLeft: "1px dashed", borderColor: "divider" }}>
          {groupedRows.map((commandRow) => {
            const summary = activitySummary(commandRow);
            const output = commandOutputPreview(commandRow.text, true).text.trimEnd();
            return (
              <Paper key={commandRow.key} variant="outlined" sx={{ p: 0.75, borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.32 : 0.56) }}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: activityStatus(commandRow.status).color, flex: "0 0 auto" }} />
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 850 }}>
                    {summary.label}
                  </Typography>
                  <Typography variant="caption" title={summary.detail} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {summary.detail ? `(${summary.detail})` : ""}
                  </Typography>
                </Stack>
                {output && (
                  <Typography
                    component="pre"
                    sx={{
                      mt: 0.5,
                      mb: 0,
                      maxHeight: 180,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 11.5,
                      color: "text.secondary"
                    }}
                  >
                    {output}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

function DashedRule() {
  return (
    <Box
      aria-hidden
      sx={{
        height: 1,
        minWidth: 0,
        backgroundImage: (theme) => `repeating-linear-gradient(to right, ${alpha(theme.palette.text.secondary, 0.34)} 0 7px, transparent 7px 13px)`
      }}
    />
  );
}

function CommandExecutionRow({ row, expanded, onToggleExpanded }: { row: ChatWaterfallRow; expanded: boolean; onToggleExpanded: () => void }) {
  const [copied, setCopied] = useState(false);
  const hasOutput = Boolean(row.text.trim());
  const commandOutput = commandOutputPreview(row.text, expanded);
  const summary = activitySummary(row);
  async function copyOutput() {
    await navigator.clipboard.writeText(row.text.trimEnd());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <ActivityRow
      row={row}
      label={summary.label}
      detail={summary.detail}
      expandable={hasOutput}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          {hasOutput && (
            <Button size="small" variant="text" onClick={(event) => { event.stopPropagation(); onToggleExpanded(); }} sx={expandHintButtonSx}>
              {expanded ? "collapse" : "ctrl+o to expand"}
            </Button>
          )}
          {row.text ? (
            <Tooltip title={copied ? "Copied" : "Copy output"}>
              <IconButton size="small" aria-label="Copy command output" onClick={(event) => { event.stopPropagation(); void copyOutput(); }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      }
    >
      {row.text && expanded && (
        <CommandOutputBlock text={commandOutput.text} />
      )}
    </ActivityRow>
  );
}

function CommandOutputBlock({ text }: { text: string }) {
  return (
    <Box
      data-testid="command-output"
      component="pre"
      sx={{
        mt: 0.75,
        mb: 0,
        maxHeight: "min(46vh, 520px)",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.55,
        p: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.22 : 0.035),
        color: "text.primary"
      }}
    >
      {text}
    </Box>
  );
}

function ToolCallRow({ row, expanded, onToggleExpanded }: { row: ChatWaterfallRow; expanded: boolean; onToggleExpanded: () => void }) {
  const hasDetails = Boolean(row.text.trim()) || Boolean(isRecord(row.item.payload));
  const summary = activitySummary(row);
  return (
    <ActivityRow
      row={row}
      label={summary.label}
      detail={summary.detail}
      expandable={hasDetails}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      action={
        hasDetails ? (
          <Button size="small" variant="text" aria-label={expanded ? "Collapse tool details" : "Expand tool details"} onClick={(event) => { event.stopPropagation(); onToggleExpanded(); }} sx={expandHintButtonSx}>
            {expanded ? "collapse" : "ctrl+o to expand"}
          </Button>
        ) : null
      }
    >
      {hasDetails && expanded && <Box data-testid="tool-audit-details">{renderToolPayload(row)}</Box>}
    </ActivityRow>
  );
}

function FileChangeRow({ row, expanded, onToggleExpanded }: { row: ChatWaterfallRow; expanded: boolean; onToggleExpanded: () => void }) {
  const [copied, setCopied] = useState(false);
  const summary = fileChangeSummary(row);
  const details = fileChangeDetails(row, summary);
  const activity = activitySummary(row);
  const hasDetails = details.length > 0;

  async function copyPath() {
    if (!summary.primaryPath) {
      return;
    }
    await navigator.clipboard.writeText(summary.primaryPath);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <ActivityRow
      row={row}
      label={activity.label}
      detail={activity.detail}
      expandable={hasDetails}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          {hasDetails && (
            <Button size="small" variant="text" aria-label={expanded ? "Collapse file details" : "Expand file details"} onClick={(event) => { event.stopPropagation(); onToggleExpanded(); }} sx={expandHintButtonSx}>
              {expanded ? "collapse" : "ctrl+o to expand"}
            </Button>
          )}
          {summary.primaryPath && (
            <Tooltip title={copied ? "Copied" : "Copy file path"}>
              <IconButton size="small" aria-label="Copy file path" onClick={(event) => { event.stopPropagation(); void copyPath(); }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      }
    >
      {hasDetails && expanded && (
        <Box data-testid="file-audit-details" sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack spacing={1}>
            {details.map((detail, index) => (
              <FileChangeDetailBlock key={`${detail.path ?? "file"}-${index}`} detail={detail} />
            ))}
          </Stack>
        </Box>
      )}
    </ActivityRow>
  );
}

function FileChangeDetailBlock({ detail }: { detail: FileChangeDetail }) {
  const status = detail.status || detail.kind;
  const stats = fileChangeStatsLabel(detail.additions ?? 0, detail.deletions ?? 0);
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.34 : 0.56)
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          px: 1,
          py: 0.65,
          borderBottom: "1px solid",
          borderColor: "divider",
          minWidth: 0
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 850, minWidth: 0, overflowWrap: "anywhere" }}>
          {detail.path ?? "File change"}
        </Typography>
        <StatusChip status={status} />
        {stats && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 750 }}>
            {stats}
          </Typography>
        )}
      </Stack>
      {detail.beforeText != null || detail.afterText != null ? (
        <GitFileDiffView beforeText={detail.beforeText ?? ""} afterText={detail.afterText ?? ""} filePath={detail.path} />
      ) : detail.unifiedDiff ? (
        <UnifiedDiffBlock text={detail.unifiedDiff} />
      ) : detail.text ? (
        <Box sx={{ p: 1 }}>
          <MarkdownMessage text={detail.text} />
        </Box>
      ) : (
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {status ? `Status: ${status}` : "No diff body was included for this file event."}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

function GitFileDiffView({ beforeText, afterText, filePath }: { beforeText: string; afterText: string; filePath?: string }) {
  const theme = useTheme();
  const lang = guessLangFromPath(filePath);
  const diffFile = useMemo(() => {
    if (!beforeText && !afterText) {
      return null;
    }
    try {
      const instance = generateDiffFile(filePath ?? "old", beforeText, filePath ?? "new", afterText, lang, lang);
      instance.init();
      instance.buildUnifiedDiffLines();
      return instance;
    } catch {
      return null;
    }
  }, [afterText, beforeText, filePath, lang]);

  if (!diffFile) {
    return <UnifiedDiffBlock text={fallbackUnifiedDiff(beforeText, afterText)} />;
  }

  return (
    <Box
      data-testid="file-diff-view"
      sx={{
        maxHeight: "min(54vh, 620px)",
        overflow: "auto",
        bgcolor: (muiTheme) => alpha(muiTheme.palette.background.paper, muiTheme.palette.mode === "dark" ? 0.3 : 0.82),
        "& .diff-view": {
          minWidth: 640
        }
      }}
    >
      <DiffView
        diffFile={diffFile}
        diffViewMode={DiffModeEnum.Unified}
        diffViewTheme={theme.palette.mode === "dark" ? "dark" : "light"}
        diffViewHighlight
        diffViewAddWidget={false}
        diffViewWrap={false}
        diffViewFontSize={12}
      />
    </Box>
  );
}

function UnifiedDiffBlock({ text }: { text: string }) {
  return (
    <Box
      data-testid="file-unified-diff"
      component="pre"
      sx={{
        m: 0,
        p: 1,
        maxHeight: "min(54vh, 620px)",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.5,
        color: "text.primary",
        bgcolor: (theme) => alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.2 : 0.035),
        "& .diff-add": { color: (theme) => theme.palette.success.main },
        "& .diff-del": { color: (theme) => theme.palette.error.main },
        "& .diff-meta": { color: "text.secondary" }
      }}
    >
      {text}
    </Box>
  );
}

function ActivityRow({
  row,
  label,
  detail,
  action,
  children,
  expandable = false,
  expanded = false,
  onToggleExpanded
}: {
  row: ChatWaterfallRow;
  label: string;
  detail?: string;
  action?: ReactNode;
  children?: ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const status = activityStatus(row.status);
  return (
    <Box data-testid={`workbench-item-${sanitizeTestId(row.item.type)}`} sx={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", xl: "min(86vw, 1600px)" },
          mx: row.width === "wide" ? 0 : "auto",
          py: 0.18
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          onClick={expandable ? onToggleExpanded : undefined}
          sx={{
            minHeight: 28,
            px: 0.5,
            borderRadius: 1,
            cursor: expandable ? "pointer" : "default",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.045 : 0.035)
            }
          }}
        >
          <Box
            aria-label={status.label}
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              flex: "0 0 auto",
              bgcolor: status.color,
              boxShadow: status.live ? (theme) => `0 0 0 0 ${alpha(theme.palette.warning.main, 0.48)}` : "none",
              animation: status.live ? "activityPulse 1350ms ease-in-out infinite" : "none",
              "@keyframes activityPulse": {
                "0%": { transform: "scale(0.92)", boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.warning.main, 0.45)}` },
                "55%": { transform: "scale(1.14)", boxShadow: (theme) => `0 0 0 7px ${alpha(theme.palette.warning.main, 0)}` },
                "100%": { transform: "scale(0.92)", boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.warning.main, 0)}` }
              }
            }}
          />
          <Typography component="span" variant="body2" sx={{ color: "primary.main", fontWeight: 850, flex: "0 0 auto" }}>
            {label}
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{
              minWidth: 0,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: label === "Bash" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
              color: "text.primary"
            }}
            title={detail}
          >
            {detail ? `(${detail})` : ""}
          </Typography>
          {row.item.agentName && <Chip size="small" label={row.item.agentName} sx={{ height: 20, borderRadius: 1 }} />}
          {action}
        </Stack>
        {children}
        <ImageAttachments row={row} />
        <FileAttachments row={row} />
      </Box>
    </Box>
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
          <StatusChip status={row.status} />
          {action}
        </Stack>
        {children ?? (row.text ? <MarkdownMessage text={row.text} /> : null)}
        <ImageAttachments row={row} />
        <FileAttachments row={row} />
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
          <StatusChip status={row.status} />
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

function FileAttachments({ row }: { row: ChatWaterfallRow }) {
  const files = row.item.files ?? [];
  if (files.length === 0) {
    return null;
  }
  return (
    <Stack spacing={0.75} sx={{ mt: 1 }}>
      {files.map((file, index) => (
        <Paper
          key={`${file.path ?? file.url ?? file.name}-${index}`}
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            maxWidth: 520,
            p: 1,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.36 : 0.72)
          }}
        >
          <InsertDriveFileIcon color="action" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
              {[file.mediaType, file.size != null ? formatBytes(file.size) : null, file.path ?? file.url].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unit = units[0]!;
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index]!;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

type FileChangeSummary = {
  primaryPath?: string;
  status?: string;
  additions: number;
  deletions: number;
  changes: Array<{ path: string; status?: string; additions?: number; deletions?: number }>;
};

type FileChangeDetail = {
  path?: string;
  status?: string;
  kind?: string;
  additions?: number;
  deletions?: number;
  beforeText?: string;
  afterText?: string;
  unifiedDiff?: string;
  text?: string;
};

function fileChangeSummary(row: ChatWaterfallRow): FileChangeSummary {
  const payload = isRecord(row.item.payload) ? row.item.payload : {};
  const changes = Array.isArray(payload.changes)
    ? payload.changes
        .flatMap((entry) => {
          const change = isRecord(entry) ? entry : {};
          const path = stringValue(change.path) ?? stringValue(change.filePath) ?? stringValue(change.name);
          return path
            ? [
                {
                  path,
                  status: stringValue(change.status) ?? stringValue(change.kind) ?? stringValue(change.type),
                  additions: numberValue(change.additions) ?? numberValue(change.added) ?? numberValue(change.addedLines),
                  deletions: numberValue(change.deletions) ?? numberValue(change.deleted) ?? numberValue(change.removedLines)
                }
              ]
            : [];
        })
    : [];
  const primaryPath = stringValue(payload.path) ?? stringValue(payload.filePath) ?? stringValue(payload.name) ?? changes[0]?.path;
  const details = extractFileChangeDetails(row, payload, primaryPath, changes);
  const payloadAdditions = numberValue(payload.additions) ?? numberValue(payload.added) ?? numberValue(payload.addedLines);
  const payloadDeletions = numberValue(payload.deletions) ?? numberValue(payload.deleted) ?? numberValue(payload.removedLines);
  const detailAdditions = sumNumbers(details.map((detail) => detail.additions));
  const detailDeletions = sumNumbers(details.map((detail) => detail.deletions));
  const changeAdditions = sumNumbers(changes.map((change) => change.additions));
  const changeDeletions = sumNumbers(changes.map((change) => change.deletions));
  const detailChanges = details.flatMap((detail) => (detail.path ? [{ path: detail.path, status: detail.status ?? detail.kind, additions: detail.additions, deletions: detail.deletions }] : []));
  return {
    primaryPath,
    status: row.status ?? stringValue(payload.status) ?? changes[0]?.status,
    additions: payloadAdditions ?? changeAdditions ?? detailAdditions ?? 0,
    deletions: payloadDeletions ?? changeDeletions ?? detailDeletions ?? 0,
    changes: changes.length > 0 ? changes : detailChanges
  };
}

function fileChangeDetails(row: ChatWaterfallRow, summary: FileChangeSummary): FileChangeDetail[] {
  const payload = isRecord(row.item.payload) ? row.item.payload : {};
  const details = extractFileChangeDetails(row, payload, summary.primaryPath, summary.changes);
  if (details.length > 0) {
    return details;
  }
  if (summary.changes.length > 0) {
    return summary.changes.map((change) => ({ ...change, kind: change.status }));
  }
  return row.text.trim() ? [{ path: summary.primaryPath, status: summary.status, text: row.text.trim() }] : [];
}

function extractFileChangeDetails(
  row: ChatWaterfallRow,
  payload: Record<string, unknown>,
  primaryPath?: string,
  changes: Array<{ path: string; status?: string; additions?: number; deletions?: number }> = []
): FileChangeDetail[] {
  const details: FileChangeDetail[] = [];

  function addDetail(detail: FileChangeDetail | null) {
    if (!detail) {
      return;
    }
    const hasBody = detail.beforeText != null || detail.afterText != null || Boolean(detail.unifiedDiff?.trim()) || Boolean(detail.text?.trim());
    if (!hasBody && !detail.path && !detail.status && !detail.kind) {
      return;
    }
    details.push(detail);
  }

  addDetail(detailFromRecord(payload, primaryPath));

  const args = isRecord(payload.arguments) ? payload.arguments : null;
  if (args) {
    addDetail(detailFromRecord(args, primaryPath));
  }

  for (const key of ["changes", "fileChanges", "files", "edits", "patches"]) {
    const entries = payload[key];
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (isRecord(entry)) {
        const fallback = firstStringValue(entry, ["path", "filePath", "file_path", "name"]) ?? primaryPath;
        addDetail(detailFromRecord(entry, fallback));
      }
    }
  }

  const rowBody = bodyFromText(row.text);
  if (rowBody) {
    const stats = rowBody.unifiedDiff ? diffLineStats(rowBody.unifiedDiff) : undefined;
    const target = details.find((detail) => !detail.beforeText && !detail.afterText && !detail.unifiedDiff && !detail.text && (detail.path === primaryPath || !detail.path));
    const bodyDetail: FileChangeDetail = {
      path: primaryPath,
      status: row.status,
      additions: stats?.additions,
      deletions: stats?.deletions,
      ...rowBody
    };
    if (target) {
      Object.assign(target, bodyDetail, { path: target.path ?? bodyDetail.path, status: target.status ?? bodyDetail.status });
    } else if (!details.some((detail) => sameDetailBody(detail, bodyDetail))) {
      addDetail(bodyDetail);
    }
  }

  if (details.length === 0 && changes.length > 0) {
    for (const change of changes) {
      addDetail({ ...change, kind: change.status });
    }
  }

  return mergeFileDetails(details, primaryPath);
}

function detailFromRecord(record: Record<string, unknown>, fallbackPath?: string): FileChangeDetail | null {
  const path = firstStringValue(record, ["path", "filePath", "file_path", "name", "filename", "file"])
    ?? firstStringValue(isRecord(record.file) ? record.file : {}, ["path", "name"])
    ?? fallbackPath;
  const status = firstStringValue(record, ["status", "kind", "type", "operation"]);
  const beforeText = firstStringValue(record, ["beforeText", "oldText", "oldContent", "previousText", "originalText", "old_string", "oldString", "before", "original"]);
  const afterText = firstStringValue(record, ["afterText", "newText", "newContent", "updatedText", "content", "new_string", "newString", "after", "replacement"]);
  const rawDiff = firstStringValue(record, ["diff", "patch", "unifiedDiff", "gitDiff"]);
  const rawText = firstStringValue(record, ["text", "body", "message"]);
  const diffBody = rawDiff ? normalizeDiffText(rawDiff) : null;
  const textBody = rawText ? bodyFromText(rawText) : null;
  const stats = beforeText != null || afterText != null
    ? diffTextStats(beforeText ?? "", afterText ?? "", path)
    : diffBody
      ? diffLineStats(diffBody)
      : textBody?.unifiedDiff
        ? diffLineStats(textBody.unifiedDiff)
        : undefined;

  const detail: FileChangeDetail = {
    path,
    status,
    additions: numberValue(record.additions) ?? numberValue(record.added) ?? numberValue(record.addedLines) ?? stats?.additions,
    deletions: numberValue(record.deletions) ?? numberValue(record.deleted) ?? numberValue(record.removedLines) ?? stats?.deletions
  };
  if (beforeText != null || afterText != null) {
    detail.beforeText = beforeText ?? "";
    detail.afterText = afterText ?? "";
  } else if (diffBody) {
    detail.unifiedDiff = diffBody;
  } else if (textBody) {
    Object.assign(detail, textBody);
  }
  return detail;
}

function bodyFromText(text: string): Pick<FileChangeDetail, "unifiedDiff" | "text"> | null {
  const normalized = normalizeDiffText(text);
  if (!normalized) {
    return null;
  }
  if (looksLikeDiff(normalized)) {
    return { unifiedDiff: normalized };
  }
  return { text: normalized };
}

function normalizeDiffText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const fenced = /^```(?:diff|patch)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trimEnd();
}

function looksLikeDiff(text: string): boolean {
  if (/^(diff --git|@@ |index |--- |\+\+\+ )/m.test(text)) {
    return true;
  }
  const stats = diffLineStats(text);
  return stats.additions > 0 || stats.deletions > 0;
}

function mergeFileDetails(details: FileChangeDetail[], primaryPath?: string): FileChangeDetail[] {
  const merged: FileChangeDetail[] = [];
  for (const detail of details) {
    const path = detail.path ?? primaryPath;
    const existingSamePath = merged.find((entry) => (entry.path ?? primaryPath) === path);
    const detailHasBody = detail.beforeText != null || detail.afterText != null || Boolean(detail.unifiedDiff) || Boolean(detail.text);
    const existingHasBody = existingSamePath && (existingSamePath.beforeText != null || existingSamePath.afterText != null || Boolean(existingSamePath.unifiedDiff) || Boolean(existingSamePath.text));
    if (existingSamePath && detailHasBody && !existingHasBody) {
      Object.assign(existingSamePath, detail, { path, status: existingSamePath.status ?? detail.status, kind: existingSamePath.kind ?? detail.kind });
      continue;
    }
    if (existingSamePath && !detailHasBody) {
      existingSamePath.status = existingSamePath.status ?? detail.status;
      existingSamePath.kind = existingSamePath.kind ?? detail.kind;
      existingSamePath.additions = existingSamePath.additions ?? detail.additions;
      existingSamePath.deletions = existingSamePath.deletions ?? detail.deletions;
      continue;
    }
    merged.push({ ...detail, path });
  }
  return merged;
}

function sameDetailBody(left: FileChangeDetail, right: FileChangeDetail): boolean {
  return left.unifiedDiff === right.unifiedDiff && left.text === right.text && left.beforeText === right.beforeText && left.afterText === right.afterText;
}

function diffTextStats(beforeText: string, afterText: string, filePath?: string): { additions: number; deletions: number } | undefined {
  try {
    const lang = guessLangFromPath(filePath);
    const diff = generateDiffFile(filePath ?? "old", beforeText, filePath ?? "new", afterText, lang, lang);
    diff.initRaw();
    return { additions: diff.additionLength, deletions: diff.deletionLength };
  } catch {
    return undefined;
  }
}

function fallbackUnifiedDiff(beforeText: string, afterText: string): string {
  const beforeLines = beforeText.split(/\r?\n/).filter((line) => line.length > 0).map((line) => `-${line}`);
  const afterLines = afterText.split(/\r?\n/).filter((line) => line.length > 0).map((line) => `+${line}`);
  return [...beforeLines, ...afterLines].join("\n");
}

function guessLangFromPath(filePath?: string): string {
  if (!filePath) return "txt";
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    rb: "ruby",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    css: "css",
    scss: "scss",
    html: "html",
    vue: "vue",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    zsh: "bash",
    bash: "bash",
    dockerfile: "dockerfile",
    lua: "lua",
    php: "php",
    dart: "dart"
  };
  return (ext && map[ext]) || "txt";
}

function renderToolPayload(row: ChatWaterfallRow) {
  const payload = isRecord(row.item.payload) ? row.item.payload : null;
  if (!payload) {
    return row.text ? <MarkdownMessage text={row.text} /> : null;
  }
  const args = "arguments" in payload ? payload.arguments : undefined;
  const result = isRecord(payload.result) ? payload.result : null;
  const errorMessage = payload.error == null ? undefined : formatErrorText(payload.error);

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
      {row.text && <MarkdownMessage text={row.text} />}
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

const expandHintButtonSx = {
  borderRadius: 1,
  minWidth: 0,
  px: 0.75,
  color: "text.disabled",
  fontWeight: 650,
  "&:hover": {
    color: "text.secondary",
    bgcolor: "action.hover"
  }
};

function StatusChip({ status }: { status?: string }) {
  if (!status || isSilentStatus(status)) {
    return null;
  }
  return <Chip size="small" label={status} />;
}

function activityStatus(status?: string): { label: string; color: string; live: boolean } {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (["inprogress", "in_progress", "running", "pending", "started", "pendinginit"].includes(normalized)) {
    return { label: "running", color: "#f59e0b", live: true };
  }
  if (["failed", "error", "cancelled", "canceled", "interrupted"].includes(normalized)) {
    return { label: normalized || "failed", color: "#ef4444", live: false };
  }
  return { label: normalized || "completed", color: "#22c55e", live: false };
}

function activitySummary(row: ChatWaterfallRow): { label: string; detail?: string } {
  const payload = isRecord(row.item.payload) ? row.item.payload : {};
  if (row.kind === "commandExecution") {
    return { label: "Bash", detail: commandSummary(payload, row) };
  }
  if (row.kind === "fileChange") {
    const summary = fileChangeSummary(row);
    const label = fileActivityLabel(row, payload);
    const path = summary.primaryPath ?? firstStringValue(payload, ["path", "filePath", "name"]) ?? compactText(row.text);
    const stats = fileChangeStatsLabel(summary.additions, summary.deletions);
    return { label, detail: path ? `${path}${stats ? ` ${stats}` : ""}` : stats };
  }
  const label = toolActivityLabel(row, payload);
  return { label, detail: toolActivityDetail(payload, row) };
}

function commandSummary(payload: Record<string, unknown>, row: ChatWaterfallRow): string | undefined {
  const command = firstStringValue(payload, ["command", "cmd"]);
  if (command) {
    return command;
  }
  const action = isRecord(payload.action) ? payload.action : {};
  const actionCommand = firstStringValue(action, ["command", "cmd"]);
  if (actionCommand) {
    return actionCommand;
  }
  if (Array.isArray(payload.command)) {
    return payload.command.map(String).join(" ");
  }
  return compactText(row.text) || row.title;
}

function fileActivityLabel(row: ChatWaterfallRow, payload: Record<string, unknown>): string {
  const type = [row.title, row.status, firstStringValue(payload, ["type", "kind", "status"])].join(" ").toLowerCase();
  if (type.includes("edit") || type.includes("update") || type.includes("patch") || type.includes("modif") || type.includes("changed")) return "Edited";
  if (type.includes("new") || type.includes("create")) return "Created";
  if (type.includes("write")) return "Wrote";
  if (type.includes("read")) return "Read";
  return "File";
}

function toolActivityLabel(row: ChatWaterfallRow, payload: Record<string, unknown>): string {
  const raw = firstStringValue(payload, ["tool", "name", "method", "namespace"]) ?? row.title;
  const normalized = raw.toLowerCase();
  if (normalized.includes("search") || normalized.includes("grep") || normalized.includes("rg")) return "Search";
  if (normalized.includes("read")) return "Read";
  if (normalized.includes("write")) return "Write";
  if (normalized.includes("edit") || normalized.includes("patch")) return "Edit";
  if (normalized.includes("task") || normalized.includes("agent")) return "ManageTask";
  return toPascalLabel(raw || "Tool");
}

function toolActivityDetail(payload: Record<string, unknown>, row: ChatWaterfallRow): string | undefined {
  const direct = firstStringValue(payload, ["query", "pattern", "path", "filePath", "name"]);
  if (direct) {
    return direct;
  }
  const args = isRecord(payload.arguments) ? payload.arguments : {};
  return firstStringValue(args, ["query", "pattern", "path", "filePath", "cmd", "command", "prompt"]) ?? firstStringValue(payload, ["tool", "method"]) ?? compactText(row.text) ?? row.title;
}

function firstStringValue(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function compactText(value: string): string | undefined {
  const compact = value.trim().split(/\r?\n/).find((line) => line.trim())?.trim();
  return compact || undefined;
}

function toPascalLabel(value: string): string {
  return value
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("") || "Tool";
}

function isSilentStatus(status: string): boolean {
  return ["completed", "complete", "done", "success", "shutdown"].includes(status.trim().toLowerCase());
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

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
  }
  return undefined;
}

function sumNumbers(values: Array<number | undefined>): number | undefined {
  const present = values.filter((value): value is number => value != null);
  return present.length > 0 ? present.reduce((total, value) => total + value, 0) : undefined;
}

function diffLineStats(text: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) {
      additions += 1;
    } else if (line.startsWith("-")) {
      deletions += 1;
    }
  }
  return { additions, deletions };
}

function fileChangeStatsLabel(additions: number, deletions: number): string {
  if (additions === 0 && deletions === 0) {
    return "";
  }
  return `(+${additions} -${deletions})`;
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
  const previewLineCount = 1;
  const collapsible = lines.length > previewLineCount || normalized.length > 240;
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

function formatStartedAt(startedAt?: number): string | null {
  if (!startedAt) {
    return null;
  }
  const milliseconds = startedAt > 1_000_000_000_000 ? startedAt : startedAt * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatFirstToken(startedAt?: number, firstTokenAt?: number): string | null {
  if (!startedAt || !firstTokenAt) {
    return null;
  }
  const seconds = Math.max(0, firstTokenAt - startedAt);
  return `first ${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds).toString()}s`;
}

function formatAssistantUsageSummary(row: ChatWaterfallRow): string | null {
  const usage = row.tokenUsage;
  if (!usage) {
    return null;
  }
  const cacheHitRate = usage.inputTokens > 0 ? usage.cachedInputTokens / usage.inputTokens : 0;
  const parts = [`in ${formatCompactNumber(usage.inputTokens)}`, `out ${formatCompactNumber(usage.outputTokens)}`, `hit ${(cacheHitRate * 100).toFixed(1)}%`];
  const startedAt = row.startedAt;
  if (startedAt && usage.outputTokens > 0) {
    const nowSeconds = Date.now() / 1000;
    const completedAt = row.completedAt ?? nowSeconds;
    const durationSeconds = Math.max(1, completedAt - startedAt);
    const tokensPerSecond = usage.outputTokens / durationSeconds;
    parts.push(`${tokensPerSecond.toFixed(tokensPerSecond >= 10 ? 1 : 2)} tok/s`);
  }
  if (usage.estimatedCostUsd != null) {
    parts.push(`cost ${formatUsd(usage.estimatedCostUsd)}`);
  }
  return parts.join(" · ");
}

function assistantUsageDetails(row: ChatWaterfallRow): string[] | null {
  const usage = row.tokenUsage;
  if (!usage) {
    return null;
  }
  const inputBillable = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteInputTokens);
  const cacheHitRate = usage.inputTokens > 0 ? usage.cachedInputTokens / usage.inputTokens : 0;
  const details = [
    `input ${formatCompactNumber(usage.inputTokens)}`,
    `output ${formatCompactNumber(usage.outputTokens)}`,
    `cached ${formatCompactNumber(usage.cachedInputTokens)}`,
    `cache write ${formatCompactNumber(usage.cacheWriteInputTokens)}`,
    `cache hit ${(cacheHitRate * 100).toFixed(1)}%`,
    `billable input ${formatCompactNumber(inputBillable)}`,
    speedDetail(row)
  ].filter((detail): detail is string => Boolean(detail));
  if (usage.estimatedCostUsd != null) {
    if (usage.costBreakdownUsd) {
      details.push(`input cost ${formatUsd(usage.costBreakdownUsd.input)}`);
      details.push(`cached cost ${formatUsd(usage.costBreakdownUsd.cachedInput)}`);
      details.push(`write cost ${formatUsd(usage.costBreakdownUsd.cacheWrite)}`);
      details.push(`output cost ${formatUsd(usage.costBreakdownUsd.output)}`);
    }
    details.push(`total ${formatUsd(usage.estimatedCostUsd)}`);
  }
  return details;
}

function speedDetail(row: ChatWaterfallRow): string | null {
  const usage = row.tokenUsage;
  if (!usage || !row.startedAt || usage.outputTokens <= 0) {
    return null;
  }
  const completedAt = row.completedAt ?? Date.now() / 1000;
  const durationSeconds = Math.max(1, completedAt - row.startedAt);
  const tokensPerSecond = usage.outputTokens / durationSeconds;
  return `speed ${tokensPerSecond.toFixed(tokensPerSecond >= 10 ? 1 : 2)} tok/s`;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatUsd(value: number): string {
  if (value <= 0) {
    return "$0.0000";
  }
  return `$${value.toFixed(value < 0.01 ? 6 : 4)}`;
}
