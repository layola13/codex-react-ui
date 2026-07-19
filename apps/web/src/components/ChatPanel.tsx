import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Badge, Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltIcon from "@mui/icons-material/Bolt";
import BugReportIcon from "@mui/icons-material/BugReport";
import BuildIcon from "@mui/icons-material/Build";
import ChecklistIcon from "@mui/icons-material/Checklist";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import FlagIcon from "@mui/icons-material/Flag";
import ForumIcon from "@mui/icons-material/Forum";
import RateReviewIcon from "@mui/icons-material/RateReview";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TerminalIcon from "@mui/icons-material/Terminal";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PersonIcon from "@mui/icons-material/Person";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import type { ThreadEntry, WorkbenchItem, WorkbenchTurn } from "../state/codexClient";
import { themeVisualTuning, type ThemePlugin } from "../theme";
import { MarkdownMessage } from "./MarkdownMessage";
import type { TranslateFn } from "../i18n";

type AgentSession = {
  id: string;
  threadId?: string;
  name: string;
  role?: string;
  status?: string;
  source: "thread" | "collab" | "activity" | "message";
  loaded: boolean;
};

export type GoalStatus = "active" | "paused" | "blocked" | "usageLimited" | "budgetLimited" | "complete";

export type GoalBannerState = {
  threadId: string;
  objective: string;
  status: GoalStatus;
  tokenBudget?: number | null;
  tokensUsed?: number;
  timeUsedSeconds?: number;
};

export type TokenUsageBreakdown = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
};

export type ThreadTokenUsageState = {
  total: TokenUsageBreakdown;
  last: TokenUsageBreakdown;
  modelContextWindow?: number | null;
};

export type WorkbenchStatsState = {
  scope: "status" | "stats";
  activeThreadId: string | null;
  model: string;
  provider: string;
  reasoningEffort: string;
  permissionLabel: string;
  sessionTurns: number;
  sessionItems: number;
  projectThreads: number;
  projectTurns: number;
  threadUsage?: ThreadTokenUsageState;
  projectUsage?: TokenUsageBreakdown;
  goal?: GoalBannerState | null;
  modes: WorkbenchModeState;
};

export type RequestMonitorEntry = {
  id: string;
  threadId: string;
  title: string;
  source: string;
  status: string;
  provider: string;
  model: string;
  lastTokens?: TokenUsageBreakdown;
  totalTokens?: TokenUsageBreakdown;
};

export type WorkbenchModeState = {
  fast: boolean;
  plan: boolean;
  goalActive: boolean;
};

export type SlashCommandNoticeState = {
  title: string;
  message: string;
  severity: "info" | "success" | "warning";
};

type Props = {
  turns: WorkbenchTurn[];
  threads?: ThreadEntry[];
  activeThreadId: string | null;
  errors: string[];
  goal?: GoalBannerState | null;
  slashNotice?: SlashCommandNoticeState | null;
  stats?: WorkbenchStatsState | null;
  requestMonitor?: RequestMonitorEntry[];
  statsOpen?: boolean;
  modes?: WorkbenchModeState;
  activeThemePlugin?: ThemePlugin | null;
  welcomeBackgroundImage?: string;
  welcomeDismissed?: boolean;
  t: TranslateFn;
  onPromptSelect?: (text: string) => void;
  onAgentThreadSelect?: (threadId: string) => void;
  onStatsClose?: () => void;
  onSlashNoticeClose?: () => void;
  onGoalEdit?: () => void;
  onGoalStatusChange?: (status: GoalStatus) => void;
  onGoalClear?: () => void;
};

type DisplayConversationItem = {
  key: string;
  item: WorkbenchItem;
  reasoning?: string;
  activeThinking?: boolean;
};

function emptyPromptCards(t: TranslateFn) {
  return [
  {
    id: "explore",
    label: t("chat.prompt.explore.label"),
    detail: t("chat.prompt.explore.detail"),
    prompt: t("chat.prompt.explore.prompt"),
    icon: <TravelExploreIcon fontSize="small" />
  },
  {
    id: "build",
    label: t("chat.prompt.build.label"),
    detail: t("chat.prompt.build.detail"),
    prompt: t("chat.prompt.build.prompt"),
    icon: <BuildIcon fontSize="small" />
  },
  {
    id: "review",
    label: t("chat.prompt.review.label"),
    detail: t("chat.prompt.review.detail"),
    prompt: t("chat.prompt.review.prompt"),
    icon: <RateReviewIcon fontSize="small" />
  },
  {
    id: "fix",
    label: t("chat.prompt.fix.label"),
    detail: t("chat.prompt.fix.detail"),
    prompt: t("chat.prompt.fix.prompt"),
    icon: <BugReportIcon fontSize="small" />
  }
  ];
}

