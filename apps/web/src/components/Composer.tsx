import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BoltIcon from "@mui/icons-material/Bolt";
import ChecklistIcon from "@mui/icons-material/Checklist";
import EditNoteIcon from "@mui/icons-material/EditNote";
import FlagIcon from "@mui/icons-material/Flag";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  t: TranslateFn;
  modeBadges?: {
    fast: boolean;
    plan: boolean;
    goalActive: boolean;
  };
  dangerBypassConfirmed: boolean;
  onMentionConsumed: () => void;
  onUserActivity?: () => void;
  onSuggestedPromptConsumed?: () => void;
  onSend: (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[]) => void;
};

const MAX_COMPOSER_IMAGE_BYTES = 64 * 1024 * 1024;
const MAX_COMPOSER_IMAGE_TOTAL_BYTES = 128 * 1024 * 1024;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

export function Composer({
  cwd,
  permission,
  disabled,
  pendingMention,
  suggestedPrompt,
  activeThemePlugin,
  backgroundImage,
  sendBlockedReason,
  t,
  modeBadges = { fast: false, plan: false, goalActive: false },
  dangerBypassConfirmed,
  onMentionConsumed,
  onUserActivity,
  onSuggestedPromptConsumed,
  onSend
}: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ComposerImageAttachment[]>([]);
  const [mentions, setMentions] = useState<ComposerMention[]>([]);
  const [imageError, setImageError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const selectedPreset = useMemo(() => permissionPresets.find((preset) => preset.id === permission), [permission]);
  const dangerBlocked = permission === "dangerBypass" && !dangerBypassConfirmed;
  const sendBlocked = disabled || Boolean(sendBlockedReason) || dangerBlocked;
  const dangerNotice =
    selectedPreset?.severity === "critical"
      ? t("composer.fullAutoNotice")
      : "";
  const hasContent = text.trim().length > 0 || images.length > 0;
  const imageTotalBytes = images.reduce((total, image) => total + image.size, 0);

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
        if (disabled || !hasImageFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (disabled || !hasImageFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (disabled || !hasImageFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        if (disabled || !hasImageFiles(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        dragDepthRef.current = 0;
        setDragActive(false);
        void addImages(event.dataTransfer.files);
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
        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
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
        <TextField
          multiline
          minRows={3}
          maxRows={8}
          placeholder={t("composer.placeholder")}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (event.target.value.length > 0) {
              onUserActivity?.();
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              alignItems: "flex-start",
              px: 1.5,
              py: 1
            },
            "& textarea": {
              fontSize: 15,
              lineHeight: 1.65
            }
          }}
        />
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          data-testid="composer-slash-shortcuts"
          sx={{
            alignItems: "center",
            "& .MuiButton-root": {
              minHeight: 30,
              borderRadius: 1,
              px: 1
            }
          }}
        >
          <Tooltip title={t("composer.fastTooltip")}>
            <span>
              <Button
                size="small"
                variant={modeBadges.fast ? "contained" : "outlined"}
                color="warning"
                startIcon={<BoltIcon />}
                disabled={disabled}
                onClick={() => runSlashCommandShortcut("/fast")}
              >
                /fast
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t("composer.statusTooltip")}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AssessmentIcon />}
                disabled={disabled}
                onClick={() => runSlashCommandShortcut("/status")}
              >
                /status
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t("composer.goalTooltip")}>
            <span>
              <Button
                size="small"
                variant={modeBadges.goalActive ? "contained" : "outlined"}
                color="success"
                startIcon={<FlagIcon />}
                disabled={disabled}
                onClick={() => setSlashTemplate("/goal ")}
              >
                /goal
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t("composer.planTooltip")}>
            <span>
              <Button
                size="small"
                variant={modeBadges.plan ? "contained" : "outlined"}
                color="primary"
                startIcon={<ChecklistIcon />}
                disabled={disabled}
                onClick={() => runSlashCommandShortcut(modeBadges.plan ? "/plan off" : "/plan")}
              >
                /plan
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t("composer.reviewTooltip")}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RateReviewIcon />}
                disabled={disabled}
                onClick={() => runSlashCommandShortcut("/review")}
              >
                /review
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t("composer.renameTooltip")}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditNoteIcon />}
                disabled={disabled}
                onClick={() => setSlashTemplate("/rename ")}
              >
                /rename
              </Button>
            </span>
          </Tooltip>
        </Stack>
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
                <Box sx={{ position: "relative", aspectRatio: "4 / 3" }}>
                  <Box
                    component="img"
                    src={image.url}
                    alt={image.name}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
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
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: { sm: "0 0 auto" } }}>
            <Tooltip title={t("composer.attachTooltip")}>
              <span>
                <Button size="small" startIcon={<ImageIcon />} disabled={disabled} onClick={() => fileInputRef.current?.click()}>
                  {t("composer.imageButton")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) => {
                    void addImages(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </span>
            </Tooltip>
            <Box sx={{ flex: 1, display: { xs: "block", sm: "none" } }} />
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              disabled={sendBlocked || !hasContent}
              onClick={() => {
                onUserActivity?.();
                onSend(text, images, mentions);
                setText("");
                setImages([]);
                setMentions([]);
              }}
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              {t("composer.send")}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {images.length > 0
              ? t("composer.imageSummary", {
                  count: images.length,
                  imageLabel: t(images.length === 1 ? "composer.imageOne" : "composer.imageOther"),
                  bytes: formatBytes(imageTotalBytes)
                })
              : ""}
            {selectedPreset?.description}
          </Typography>
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            disabled={sendBlocked || !hasContent}
            onClick={() => {
              onUserActivity?.();
              onSend(text, images, mentions);
              setText("");
              setImages([]);
              setMentions([]);
            }}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            {t("composer.send")}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  function runSlashCommandShortcut(command: string): void {
    onUserActivity?.();
    onSend(command, [], []);
  }

  function setSlashTemplate(command: string): void {
    onUserActivity?.();
    setText((current) => (current.trim().length === 0 || current.trim().startsWith("/") ? command : `${current.trimEnd()}\n${command}`));
  }

  async function addImages(fileList: FileList | File[] | null): Promise<void> {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList);
    const rejected: string[] = [];
    const accepted: File[] = [];
    let nextTotalBytes = imageTotalBytes;

    for (const file of files) {
      if (!isSupportedImageFile(file)) {
        rejected.push(`${file.name || "file"}: unsupported image type`);
        continue;
      }
      if (file.size > MAX_COMPOSER_IMAGE_BYTES) {
        rejected.push(`${file.name || "image"}: ${formatBytes(file.size)} exceeds ${formatBytes(MAX_COMPOSER_IMAGE_BYTES)}`);
        continue;
      }
      if (nextTotalBytes + file.size > MAX_COMPOSER_IMAGE_TOTAL_BYTES) {
        rejected.push(`${file.name || "image"}: selected images would exceed ${formatBytes(MAX_COMPOSER_IMAGE_TOTAL_BYTES)}`);
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
    const next = await Promise.all(accepted.map(readImageFile));
    if (next.length > 0) {
      onUserActivity?.();
    }
    setImages((current) => [...current, ...next]);
  }
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
    mediaType
  };
}

function hasImageFiles(dataTransfer: DataTransfer): boolean {
  if (dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some((item) => item.kind === "file" && (item.type.startsWith("image/") || item.type === ""));
  }
  return Array.from(dataTransfer.files).some(isSupportedImageFile);
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
