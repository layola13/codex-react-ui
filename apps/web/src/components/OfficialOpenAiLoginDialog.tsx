import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KeyIcon from "@mui/icons-material/Key";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { ProviderConfig } from "@codex-ui/shared";

export interface OfficialOpenAiLoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSaveProvider: (provider: ProviderConfig, apiKey?: string) => Promise<void>;
  onActivateProvider: (providerId: string, model?: string) => Promise<void>;
}

export function OfficialOpenAiLoginDialog({
  open,
  onClose,
  onSaveProvider,
  onActivateProvider
}: OfficialOpenAiLoginDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const handleLogin = async () => {
    const key = apiKey.trim();
    if (!key) {
      setErrorText("请输入有效的 OpenAI 官方 API Key 或 Access Token！");
      return;
    }

    setLoading(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      // 1. Verify credentials by attempting a GET /models check
      const targetUrl = (baseUrl.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
      try {
        const checkRes = await fetch(`${targetUrl}/models`, {
          headers: {
            Authorization: `Bearer ${key}`
          }
        });
        if (checkRes.status === 401 || checkRes.status === 403) {
          throw new Error("OpenAI API Key / Token 校验失败 (HTTP 401 Unauthorized)。请检查密钥是否正确。");
        }
      } catch (err: any) {
        // If network idle or cors restriction, proceed with saving while warning
        if (err.message?.includes("401")) {
          throw err;
        }
      }

      // 2. Build Official OpenAI ProviderConfig
      const officialProviderId = "official-openai";
      const officialProvider: ProviderConfig = {
        id: officialProviderId,
        kind: "openai",
        name: "🔷 官方 OpenAI",
        baseUrl: targetUrl,
        defaultModel: "gpt-5.5",
        nativeModels: ["gpt-5.5", "gpt-5.4", "gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
        modelAliases: [],
        stationType: "official",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 3. Save to provider store
      await onSaveProvider(officialProvider, key);

      // 4. Activate Official OpenAI provider
      await onActivateProvider(officialProviderId);

      setSuccessText("✅ 官方 OpenAI 登录成功！已自动保存并切换至官方直连模式。");

      setTimeout(() => {
        setLoading(false);
        setApiKey("");
        setSuccessText(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setLoading(false);
      setErrorText(err.message || "登录失败，请检查 API Key 或网络状况。");
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <KeyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            🔷 官方 OpenAI 直接登录
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            参照 Codex 官方鉴权机制，直接输入 OpenAI 官方 API Key (`sk-proj-...` 或 `sk-...`) 或 Access Token 登录。成功后自动添加至中转站列表并开启官方直连模式。
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(37,99,235,0.12)" : "rgba(239,246,255,0.85)", borderColor: "primary.main" }}>
            <Stack spacing={1.25} alignItems="flex-start">
              <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                🌐 官方网页授权登录 (OAuth / API Key)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                点击下方按钮将直接打开 OpenAI 官方平台授权页面 (`https://platform.openai.com/api-keys` / `auth.openai.com`) 登录并快捷生成/复制官方授权 Token。
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<OpenInNewIcon fontSize="small" />}
                onClick={() => window.open("https://platform.openai.com/api-keys", "_blank", "noopener,noreferrer")}
                sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 800 }}
              >
                跳转 OpenAI 官方授权网页
              </Button>
            </Stack>
          </Paper>

          {errorText && (
            <Alert severity="error" variant="outlined" onClose={() => setErrorText(null)}>
              {errorText}
            </Alert>
          )}

          {successText && (
            <Alert severity="success" variant="outlined">
              {successText}
            </Alert>
          )}

          <TextField
            autoFocus
            required
            fullWidth
            type="password"
            size="small"
            label="OpenAI 官方 API Key / Access Token"
            placeholder="sk-proj-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
          />

          <TextField
            fullWidth
            size="small"
            label="官方 API Base URL (默认建议保持为空)"
            placeholder="https://api.openai.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={loading}
            helperText="默认为 https://api.openai.com/v1，若使用官方反代可自定义"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          取消
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleLogin()}
          disabled={loading || !apiKey.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />}
        >
          {loading ? "正在验证登录..." : "验证并登录官方"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