export function ChatPanel({
  turns,
  threads = [],
  activeThreadId,
  errors,
  goal,
  slashNotice,
  stats,
  requestMonitor = [],
  statsOpen = false,
  modes = { fast: false, plan: false, goalActive: false },
  activeThemePlugin,
  welcomeBackgroundImage,
  welcomeDismissed = false,
  t,
  onPromptSelect,
  onAgentThreadSelect,
  onStatsClose,
  onSlashNoticeClose,
  onGoalEdit,
  onGoalStatusChange,
  onGoalClear
}: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [closedAgentIds, setClosedAgentIds] = useState<string[]>([]);
  const [acknowledgedAgentIds, setAcknowledgedAgentIds] = useState<string[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);

  useEffect(() => {
    setSelectedAgentId(null);
    setClosedAgentIds([]);
    setAcknowledgedAgentIds([]);
  }, [activeThreadId]);

  const agentSessions = useMemo(() => buildAgentSessions(turns, threads, activeThreadId), [activeThreadId, threads, turns]);
  const visibleAgents = agentSessions.filter((agent) => !closedAgentIds.includes(agent.id));
  const selectedAgent = visibleAgents.find((agent) => agent.id === selectedAgentId) ?? null;

  useEffect(() => {
    if (selectedAgentId && !visibleAgents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [selectedAgentId, visibleAgents]);

  const displayItems = selectedAgent
    ? agentConversationItems(turns, activeThreadId, selectedAgent)
    : mainConversationItems(turns, activeThreadId);
  const hasAnyVisibleThreadActivity = hasThreadActivity(turns, activeThreadId);
  const showEmptyConversation = displayItems.length === 0 && !welcomeDismissed && (selectedAgent || !hasAnyVisibleThreadActivity);
  const hasParallelAgents = visibleAgents.length > 0;
  const showStickyGoal = Boolean(goal);

  function selectAgent(agent: AgentSession) {
    setSelectedAgentId(agent.id);
    if (isTerminalAgentStatus(agent.status)) {
      setAcknowledgedAgentIds((current) => (current.includes(agent.id) ? current : [...current, agent.id]));
    }
    if (agent.threadId) {
      onAgentThreadSelect?.(agent.threadId);
    }
  }

  function closeAgent(agent: AgentSession) {
    setClosedAgentIds((current) => (current.includes(agent.id) ? current : [...current, agent.id]));
    if (selectedAgentId === agent.id) {
      setSelectedAgentId(null);
    }
  }

  return (
    <Box
      sx={{
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: hasParallelAgents ? { xs: "54px minmax(0, 1fr)", sm: "64px minmax(0, 1fr)" } : "minmax(0, 1fr)"
      }}
    >
      {hasParallelAgents && (
        <ParallelAgentsRail
          agents={visibleAgents}
          selectedAgentId={selectedAgentId}
          acknowledgedAgentIds={acknowledgedAgentIds}
          onSelectMain={() => setSelectedAgentId(null)}
          onSelectAgent={selectAgent}
          onCloseAgent={closeAgent}
        />
      )}
      <Box sx={{ minHeight: 0, display: "grid", gridTemplateRows: showStickyGoal ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
        {goal && (
          <Box
            data-testid="chat-sticky-goal-surface"
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.72 : 0.82),
              backdropFilter: "blur(18px)",
              px: { xs: 1, sm: 1.5, lg: 2 },
              py: 1
            }}
          >
            <Box sx={{ maxWidth: 1120, mx: "auto" }}>
              <GoalBanner
                goal={goal}
                t={t}
                onEdit={onGoalEdit}
                onStatusChange={onGoalStatusChange}
                onClear={onGoalClear}
              />
            </Box>
          </Box>
        )}
        <Box sx={{ minHeight: 0, overflow: "auto", p: { xs: 1.5, sm: 2.5, lg: 3 } }}>
          <Stack spacing={1.75} sx={{ maxWidth: 1120, mx: "auto" }}>
            {errors.map((error, index) => (
              error ? <Alert key={`${error}-${index}`} severity="error">{error}</Alert> : null
            ))}
            {slashNotice && (
              <Alert
                data-testid="slash-command-result"
                severity={slashNotice.severity}
                onClose={onSlashNoticeClose}
                sx={{
                  alignItems: "flex-start",
                  "& .MuiAlert-message": {
                    minWidth: 0,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere"
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                  {slashNotice.title}
                </Typography>
                <Typography variant="body2" component="div">
                  {slashNotice.message}
                </Typography>
              </Alert>
            )}
            {requestMonitor.length > 0 && (
              <Stack direction="row" alignItems="center" justifyContent="flex-end">
                <Button
                  data-testid="request-monitor-button"
                  size="small"
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={() => setRequestsOpen(true)}
                  sx={{ borderRadius: 1 }}
                >
                  {t("chat.requests")}
                  <Chip size="small" label={requestMonitor.length} sx={{ ml: 1, height: 20 }} />
                </Button>
              </Stack>
            )}
            {(modes.fast || modes.plan) && (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap data-testid="chat-mode-badges">
                {modes.fast && <Chip size="small" color="warning" icon={<BoltIcon />} label={t("app.fast")} data-testid="fast-mode-badge" />}
                {modes.plan && <Chip size="small" color="primary" icon={<ChecklistIcon />} label={t("app.plan")} data-testid="plan-mode-badge" />}
              </Stack>
            )}
            {statsOpen && stats && <StatsPanel stats={stats} t={t} onClose={onStatsClose} />}
            {selectedAgent && <AgentConversationHeader agent={selectedAgent} onClose={() => closeAgent(selectedAgent)} />}
            {showEmptyConversation && <EmptyConversation selectedAgent={selectedAgent} activeThemePlugin={activeThemePlugin} welcomeBackgroundImage={welcomeBackgroundImage} t={t} onPromptSelect={onPromptSelect} />}
            <Stack spacing={1} data-testid="conversation-waterfall">
              {displayItems.map(({ key, item, reasoning, activeThinking }) => (
                <Box key={key} data-testid={`conversation-item-${sanitizeTestId(item.id)}`}>
                  {renderWorkbenchItem(item, t, { reasoning, activeThinking })}
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Box>
      <Dialog
        open={requestsOpen}
        onClose={() => setRequestsOpen(false)}
        fullWidth
        maxWidth="lg"
        data-testid="request-monitor-dialog"
      >
        <DialogTitle sx={{ pr: 6 }}>
          {t("chat.requests")}
          <IconButton
            aria-label={t("chat.closeRequests")}
            onClick={() => setRequestsOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0, pb: 2 }}>
          <RequestMonitorTable entries={requestMonitor} t={t} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function GoalBanner({
  goal,
  t,
  onEdit,
  onStatusChange,
  onClear
}: {
  goal: GoalBannerState;
  t: TranslateFn;
  onEdit?: () => void;
  onStatusChange?: (status: GoalStatus) => void;
  onClear?: () => void;
}) {
  const paused = goal.status === "paused";
  const complete = goal.status === "complete";
  return (
    <Paper
      data-testid="sticky-goal-bar"
      variant="outlined"
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.84 : 0.9)
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <FlagIcon fontSize="small" color={complete ? "success" : paused ? "disabled" : "primary"} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 800, textTransform: "uppercase" }}>
              {t("chat.goal")}
            </Typography>
            <Typography sx={{ fontWeight: 750, overflowWrap: "anywhere", lineHeight: 1.35 }}>{goal.objective}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" label={goalStatusLabel(goal.status)} color={complete ? "success" : paused ? "default" : "primary"} />
          {typeof goal.tokensUsed === "number" && <Chip size="small" variant="outlined" label={`${formatNumber(goal.tokensUsed)} tokens`} />}
          {goal.tokenBudget != null && <Chip size="small" variant="outlined" label={`${formatNumber(goal.tokenBudget)} budget`} />}
          {typeof goal.timeUsedSeconds === "number" && goal.timeUsedSeconds > 0 && (
            <Chip size="small" variant="outlined" label={formatDuration(goal.timeUsedSeconds)} />
          )}
          <Tooltip title={t("chat.editGoal")}>
            <IconButton size="small" aria-label={t("chat.editGoal")} onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={paused ? t("chat.resumeGoal") : t("chat.pauseGoal")}>
            <IconButton
              size="small"
              aria-label={paused ? t("chat.resumeGoal") : t("chat.pauseGoal")}
              onClick={() => onStatusChange?.(paused ? "active" : "paused")}
              disabled={complete}
            >
              {paused ? <PlayCircleIcon fontSize="small" /> : <PauseCircleIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t("chat.clearGoal")}>
            <IconButton size="small" aria-label={t("chat.clearGoal")} onClick={onClear}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}

function StatsPanel({ stats, t, onClose }: { stats: WorkbenchStatsState; t: TranslateFn; onClose?: () => void }) {
  return (
    <Paper
      data-testid="slash-stats-panel"
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.68 : 0.74)
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AssessmentIcon fontSize="small" color="primary" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
              {stats.scope === "stats" ? t("chat.projectStats") : t("chat.sessionStatus")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {stats.activeThreadId ? `Thread ${stats.activeThreadId}` : t("chat.noActiveThread")}
            </Typography>
          </Box>
          <Button size="small" onClick={onClose}>
            {t("chat.close")}
          </Button>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
            gap: 0.75
          }}
        >
          <StatsMetric label="Thread tokens" value={formatTokenValue(stats.threadUsage?.total.totalTokens)} />
          <StatsMetric label="Project tokens" value={formatTokenValue(stats.projectUsage?.totalTokens)} />
          <StatsMetric label="Thread turns" value={formatNumber(stats.sessionTurns)} />
          <StatsMetric label="Project turns" value={formatNumber(stats.projectTurns)} />
          <StatsMetric label="Model" value={stats.model || "Engine default"} compact />
          <StatsMetric label="Provider" value={stats.provider || "default"} compact />
          <StatsMetric label="Reasoning" value={stats.reasoningEffort} compact />
          <StatsMetric label="Permissions" value={stats.permissionLabel} compact />
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={stats.modes.fast ? "Fast on" : "Fast off"} color={stats.modes.fast ? "warning" : "default"} icon={<BoltIcon />} />
          <Chip size="small" label={stats.modes.plan ? "Plan on" : "Plan off"} color={stats.modes.plan ? "primary" : "default"} icon={<ChecklistIcon />} />
          <Chip size="small" label={stats.goal ? `Goal ${goalStatusLabel(stats.goal.status)}` : "No goal"} />
          <Chip size="small" label={`${formatNumber(stats.projectThreads)} threads indexed`} />
          <Chip size="small" label={`${formatNumber(stats.sessionItems)} items in thread`} />
        </Stack>
      </Stack>
    </Paper>
  );
}

function StatsMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        p: 0.85
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography
        title={value}
        sx={{
          fontWeight: compact ? 700 : 850,
          fontSize: compact ? 13 : 18,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function goalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "blocked":
      return "Blocked";
    case "usageLimited":
      return "Usage limited";
    case "budgetLimited":
      return "Budget limited";
    case "complete":
      return "Complete";
    default:
      return status;
  }
}

function formatTokenValue(value?: number): string {
  return typeof value === "number" ? formatNumber(value) : "waiting for usage";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours <= 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function ParallelAgentsRail({
  agents,
  selectedAgentId,
  acknowledgedAgentIds,
  onSelectMain,
  onSelectAgent,
  onCloseAgent
}: {
  agents: AgentSession[];
  selectedAgentId: string | null;
  acknowledgedAgentIds: string[];
  onSelectMain: () => void;
  onSelectAgent: (agent: AgentSession) => void;
  onCloseAgent: (agent: AgentSession) => void;
}) {
  return (
    <Box
      data-testid="parallel-agent-rail"
      aria-label="Parallel agents"
      sx={{
        minHeight: 0,
        overflowY: "auto",
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.68 : 0.76),
        py: 1,
        px: { xs: 0.5, sm: 0.75 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.75
      }}
    >
      <Tooltip title="Main conversation" placement="right">
        <IconButton
          size="small"
          aria-label="Open main conversation"
          data-testid="parallel-agent-main"
          onClick={onSelectMain}
          color={selectedAgentId ? "default" : "primary"}
          sx={railButtonSx(!selectedAgentId)}
        >
          <ForumIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Divider flexItem sx={{ my: 0.25 }} />
      {agents.map((agent, index) => {
        const active = selectedAgentId === agent.id;
        const done = isTerminalAgentStatus(agent.status);
        const badgeVisible = done && !active && !acknowledgedAgentIds.includes(agent.id);
        const testId = sanitizeTestId(agent.id);
        return (
          <Box key={agent.id} data-testid={`parallel-agent-slot-${testId}`} sx={{ position: "relative", width: "100%", display: "grid", placeItems: "center" }}>
            <Tooltip title={`${agent.name}${agent.status ? ` - ${agent.status}` : ""}`} placement="right">
              <IconButton
                size="small"
                aria-label={`Open agent ${agent.name}`}
                data-testid={`parallel-agent-button-${testId}`}
                onClick={() => onSelectAgent(agent)}
                color={active ? "primary" : "default"}
                sx={railButtonSx(active)}
              >
                <Badge
                  color="error"
                  variant="dot"
                  invisible={!badgeVisible}
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  data-testid={badgeVisible ? `parallel-agent-badge-${testId}` : undefined}
                  sx={{
                    "& .MuiBadge-badge": {
                      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.92)"
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: 13,
                      fontWeight: 800,
                      bgcolor: agentAvatarColor(index),
                      color: "primary.contrastText"
                    }}
                  >
                    {agentInitial(agent.name)}
                  </Avatar>
                </Badge>
              </IconButton>
            </Tooltip>
            {done && (
              <Tooltip title={`Close ${agent.name}`} placement="right">
                <IconButton
                  size="small"
                  aria-label={`Close agent ${agent.name}`}
                  data-testid={`parallel-agent-close-${testId}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseAgent(agent);
                  }}
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: 0,
                    width: 18,
                    height: 18,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function AgentConversationHeader({ agent, onClose }: { agent: AgentSession; onClose: () => void }) {
  const done = isTerminalAgentStatus(agent.status);
  return (
    <Paper
      data-testid="parallel-agent-header"
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.72 : 0.82)
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <AccountTreeIcon fontSize="small" color="primary" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.name}
          </Typography>
          {agent.role && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agent.role}
            </Typography>
          )}
        </Box>
        {agent.status && <Chip size="small" label={agent.status} color={agent.status === "failed" ? "error" : "default"} />}
        {done && (
          <Tooltip title={`Close ${agent.name}`}>
            <IconButton size="small" aria-label={`Close agent ${agent.name}`} onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}

function EmptyConversation({
  selectedAgent,
  activeThemePlugin,
  welcomeBackgroundImage,
  t,
  onPromptSelect
}: {
  selectedAgent: AgentSession | null;
  activeThemePlugin?: ThemePlugin | null;
  welcomeBackgroundImage?: string;
  t: TranslateFn;
  onPromptSelect?: (text: string) => void;
}) {
  if (!selectedAgent) {
    return <DefaultWorkbenchEmpty activeThemePlugin={activeThemePlugin} welcomeBackgroundImage={welcomeBackgroundImage} t={t} onPromptSelect={onPromptSelect} />;
  }
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.58 : 0.74),
        boxShadow: (theme) => theme.customShadows?.card
      }}
    >
      <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 750 }}>
        {`${selectedAgent.name} has no visible messages yet`}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        The agent thread is available, and messages will appear here as Codex streams them.
      </Typography>
    </Paper>
  );
}

function DefaultWorkbenchEmpty({
  activeThemePlugin,
  welcomeBackgroundImage,
  t,
  onPromptSelect
}: {
  activeThemePlugin?: ThemePlugin | null;
  welcomeBackgroundImage?: string;
  t: TranslateFn;
  onPromptSelect?: (text: string) => void;
}) {
  const heroImage =
    activeThemePlugin?.layout?.heroEnabled === false
      ? undefined
      : safeThemeAssetUrl(welcomeBackgroundImage ?? activeThemePlugin?.assets?.welcomeBackgroundImage ?? activeThemePlugin?.assets?.heroImage ?? activeThemePlugin?.assets?.appBackgroundImage);
  const cornerImage = safeThemeAssetUrl(activeThemePlugin?.assets?.cornerImage);
  const richDecorations = activeThemePlugin?.layout?.decorationIntensity === "rich";
  const themeTuning = themeVisualTuning(activeThemePlugin);
  return (
    <Box data-testid="default-workbench-empty" sx={{ minHeight: { xs: 440, md: 560 }, display: "grid", alignItems: "center" }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.workspaceSurfaceOpacity),
          boxShadow: (theme) => theme.customShadows?.card,
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, md: 4 },
          backgroundImage: heroImage
            ? (theme) =>
                [
                  `linear-gradient(90deg, ${alpha(theme.palette.background.paper, Math.min(0.9, themeTuning.heroOverlayOpacity + 0.14))} 0%, ${alpha(theme.palette.background.paper, themeTuning.heroOverlayOpacity)} 48%, ${alpha(theme.palette.background.paper, Math.max(0, themeTuning.heroOverlayOpacity * 0.28))} 100%)`,
                  `radial-gradient(circle at 12% 24%, ${alpha(themeTuning.toneColor, themeTuning.toneOpacity)}, transparent 42%)`,
                  `url("${heroImage}")`
                ].join(", ")
            : (theme) =>
                [
                  `radial-gradient(circle at 18% 12%, ${alpha(theme.palette.primary.main, 0.16)}, transparent 34%)`,
                  `radial-gradient(circle at 82% 18%, ${alpha(theme.palette.secondary.main, 0.12)}, transparent 28%)`,
                  `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.84)}, ${alpha(theme.palette.background.default, 0.66)})`
                ].join(", "),
          backgroundSize: heroImage ? "cover" : "auto",
          backgroundPosition: "center"
        }}
      >
        {richDecorations && (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(circle at 12% 32%, rgba(255,255,255,0.52) 0 2px, transparent 3px), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.46) 0 2px, transparent 3px)",
              opacity: Math.min(0.72, themeTuning.toneOpacity + 0.28)
            }}
          />
        )}
        <Stack spacing={2.75} sx={{ position: "relative", zIndex: 1 }}>
          <Stack spacing={1.25} sx={{ maxWidth: 620 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AutoAwesomeIcon color="primary" />
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 800 }}>
                {t("chat.emptyBrand")}
              </Typography>
            </Stack>
            <Typography component="h2" sx={{ fontSize: { xs: 34, md: 48 }, lineHeight: 1.08, fontWeight: 850 }}>
              {t("chat.emptyTitle")}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 540, fontSize: 16 }}>
              {t("chat.emptySubtitle")}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
              gap: 1.25
            }}
          >
            {emptyPromptCards(t).map((card) => (
              <Button
                key={card.id}
                data-testid={`default-prompt-card-${card.id}`}
                variant="outlined"
                color="inherit"
                onClick={() => onPromptSelect?.(card.prompt)}
                sx={{
                  minHeight: 112,
                  justifyContent: "flex-start",
                  alignItems: "stretch",
                  textAlign: "left",
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette.background.paper, themeTuning.panelSurfaceOpacity),
                  borderColor: "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.hover"
                  }
                }}
              >
                <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                  <Box sx={{ color: "primary.main" }}>{card.icon}</Box>
                  <Typography sx={{ fontWeight: 800, lineHeight: 1.28 }}>{card.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    {card.detail}
                  </Typography>
                </Stack>
              </Button>
            ))}
          </Box>
        </Stack>
        {cornerImage && (
          <Box
            component="img"
            src={cornerImage}
            alt=""
            sx={{
              position: "absolute",
              right: { xs: 12, md: 24 },
              bottom: { xs: 12, md: 18 },
              width: { xs: 72, md: 118 },
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: (theme) => theme.customShadows?.z8,
              display: { xs: "none", md: "block" },
              transform: "rotate(3deg)"
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function RequestMonitorTable({ entries, t }: { entries: RequestMonitorEntry[]; t: TranslateFn }) {
  return (
    <Paper
      data-testid="homepage-request-monitor"
      variant="outlined"
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.58 : 0.78)
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.25, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <AssessmentIcon fontSize="small" color="primary" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
            {t("chat.requests")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("chat.requestsSubtitle")}
          </Typography>
        </Box>
        <Chip size="small" label={t("chat.requestsTracked", { count: entries.length })} />
      </Stack>
      {entries.length === 0 ? (
        <Box sx={{ px: 1.25, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t("chat.requestsEmpty")}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              minWidth: 720,
              borderCollapse: "collapse",
              "& th, & td": {
                px: 1.25,
                py: 0.85,
                borderBottom: "1px solid",
                borderColor: "divider",
                textAlign: "left",
                verticalAlign: "middle"
              },
              "& th": {
                typography: "caption",
                color: "text.secondary",
                fontWeight: 800,
                bgcolor: "action.hover"
              },
              "& td": {
                typography: "body2"
              },
              "& tr:last-of-type td": {
                borderBottom: 0
              }
            }}
          >
            <thead>
              <tr>
                <th>{t("chat.request")}</th>
                <th>{t("chat.source")}</th>
                <th>{t("chat.status")}</th>
                <th>{t("chat.requestModel")}</th>
                <th>{t("chat.lastTokens")}</th>
                <th>{t("chat.totalTokens")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <Typography variant="body2" sx={{ fontWeight: 750, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.id}
                    </Typography>
                  </td>
                  <td>
                    <Chip size="small" label={entry.source} variant="outlined" />
                  </td>
                  <td>
                    <Chip size="small" label={entry.status} color={entry.status === "failed" ? "error" : entry.status === "inProgress" ? "warning" : "default"} />
                  </td>
                  <td>
                    <Typography variant="body2" sx={{ maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.model || t("chat.engineDefault")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.provider || t("chat.default")}
                    </Typography>
                  </td>
                  <td>{formatUsageCell(entry.lastTokens, t)}</td>
                  <td>{formatUsageCell(entry.totalTokens, t)}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

function formatUsageCell(usage: TokenUsageBreakdown | undefined, t: TranslateFn): string {
  if (!usage) {
    return t("chat.waiting");
  }
  return `${formatNumber(usage.totalTokens)} total / ${formatNumber(usage.outputTokens)} out`;
}

function renderWorkbenchItem(item: WorkbenchItem, t: TranslateFn, options: { reasoning?: string; activeThinking?: boolean } = {}) {
  return <WorkbenchItemView item={item} t={t} reasoning={options.reasoning} activeThinking={options.activeThinking} />;
}

function WorkbenchItemView({ item, t, reasoning, activeThinking = false }: { item: WorkbenchItem; t: TranslateFn; reasoning?: string; activeThinking?: boolean }) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const isUser = item.type === "userMessage";
  const isAssistant = item.type === "agentMessage";
  const isToolLike = !isUser && !isAssistant && item.type !== "reasoning";
  const align = isUser ? "flex-end" : "flex-start";
  const reasoningContent = reasoning?.trim() ?? "";
  return (
    <Box
      key={item.id}
      data-testid={`workbench-item-${sanitizeTestId(item.type)}`}
      sx={{
        display: "flex",
        justifyContent: isToolLike ? "stretch" : align
      }}
    >
      <Box
        sx={{
          width: isToolLike ? "100%" : "fit-content",
          maxWidth: isUser ? { xs: "92%", md: "76%" } : { xs: "96%", md: "84%" },
          minWidth: 0
        }}
      >
        {item.type === "reasoning" && activeThinking ? (
          <ReasoningPreview item={item} t={t} />
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: isAssistant || isUser ? 1.35 : 1.2,
              borderRadius: isUser ? "14px 14px 4px 14px" : isAssistant ? "14px 14px 14px 4px" : 1,
              bgcolor: isAssistant
                ? (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.82 : 0.88)
                : isUser
                  ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.1)
                  : (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.66 : 0.6),
              borderColor: isUser ? "primary.main" : "divider",
              boxShadow: (theme) =>
                isToolLike
                  ? theme.customShadows?.z1
                  : isAssistant
                    ? theme.customShadows?.z4
                    : theme.customShadows?.z1
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              {item.type === "commandExecution" ? (
                <TerminalIcon fontSize="small" />
              ) : item.type === "fileChange" ? (
                <InsertDriveFileIcon fontSize="small" />
              ) : item.type === "userMessage" ? (
                <PersonIcon fontSize="small" />
              ) : (
                <SmartToyIcon fontSize="small" />
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 750, flex: 1 }}>
                {item.title}
              </Typography>
              {item.agentName && <Chip size="small" label={item.agentName} />}
              {item.status && <Chip size="small" label={item.status} />}
              {isAssistant && reasoningContent && (
                <Button size="small" variant="text" startIcon={<SmartToyIcon fontSize="small" />} onClick={() => setThinkingOpen(true)} sx={{ borderRadius: 1 }}>
                  {t("chat.thinking")}
                </Button>
              )}
            </Stack>
            {item.text && item.type === "commandExecution" && (
              <Typography
                component="pre"
                sx={{
                  mt: 1,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                  m: 0,
                  pt: 1
                }}
              >
                {item.text}
              </Typography>
            )}
            {item.text && item.type !== "commandExecution" && <MarkdownMessage text={item.text} />}
            {item.type === "mcpToolCall" && renderMcpToolCall(item)}
            {item.images && item.images.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: "auto" }}>
                {item.images.map((image, index) => (
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
            )}
          </Paper>
        )}
      </Box>
      {isAssistant && reasoningContent && (
        <Dialog open={thinkingOpen} onClose={() => setThinkingOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              <SmartToyIcon color="primary" />
              <Typography component="span" variant="h6" sx={{ fontWeight: 850 }}>
                {t("chat.thinking")}
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ maxHeight: "70vh", overflow: "auto" }}>
              <MarkdownMessage text={reasoningContent} />
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}

function ReasoningPreview({ item, t }: { item: WorkbenchItem; t: TranslateFn }) {
  const content = reasoningText(item);
  const preview = content.split(/\r?\n/).slice(0, 3).join("\n").trim();
  if (!content) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
      <Paper
        variant="outlined"
        data-testid="thinking-preview"
        sx={{
          width: { xs: "96%", md: "84%" },
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

function reasoningText(item: WorkbenchItem): string {
  if (item.text.trim()) {
    return item.text.trim();
  }
  const payload = isRecord(item.payload) ? item.payload : {};
  const summary = payload.summary;
  if (typeof summary === "string") {
    return summary.trim();
  }
  if (Array.isArray(summary)) {
    return summary.map((entry) => (typeof entry === "string" ? entry : summarizeReasoningEntry(entry))).filter(Boolean).join("\n").trim();
  }
  if (isRecord(summary)) {
    return summarizeReasoningEntry(summary).trim();
  }
  return "";
}

function summarizeReasoningEntry(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (isRecord(value)) {
    for (const key of ["text", "summary", "content", "message"]) {
      const nested = value[key];
      if (typeof nested === "string" && nested.trim()) {
        return nested;
      }
    }
    return prettyJson(value);
  }
  return "";
}

function buildAgentSessions(turns: WorkbenchTurn[], threads: ThreadEntry[], activeThreadId: string | null): AgentSession[] {
  if (!activeThreadId) {
    return [];
  }
  const sessions = new Map<string, AgentSession>();
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const loadedThreadIds = new Set(turns.map((turn) => turn.threadId));

  function upsert(next: AgentSession) {
    const existing = sessions.get(next.id);
    sessions.set(next.id, {
      ...existing,
      ...next,
      name: next.name || existing?.name || "Agent",
      role: next.role ?? existing?.role,
      status: mergeAgentStatus(existing?.status, next.status),
      loaded: Boolean(next.threadId && loadedThreadIds.has(next.threadId)) || existing?.loaded || false
    });
  }

  threads
    .filter((thread) => thread.parentThreadId === activeThreadId)
    .forEach((thread, index) => {
      upsert({
        id: thread.id,
        threadId: thread.id,
        name: agentThreadName(thread, index),
        role: thread.agentRole,
        status: normalizeAgentStatus(thread.status),
        source: "thread",
        loaded: loadedThreadIds.has(thread.id)
      });
    });

  const activeTurns = turns.filter((turn) => turn.threadId === activeThreadId);
  activeTurns.forEach((turn) => {
    turn.items.forEach((item) => {
      if (item.type === "collabAgentToolCall") {
        const payload = isRecord(item.payload) ? item.payload : {};
        const agentStates = isRecord(payload.agentsStates) ? payload.agentsStates : {};
        const receiverThreadIds = asStringArray(payload.receiverThreadIds);
        const ids = receiverThreadIds.length > 0 ? receiverThreadIds : Object.keys(agentStates);
        ids.forEach((threadId, index) => {
          const thread = threadById.get(threadId);
          const state = isRecord(agentStates[threadId]) ? agentStates[threadId] : {};
          upsert({
            id: threadId,
            threadId,
            name: thread ? agentThreadName(thread, index) : `Agent ${sessions.size + 1}`,
            role: thread?.agentRole ?? stringValue(payload.tool),
            status: normalizeAgentStatus(stringValue(state.status) ?? item.status),
            source: "collab",
            loaded: loadedThreadIds.has(threadId)
          });
        });
      }
      if (item.type === "subAgentActivity") {
        const payload = isRecord(item.payload) ? item.payload : {};
        const threadId = stringValue(payload.agentThreadId) ?? item.agentThreadId;
        if (threadId) {
          const thread = threadById.get(threadId);
          upsert({
            id: threadId,
            threadId,
            name: thread ? agentThreadName(thread, sessions.size) : stringValue(payload.agentPath) ?? `Agent ${sessions.size + 1}`,
            role: thread?.agentRole ?? stringValue(payload.agentPath),
            status: normalizeAgentStatus(stringValue(payload.kind)),
            source: "activity",
            loaded: loadedThreadIds.has(threadId)
          });
        }
      }
      if (item.agentId || item.agentThreadId) {
        const id = item.agentId ?? item.agentThreadId;
        if (id) {
          upsert({
            id,
            threadId: item.agentThreadId,
            name: item.agentName ?? item.agentRole ?? `Agent ${sessions.size + 1}`,
            role: item.agentRole,
            status: normalizeAgentStatus(item.agentStatus ?? item.status),
            source: "message",
            loaded: Boolean(item.agentThreadId && loadedThreadIds.has(item.agentThreadId))
          });
        }
      }
    });
  });

  return [...sessions.values()];
}

function mainConversationItems(turns: WorkbenchTurn[], activeThreadId: string | null): DisplayConversationItem[] {
  const visibleTurns = activeThreadId ? turns.filter((turn) => turn.threadId === activeThreadId) : turns;
  return conversationItemsForTurns(visibleTurns, (item) => !item.agentId && !item.agentThreadId);
}

function agentConversationItems(turns: WorkbenchTurn[], activeThreadId: string | null, agent: AgentSession): DisplayConversationItem[] {
  const visibleTurns = turns.map((turn) => {
    if (agent.threadId && turn.threadId === agent.threadId) {
      return turn;
    }
    if (turn.threadId !== activeThreadId) {
      return { ...turn, items: [] };
    }
    return { ...turn, items: turn.items.filter((item) => itemBelongsToAgent(item, agent)) };
  });
  return conversationItemsForTurns(visibleTurns);
}

function conversationItemsForTurns(turns: WorkbenchTurn[], filterItem: (item: WorkbenchItem) => boolean = () => true): DisplayConversationItem[] {
  return turns.flatMap((turn) => {
    const output: DisplayConversationItem[] = [];
    const reasoningBuffer: string[] = [];
    const visibleItems = turn.items.filter(filterItem);

    visibleItems.forEach((item, index) => {
      if (item.type === "reasoning") {
        const content = reasoningText(item);
        if (content) {
          reasoningBuffer.push(content);
        }
        return;
      }

      if (item.type === "agentMessage") {
        output.push({
          key: `${turn.id}:${item.id}:${index}`,
          item,
          reasoning: reasoningBuffer.join("\n\n").trim() || undefined
        });
        reasoningBuffer.length = 0;
        return;
      }

      output.push({
        key: `${turn.id}:${item.id}:${index}`,
        item
      });
    });

    if (reasoningBuffer.length > 0 && turn.status !== "completed") {
      const lastReasoning = [...visibleItems].reverse().find((item) => item.type === "reasoning");
      if (lastReasoning) {
        output.push({
          key: `${turn.id}:${lastReasoning.id}:thinking`,
          item: lastReasoning,
          reasoning: reasoningBuffer.join("\n\n").trim(),
          activeThinking: true
        });
      }
    }

    return output;
  });
}

function hasThreadActivity(turns: WorkbenchTurn[], activeThreadId: string | null): boolean {
  const visibleTurns = activeThreadId ? turns.filter((turn) => turn.threadId === activeThreadId) : turns;
  return visibleTurns.some((turn) => turn.items.length > 0);
}

function itemBelongsToAgent(item: WorkbenchItem, agent: AgentSession): boolean {
  const ids = [agent.id, agent.threadId].filter((value): value is string => Boolean(value));
  return Boolean((item.agentId && ids.includes(item.agentId)) || (item.agentThreadId && ids.includes(item.agentThreadId)));
}

function agentThreadName(thread: ThreadEntry, index: number): string {
  return thread.agentNickname ?? thread.agentRole ?? thread.preview ?? `Agent ${index + 1}`;
}

function normalizeAgentStatus(value?: string): string | undefined {
  switch (value) {
    case "started":
    case "interacted":
    case "inProgress":
    case "pendingInit":
      return "running";
    case "errored":
    case "notFound":
      return "failed";
    default:
      return value;
  }
}

function mergeAgentStatus(current?: string, next?: string): string | undefined {
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }
  return agentStatusRank(next) >= agentStatusRank(current) ? next : current;
}

function agentStatusRank(status: string): number {
  if (["failed", "errored", "notFound"].includes(status)) return 5;
  if (["completed", "shutdown", "done", "success"].includes(status)) return 4;
  if (status === "interrupted") return 3;
  if (["running", "inProgress", "started", "interacted"].includes(status)) return 2;
  return 1;
}

function isTerminalAgentStatus(status?: string): boolean {
  return Boolean(status && ["completed", "shutdown", "done", "success", "failed", "errored", "notFound"].includes(status));
}

function railButtonSx(active: boolean) {
  return {
    width: { xs: 38, sm: 44 },
    height: { xs: 38, sm: 44 },
    borderRadius: 2,
    border: "1px solid",
    borderColor: active ? "primary.main" : "divider",
    bgcolor: active ? "action.selected" : "background.paper",
    boxShadow: active ? "0 0 0 3px rgba(25, 118, 210, 0.14)" : "none",
    "&:hover": {
      bgcolor: "action.hover"
    }
  };
}

function agentAvatarColor(index: number): string {
  const colors = ["primary.main", "secondary.main", "success.main", "warning.main", "info.main"] as const;
  return colors[index % colors.length] ?? "primary.main";
}

function agentInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "A";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function sanitizeTestId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-");
}

function isRenderableImageUrl(url: string): boolean {
  return url.startsWith("data:image/") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://");
}

function renderMcpToolCall(item: { payload?: unknown }) {
  const payload = isRecord(item.payload) ? item.payload : null;
  if (!payload) {
    return null;
  }
  const server = stringValue(payload.server);
  const tool = stringValue(payload.tool);
  const args = "arguments" in payload ? payload.arguments : undefined;
  const result = isRecord(payload.result) ? payload.result : null;
  const errorMessage = payload.error == null ? undefined : formatErrorText(payload.error);

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
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
