import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import StopIcon from "@mui/icons-material/Stop";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BoltIcon from "@mui/icons-material/Bolt";
import ChecklistIcon from "@mui/icons-material/Checklist";
import EditNoteIcon from "@mui/icons-material/EditNote";
import FlagIcon from "@mui/icons-material/Flag";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PanToolAltIcon from "@mui/icons-material/PanToolAlt";
import RateReviewIcon from "@mui/icons-material/RateReview";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { alpha } from "@mui/material/styles";
import { permissionPresets, type PermissionPresetId } from "@codex-ui/shared";
import type { ComposerImageAttachment, ComposerMention } from "../state/codexClient";
import { themeVisualTuning, type ThemePlugin } from "../theme";
import type { TranslateFn } from "../i18n";

type Props = {
  cwd: string;
  permission: PermissionPresetId;
  disabled: boolean;
  pendingMention: ComposerMention | null;
  suggestedPrompt?: { id: string; text: string } | null;
  activeThemePlugin?: ThemePlugin | null;
  backgroundImage?: string;
  sendBlockedReason?: string;
  sessionToken?: string | null;
  t: TranslateFn;
  modeBadges?: {
    fast: boolean;
    plan: boolean;
    goalActive: boolean;
  };
  dangerBypassConfirmed: boolean;
  running?: boolean;
  workingStatus?: ComposerWorkingStatus | null;
  statusLabel?: string;
  onMentionConsumed: () => void;
  onUserActivity?: () => void;
  onSuggestedPromptConsumed?: () => void;
  onStop?: () => void;
  onSend: (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[]) => void;
};

export type ComposerWorkingStatus = {
  active: boolean;
  startedAt: number;
  backgroundTerminalCount: number;
};

const MAX_COMPOSER_IMAGE_BYTES = 64 * 1024 * 1024;
const MAX_COMPOSER_IMAGE_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_COMPOSER_FILE_BYTES = 64 * 1024 * 1024;
const MAX_COMPOSER_FILE_TOTAL_BYTES = 192 * 1024 * 1024;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
const SUPPORTED_FILE_EXTENSIONS = new Set([
  ...SUPPORTED_IMAGE_EXTENSIONS,
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "ppt",
  "pptx",
  "txt",
  "md",
  "json"
]);
const COMPOSER_HISTORY_STORAGE_KEY = "codex-react-ui.composer-input-history";
const MAX_COMPOSER_HISTORY = 100;

