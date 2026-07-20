import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Paper,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HubIcon from "@mui/icons-material/Hub";
import { useMemo, useState } from "react";
import { useI18n, type TranslateFn } from "../i18n";
import {
  CODE_LAUNCH,
  LAUNCH_ADAPTERS,
  LAUNCH_ORG_URL,
  LAUNCH_REPO_PATTERN,
  codeLaunchCloneCommand,
  type LaunchAdapter
} from "../launchAdapters";

/** Chat engines planned for multi-engine UI (only codex is live today). */
export type ChatEngineId =
  | "codex"
  | "agy"
  | "auggie"
  | "claude"
  | "crush"
  | "grok"
  | "gemini";

export type ChatEnginePlan = {
  id: ChatEngineId;
  label: string;
  protocol: "responses" | "chat";
  launchId?: string;
  status: "active" | "planned";
  githubUrl?: string;
};

export const CHAT_ENGINE_PLAN: ChatEnginePlan[] = [
  {
    id: "codex",
    label: "Codex",
    protocol: "responses",
    launchId: "code-launch",
    status: "active",
    githubUrl: CODE_LAUNCH.githubUrl
  },
  {
    id: "agy",
    label: "agy CLI",
    protocol: "chat",
    launchId: "agy-launch",
    status: "planned",
    githubUrl: "https://github.com/layola13/agy-launch"
  },
  {
    id: "auggie",
    label: "Auggie",
    protocol: "chat",
    launchId: "auggie-launch",
    status: "planned",
    githubUrl: "https://github.com/layola13/auggie-launch"
  },
  {
    id: "claude",
    label: "Claude Code",
    protocol: "chat",
    launchId: "claude-launch",
    status: "planned",
    githubUrl: "https://github.com/layola13/claude-launch"
  },
  {
    id: "crush",
    label: "Crush",
    protocol: "chat",
    launchId: "crush-launch",
    status: "planned",
    githubUrl: "https://github.com/layola13/crush-launch"
  },
  {
    id: "grok",
    label: "Grok",
    protocol: "chat",
    launchId: "grok-launch",
    status: "planned",
    githubUrl: "https://github.com/layola13/grok-launch"
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    protocol: "chat",
    launchId: "gemini-launch",
    status: "planned",
    githubUrl: "https://github.com/layola13/gemini-launch"
  }
];

type CompactProps = {
  t: TranslateFn;
  severity?: "info" | "warning" | "error";
};

/**
 * Inline banner for relay settings: warn that Chat Completions relays need code-launch.
 */
export function CodeLaunchRelayBanner({ t, severity = "warning" }: CompactProps) {
  const [copied, setCopied] = useState(false);
  const cmd = codeLaunchCloneCommand();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
    } catch {
      setCopied(true);
    }
  };

  return (
    <Alert severity={severity} variant="outlined" icon={<RocketLaunchIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
          {t("settings.launch.relayBannerTitle")}
        </Typography>
        <Typography variant="body2">
          {t("settings.launch.relayBannerBody", {
            repo: CODE_LAUNCH.githubUrl,
            pattern: LAUNCH_REPO_PATTERN
          })}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button
            size="small"
            variant="contained"
            startIcon={<OpenInNewIcon />}
            href={CODE_LAUNCH.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ borderRadius: 999, fontWeight: 800 }}
          >
            {t("settings.launch.openCodeLaunch")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void copy()} sx={{ borderRadius: 999 }}>
            {t("settings.launch.copyInstall")}
          </Button>
          <Chip size="small" variant="outlined" label={t("settings.launch.familyPattern", { pattern: LAUNCH_REPO_PATTERN })} />
        </Stack>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1,
            borderRadius: 1.5,
            bgcolor: "action.hover",
            fontSize: 12,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            overflow: "auto",
            whiteSpace: "pre-wrap"
          }}
        >
          {cmd}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t("settings.launch.afterInstallHint")}
        </Typography>
      </Stack>
      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)} message={t("settings.launch.copied")} />
    </Alert>
  );
}

type CatalogProps = {
  t: TranslateFn;
  /** When true, show full settings page chrome (engine switcher + roadmap). */
  fullPage?: boolean;
};

/**
 * Full settings surface: engine plan (default Codex) + layola13 *-launch download catalog.
 */
