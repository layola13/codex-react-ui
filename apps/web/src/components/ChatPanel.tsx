import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Badge, Box, Button, Chip, Divider, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
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

export type WorkbenchModeState = {
  fast: boolean;
  plan: boolean;
  goalActive: boolean;
};

type Props = {
  turns: WorkbenchTurn[];
  threads?: ThreadEntry[];
  activeThreadId: string | null;
  errors: string[];
  goal?: GoalBannerState | null;
  stats?: WorkbenchStatsState | null;
  statsOpen?: boolean;
  modes?: WorkbenchModeState;
  activeThemePlugin?: ThemePlugin | null;
  onPromptSelect?: (text: string) => void;
  onAgentThreadSelect?: (threadId: string) => void;
  onStatsClose?: () => void;
  onGoalEdit?: () => void;
  onGoalStatusChange?: (status: GoalStatus) => void;
  onGoalClear?: () => void;
};

const emptyPromptCards = [
  {
    id: "explore",
    label: "Explore code",
    detail: "Map the architecture and important files.",
    prompt: "Explore this repository and summarize the architecture, key entry points, and likely places to modify.",
    icon: <TravelExploreIcon fontSize="small" />
  },
  {
    id: "build",
    label: "Build feature",
    detail: "Plan, implement, and verify a focused change.",
    prompt: "Build a new feature in this project. Start by inspecting the relevant files, then implement and verify the change.",
    icon: <BuildIcon fontSize="small" />
  },
  {
    id: "review",
    label: "Review changes",
    detail: "Find risks, regressions, and missing tests.",
    prompt: "/review",
    icon: <RateReviewIcon fontSize="small" />
  },
  {
    id: "fix",
    label: "Fix failures",
    detail: "Reproduce the issue and land a tested fix.",
    prompt: "Find and fix the current failure. Reproduce it first, make the smallest safe change, and run the relevant tests.",
    icon: <BugReportIcon fontSize="small" />
  }
] as const;