export function Composer({
  cwd,
  permission,
  disabled,
  pendingMention,
  suggestedPrompt,
  activeThemePlugin,
  backgroundImage,
  sendBlockedReason,
  sessionToken,
  t,
  modeBadges = { fast: false, plan: false, goalActive: false },
  dangerBypassConfirmed,
  running = false,
  workingStatus,
  statusLabel,
  onMentionConsumed,
  onUserActivity,
  onSuggestedPromptConsumed,
  onStop,
  onSend
}: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ComposerImageAttachment[]>([]);
  const [mentions, setMentions] = useState<ComposerMention[]>([]);
  const [imageError, setImageError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [inputHistory, setInputHistory] = useState<string[]>(() => loadComposerInputHistory());
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftBeforeHistoryRef = useRef("");
  const dragDepthRef = useRef(0);
  const selectedPreset = useMemo(() => permissionPresets.find((preset) => preset.id === permission), [permission]);
  const dangerBlocked = permission === "dangerBypass" && !dangerBypassConfirmed;
  const slashCommandDraft = text.trim().startsWith("/") && !text.trim().startsWith("//") && images.length === 0 && mentions.length === 0;
  const sendBlocked = disabled || dangerBlocked || (Boolean(sendBlockedReason) && !slashCommandDraft);
  const dangerNotice =
    selectedPreset?.severity === "critical"
      ? t("composer.fullAutoNotice")
      : "";
  const hasContent = text.trim().length > 0 || images.length > 0;
  const imageTotalBytes = images.reduce((total, image) => total + image.size, 0);
  const permissionShortLabel = selectedPreset?.label ?? permission;

  useEffect(() => {
    if (!pendingMention) {
      return;
    }
    setText((current) => (current.trim().length === 0 ? `${pendingMention.token} ` : `${current.trimEnd()} ${pendingMention.token} `));
    setMentions((current) => {
      const existing = current.some((entry) => entry.path === pendingMention.path);
      return existing ? current : [...current, pendingMention];
    });
    onMentionConsumed();
  }, [onMentionConsumed, pendingMention]);

  useEffect(() => {
    if (!suggestedPrompt) {
      return;
    }
    setText(suggestedPrompt.text);
    setHistoryCursor(null);
    draftBeforeHistoryRef.current = "";
    onUserActivity?.();
    onSuggestedPromptConsumed?.();
  }, [onSuggestedPromptConsumed, onUserActivity, suggestedPrompt]);

  const composerBackdrop = safeThemeAssetUrl(
    backgroundImage ?? activeThemePlugin?.assets?.composerBackgroundImage ?? activeThemePlugin?.assets?.cornerImage ?? activeThemePlugin?.assets?.heroImage ?? activeThemePlugin?.assets?.appBackgroundImage
  );
  const themeTuning = themeVisualTuning(activeThemePlugin);

  return (
    <Box
      onDragEnter={(event) => {
        if (disabled || !hasSupportedFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (disabled || !hasSupportedFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (disabled || !hasSupportedFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        if (disabled || !hasSupportedFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current = 0;
        setDragActive(false);
        void addAttachments(event.dataTransfer.files);
      }}
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.panelSurfaceOpacity),
        backgroundImage: composerBackdrop
          ? (theme) =>
              [
                `linear-gradient(135deg, ${alpha(theme.palette.background.paper, Math.min(0.9, themeTuning.heroOverlayOpacity + 0.12))}, ${alpha(theme.palette.background.paper, themeTuning.heroOverlayOpacity)})`,
                `url("${composerBackdrop}")`
              ].join(", ")
          : undefined,
        backgroundSize: composerBackdrop ? "cover" : undefined,
        backgroundPosition: composerBackdrop ? "center" : undefined,
        backdropFilter: `blur(${themeTuning.blurStrength}px)`,
        outline: dragActive ? "2px solid" : "0 solid",
        outlineColor: "primary.main",
        outlineOffset: dragActive ? -4 : 0,
        transition: "outline-color 120ms ease, outline-width 120ms ease"
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5}>
          <Chip
            size="small"
            color={running ? "primary" : statusLabel === "idle" ? "success" : statusLabel === "disconnect" || statusLabel === "engine-error" ? "error" : statusLabel === "retrying" ? "warning" : "default"}
            variant={running ? "filled" : "outlined"}
            label={statusLabel ?? (running ? t("composer.running") : t("composer.ready"))}
            data-testid="composer-turn-status"
            sx={{ height: 28, fontWeight: 800 }}
          />
          {workingStatus?.active && <ComposerWorkingIndicator status={workingStatus} t={t} />}
          <Tooltip
            arrow
            placement="top-end"
            title={
              <Box sx={{ maxWidth: 320 }}>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 800 }}>
                  {t("composer.setup")}
                </Typography>
                <Typography variant="caption" sx={{ display: "block" }}>
                  {t("composer.workspace", { cwd })}
                </Typography>
                <Typography variant="caption" sx={{ display: "block" }}>
                  {t("composer.permissions", { permission: selectedPreset?.label ?? permission })}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.82 }}>
                  {t("composer.setupDescription")}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.75, fontWeight: 800 }}>
                  {t("composer.shortcuts")}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", opacity: 0.82 }}>
                  {t("composer.shortcutsDescription")}
                </Typography>
              </Box>
            }
          >
            <IconButton size="small" aria-label={t("composer.setupHelp")} sx={{ borderRadius: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {dangerNotice && (
            <Tooltip arrow placement="top-end" title={dangerNotice}>
              <IconButton
                size="small"
                aria-label={t("composer.fullAutoWarning")}
                color="error"
                sx={{ borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.18 : 0.1) }}
              >
                <WarningAmberIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {sendBlockedReason && (
            <Tooltip arrow placement="top-end" title={sendBlockedReason}>
              <IconButton
                size="small"
                aria-label={t("composer.statusNotice")}
                color="info"
                sx={{ borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.18 : 0.1) }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {imageError && (
          <Alert severity="warning" onClose={() => setImageError("")}>
            {imageError}
          </Alert>
        )}
        {(modeBadges.fast || modeBadges.plan || modeBadges.goalActive) && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap data-testid="composer-command-badges">
            {modeBadges.fast && <Chip size="small" color="warning" icon={<BoltIcon />} label={t("composer.fastBadge")} data-testid="composer-fast-badge" />}
            {modeBadges.plan && <Chip size="small" color="primary" icon={<ChecklistIcon />} label={t("composer.planBadge")} data-testid="composer-plan-badge" />}
            {modeBadges.goalActive && <Chip size="small" color="success" variant="outlined" icon={<FlagIcon />} label={t("composer.goalBadge")} data-testid="composer-goal-badge" />}
          </Stack>
        )}
        <Box sx={{ position: "relative" }}>
          <TextField
            multiline
            minRows={3}
            maxRows={8}
            placeholder={t("composer.placeholder")}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setHistoryCursor(null);
              draftBeforeHistoryRef.current = "";
              if (event.target.value.length > 0) {
                onUserActivity?.();
              }
            }}
            onKeyDown={handleTextFieldKeyDown}
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                alignItems: "flex-start",
                px: 1.5,
                pt: 1,
                pb: 6.5
              },
              "& textarea": {
                fontSize: 15,
                lineHeight: 1.65
              }
            }}
          />
          <Tooltip title={t("composer.attachTooltip")}>
            <span>
              <IconButton
                size="small"
                aria-label={t("composer.attachTooltip")}
                disabled={disabled}
                onClick={(event) => setMenuAnchorEl(event.currentTarget)}
                sx={{
                  position: "absolute",
                  left: 12,
                  bottom: 10,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) => alpha(theme.palette.background.paper, 0.94),
                  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                  "&:hover": {
                    bgcolor: "background.paper"
                  }
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Box
            sx={{
              position: "absolute",
              left: 58,
              right: running ? 164 : 118,
              bottom: 10,
              height: 36,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              color: "text.secondary",
              pointerEvents: "none",
              minWidth: 0
            }}
          >
            <PanToolAltIcon sx={{ fontSize: 18, flex: "0 0 auto" }} />
            <Typography
              variant="body2"
              sx={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "text.secondary"
              }}
            >
              {permissionShortLabel}
            </Typography>
          </Box>
          <Tooltip
            title={
              running
                ? t("composer.append")
                : images.length > 0
                ? t("composer.imageSummary", {
                    count: images.length,
                    imageLabel: t(images.length === 1 ? "composer.imageOne" : "composer.imageOther"),
                    bytes: formatBytes(imageTotalBytes)
                  })
                : selectedPreset?.description ?? ""
            }
          >
            <span>
              <IconButton
                color="primary"
                aria-label={running ? t("composer.append") : t("composer.send")}
                disabled={sendBlocked || !hasContent}
                onClick={() => {
                  onUserActivity?.();
                  submitComposer(text, images, mentions);
                }}
                sx={{
                  position: "absolute",
                  right: 12,
                  bottom: 10,
                  width: 40,
                  height: 40,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? theme.palette.primary.main : "#111827",
                  color: "#fff",
                  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? theme.palette.primary.dark : "#020617"
                  },
                  "&.Mui-disabled": {
                    bgcolor: "action.disabledBackground",
                    color: "action.disabled"
                  }
                }}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {running && (
            <Tooltip title={t("composer.stop")}>
              <span>
                <IconButton
                  color="error"
                  aria-label={t("composer.stop")}
                  disabled={!onStop}
                  onClick={() => onStop?.()}
                  sx={{
                    position: "absolute",
                    right: 58,
                    bottom: 12,
                    width: 36,
                    height: 36,
                    bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.24 : 0.12),
                    color: "error.main",
                    border: "1px solid",
                    borderColor: (theme) => alpha(theme.palette.error.main, 0.38),
                    "&:hover": {
                      bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.32 : 0.18)
                    }
                  }}
                >
                  <StopIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
        {images.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
            {images.map((image) => (
              <Box
                key={image.id}
                sx={{
                  width: 112,
                  flex: "0 0 auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: "background.default"
                }}
              >
                <Box sx={{ position: "relative", aspectRatio: "4 / 3", display: "grid", placeItems: "center" }}>
                  {(image.kind ?? "image") === "image" ? (
                    <Box
                      component="img"
                      src={image.url}
                      alt={image.name}
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <DescriptionIcon color="action" sx={{ fontSize: 36 }} />
                  )}
                  <IconButton
                    size="small"
                    aria-label={`Remove ${image.name}`}
                    onClick={() => setImages((current) => current.filter((entry) => entry.id !== image.id))}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      bgcolor: "rgba(255,255,255,0.9)",
                      "&:hover": { bgcolor: "background.paper" }
                    }}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                </Box>
                <Typography
                  variant="caption"
                  title={image.name}
                  sx={{ display: "block", px: 0.75, py: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {image.name}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.json"
          multiple
          hidden
          onChange={(event) => {
            void addAttachments(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                width: { xs: "calc(100vw - 48px)", sm: 420 },
                maxWidth: 520,
                borderRadius: 3,
                p: 1,
                boxShadow: "0 20px 50px rgba(15, 23, 42, 0.18)"
              }
            }
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, py: 0.75 }}>
            {t("composer.menu.add")}
          </Typography>
          <MenuItem
            disabled={disabled}
            onClick={() => {
              setMenuAnchorEl(null);
              fileInputRef.current?.click();
            }}
            sx={{ borderRadius: 2, minHeight: 42 }}
          >
            <ImageIcon fontSize="small" style={{ marginRight: 14 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">{t("composer.imageButton")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t("composer.attachTooltip")}
              </Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ my: 0.75 }} />
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, py: 0.75 }}>
            {t("composer.menu.commands")}
          </Typography>
          <ComposerMenuItem icon={<BoltIcon fontSize="small" />} label="/fast" detail={t("composer.fastTooltip")} disabled={disabled} onClick={() => runSlashCommandShortcut("/fast")} />
          <ComposerMenuItem icon={<AssessmentIcon fontSize="small" />} label="/status" detail={t("composer.statusTooltip")} disabled={disabled} onClick={() => runSlashCommandShortcut("/status")} />
          <ComposerMenuItem icon={<FlagIcon fontSize="small" />} label="/goal" detail={t("composer.goalTooltip")} disabled={disabled} onClick={() => setSlashTemplate("/goal ")} />
          <ComposerMenuItem icon={<ChecklistIcon fontSize="small" />} label="/plan" detail={t("composer.planTooltip")} disabled={disabled} onClick={() => runSlashCommandShortcut(modeBadges.plan ? "/plan off" : "/plan")} />
          <ComposerMenuItem icon={<RateReviewIcon fontSize="small" />} label="/review" detail={t("composer.reviewTooltip")} disabled={disabled} onClick={() => runSlashCommandShortcut("/review")} />
          <ComposerMenuItem icon={<EditNoteIcon fontSize="small" />} label="/rename" detail={t("composer.renameTooltip")} disabled={disabled} onClick={() => setSlashTemplate("/rename ")} />
        </Menu>
      </Stack>
    </Box>
  );

  function runSlashCommandShortcut(command: string): void {
    setMenuAnchorEl(null);
    onUserActivity?.();
    rememberComposerInput(command);
    onSend(command, [], []);
  }

  function submitComposer(value: string, nextImages: ComposerImageAttachment[], nextMentions: ComposerMention[]): void {
    rememberComposerInput(value);
    onSend(value, nextImages, nextMentions);
    setText("");
    setImages([]);
    setMentions([]);
    setHistoryCursor(null);
    draftBeforeHistoryRef.current = "";
  }

  function rememberComposerInput(value: string): void {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    setInputHistory((current) => {
      const withoutDuplicateTail = current[current.length - 1] === normalized ? current.slice(0, -1) : current;
      const next = [...withoutDuplicateTail, normalized].slice(-MAX_COMPOSER_HISTORY);
      saveComposerInputHistory(next);
      return next;
    });
  }

  function handleTextFieldKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target || target.tagName !== "TEXTAREA") {
      return;
    }
    if (event.key === "Escape" && running && onStop) {
      event.preventDefault();
      onStop();
      return;
    }
    const nativeEvent = event.nativeEvent as { isComposing?: boolean };
    if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !nativeEvent.isComposing) {
      if (!sendBlocked && hasContent) {
        event.preventDefault();
        onUserActivity?.();
        submitComposer(text, images, mentions);
      }
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const direction = event.key === "ArrowUp" ? -1 : 1;
    if (!shouldUseHistoryNavigation(target, direction, historyCursor !== null)) {
      return;
    }
    navigateComposerHistory(direction, target, event);
  }

  function navigateComposerHistory(direction: -1 | 1, target: HTMLTextAreaElement, event: KeyboardEvent<HTMLDivElement>): void {
    if (inputHistory.length === 0) {
      return;
    }
    if (direction === 1 && historyCursor === null) {
      return;
    }
    event.preventDefault();
    if (historyCursor === null) {
      draftBeforeHistoryRef.current = text;
    }
    const nextCursor =
      direction === -1
        ? historyCursor === null
          ? inputHistory.length - 1
          : Math.max(0, historyCursor - 1)
        : historyCursor === null
        ? null
        : historyCursor >= inputHistory.length - 1
        ? null
        : historyCursor + 1;
    const nextText = nextCursor === null ? draftBeforeHistoryRef.current : inputHistory[nextCursor] ?? "";
    setHistoryCursor(nextCursor);
    setText(nextText);
    setTimeout(() => {
      target.setSelectionRange(nextText.length, nextText.length);
    }, 0);
  }

  function setSlashTemplate(command: string): void {
    setMenuAnchorEl(null);
    onUserActivity?.();
    setHistoryCursor(null);
    draftBeforeHistoryRef.current = "";
    setText((current) => (current.trim().length === 0 || current.trim().startsWith("/") ? command : `${current.trimEnd()}\n${command}`));
  }

  async function addAttachments(fileList: FileList | File[] | null): Promise<void> {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList);
    const rejected: string[] = [];
    const accepted: File[] = [];
    let nextTotalBytes = images.reduce((total, image) => total + image.size, 0);

    for (const file of files) {
      if (!isSupportedAttachmentFile(file)) {
        rejected.push(`${file.name || "file"}: unsupported file type`);
        continue;
      }
      const isImage = isSupportedImageFile(file);
      const maxBytes = isImage ? MAX_COMPOSER_IMAGE_BYTES : MAX_COMPOSER_FILE_BYTES;
      if (file.size > maxBytes) {
        rejected.push(`${file.name || "file"}: ${formatBytes(file.size)} exceeds ${formatBytes(maxBytes)}`);
        continue;
      }
      if (nextTotalBytes + file.size > MAX_COMPOSER_FILE_TOTAL_BYTES) {
        rejected.push(`${file.name || "file"}: selected attachments would exceed ${formatBytes(MAX_COMPOSER_FILE_TOTAL_BYTES)}`);
        continue;
      }
      nextTotalBytes += file.size;
      accepted.push(file);
    }

    if (rejected.length > 0) {
      setImageError(rejected.slice(0, 3).join("; ") + (rejected.length > 3 ? `; +${rejected.length - 3} more` : ""));
    } else {
      setImageError("");
    }
    const next = await Promise.all(accepted.map((file) => readAttachmentFile(file, sessionToken, cwd)));
    if (next.length > 0) {
      onUserActivity?.();
    }
    setImages((current) => [...current, ...next]);
  }
}

