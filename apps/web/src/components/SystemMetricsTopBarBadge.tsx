import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Chip,
  ClickAwayListener,
  Divider,
  LinearProgress,
  Paper,
  Popper,
  Stack,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import SpeedIcon from "@mui/icons-material/Speed";
import DnsIcon from "@mui/icons-material/Dns";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import type { SystemMetrics } from "@codex-ui/shared";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${mins}分`;
  return `${mins}分钟`;
}

function getProgressColor(percent: number): "success" | "warning" | "error" {
  if (percent >= 85) return "error";
  if (percent >= 65) return "warning";
  return "success";
}

export const SystemMetricsTopBarBadge: React.FC<{ token?: string }> = ({ token }) => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchorEl);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const fetchMetrics = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers["x-codex-ui-token"] = token;
        }
        const res = await fetch("/api/system/metrics", { headers });
        if (res.ok && active) {
          const data = (await res.json()) as SystemMetrics;
          setMetrics(data);
        }
      } catch {
        /* ignore transient errors */
      }
    };

    void fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => {
      active = false;
      clearInterval(interval);
      clearCloseTimer();
    };
  }, [token]);

  const clearCloseTimer = () => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setAnchorEl(null);
      hoverTimeoutRef.current = null;
    }, 260);
  };

  const openPanel = (element: HTMLElement) => {
    clearCloseTimer();
    setAnchorEl(element);
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    openPanel(event.currentTarget);
  };

  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    openPanel(event.currentTarget);
  };

  if (!metrics) {
    return null;
  }

  const cpuColor = getProgressColor(metrics.cpu.usagePercent);
  const memColor = getProgressColor(metrics.memory.usagePercent);
  const diskColor = getProgressColor(metrics.disk.usagePercent);

  return (
    <>
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleClose}
        sx={{
          display: { xs: "none", md: "inline-flex" },
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.4,
          borderRadius: 2,
          border: "1px solid",
          borderColor: isOpen ? "primary.main" : "divider",
          bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            bgcolor: (t) => alpha(t.palette.action.hover, 0.12),
            boxShadow: theme.customShadows?.z4
          }
        }}
        onFocus={handleFocus}
      >
        {/* Pulsing online indicator */}
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "success.main",
            boxShadow: "0 0 8px rgba(76, 175, 80, 0.8)",
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": { opacity: 1 },
              "50%": { opacity: 0.35 },
              "100%": { opacity: 1 }
            }
          }}
        />

        <Chip
          size="small"
          variant="outlined"
          color={cpuColor}
          icon={<SpeedIcon style={{ fontSize: 14 }} />}
          label={`CPU ${metrics.cpu.usagePercent}%`}
          sx={{ height: 22, fontSize: 11.5, fontWeight: 750, border: 0 }}
        />

        <Chip
          size="small"
          variant="outlined"
          color={memColor}
          icon={<MemoryIcon style={{ fontSize: 14 }} />}
          label={`RAM ${metrics.memory.usagePercent}%`}
          sx={{ height: 22, fontSize: 11.5, fontWeight: 750, border: 0 }}
        />

        <Chip
          size="small"
          variant="outlined"
          color={diskColor}
          icon={<StorageIcon style={{ fontSize: 14 }} />}
          label={`Disk ${metrics.disk.usagePercent}%`}
          sx={{ height: 22, fontSize: 11.5, fontWeight: 750, border: 0 }}
        />
      </Box>

      <Popper
        open={isOpen}
        anchorEl={anchorEl}
        placement="bottom"
        disablePortal={false}
        modifiers={[
          { name: "offset", options: { offset: [0, 0] } },
          { name: "preventOverflow", options: { padding: 12 } }
        ]}
        sx={{
          zIndex: (t) => t.zIndex.tooltip,
          pointerEvents: "auto"
        }}
      >
        <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
          <Box
            data-testid="system-metrics-panel"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            sx={{
              pt: 0.75,
              // Transparent hover bridge between the top-bar badge and panel.
              pointerEvents: "auto"
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: 2,
                width: 330,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (t) => alpha(t.palette.background.paper, 0.95),
                backdropFilter: "blur(16px)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.36)",
                pointerEvents: "auto"
              }}
            >
              <Stack spacing={1.75}>
                {/* Header & Host Info */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DnsIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850, lineHeight: 1.2 }}>
                        {metrics.host.hostname || "VPS Host Server"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        {metrics.host.platform} ({metrics.host.arch})
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <AccessTimeIcon color="action" style={{ fontSize: 13 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: 11 }}>
                      {formatUptime(metrics.host.uptimeSec)}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider />

                {/* CPU Details */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <SpeedIcon color={cpuColor} fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        CPU 处理器
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" color={`${cpuColor}.main`} sx={{ fontWeight: 900 }}>
                      {metrics.cpu.usagePercent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.cpu.usagePercent}
                    color={cpuColor}
                    sx={{ height: 6, borderRadius: 3, mb: 0.75 }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      {metrics.cpu.cores} 核心 · {metrics.cpu.model.slice(0, 24)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                      Load: {metrics.cpu.loadAvg.join(" / ")}
                    </Typography>
                  </Stack>
                </Box>

                {/* Memory Details */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <MemoryIcon color={memColor} fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        RAM 内存占用
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" color={`${memColor}.main`} sx={{ fontWeight: 900 }}>
                      {metrics.memory.usagePercent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.memory.usagePercent}
                    color={memColor}
                    sx={{ height: 6, borderRadius: 3, mb: 0.75 }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      已用 {formatBytes(metrics.memory.usedBytes)} / 共 {formatBytes(metrics.memory.totalBytes)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      可用 {formatBytes(metrics.memory.freeBytes)}
                    </Typography>
                  </Stack>

                  {Boolean(metrics.memory.swapTotalBytes) && (
                    <Stack direction="row" justifyContent="space-between" mt={0.5}>
                      <Typography variant="caption" color="text.disabled">
                        Swap 交换空间
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatBytes(metrics.memory.swapUsedBytes || 0)} / {formatBytes(metrics.memory.swapTotalBytes || 0)} ({metrics.memory.swapUsagePercent || 0}%)
                      </Typography>
                    </Stack>
                  )}
                </Box>

                {/* Disk Details */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <StorageIcon color={diskColor} fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        Disk 磁盘使用 ({metrics.disk.mountPoint})
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" color={`${diskColor}.main`} sx={{ fontWeight: 900 }}>
                      {metrics.disk.usagePercent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.disk.usagePercent}
                    color={diskColor}
                    sx={{ height: 6, borderRadius: 3, mb: 0.75 }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      已用 {formatBytes(metrics.disk.usedBytes)} / 总 {formatBytes(metrics.disk.totalBytes)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      剩余 {formatBytes(metrics.disk.freeBytes)}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </ClickAwayListener>
      </Popper>
    </>
  );
};
