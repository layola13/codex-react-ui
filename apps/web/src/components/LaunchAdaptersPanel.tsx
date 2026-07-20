import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HubIcon from "@mui/icons-material/Hub";
import RefreshIcon from "@mui/icons-material/Refresh";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n, type TranslateFn } from "../i18n";
import {
  CODE_LAUNCH,
  LAUNCH_ADAPTERS,
  LAUNCH_ORG_URL,
  LAUNCH_REPO_PATTERN,
  codeLaunchCloneCommand,
  type LaunchAdapter
} from "../launchAdapters";
import {
  fetchLaunchAdapters,
  installLaunchAdapters,
  writeLaunchAdapterEnvs,
  type LaunchAdapterStatus,
  type LaunchEnvValues,
  type InstallLaunchResultItem
} from "../state/codexClient";

/** Chat engines planned for multi-engine UI (only codex is live today).
 *  History tabs already list all *-launch CLIs (read-only); chatRuntime is next.
 *  Canonical catalog: @codex-ui/shared AGENT_ENGINE_CATALOG.
 */
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
  /** Session token for host detect / one-click install APIs. */
  token?: string | null;
  /** When membership is on, only admin can mutate host installs. */
  isAdmin?: boolean;
};

/**
 * Full settings surface: engine plan (default Codex) + layola13 *-launch download catalog
 * with host install detection and optional one-click install + .env write.
 */