function ComposerWorkingIndicator({ status, t }: { status: ComposerWorkingStatus; t: TranslateFn }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = formatElapsed(now - status.startedAt);
  const terminalSegment =
    status.backgroundTerminalCount > 0
      ? t("chat.working.backgroundTerminals", { count: status.backgroundTerminalCount })
      : t("chat.working.noBackgroundTerminals");
  const label = `Working ${elapsed}`;
  const fullLabel = `${label} · ${terminalSegment} · ${t("chat.working.psHint")} · ${t("chat.working.stopHint")}`;

  return (
    <Tooltip title={fullLabel} arrow placement="top">
      <Stack
        data-testid="composer-working-indicator"
        role="status"
        aria-live="polite"
        aria-label={fullLabel}
        direction="row"
        spacing={0.65}
        alignItems="center"
        sx={{
          minWidth: 0,
          height: 28,
          px: 0.75,
          borderRadius: 999,
          color: "text.secondary",
          bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.045 : 0.035)
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "primary.main",
            boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.primary.main, 0.34)}`,
            animation: "composerWorkingPulse 1400ms ease-in-out infinite",
            "@keyframes composerWorkingPulse": {
              "0%": { transform: "scale(0.88)", opacity: 0.7, boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.primary.main, 0.3)}` },
              "55%": { transform: "scale(1.12)", opacity: 1, boxShadow: (theme) => `0 0 0 6px ${alpha(theme.palette.primary.main, 0)}` },
              "100%": { transform: "scale(0.88)", opacity: 0.7, boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}` }
            }
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 760, color: "text.secondary", whiteSpace: "nowrap", lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            maxWidth: { xs: 74, sm: 190 },
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "text.disabled",
            lineHeight: 1
          }}
        >
          {terminalSegment} · /ps · /stop
        </Typography>
      </Stack>
    </Tooltip>
  );
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function ComposerMenuItem({
  icon,
  label,
  detail,
  disabled,
  onClick
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <MenuItem disabled={disabled} onClick={onClick} sx={{ borderRadius: 2, minHeight: 44 }}>
      <Box sx={{ mr: 1.75, width: 20, height: 20, display: "grid", placeItems: "center", color: "text.secondary", flex: "0 0 auto" }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {detail}
        </Typography>
      </Box>
    </MenuItem>
  );
}

async function readAttachmentFile(file: File, sessionToken: string | null | undefined, cwd: string): Promise<ComposerImageAttachment> {
  if (isSupportedImageFile(file)) {
    return readImageFile(file);
  }
  const uploaded = sessionToken ? await uploadAttachmentFile(file, sessionToken, cwd) : null;
  return {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${file.name}-${Date.now()}-${Math.random()}`,
    name: file.name,
    url: uploaded?.path ?? "",
    path: uploaded?.path,
    size: file.size,
    mediaType: uploaded?.mediaType ?? fileMediaType(file),
    kind: "file"
  };
}

