import { useEffect, useState } from "react";
import { Box, ButtonBase, IconButton, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import type { ChatFloorEntry } from "./ChatFloorRail";

type Props = {
  open: boolean;
  floors: ChatFloorEntry[];
  onOpen: () => void;
  onClose: () => void;
  onJump: (rowIndex: number) => void;
};

export function ChatPromptMap({ open, floors, onOpen, onClose, onJump }: Props) {
  const [filter, setFilter] = usePromptFilter(open);
  const query = filter.trim().toLowerCase();
  const visibleFloors = query ? floors.filter((floor) => floor.label.toLowerCase().includes(query) || String(floor.index).includes(query)) : floors;

  if (floors.length < 2) {
    return null;
  }

  if (!open) {
    return (
      <Tooltip title="Prompt map">
        <IconButton
          data-testid="chat-prompt-map-open"
          aria-label="Open prompt map"
          size="small"
          onClick={onOpen}
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: (theme) => theme.customShadows?.z4,
            "&:hover": { bgcolor: "action.hover" }
          }}
        >
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  function jump(floor: ChatFloorEntry) {
    onJump(floor.rowIndex);
    onClose();
  }

  return (
    <Paper
      data-testid="chat-prompt-map"
      variant="outlined"
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: 420 },
        maxHeight: "min(70vh, 560px)",
        overflow: "hidden",
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.84 : 0.94),
        backdropFilter: "blur(16px)",
        boxShadow: (theme) => theme.customShadows?.z8
      }}
    >
      <Stack spacing={0.75} sx={{ p: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <FormatListBulletedIcon fontSize="small" color="disabled" />
          <Typography variant="subtitle2" sx={{ fontWeight: 850, minWidth: 0, flex: 1 }}>
            Prompt map
          </Typography>
          <IconButton aria-label="Close prompt map" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            } else if (event.key === "Enter" && visibleFloors[0]) {
              event.preventDefault();
              jump(visibleFloors[0]);
            }
          }}
          placeholder="Filter prompts"
          inputProps={{ "aria-label": "Filter prompts" }}
        />
        <Typography variant="caption" color="text.secondary">
          {visibleFloors.length}/{floors.length} prompts
        </Typography>
        <Box sx={{ maxHeight: "calc(min(70vh, 560px) - 116px)", overflowY: "auto", pr: 0.25 }}>
          <Stack spacing={0.25}>
            {visibleFloors.map((floor) => (
              <ButtonBase
                key={`${floor.index}-${floor.rowIndex}`}
                aria-label={`Jump to prompt ${floor.index}: ${floor.label}`}
                onClick={() => jump(floor)}
                sx={{
                  width: "100%",
                  minHeight: 38,
                  borderRadius: 0.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 1,
                  px: 0.75,
                  color: floor.active ? "primary.main" : "text.primary",
                  bgcolor: floor.active ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.1) : "transparent",
                  "&:hover": { bgcolor: "action.hover" }
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ width: 34, flexShrink: 0, fontWeight: 850, textAlign: "right", color: floor.active ? "primary.main" : "text.secondary" }}
                >
                  {floor.index}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left"
                  }}
                >
                  {floor.label}
                </Typography>
              </ButtonBase>
            ))}
          </Stack>
          {visibleFloors.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 0.75, py: 1 }}>
              No prompts match this filter.
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function usePromptFilter(open: boolean): [string, (value: string) => void] {
  const [filter, setFilter] = useState("");
  useEffect(() => {
    if (!open) {
      setFilter("");
    }
  }, [open]);
  return [filter, setFilter];
}
