import { useEffect, useMemo, useRef } from "react";
import { alpha } from "@mui/material/styles";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import TuneIcon from "@mui/icons-material/Tune";
import type { ModelEntry, WorkbenchTurn } from "../state/codexClient";
import { MarkdownMessage } from "./MarkdownMessage";

export type SideChatTab = {
  id: string;
  title: string;
  threadId: string | null;
  draft: string;
  userMessages: Array<{ id: string; text: string }>;
};

type Props = {
  tabs: SideChatTab[];
  activeTabId: string;
  turns: WorkbenchTurn[];
  models: ModelEntry[];
  selectedModel: string;
  reasoningLabel: string;
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
  const visibleTurns = useMemo(
    () => (activeTab?.threadId ? turns.filter((turn) => turn.threadId === activeTab.threadId) : []),
    [activeTab?.threadId, turns]
  );
  const busy = visibleTurns.some((turn) => turn.status === "inProgress");
  const canSend = Boolean(activeTab?.draft.trim()) && connected && engineReady && !busy;
  const modelLabel = models.find((model) => (model.model ?? model.id ?? "") === selectedModel)?.displayName ?? selectedModel;

  useEffect(() => {
    const element = transcriptRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [activeTab?.id, activeTab?.userMessages.length, visibleTurns]);

  if (!activeTab) {
    return null;
  }

  return (
    <Box
      data-testid="sidechat-panel"
      sx={{
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        display: "grid",
        gridTemplateRows: "48px minmax(0, 1fr) auto",
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.7 : 0.82)
      }}
    >
      <Box
        role="tablist"
        aria-label="Side chat tabs"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          minWidth: 0,
          overflowX: "auto",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.42 : 0.55)
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab.id;
          return (
            <Box
              key={tab.id}
              sx={{
                display: "flex",
                alignItems: "center",
                flex: "0 0 auto",
                minWidth: 0,
                borderRadius: 1.5,
                bgcolor: active ? "action.selected" : "transparent",
                border: "1px solid",
                borderColor: active ? "divider" : "transparent"
              }}
            >
              <Box
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  minWidth: 0,
                  height: 34,
                  px: 1,
                  border: 0,
                  bgcolor: "transparent",
                  color: active ? "text.primary" : "text.secondary",
                  font: "inherit",
                  cursor: "pointer"
                }}
              >
                <ChatBubbleOutlineIcon sx={{ fontSize: 16, flex: "0 0 auto" }} />
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
          <IconButton size="small" aria-label="New side chat" onClick={onAddTab} sx={{ color: "text.secondary" }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Tooltip title="Close side chat">
          <IconButton size="small" aria-label="Close side chat" onClick={onClosePanel} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        ref={transcriptRef}
        sx={{
          minHeight: 0,
          overflow: "auto",
          p: { xs: 1.25, sm: 2 },
          bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.2 : 0.18)
        }}
      >
        <Stack spacing={1.25} sx={{ maxWidth: 880, mx: "auto" }}>
          {activeTab.userMessages.map((message) => (
            <Box key={message.id} sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Paper
                variant="outlined"
                sx={{
                  maxWidth: "82%",
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.1),
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.32)
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
                bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.62 : 0.74)
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
      </Box>

      <Box
        sx={{
          p: { xs: 1, sm: 1.25 },
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.82 : 0.94)
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          value={activeTab.draft}
          disabled={!connected || !engineReady}
          placeholder="Do anything"
          inputProps={{ "aria-label": "Side chat message" }}
          onChange={(event) => onDraftChange(activeTab.id, event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSend) {
              event.preventDefault();
              onSend(activeTab.id, activeTab.draft);
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              alignItems: "flex-start",
              px: 1.25,
              py: 1
            },
            "& textarea": { fontSize: 14, lineHeight: 1.5 }
          }}
        />
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
          <Tooltip title="Add context">
            <IconButton size="small" aria-label="Add side chat context">
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Approval policy">
            <Box sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary", minWidth: 0 }}>
              <TuneIcon sx={{ fontSize: 16, mr: 0.5 }} />
              <Typography variant="caption" noWrap>
                Ask for approval
              </Typography>
            </Box>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 8 }} />
          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: { xs: 110, sm: 170 } }}>
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
      </Box>
    </Box>
  );
}
