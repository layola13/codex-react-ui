import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { DANGER_CONFIRMATION, permissionPresets, type PermissionPresetId } from "@codex-ui/shared";
import { dangerousConfirmationMatches, type ComposerImageAttachment, type ComposerMention } from "../state/codexClient";

type Props = {
  cwd: string;
  permission: PermissionPresetId;
  disabled: boolean;
  pendingMention: ComposerMention | null;
  onCwdChange: (cwd: string) => void;
  onPermissionChange: (permission: PermissionPresetId) => void;
  onMentionConsumed: () => void;
  onSend: (text: string, images: ComposerImageAttachment[], mentions: ComposerMention[]) => void;
};

export function Composer({
  cwd,
  permission,
  disabled,
  pendingMention,
  onCwdChange,
  onPermissionChange,
  onMentionConsumed,
  onSend
}: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ComposerImageAttachment[]>([]);
  const [mentions, setMentions] = useState<ComposerMention[]>([]);
  const [dangerConfirm, setDangerConfirm] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedPreset = useMemo(() => permissionPresets.find((preset) => preset.id === permission), [permission]);
  const dangerBlocked = permission === "dangerBypass" && !dangerousConfirmationMatches(dangerConfirm);
  const hasContent = text.trim().length > 0 || images.length > 0;

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

  return (
    <Box sx={{ p: 1.5, bgcolor: "background.paper" }}>
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
            Highest-risk mode disables approvals and sandboxing. Type <strong>{DANGER_CONFIRMATION}</strong> before sending this conversation.
          </Alert>
        )}
        {permission === "dangerBypass" && (
          <TextField
            size="small"
            label="Danger confirmation"
            value={dangerConfirm}
            onChange={(event) => setDangerConfirm(event.target.value)}
            placeholder={DANGER_CONFIRMATION}
          />
        )}
        <TextField
          multiline
          minRows={3}
          maxRows={8}
          placeholder="Ask Codex to inspect, edit, test, or explain this workspace..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
        />
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
            <Tooltip title="Attach images to this turn.">
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

  async function addImages(fileList: FileList | null): Promise<void> {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    const next = await Promise.all(files.map(readImageFile));
    setImages((current) => [...current, ...next]);
  }
}

async function readImageFile(file: File): Promise<ComposerImageAttachment> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
  return {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${file.name}-${Date.now()}-${Math.random()}`,
    name: file.name,
    url,
    size: file.size,
    mediaType: file.type || "image/*"
  };
}
