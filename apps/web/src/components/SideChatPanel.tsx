import { useEffect, useMemo, useRef, useState } from "react";
import { alpha } from "@mui/material/styles";
import {
  Box,
  ButtonBase,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import PublicIcon from "@mui/icons-material/Public";
import SendIcon from "@mui/icons-material/Send";
import TerminalIcon from "@mui/icons-material/Terminal";
import TuneIcon from "@mui/icons-material/Tune";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import type { ModelEntry, WorkbenchTurn } from "../state/codexClient";
import { MarkdownMessage } from "./MarkdownMessage";

export type SideChatTab = {
  id: string;
  title: string;
  threadId: string | null;
  draft: string;
  sending: boolean;
  userMessages: Array<{ id: string; text: string }>;
};

type Props = {
  tabs: SideChatTab[];
  activeTabId: string | null;
  turns: WorkbenchTurn[];
  models: ModelEntry[];
  selectedModel: string;
  reasoningLabel: string;
  permissionLabel: string;
  connected: boolean;
  engineReady: boolean;
  error: string | null;
  onTabChange: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onClosePanel: () => void;
  onDraftChange: (tabId: string, draft: string) => void;
  onSend: (tabId: string, text: string) => void;
};

export function SideChatPanel({
  tabs,
  activeTabId,
  turns,
  models,
  selectedModel,
  reasoningLabel,
  permissionLabel,
  connected,
  engineReady,
  error,
  onTabChange,
  onAddTab,
  onCloseTab,
  onClosePanel,
  onDraftChange,
  onSend
}: Props) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [launcherAnchor, setLauncherAnchor] = useState<HTMLElement | null>(null);
  const visibleTurns = useMemo(
    () => (activeTab?.threadId ? turns.filter((turn) => turn.threadId === activeTab.threadId) : []),
    [activeTab?.threadId, turns]
  );
  const busy = Boolean(activeTab?.sending) || visibleTurns.some((turn) => turn.status === "inProgress");
  const canSend = Boolean(activeTab?.draft.trim()) && connected && engineReady && !busy;
  const modelLabel = models.find((model) => (model.model ?? model.id ?? "") === selectedModel)?.displayName ?? selectedModel;

  useEffect(() => {
    const element = transcriptRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [activeTab?.id, activeTab?.userMessages.length, visibleTurns]);

  return (
    <Box
      data-testid="sidechat-panel"
      sx={{
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        display: "grid",
        gridTemplateRows: activeTab ? "48px minmax(0, 1fr) auto" : "48px minmax(0, 1fr)",
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.7 : 0.96)
      }}
    >
      <Box
        role="tablist"
        aria-label="Side chat tabs"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.25,
          minWidth: 0,
          overflowX: "auto",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.48 : 0.72)
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab?.id;
          return (
            <Box
              key={tab.id}
              sx={{
                display: "flex",
                alignItems: "center",
                flex: "0 0 auto",
                minWidth: 0,
                borderRadius: 999,
                bgcolor: active ? "action.selected" : "transparent",
                border: "1px solid",
                borderColor: active ? "divider" : "transparent"
              }}
            >
              <Box
                component="button"
                type="button"
                role="tab"
                data-testid={`sidechat-tab-${tab.id}`}
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  minWidth: 0,
                  height: 34,
                  pl: 1,
                  pr: 0.5,
                  border: 0,
                  bgcolor: "transparent",
                  color: active ? "text.primary" : "text.secondary",
                  font: "inherit",
                  cursor: "pointer"
                }}
              >
                <AddCircleOutlineIcon sx={{ fontSize: 16, flex: "0 0 auto" }} />
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ maxWidth: { xs: 120, lg: 150 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {tab.title}
                </Typography>
              </Box>
              <Tooltip title={`Close ${tab.title}`}>
                <IconButton
                  size="small"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => onCloseTab(tab.id)}
                  sx={{ mr: 0.25, color: "text.secondary" }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
        <Tooltip title="New side chat">
          <IconButton
            size="small"
            aria-label="New side chat"
            onClick={(event) => setLauncherAnchor(event.currentTarget)}
            sx={{ color: "text.secondary", borderRadius: 1.5 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Tooltip title="Maximize side chat">
          <IconButton size="small" aria-label="Maximize side chat" sx={{ color: "text.secondary", display: { xs: "none", sm: "inline-flex" } }}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hide side chat">
          <IconButton size="small" aria-label="Hide side chat" onClick={onClosePanel} sx={{ color: "text.secondary", borderRadius: 1.5 }}>
            <ViewColumnIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={launcherAnchor}
        open={Boolean(launcherAnchor)}
        onClose={() => setLauncherAnchor(null)}
        PaperProps={{
          sx: {
            mt: 0.75,
            minWidth: 260,
            borderRadius: 2,
            boxShadow: (theme) => theme.customShadows?.dropdown
          }
        }}
      >
        <MenuItem
          onClick={() => {
            setLauncherAnchor(null);
            onAddTab();
          }}
        >
          <ListItemIcon>
            <AddCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Side chat" />
          <Typography variant="caption" color="text.secondary">
            Ctrl+Alt+S
          </Typography>
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon>
            <PublicIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Browser" />
          <Typography variant="caption" color="text.secondary">
            Ctrl+T
          </Typography>
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon>
            <TerminalIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Terminal" />
        </MenuItem>
      </Menu>

      <Box
        ref={transcriptRef}
        sx={{
          minHeight: 0,
          overflow: "auto",
          p: { xs: 1.25, sm: 2 },
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.2 : 0.1)
        }}
      >
        {!activeTab ? (
          <Box sx={{ minHeight: "100%", display: "grid", placeItems: "center", px: 2 }}>
            <Stack spacing={1.25} sx={{ width: "min(520px, 100%)" }}>
              <LauncherRow icon={<AddCircleOutlineIcon fontSize="small" />} label="Side chat" shortcut="Ctrl+Alt+S" onClick={onAddTab} />
              <LauncherRow icon={<PublicIcon fontSize="small" />} label="Browser" shortcut="Ctrl+T" disabled />
              <LauncherRow icon={<TerminalIcon fontSize="small" />} label="Terminal" disabled />
            </Stack>
          </Box>
        ) : (
        <Stack spacing={1.25} sx={{ maxWidth: 880, mx: "auto" }}>
          {activeTab.userMessages.map((message) => (
            <Box key={message.id} sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Paper
                variant="outlined"
                sx={{
                  maxWidth: "82%",
                  px: 1.5,
                  py: 1,
                  borderRadius: 2.5,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.1 : 0.06),
                  borderColor: "transparent"
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {message.text}
                </Typography>
              </Paper>
            </Box>
          ))}
          {visibleTurns.map((turn) => (
            <Paper
              key={turn.id}
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.62 : 0.82)
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  Side chat
                </Typography>
                <Chip size="small" label={turn.status} />
              </Stack>
              <Stack spacing={1}>
                {turn.items.map((item) => (
                  <Box key={item.id}>
                    {item.text && item.type === "commandExecution" ? (
                      <Typography
                        component="pre"
                        sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
                      >
                        {item.text}
                      </Typography>
                    ) : item.text ? (
                      <MarkdownMessage text={item.text} />
                    ) : null}
                  </Box>
                ))}
              </Stack>
            </Paper>
          ))}
          {activeTab.userMessages.length === 0 && visibleTurns.length === 0 && !error && (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 220, textAlign: "center" }}>
              <Stack spacing={1} alignItems="center">
                <ChatBubbleOutlineIcon sx={{ fontSize: 30, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary">
                  Start a side chat
                </Typography>
              </Stack>
            </Box>
          )}
          {error && (
            <Paper variant="outlined" sx={{ p: 1.25, borderColor: "error.main", color: "error.main" }}>
              <Typography variant="body2">{error}</Typography>
            </Paper>
          )}
        </Stack>
        )}
      </Box>

      {activeTab && (
        <Box
          sx={{
            px: { xs: 1, sm: 2 },
            pb: { xs: 1, sm: 1.75 },
            pt: 1,
            bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.24 : 0.1)
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              width: "min(860px, 100%)",
              mx: "auto",
              minHeight: 146,
              display: "grid",
              gridTemplateRows: "minmax(76px, 1fr) auto",
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: "background.paper",
              boxShadow: (theme) => theme.customShadows?.z8
            }}
          >
            <TextField
              fullWidth
              multiline
              variant="standard"
              minRows={2}
              maxRows={6}
              value={activeTab.draft}
              disabled={!connected || !engineReady}
              placeholder="Do anything"
              inputProps={{ "aria-label": "Side chat message" }}
              InputProps={{ disableUnderline: true }}
              onChange={(event) => onDraftChange(activeTab.id, event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSend) {
                  event.preventDefault();
                  onSend(activeTab.id, activeTab.draft);
                }
              }}
              sx={{
                px: 2,
                pt: 1.75,
                "& textarea": { fontSize: 15, lineHeight: 1.55 }
              }}
            />
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1.25, py: 1 }}>
              <Tooltip title="Add context">
                <IconButton size="small" aria-label="Add side chat context">
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Approval policy">
                <Box sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary", minWidth: 0 }}>
                  <TuneIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  <Typography variant="caption" noWrap sx={{ maxWidth: { xs: 120, sm: 180 } }}>
                    {permissionLabel}
                  </Typography>
                </Box>
              </Tooltip>
              <Box sx={{ flex: 1, minWidth: 8 }} />
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: { xs: 116, sm: 210 } }}>
                {modelLabel || "Model"} · {reasoningLabel}
              </Typography>
              <Tooltip title="Send side chat message">
                <span>
                  <IconButton
                    color="primary"
                    aria-label="Send side chat message"
                    disabled={!canSend}
                    onClick={() => onSend(activeTab.id, activeTab.draft)}
                    sx={{
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.hover" }
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

function LauncherRow({
  icon,
  label,
  shortcut,
  disabled,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      sx={{
        width: "100%",
        minHeight: 48,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        justifyContent: "flex-start",
        color: disabled ? "text.disabled" : "text.primary",
        "&:hover": { bgcolor: disabled ? "transparent" : "action.hover" }
      }}
    >
      <Box sx={{ width: 30, display: "inline-flex", color: "text.secondary" }}>{icon}</Box>
      <Typography variant="body2" sx={{ flex: 1, textAlign: "left" }}>
        {label}
      </Typography>
      {shortcut && (
        <Chip
          size="small"
          label={shortcut}
          sx={{
            height: 22,
            color: "text.secondary",
            bgcolor: "action.selected",
            "& .MuiChip-label": { px: 0.75 }
          }}
        />
      )}
    </ButtonBase>
  );
}
