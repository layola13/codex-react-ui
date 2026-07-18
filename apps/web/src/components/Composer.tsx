import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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
import RateReviewIcon from "@mui/icons-material/RateReview";
import { alpha } from "@mui/material/styles";
import { permissionPresets, type PermissionPresetId } from "@codex-ui/shared";
import type { ComposerImageAttachment, ComposerMention } from "../state/codexClient";
import { themeVisualTuning, type ThemePlugin } from "../theme";

type Props = {
  cwd: string;
  permission: PermissionPresetId;
  disabled: boolean;
  pendingMention: ComposerMention | null;
  suggestedPrompt?: { id: string; text: string } | null;
  activeThemePlugin?: ThemePlugin | null;
  modeBadges?: {
    fast: boolean;
    plan: boolean;
    goalActive: boolean;
  };
  dangerBypassConfirmed: boolean;
  onCwdChange: (cwd: string) => void;
  onPermissionChange: (permission: PermissionPresetId) => void;
  onMentionConsumed: () => void;
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
  modeBadges = { fast: false, plan: false, goalActive: false },
  dangerBypassConfirmed,
  onCwdChange,
  onPermissionChange,
  onMentionConsumed,
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
    onSuggestedPromptConsumed?.();
  }, [onSuggestedPromptConsumed, suggestedPrompt]);

  const composerBackdrop = safeThemeAssetUrl(
    activeThemePlugin?.assets?.cornerImage ?? activeThemePlugin?.assets?.heroImage ?? activeThemePlugin?.assets?.appBackgroundImage
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
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1}>
          <TextField size="small" label="Workspace cwd" value={cwd} onChange={(event) => onCwdChange(event.target.value)} sx={{ minWidth: 260, flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Permissions</InputLabel>
            <Select value={permission} label="Permissions" onChange={(event) => onPermissionChange(event.target.value as PermissionPresetId)}>
              {permissionPresets.map((preset) => (
                <MenuItem key={preset.id} value={preset.id}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        {selectedPreset?.severity === "critical" && (
          <Alert severity="error">
            Full Auto is active for this conversation. No sandbox boundary and no approval prompts will be used for Codex actions.
          </Alert>
        )}
        {imageError && (
          <Alert severity="warning" onClose={() => setImageError("")}>
            {imageError}
          </Alert>
        )}
        {(modeBadges.fast || modeBadges.plan || modeBadges.goalActive) && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap data-testid="composer-command-badges">
            {modeBadges.fast && <Chip size="small" color="warning" icon={<BoltIcon />} label="Fast" data-testid="composer-fast-badge" />}
            {modeBadges.plan && <Chip size="small" color="primary" icon={<ChecklistIcon />} label="Plan" data-testid="composer-plan-badge" />}
            {modeBadges.goalActive && <Chip size="small" color="success" variant="outlined" icon={<FlagIcon />} label="Goal active" data-testid="composer-goal-badge" />}
          </Stack>
        )}
        <TextField
          multiline
          minRows={3}
          maxRows={8}
          placeholder="Ask Codex to inspect, edit, test, or explain this workspace..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
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
          <Tooltip title="Toggle fast mode">
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
          <Tooltip title="Show session status">
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
          <Tooltip title="Set a sticky goal">
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
          <Tooltip title="Toggle plan mode">
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
          <Tooltip title="Start a review">
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
          <Tooltip title="Rename current thread">
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
            <Tooltip title="Attach images to this turn. Drag and drop is also supported.">
              <span>
                <Button size="small" startIcon={<ImageIcon />} disabled={disabled} onClick={() => fileInputRef.current?.click()}>
                  Image
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
              disabled={disabled || !hasContent || dangerBlocked}
              onClick={() => {
                onSend(text, images, mentions);
                setText("");
                setImages([]);
                setMentions([]);
              }}
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              Send
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {images.length > 0 ? `${images.length} image${images.length === 1 ? "" : "s"} · ${formatBytes(imageTotalBytes)} selected. ` : ""}
            {selectedPreset?.description}
          </Typography>
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            disabled={disabled || !hasContent || dangerBlocked}
            onClick={() => {
              onSend(text, images, mentions);
              setText("");
              setImages([]);
              setMentions([]);
            }}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  function runSlashCommandShortcut(command: string): void {
    onSend(command, [], []);
  }

  function setSlashTemplate(command: string): void {
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