async function readImageFile(file: File): Promise<ComposerImageAttachment> {
  const mediaType = imageMediaType(file);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      if (file.type || !mediaType.startsWith("image/")) {
        resolve(result);
        return;
      }
      const [, payload] = result.split(",", 2);
      resolve(payload ? `data:${mediaType};base64,${payload}` : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
  return {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${file.name}-${Date.now()}-${Math.random()}`,
    name: file.name,
    url,
    size: file.size,
    mediaType,
    kind: "image"
  };
}

async function uploadAttachmentFile(file: File, sessionToken: string, cwd: string): Promise<{ path: string; mediaType: string; size: number } | null> {
  const form = new FormData();
  form.set("file", file);
  form.set("cwd", cwd);
  const response = await fetch("/api/attachments/upload", {
    method: "POST",
    headers: {
      "x-codex-ui-token": sessionToken
    },
    body: form
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Attachment upload failed (${response.status})`);
  }
  const body = await response.json() as { path?: string; mediaType?: string; size?: number };
  if (!body.path) {
    throw new Error("Attachment upload failed: missing saved path");
  }
  return {
    path: body.path,
    mediaType: body.mediaType ?? fileMediaType(file),
    size: body.size ?? file.size
  };
}

function hasSupportedFiles(dataTransfer: DataTransfer): boolean {
  if (dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some((item) => item.kind === "file");
  }
  return Array.from(dataTransfer.files).some(isSupportedAttachmentFile);
}