export function ChatPanel({
  turns,
  threads = [],
  activeThreadId,
  errors,
  goal,
  stats,
  statsOpen = false,
  modes = { fast: false, plan: false, goalActive: false },
  activeThemePlugin,
  onPromptSelect,
  onAgentThreadSelect,
  onStatsClose,
  onGoalEdit,
  onGoalStatusChange,
  onGoalClear
}: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [closedAgentIds, setClosedAgentIds] = useState<string[]>([]);
  const [acknowledgedAgentIds, setAcknowledgedAgentIds] = useState<string[]>([]);

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

  const displayTurns = selectedAgent
    ? agentConversationTurns(turns, activeThreadId, selectedAgent)
    : mainConversationTurns(turns, activeThreadId);
  const hasParallelAgents = visibleAgents.length > 0;
  const showTopStatus = Boolean(goal || statsOpen || modes.fast || modes.plan);

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
      <Box sx={{ minHeight: 0, display: "grid", gridTemplateRows: showTopStatus ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
        {showTopStatus && (
          <ChatTopStatusSurface
            goal={goal}
            stats={stats}
            statsOpen={statsOpen}
            modes={modes}
            onStatsClose={onStatsClose}
            onGoalEdit={onGoalEdit}
            onGoalStatusChange={onGoalStatusChange}
            onGoalClear={onGoalClear}
          />
        )}
      <Box sx={{ minHeight: 0, overflow: "auto", p: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        <Stack spacing={1.75} sx={{ maxWidth: 1120, mx: "auto" }}>
          {errors.map((error, index) => (
            error ? <Alert key={`${error}-${index}`} severity="error">{error}</Alert> : null
          ))}
          {selectedAgent && <AgentConversationHeader agent={selectedAgent} onClose={() => closeAgent(selectedAgent)} />}
          {displayTurns.length === 0 && (
            <EmptyConversation selectedAgent={selectedAgent} activeThemePlugin={activeThemePlugin} onPromptSelect={onPromptSelect} />
          )}
          {displayTurns.map((turn) => (
            <Paper
              key={turn.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.58 : 0.72),
                boxShadow: (theme) => theme.customShadows?.z4
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Chip size="small" label={turn.status} color={turn.status === "failed" ? "error" : "default"} />
                <Typography variant="caption" color="text.secondary">
                  {turn.id}
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {turn.items.map((item) => renderWorkbenchItem(item))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
      </Box>
    </Box>
  );
}

function ChatTopStatusSurface({
  goal,
  stats,
  statsOpen,
  modes,
  onStatsClose,
  onGoalEdit,
  onGoalStatusChange,
  onGoalClear
}: {
  goal?: GoalBannerState | null;
  stats?: WorkbenchStatsState | null;
  statsOpen: boolean;
  modes: WorkbenchModeState;
  onStatsClose?: () => void;
  onGoalEdit?: () => void;
  onGoalStatusChange?: (status: GoalStatus) => void;
  onGoalClear?: () => void;
}) {
  return (
    <Box
      data-testid="chat-top-status-surface"
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.72 : 0.82),
        backdropFilter: "blur(18px)",
        px: { xs: 1, sm: 1.5, lg: 2 },
        py: 1
      }}
    >
      <Stack spacing={1} sx={{ maxWidth: 1120, mx: "auto" }}>
        {goal && (
          <GoalBanner
            goal={goal}
            onEdit={onGoalEdit}
            onStatusChange={onGoalStatusChange}
            onClear={onGoalClear}
          />
        )}
        {(modes.fast || modes.plan) && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap data-testid="chat-mode-badges">
            {modes.fast && <Chip size="small" color="warning" icon={<BoltIcon />} label="Fast" data-testid="fast-mode-badge" />}
            {modes.plan && <Chip size="small" color="primary" icon={<ChecklistIcon />} label="Plan" data-testid="plan-mode-badge" />}
          </Stack>
        )}
        {statsOpen && stats && <StatsPanel stats={stats} onClose={onStatsClose} />}
      </Stack>
    </Box>
  );
}

function GoalBanner({
  goal,
  onEdit,
  onStatusChange,
  onClear
}: {
  goal: GoalBannerState;
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
              Goal
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
          <Tooltip title="Edit goal">
            <IconButton size="small" aria-label="Edit goal" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={paused ? "Resume goal" : "Pause goal"}>
            <IconButton
              size="small"
              aria-label={paused ? "Resume goal" : "Pause goal"}
              onClick={() => onStatusChange?.(paused ? "active" : "paused")}
              disabled={complete}
            >
              {paused ? <PlayCircleIcon fontSize="small" /> : <PauseCircleIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear goal">
            <IconButton size="small" aria-label="Clear goal" onClick={onClear}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}

function StatsPanel({ stats, onClose }: { stats: WorkbenchStatsState; onClose?: () => void }) {
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
              {stats.scope === "stats" ? "Project Stats" : "Session Status"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {stats.activeThreadId ? `Thread ${stats.activeThreadId}` : "No active thread yet"}
            </Typography>
          </Box>
          <Button size="small" onClick={onClose}>
            Close
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
  onPromptSelect
}: {
  selectedAgent: AgentSession | null;
  activeThemePlugin?: ThemePlugin | null;
  onPromptSelect?: (text: string) => void;
}) {
  if (!selectedAgent) {
    return <DefaultWorkbenchEmpty activeThemePlugin={activeThemePlugin} onPromptSelect={onPromptSelect} />;
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
  onPromptSelect
}: {
  activeThemePlugin?: ThemePlugin | null;
  onPromptSelect?: (text: string) => void;
}) {
  const heroImage =
    activeThemePlugin?.layout?.heroEnabled === false
      ? undefined
      : safeThemeAssetUrl(activeThemePlugin?.assets?.heroImage ?? activeThemePlugin?.assets?.appBackgroundImage);
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
                Codex Workbench
              </Typography>
            </Stack>
            <Typography component="h2" sx={{ fontSize: { xs: 34, md: 48 }, lineHeight: 1.08, fontWeight: 850 }}>
              What should we build?
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 540, fontSize: 16 }}>
              Start from a focused coding workflow, or type your own request in the composer below.
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
              gap: 1.25
            }}
          >
            {emptyPromptCards.map((card) => (
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

function renderWorkbenchItem(item: WorkbenchItem) {
  return (
    <Paper
      key={item.id}
      variant="outlined"
      sx={{
        p: 1.35,
        borderRadius: 1,
        bgcolor:
          item.type === "agentMessage"
            ? (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.82 : 0.86)
            : item.type === "userMessage"
              ? "action.selected"
              : (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.66 : 0.6)
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
  );
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

function mainConversationTurns(turns: WorkbenchTurn[], activeThreadId: string | null): WorkbenchTurn[] {
  const visibleTurns = activeThreadId ? turns.filter((turn) => turn.threadId === activeThreadId) : turns;
  return visibleTurns
    .map((turn) => ({
      ...turn,
      items: turn.items.filter((item) => !item.agentId && !item.agentThreadId)
    }))
    .filter((turn) => turn.items.length > 0);
}

function agentConversationTurns(turns: WorkbenchTurn[], activeThreadId: string | null, agent: AgentSession): WorkbenchTurn[] {
  return turns
    .map((turn): WorkbenchTurn | null => {
      if (agent.threadId && turn.threadId === agent.threadId) {
        return turn;
      }
      if (turn.threadId !== activeThreadId) {
        return null;
      }
      const items = turn.items.filter((item) => itemBelongsToAgent(item, agent));
      return items.length > 0 ? { ...turn, items } : null;
    })
    .filter((turn): turn is WorkbenchTurn => Boolean(turn));
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
  const errorMessage = stringValue(isRecord(payload.error) ? payload.error.message : undefined);

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
