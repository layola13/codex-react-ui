import { Box, ButtonBase, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

export type ChatFloorEntry = {
  rowIndex: number;
  index: number;
  label: string;
  active: boolean;
};

type Props = {
  floors: ChatFloorEntry[];
  onJump: (rowIndex: number) => void;
};

export function ChatFloorRail({ floors, onJump }: Props) {
  if (floors.length < 2) {
    return null;
  }
  return (
    <Paper
      data-testid="chat-floor-rail"
      variant="outlined"
      sx={{
        width: 34,
        maxHeight: "min(68vh, 520px)",
        overflow: "hidden",
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.62 : 0.78),
        backdropFilter: "blur(16px)",
        boxShadow: (theme) => theme.customShadows?.z4,
        transition: "width 160ms ease, background-color 160ms ease",
        "&:hover, &:focus-within": {
          width: 280,
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.78 : 0.92)
        },
        "&:hover .floor-label, &:focus-within .floor-label": {
          opacity: 1,
          transform: "translateX(0)"
        },
        "&:hover .floor-title, &:focus-within .floor-title": {
          opacity: 1
        }
      }}
    >
      <Stack spacing={0.25} sx={{ p: 0.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 0.5, py: 0.35, minHeight: 26 }}>
          <FormatListBulletedIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
          <Typography
            className="floor-title"
            variant="caption"
            sx={{
              opacity: 0,
              transition: "opacity 140ms ease",
              fontWeight: 850,
              whiteSpace: "nowrap",
              color: "text.secondary"
            }}
          >
            Prompts
          </Typography>
        </Stack>
        <Box sx={{ maxHeight: "calc(min(68vh, 520px) - 36px)", overflowY: "auto", pr: 0.25 }}>
          {floors.map((floor) => (
            <Tooltip key={`${floor.index}-${floor.rowIndex}`} title={`Prompt ${floor.index}: ${floor.label}`} placement="left">
              <ButtonBase
                aria-label={`Jump to prompt ${floor.index}: ${floor.label}`}
                onClick={() => onJump(floor.rowIndex)}
                sx={{
                  width: "100%",
                  minHeight: 26,
                  borderRadius: 0.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 0.75,
                  px: 0.5,
                  color: floor.active ? "primary.main" : "text.secondary",
                  bgcolor: floor.active ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.1) : "transparent",
                  "&:hover": {
                    bgcolor: "action.hover"
                  }
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: floor.active ? 14 : 8,
                    height: floor.active ? 14 : 8,
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: floor.active ? "primary.main" : "divider",
                    bgcolor: floor.active ? "primary.main" : "background.paper",
                    flexShrink: 0,
                    transition: "width 140ms ease, height 140ms ease, background-color 140ms ease"
                  }}
                />
                <Typography
                  className="floor-label"
                  variant="caption"
                  sx={{
                    minWidth: 0,
                    opacity: 0,
                    transform: "translateX(-6px)",
                    transition: "opacity 140ms ease, transform 140ms ease",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left"
                  }}
                >
                  {floor.index}. {floor.label}
                </Typography>
              </ButtonBase>
            </Tooltip>
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}