export function LaunchAdaptersCatalog({ t, fullPage = false }: CatalogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [engine, setEngine] = useState<ChatEngineId>("codex");
  const { locale } = useI18n();
  const localeIsCn = locale === "zh";

  const activeEngine: ChatEnginePlan = useMemo(() => {
    return CHAT_ENGINE_PLAN.find((e) => e.id === engine) ?? {
      id: "codex",
      label: "Codex",
      protocol: "responses",
      launchId: "code-launch",
      status: "active",
      githubUrl: CODE_LAUNCH.githubUrl
    };
  }, [engine]);

  const copyCmd = async (adapter: LaunchAdapter) => {
    const cmd = localeIsCn ? adapter.installHintCn : adapter.installHintEn;
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      /* ignore */
    }
    setCopiedId(adapter.id);
  };

  const onEngineChange = (_: unknown, next: ChatEngineId | null) => {
    if (!next) {
      return;
    }
    const plan = CHAT_ENGINE_PLAN.find((e) => e.id === next);
    if (!plan || plan.status !== "active") {
      // Keep selection visual only for planned engines; chat still Codex.
      setEngine(next);
      return;
    }
    setEngine(next);
  };

  return (
    <Stack spacing={2.25}>
      {fullPage ? (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "flex-start" }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <RocketLaunchIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {t("settings.launch.pageTitle")}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
                {t("settings.launch.pageSubtitle", { org: LAUNCH_ORG_URL, pattern: LAUNCH_REPO_PATTERN })}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              href={LAUNCH_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 999, alignSelf: "flex-start" }}
            >
              {t("settings.launch.openOrg")}
            </Button>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.06))"
                  : "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.06))"
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <HubIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                  {t("settings.launch.engineTitle")}
                </Typography>
                <Chip size="small" color="primary" label={t("settings.launch.engineDefaultCodex")} sx={{ fontWeight: 800 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t("settings.launch.engineHint")}
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={engine}
                onChange={onEngineChange}
                sx={{
                  flexWrap: "wrap",
                  gap: 0.75,
                  "& .MuiToggleButton-root": {
                    borderRadius: "999px !important",
                    border: "1px solid",
                    borderColor: "divider",
                    px: 1.5,
                    textTransform: "none",
                    fontWeight: 700
                  }
                }}
              >
                {CHAT_ENGINE_PLAN.map((item) => (
                  <ToggleButton key={item.id} value={item.id} disabled={item.status !== "active"}>
                    {item.label}
                    {item.status === "planned" ? (
                      <Chip size="small" label={t("settings.launch.planned")} sx={{ ml: 0.75, height: 20, fontSize: 10 }} />
                    ) : null}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Alert severity={activeEngine.status === "active" ? "success" : "info"} variant="outlined" sx={{ borderRadius: 2 }}>
                {activeEngine.status === "active"
                  ? t("settings.launch.engineActiveNote", { engine: activeEngine.label })
                  : t("settings.launch.enginePlannedNote", {
                      engine: activeEngine.label,
                      protocol: activeEngine.protocol,
                      launch: activeEngine.launchId ?? "*-launch"
                    })}
              </Alert>
              <Typography variant="caption" color="text.secondary">
                {t("settings.launch.engineRoadmap")}
              </Typography>
            </Stack>
          </Paper>
        </>
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {t("settings.launch.catalogTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.launch.catalogSubtitle", { org: LAUNCH_ORG_URL, pattern: LAUNCH_REPO_PATTERN })}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={LAUNCH_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ borderRadius: 999, alignSelf: "flex-start" }}
          >
            {t("settings.launch.openOrg")}
          </Button>
        </Stack>
      )}

      <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
        <Typography variant="body2">{t("settings.launch.catalogInfo")}</Typography>
      </Alert>

      <Divider />

      <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
        {t("settings.launch.downloadSection")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("settings.launch.downloadSectionHint", { pattern: LAUNCH_REPO_PATTERN })}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }
        }}
      >
        {LAUNCH_ADAPTERS.map((adapter) => {
          const summary = localeIsCn ? adapter.summaryCn : adapter.summaryEn;
          const install = localeIsCn ? adapter.installHintCn : adapter.installHintEn;
          return (
            <Paper
              key={adapter.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderColor: adapter.requiredForCodexUi ? "warning.main" : "divider",
                background: adapter.requiredForCodexUi
                  ? (theme) =>
                      theme.palette.mode === "dark"
                        ? "linear-gradient(145deg, rgba(251,191,36,0.08), transparent 70%)"
                        : "linear-gradient(145deg, rgba(251,191,36,0.12), transparent 70%)"
                  : undefined
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    {adapter.name}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {adapter.requiredForCodexUi ? (
                      <Chip size="small" color="warning" label={t("settings.launch.requiredForUi")} />
                    ) : (
                      <Chip size="small" variant="outlined" label={t("settings.launch.optional")} />
                    )}
                  </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {adapter.product}
                </Typography>
                <Typography variant="body2">{summary}</Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    overflow: "auto",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {install}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant={adapter.requiredForCodexUi ? "contained" : "outlined"}
                    startIcon={<DownloadIcon />}
                    href={adapter.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ borderRadius: 999 }}
                  >
                    {t("settings.launch.download")}
                  </Button>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => void copyCmd(adapter)} sx={{ borderRadius: 999 }}>
                    {t("settings.launch.copyInstall")}
                  </Button>
                  <Link href={adapter.githubUrl} target="_blank" rel="noopener noreferrer" underline="hover" variant="caption" sx={{ alignSelf: "center" }}>
                    {adapter.githubUrl}
                  </Link>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Box>
      <Snackbar open={Boolean(copiedId)} autoHideDuration={1800} onClose={() => setCopiedId(null)} message={t("settings.launch.copied")} />
    </Stack>
  );
}

type ProviderHintProps = {
  t: TranslateFn;
  needsCodeLaunch: boolean;
};

/** Per-provider row hint chip + short text. */
export function ProviderCodeLaunchHint({ t, needsCodeLaunch }: ProviderHintProps) {
  if (!needsCodeLaunch) {
    return null;
  }
  return (
    <Chip
      size="small"
      color="warning"
      variant="outlined"
      icon={<RocketLaunchIcon />}
      component="a"
      href={CODE_LAUNCH.githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      clickable
      label={t("settings.launch.needsCodeLaunchChip")}
      sx={{ borderRadius: 999, fontWeight: 700 }}
    />
  );
}
