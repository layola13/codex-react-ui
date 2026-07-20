import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PhonelinkLockIcon from "@mui/icons-material/PhonelinkLock";
import { useCallback, useEffect, useState } from "react";
import type { SystemAuthSettings } from "@codex-ui/shared";
import type { TranslateFn } from "../i18n";
import {
  disableTotp,
  enableTotp,
  fetchAdminSettings,
  fetchTotpStatus,
  setupTotp,
  updateAdminSettings
} from "../state/codexClient";

type Props = {
  token: string;
  isAdmin: boolean;
  t: TranslateFn;
  onSettingsSaved?: (settings: SystemAuthSettings) => void;
  onTotpChanged?: (enabled: boolean) => void;
};

/**
 * Sub2API-inspired security controls:
 * - admin: open registration, captcha, system TOTP, defaults
 * - any user: personal Google Authenticator (TOTP) setup
 */
export function SecuritySettingsPanel({ token, isAdmin, t, onSettingsSaved, onTotpChanged }: Props) {
  const [settings, setSettings] = useState<SystemAuthSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [totpStatus, setTotpStatus] = useState<{ systemEnabled: boolean; enabled: boolean; forceAdminTotp: boolean } | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string; qrUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await fetchTotpStatus(token);
      setTotpStatus(status);
      if (isAdmin) {
        setSettings(await fetchAdminSettings(token));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveSettings = async (patch: Partial<SystemAuthSettings>) => {
    if (!isAdmin) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateAdminSettings(token, patch);
      setSettings(next);
      onSettingsSaved?.(next);
      setMessage(t("settings.security.saved"));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const startTotpSetup = async () => {
    setTotpBusy(true);
    setError(null);
    setMessage(null);
    try {
      setSetup(await setupTotp(token));
      setTotpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmTotpEnable = async () => {
    setTotpBusy(true);
    setError(null);
    setMessage(null);
    try {
      await enableTotp(token, totpCode.trim());
      setSetup(null);
      setTotpCode("");
      setMessage(t("settings.security.totpEnabledMsg"));
      onTotpChanged?.(true);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmTotpDisable = async () => {
    setTotpBusy(true);
    setError(null);
    setMessage(null);
    try {
      await disableTotp(token, { totpCode: totpCode.trim() || undefined, password: disablePassword || undefined });
      setTotpCode("");
      setDisablePassword("");
      setMessage(t("settings.security.totpDisabledMsg"));
      onTotpChanged?.(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTotpBusy(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <PhonelinkLockIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {t("settings.security.title")}
          </Typography>
          <Typography color="text.secondary">{t("settings.security.subtitle")}</Typography>
        </Box>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography color="text.secondary">{t("settings.security.loading")}</Typography>
        </Stack>
      ) : null}
      {error ? (
        <Alert severity="error" variant="outlined" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert severity="success" variant="outlined" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      ) : null}

      {isAdmin && settings ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <AdminPanelSettingsIcon fontSize="small" color="warning" />
            <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
              {t("settings.security.adminTitle")}
            </Typography>
          </Stack>
          <Stack spacing={1.25}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.registrationEnabled}
                  disabled={saving}
                  onChange={(e) => void saveSettings({ registrationEnabled: e.target.checked })}
                />
              }
              label={t("settings.security.registrationEnabled")}
            />
            <Typography variant="caption" color="text.secondary" sx={{ pl: 6, mt: -1 }}>
              {t("settings.security.registrationHint")}
            </Typography>
            <FormControlLabel
              control={
                <Switch checked={settings.captchaEnabled} disabled={saving} onChange={(e) => void saveSettings({ captchaEnabled: e.target.checked })} />
              }
              label={t("settings.security.captchaEnabled")}
            />
            <FormControlLabel
              control={<Switch checked={settings.totpEnabled} disabled={saving} onChange={(e) => void saveSettings({ totpEnabled: e.target.checked })} />}
              label={t("settings.security.totpSystemEnabled")}
            />
            <FormControlLabel
              control={
                <Switch checked={settings.forceAdminTotp} disabled={saving} onChange={(e) => void saveSettings({ forceAdminTotp: e.target.checked })} />
              }
              label={t("settings.security.forceAdminTotp")}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                size="small"
                type="number"
                label={t("settings.security.defaultBalance")}
                value={String(settings.defaultMemberBalance)}
                onChange={(e) => setSettings((s) => (s ? { ...s, defaultMemberBalance: Number(e.target.value) || 0 } : s))}
                onBlur={() => void saveSettings({ defaultMemberBalance: settings.defaultMemberBalance })}
                fullWidth
              />
              <TextField
                size="small"
                type="number"
                label={t("settings.security.defaultConcurrency")}
                value={String(settings.defaultMemberConcurrency)}
                onChange={(e) => setSettings((s) => (s ? { ...s, defaultMemberConcurrency: Math.max(1, Number(e.target.value) || 1) } : s))}
                onBlur={() => void saveSettings({ defaultMemberConcurrency: settings.defaultMemberConcurrency })}
                fullWidth
              />
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1 }}>
          {t("settings.security.totpTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("settings.security.totpHint")}
        </Typography>
        {totpStatus && !totpStatus.systemEnabled ? (
          <Alert severity="warning" variant="outlined">
            {t("settings.security.totpSystemOff")}
          </Alert>
        ) : null}
        <Stack spacing={1.25} sx={{ mt: 1 }}>
          <Alert severity={totpStatus?.enabled ? "success" : "info"} variant="outlined">
            {totpStatus?.enabled ? t("settings.security.totpOn") : t("settings.security.totpOff")}
          </Alert>
          {!totpStatus?.enabled ? (
            <>
              <Button variant="contained" disabled={totpBusy || !totpStatus?.systemEnabled} onClick={() => void startTotpSetup()} sx={{ alignSelf: "flex-start", borderRadius: 999 }}>
                {t("settings.security.totpSetup")}
              </Button>
              {setup ? (
                <Stack spacing={1.25}>
                  <Box
                    component="img"
                    src={setup.qrUrl}
                    alt="TOTP QR"
                    sx={{ width: 180, height: 180, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}
                  />
                  <Typography variant="caption" sx={{ fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
                    {setup.secret}
                  </Typography>
                  <TextField size="small" label={t("settings.security.totpCode")} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} inputProps={{ inputMode: "numeric", maxLength: 6 }} />
                  <Button variant="contained" disabled={totpBusy || totpCode.trim().length < 6} onClick={() => void confirmTotpEnable()} sx={{ alignSelf: "flex-start" }}>
                    {t("settings.security.totpConfirm")}
                  </Button>
                </Stack>
              ) : null}
            </>
          ) : (
            <>
              <Divider />
              <TextField size="small" label={t("settings.security.totpCode")} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
              <TextField size="small" type="password" label={t("settings.security.passwordFallback")} value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
              <Button color="error" variant="outlined" disabled={totpBusy} onClick={() => void confirmTotpDisable()} sx={{ alignSelf: "flex-start", borderRadius: 999 }}>
                {t("settings.security.totpDisable")}
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