function isSupportedAttachmentFile(file: File): boolean {
  return isSupportedImageFile(file) || SUPPORTED_FILE_EXTENSIONS.has(fileExtension(file.name));
}

function isSupportedImageFile(file: File): boolean {
  return file.type.startsWith("image/") || SUPPORTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

function imageMediaType(file: File): string {
  if (file.type.startsWith("image/")) {
    return file.type;
  }
  const extension = fileExtension(file.name);
  if (extension === "jpg") {
    return "image/jpeg";
  }
  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return `image/${extension}`;
  }
  return "image/*";
}

function fileMediaType(file: File): string {
  if (file.type) {
    return file.type;
  }
  switch (fileExtension(file.name)) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "csv":
      return "text/csv";
    case "md":
      return "text/markdown";
    case "json":
      return "application/json";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function fileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
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

function safeThemeAssetUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || /["'()\\]/.test(trimmed)) {
    return undefined;
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  return undefined;
}

function loadComposerInputHistory(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPOSER_HISTORY_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).slice(-MAX_COMPOSER_HISTORY);
  } catch {
    return [];
  }
}

function saveComposerInputHistory(history: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(COMPOSER_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_COMPOSER_HISTORY)));
  } catch {
    // Ignore storage quota/private-mode failures; in-memory history still works for this session.
  }
}

function shouldUseHistoryNavigation(textarea: HTMLTextAreaElement, direction: -1 | 1, browsingHistory: boolean): boolean {
  if (browsingHistory) {
    return true;
  }
  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  if (selectionStart !== selectionEnd) {
    return false;
  }
  const value = textarea.value;
  if (direction === -1) {
    return !value.slice(0, selectionStart).includes("\n");
  }
  return !value.slice(selectionStart).includes("\n");
}