export function LaunchAdaptersCatalog({ t, fullPage = false, token = null, isAdmin = true }: CatalogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [engine, setEngine] = useState<ChatEngineId>("codex");
  const { locale } = useI18n();
  const localeIsCn = locale === "zh";

  const [statusMap, setStatusMap] = useState<Record<string, LaunchAdapterStatus>>({});
  const [sourceRoot, setSourceRoot] = useState<string>("");
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [envMode, setEnvMode] = useState<"shared" | "separate" | "none">("shared");
  const [sharedEnv, setSharedEnv] = useState<LaunchEnvValues>({ baseUrl: "", model: "", apiKey: "" });
  const [separateEnv, setSeparateEnv] = useState<Record<string, LaunchEnvValues>>({});
  const [skipCli, setSkipCli] = useState(true);
  const [forceEnv, setForceEnv] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<InstallLaunchResultItem[] | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const canMutate = Boolean(token) && isAdmin;

  const reloadStatus = useCallback(async () => {
    if (!token) {
      setDetectError(null);
      return;
    }
    setDetectLoading(true);
    setDetectError(null);
    try {
      const data = await fetchLaunchAdapters(token);
      setSourceRoot(data.sourceRoot);
      const map: Record<string, LaunchAdapterStatus> = {};
      const nextSelected: Record<string, boolean> = {};
      for (const row of data.adapters) {
        map[row.id] = row;
        nextSelected[row.id] = row.needsInstall && row.cloneable;
      }
      setStatusMap(map);
      setSelected((prev) => {
        // Keep user choices if already set
        if (Object.keys(prev).length) {
          const merged = { ...nextSelected };
          for (const [k, v] of Object.entries(prev)) {
            if (k in merged) merged[k] = v;
          }
          return merged;
        }
        return nextSelected;
      });
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetectLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reloadStatus();
  }, [reloadStatus]);

  const missingCount = useMemo(
    () => Object.values(statusMap).filter((s) => s.needsInstall).length,
    [statusMap]
  );
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  const onInstall = async (ids?: string[]) => {
    if (!token || !canMutate) return;
    setInstalling(true);
    setActionMsg(null);
    setInstallLog(null);
    try {
      const payload = {
        ids: ids && ids.length ? ids : selectedIds,
        missingOnly: false,
        skipCli,
        envMode,
        sharedEnv: envMode === "shared" ? sharedEnv : undefined,
        separateEnv: envMode === "separate" ? separateEnv : undefined,
        forceEnv
      };
      const result = await installLaunchAdapters(token, payload);
      setInstallLog(result.results);
      const map: Record<string, LaunchAdapterStatus> = {};
      for (const row of result.adapters) map[row.id] = row;
      setStatusMap(map);
      const ok = result.results.filter((r) => r.ok).length;
      const fail = result.results.filter((r) => !r.ok).length;
      setActionMsg(t("settings.launch.installDone", { ok: String(ok), fail: String(fail) }));
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
    }
  };

  const onWriteEnvOnly = async () => {
    if (!token || !canMutate || envMode === "none") return;
    setInstalling(true);
    setActionMsg(null);
    try {
      const result = await writeLaunchAdapterEnvs(token, {
        mode: envMode === "separate" ? "separate" : "shared",
        ids: selectedIds.length ? selectedIds : undefined,
        sharedEnv: envMode === "shared" ? sharedEnv : undefined,
        separateEnv: envMode === "separate" ? separateEnv : undefined,
        force: forceEnv
      });
      const map: Record<string, LaunchAdapterStatus> = {};
      for (const row of result.adapters) map[row.id] = row;
      setStatusMap(map);
      setActionMsg(t("settings.launch.envWrote", { count: String(result.results.filter((r) => r.ok).length) }));
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
    }
  };

  const statusChip = (adapter: LaunchAdapter) => {
    const st = statusMap[adapter.id];
    if (!token) {
      return <Chip size="small" variant="outlined" label={t("settings.launch.statusUnknown")} />;
    }
    if (!st) {
      return <Chip size="small" variant="outlined" label={t("settings.launch.statusChecking")} />;
    }
    if (st.installed && st.envConfigured) {
      return <Chip size="small" color="success" icon={<CheckCircleIcon />} label={t("settings.launch.statusReady")} />;
    }
    if (st.installed && !st.envConfigured) {
      return <Chip size="small" color="warning" label={t("settings.launch.statusNeedEnv")} />;
    }
    if (!st.cloneable) {
      return <Chip size="small" color="default" label={t("settings.launch.statusNoRepo")} />;
    }
    return <Chip size="small" color="error" icon={<ErrorOutlineIcon />} label={t("settings.launch.statusMissing")} />;
  };

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

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2.5,
          borderColor: "primary.main",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(56,189,248,0.05))"
              : "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(14,165,233,0.06))"
        }}
      >
        <Stack spacing={1.75}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                {t("settings.launch.oneClickTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("settings.launch.oneClickHint", {
                  missing: String(missingCount),
                  root: sourceRoot || "~/.codex-react-ui/launch-src"
                })}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                startIcon={detectLoading ? <CircularProgress size={14} /> : <RefreshIcon />}
                onClick={() => void reloadStatus()}
                disabled={!token || detectLoading}
                sx={{ borderRadius: 999 }}
              >
                {t("settings.launch.detect")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={installing ? <CircularProgress size={14} color="inherit" /> : <InstallDesktopIcon />}
                onClick={() => void onInstall(selectedIds)}
                disabled={!canMutate || installing || selectedIds.length === 0}
                sx={{ borderRadius: 999, fontWeight: 800 }}
              >
                {t("settings.launch.installSelected", { count: String(selectedIds.length) })}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() =>
                  void onInstall(
                    Object.values(statusMap)
                      .filter((s) => s.needsInstall && (s.cloneable || s.sourcePresent))
                      .map((s) => s.id)
                  )
                }
                disabled={!canMutate || installing || missingCount === 0}
                sx={{ borderRadius: 999, fontWeight: 800 }}
              >
                {t("settings.launch.installMissing")}
              </Button>
            </Stack>
          </Stack>

          {!token ? (
            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
              {t("settings.launch.needToken")}
            </Alert>
          ) : null}
          {token && !isAdmin ? (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
              {t("settings.launch.adminOnlyMutate")}
            </Alert>
          ) : null}
          {detectError ? (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
              {detectError}
            </Alert>
          ) : null}
          {actionMsg ? (
            <Alert severity="success" variant="outlined" sx={{ borderRadius: 2 }}>
              {actionMsg}
            </Alert>
          ) : null}

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t("settings.launch.envModeTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("settings.launch.envModeHint")}
          </Typography>
          <RadioGroup
            row
            value={envMode}
            onChange={(_, v) => setEnvMode(v as "shared" | "separate" | "none")}
          >
            <FormControlLabel value="shared" control={<Radio size="small" />} label={t("settings.launch.envShared")} />
            <FormControlLabel value="separate" control={<Radio size="small" />} label={t("settings.launch.envSeparate")} />
            <FormControlLabel value="none" control={<Radio size="small" />} label={t("settings.launch.envNone")} />
          </RadioGroup>

          {envMode === "shared" ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <TextField
                size="small"
                fullWidth
                label={t("settings.launch.envBaseUrl")}
                value={sharedEnv.baseUrl ?? ""}
                onChange={(e) => setSharedEnv((s) => ({ ...s, baseUrl: e.target.value }))}
                placeholder="https://api.example.com/v1"
              />
              <TextField
                size="small"
                fullWidth
                label={t("settings.launch.envModel")}
                value={sharedEnv.model ?? ""}
                onChange={(e) => setSharedEnv((s) => ({ ...s, model: e.target.value }))}
                placeholder="gpt-4o"
              />
              <TextField
                size="small"
                fullWidth
                type="password"
                label={t("settings.launch.envApiKey")}
                value={sharedEnv.apiKey ?? ""}
                onChange={(e) => setSharedEnv((s) => ({ ...s, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
            </Stack>
          ) : null}

          {envMode === "separate" ? (
            <Stack spacing={1.25}>
              {LAUNCH_ADAPTERS.filter((a) => selected[a.id]).map((adapter) => {
                const env = separateEnv[adapter.id] ?? {};
                return (
                  <Paper key={adapter.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {adapter.name} ({adapter.envPrefix}*)
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="BASE_URL"
                        value={env.baseUrl ?? ""}
                        onChange={(e) =>
                          setSeparateEnv((s) => ({
                            ...s,
                            [adapter.id]: { ...s[adapter.id], baseUrl: e.target.value }
                          }))
                        }
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label="MODEL"
                        value={env.model ?? ""}
                        onChange={(e) =>
                          setSeparateEnv((s) => ({
                            ...s,
                            [adapter.id]: { ...s[adapter.id], model: e.target.value }
                          }))
                        }
                      />
                      <TextField
                        size="small"
                        fullWidth
                        type="password"
                        label="API_KEY"
                        value={env.apiKey ?? ""}
                        onChange={(e) =>
                          setSeparateEnv((s) => ({
                            ...s,
                            [adapter.id]: { ...s[adapter.id], apiKey: e.target.value }
                          }))
                        }
                      />
                    </Stack>
                  </Paper>
                );
              })}
              {selectedIds.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("settings.launch.selectForSeparateEnv")}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={<Checkbox size="small" checked={skipCli} onChange={(_, v) => setSkipCli(v)} />}
              label={t("settings.launch.skipCli")}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={forceEnv} onChange={(_, v) => setForceEnv(v)} />}
              label={t("settings.launch.forceEnv")}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={!canMutate || installing || envMode === "none"}
              onClick={() => void onWriteEnvOnly()}
              sx={{ borderRadius: 999 }}
            >
              {t("settings.launch.writeEnvOnly")}
            </Button>
          </Stack>

          {installLog ? (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: "action.hover",
                fontSize: 11,
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                maxHeight: 220,
                overflow: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {installLog
                .map((r) =>
                  [
                    `# ${r.id} ${r.ok ? "OK" : "FAIL"}`,
                    ...r.steps.map((s) => `  ${s}`),
                    r.error ? `  error: ${r.error}` : ""
                  ]
                    .filter(Boolean)
                    .join("\n")
                )
                .join("\n\n")}
            </Box>
          ) : null}
        </Stack>
      </Paper>

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
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Checkbox
                      size="small"
                      checked={Boolean(selected[adapter.id])}
                      onChange={(_, v) => setSelected((s) => ({ ...s, [adapter.id]: v }))}
                      disabled={!token}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                      {adapter.name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {statusChip(adapter)}
                    {adapter.requiredForCodexUi ? (
                      <Chip size="small" color="warning" label={t("settings.launch.requiredForUi")} />
                    ) : (
                      <Chip size="small" variant="outlined" label={t("settings.launch.optional")} />
                    )}
                  </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {adapter.product}
                  {statusMap[adapter.id]?.wrapperPath
                    ? ` · ${statusMap[adapter.id]?.wrapperPath}`
                    : statusMap[adapter.id]?.sourceDir
                      ? ` · src:${statusMap[adapter.id]?.sourceDir}`
                      : ""}
                </Typography>
                <Typography variant="body2">{summary}</Typography>
                {statusMap[adapter.id] && !statusMap[adapter.id]?.cloneable && !statusMap[adapter.id]?.installed ? (
                  <Alert severity="warning" variant="outlined" sx={{ borderRadius: 1.5, py: 0 }}>
                    {t("settings.launch.noPublicRepo")}
                  </Alert>
                ) : null}
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
                  {statusMap[adapter.id]?.needsInstall && (statusMap[adapter.id]?.cloneable || statusMap[adapter.id]?.sourcePresent) ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<InstallDesktopIcon />}
                      disabled={!canMutate || installing}
                      onClick={() => void onInstall([adapter.id])}
                      sx={{ borderRadius: 999, fontWeight: 800 }}
                    >
                      {t("settings.launch.oneClick")}
                    </Button>
                  ) : null}
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
