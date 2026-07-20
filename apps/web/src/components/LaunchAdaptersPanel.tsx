import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Snackbar,
  Stack,
  Typography
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ExtensionIcon from "@mui/icons-material/Extension";
import { useState } from "react";
import { useI18n, type TranslateFn } from "../i18n";
import {
  CODE_LAUNCH,
  LAUNCH_ADAPTERS,
  LAUNCH_ORG_URL,
  LAUNCH_REPO_PATTERN,
  codeLaunchCloneCommand,
  type LaunchAdapter
} from "../launchAdapters";

type CompactProps = {
  t: TranslateFn;
  /** When true, emphasize code-launch only (relay context). */
  focusCodeLaunch?: boolean;
  severity?: "info" | "warning" | "error";
  title?: string;
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
    <Alert
      severity={severity}
      variant="outlined"
      icon={<ExtensionIcon fontSize="inherit" />}
      sx={{ borderRadius: 2 }}
    >
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
};

/**
 * Full catalog of layola13 *-launch adapters for the Plugins settings tab.
 */
export function LaunchAdaptersCatalog({ t }: CatalogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { locale } = useI18n();
  const localeIsCn = locale === "zh";

  const copyCmd = async (adapter: LaunchAdapter) => {
    const cmd = localeIsCn ? adapter.installHintCn : adapter.installHintEn;
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      /* ignore */
    }
    setCopiedId(adapter.id);
  };

  return (
    <Stack spacing={2}>
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

      <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
        <Typography variant="body2">{t("settings.launch.catalogInfo")}</Typography>
      </Alert>

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
      icon={<ExtensionIcon />}
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
