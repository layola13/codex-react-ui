import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import TerminalIcon from "@mui/icons-material/Terminal";
import DeleteIcon from "@mui/icons-material/Delete";
import { WorkspaceFilesSettingsPanel, type OpenWorkspaceFile } from "./WorkspaceFilesSettingsPanel";
import type { FsDirectoryEntry, TerminalSession, WebDevPreviewProbeResult } from "../state/codexClient";
import type { TranslateFn } from "../i18n";

type Props = {
  cwd: string;
  fileDirectories: Record<string, FsDirectoryEntry[]>;
  openFile: OpenWorkspaceFile | null;
  filesPanelLayout?: Record<string, number>;
  terminalSessions: TerminalSession[];
  t: TranslateFn;
  onFilesPanelLayoutChange?: (layout: Record<string, number>) => void;
  onReadDirectory: (path: string) => void;
  onReadFile: (path: string) => void;
  onChangeOpenFileContent: (content: string) => void;
  onSaveOpenFile: () => void;
  onRunTerminalCommand: (command: string, cwd: string, size: { rows: number; cols: number }) => void;
  onWriteTerminalInput: (processId: string, input: string) => void;
  onTerminateTerminal: (processId: string) => void;
  onResizeTerminal: (processId: string, size: { rows: number; cols: number }) => void;
  onProbePreviewUrl: (url: string) => Promise<WebDevPreviewProbeResult>;
};

export function WebDevWorkspacePanel({
  cwd,
  fileDirectories,
  openFile,
  filesPanelLayout,
  terminalSessions,
  t,
  onFilesPanelLayoutChange,
  onReadDirectory,
  onReadFile,
  onChangeOpenFileContent,
  onSaveOpenFile,
  onRunTerminalCommand,
  onWriteTerminalInput,
  onTerminateTerminal,
  onResizeTerminal,
  onProbePreviewUrl
}: Props) {
  const [previewDraft, setPreviewDraft] = useState("http://localhost:5173");
  const [previewUrl, setPreviewUrl] = useState("http://localhost:5173");
  const [serverCommand, setServerCommand] = useState("bun install && bun dev");
  const [serverCwd, setServerCwd] = useState(cwd);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalSize, setTerminalSize] = useState({ rows: 24, cols: 80 });
  const [probeState, setProbeState] = useState<"idle" | "checking" | "ready" | "failed">("idle");
  const [probeResult, setProbeResult] = useState<WebDevPreviewProbeResult | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const probeSequence = useRef(0);
  const activeTerminal = terminalSessions.find((session) => session.status === "running") ?? null;
  const detectedPreviewUrl = useMemo(() => detectPreviewUrl(terminalSessions), [terminalSessions]);

  const applyPreviewUrl = useCallback((value: string) => {
    const next = normalizePreviewUrl(value);
    setPreviewDraft(next);
    setPreviewUrl(next);
    setPreviewRevision((current) => current + 1);
  }, []);

  const probePreview = useCallback(async (url: string) => {
    const sequence = probeSequence.current + 1;
    probeSequence.current = sequence;
    setProbeState("checking");
    setProbeResult(null);
    const result = await onProbePreviewUrl(url);
    if (probeSequence.current !== sequence) {
      return;
    }
    setProbeResult(result);
    setProbeState(result.ok ? "ready" : "failed");
  }, [onProbePreviewUrl]);

  useEffect(() => {
    setServerCwd(cwd);
  }, [cwd]);

  useEffect(() => {
    if (!detectedPreviewUrl) {
      return;
    }
    const normalized = normalizePreviewUrl(detectedPreviewUrl);
    if (normalized !== previewUrl) {
      applyPreviewUrl(normalized);
    }
  }, [applyPreviewUrl, detectedPreviewUrl, previewUrl]);

  useEffect(() => {
    void probePreview(previewUrl);
  }, [previewUrl, previewRevision, probePreview]);

  return (
    <Box data-testid="webdev-panel" sx={{ height: "100%", minHeight: 0, overflow: "auto", p: 1 }}>
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <CodeIcon fontSize="small" color="primary" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 850, lineHeight: 1.2 }}>
              Web Dev
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {cwd}
            </Typography>
          </Box>
          <Chip size="small" label="Bun" />
          <Chip size="small" label="React / HTML+JS / three.js" />
        </Stack>

        <Alert variant="outlined" severity="info" sx={{ alignItems: "flex-start" }}>
          Bun first. Use React when the request mentions a UI framework, three.js when it mentions 3D, and plain HTML + JS for a vanilla site.
        </Alert>

        <Box
          sx={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.4fr) minmax(350px, 0.9fr)" },
            gap: 1,
            alignItems: "start"
          }}
        >
          <WorkspaceFilesSettingsPanel
            cwd={cwd}
            fileDirectories={fileDirectories}
            openFile={openFile}
            filesPanelLayout={filesPanelLayout}
            t={t}
            onFilesPanelLayoutChange={onFilesPanelLayoutChange}
            onReadDirectory={onReadDirectory}
            onReadFile={onReadFile}
            onChangeOpenFileContent={onChangeOpenFileContent}
            onSaveOpenFile={onSaveOpenFile}
          />

          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.25,
                height: { xs: 430, xl: 560 },
                minHeight: 360,
                display: "grid",
                gridTemplateRows: "auto minmax(0, 1fr)",
                minWidth: 0
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
                  Preview
                </Typography>
                <Chip
                  data-testid="webdev-preview-status"
                  size="small"
                  color={previewStatusColor(probeState)}
                  label={previewStatusLabel(probeState, probeResult)}
                  icon={probeState === "checking" ? <CircularProgress color="inherit" size={12} /> : undefined}
                />
                <Tooltip title="Open in a new tab">
                  <IconButton size="small" aria-label="Open preview in new tab" href={previewUrl} target="_blank" rel="noreferrer">
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack spacing={1} sx={{ minHeight: 0, display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    data-testid="webdev-preview-url"
                    size="small"
                    label="Preview URL"
                    value={previewDraft}
                    onChange={(event) => setPreviewDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyPreviewUrl(previewDraft);
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <Button size="small" startIcon={<RefreshIcon />} onClick={() => applyPreviewUrl(previewDraft)}>
                    Go
                  </Button>
                </Stack>
                <Typography variant="caption" color={probeState === "failed" ? "error" : "text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                  {previewStatusDetail(probeState, probeResult, detectedPreviewUrl)}
                </Typography>
                <Box sx={{ minHeight: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                  <Box
                    data-testid="webdev-preview-frame"
                    key={`${previewUrl}-${previewRevision}`}
                    component="iframe"
                    title="Web preview"
                    src={previewUrl}
                    sx={{ width: "100%", height: "100%", border: 0, bgcolor: "background.paper", display: "block" }}
                  />
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TerminalIcon fontSize="small" color="primary" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Server
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                    {serverCwd}
                  </Typography>
                </Box>
                <Chip size="small" label={`${terminalSessions.length} sessions`} />
              </Stack>

              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="Command"
                  value={serverCommand}
                  onChange={(event) => setServerCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      onRunTerminalCommand(serverCommand, serverCwd, terminalSize);
                    }
                  }}
                />
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {WEBDEV_COMMANDS.map((command) => (
                    <Chip key={command.label} size="small" clickable label={command.label} onClick={() => setServerCommand(command.value)} />
                  ))}
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField size="small" label="Command cwd" value={serverCwd} onChange={(event) => setServerCwd(event.target.value)} sx={{ flex: 1 }} />
                  <TextField
                    size="small"
                    label="Rows"
                    type="number"
                    value={terminalSize.rows}
                    onChange={(event) => setTerminalSize((current) => ({ ...current, rows: Math.max(1, Number(event.target.value) || current.rows) }))}
                    sx={{ width: 90 }}
                  />
                  <TextField
                    size="small"
                    label="Cols"
                    type="number"
                    value={terminalSize.cols}
                    onChange={(event) => setTerminalSize((current) => ({ ...current, cols: Math.max(1, Number(event.target.value) || current.cols) }))}
                    sx={{ width: 90 }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    data-testid="webdev-run-server"
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onRunTerminalCommand(serverCommand, serverCwd, terminalSize)}
                  >
                    Run
                  </Button>
                  <Button size="small" startIcon={<RefreshIcon />} onClick={() => void probePreview(previewUrl)}>
                    Probe
                  </Button>
                  <Button size="small" disabled={!activeTerminal} onClick={() => activeTerminal && onResizeTerminal(activeTerminal.processId, terminalSize)}>
                    Resize
                  </Button>
                  <Button size="small" color="error" disabled={!activeTerminal} startIcon={<DeleteIcon />} onClick={() => activeTerminal && onTerminateTerminal(activeTerminal.processId)}>
                    Terminate
                  </Button>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField size="small" label="Stdin" value={terminalInput} onChange={(event) => setTerminalInput(event.target.value)} disabled={!activeTerminal} sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    disabled={!activeTerminal}
                    onClick={() => {
                      if (!activeTerminal) {
                        return;
                      }
                      onWriteTerminalInput(activeTerminal.processId, terminalInput.endsWith("\n") ? terminalInput : `${terminalInput}\n`);
                      setTerminalInput("");
                    }}
                  >
                    Send stdin
                  </Button>
                </Stack>
                <Stack spacing={1}>
                  {terminalSessions.length === 0 && <Typography color="text.secondary">No terminal sessions yet.</Typography>}
                  {terminalSessions.map((session) => (
                    <Box key={session.processId} data-testid="webdev-terminal-session" sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" sx={{ flex: 1, overflowWrap: "anywhere" }}>
                          {session.command}
                        </Typography>
                        <Chip size="small" label={terminalStatusLabel(session)} color={terminalStatusColor(session.status)} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                        {session.cwd} / {session.cols}x{session.rows}
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          mt: 0.75,
                          p: 1,
                          bgcolor: "#101418",
                          color: "#e7edf2",
                          borderRadius: 1,
                          minHeight: 100,
                          maxHeight: 220,
                          overflow: "auto",
                          fontSize: 12,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere"
                        }}
                      >
                        {session.output || "Waiting for output..."}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function normalizePreviewUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "http://localhost:5173";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

const WEBDEV_COMMANDS = [
  { label: "install + dev", value: "bun install && bun run dev -- --host 127.0.0.1" },
  { label: "vite dev", value: "bunx vite --host 127.0.0.1" },
  { label: "new react", value: "bun create vite . --template react" }
];

function detectPreviewUrl(sessions: TerminalSession[]): string | null {
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    const session = sessions[index];
    const blob = [session?.command, session?.output].filter(Boolean).join("\n");
    const explicit = [...blob.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?(?:\/[^\s'"<>)\]]*)?/gi)].at(-1)?.[0];
    if (explicit) {
      return explicit;
    }
    const shorthand = [...blob.matchAll(/\b(?:localhost|127\.0\.0\.1)(?::\d{1,5})(?:\/[^\s'"<>)\]]*)?/gi)].at(-1)?.[0];
    if (shorthand) {
      return shorthand;
    }
  }
  return null;
}

function previewStatusLabel(state: "idle" | "checking" | "ready" | "failed", result: WebDevPreviewProbeResult | null): string {
  if (state === "checking") {
    return "Checking";
  }
  if (state === "ready") {
    return result?.status ? `HTTP ${result.status}` : "Ready";
  }
  if (state === "failed") {
    return "Offline";
  }
  return "Not checked";
}

function previewStatusDetail(state: "idle" | "checking" | "ready" | "failed", result: WebDevPreviewProbeResult | null, detectedUrl: string | null): string {
  if (state === "checking") {
    return "Checking local preview...";
  }
  if (state === "ready" && result) {
    const title = result.title ? ` / ${result.title}` : "";
    return `${result.url} / ${result.contentType ?? "unknown content"} / ${result.elapsedMs}ms${title}`;
  }
  if (state === "failed" && result) {
    return result.error ?? `Preview returned HTTP ${result.status ?? "unknown"}`;
  }
  if (detectedUrl) {
    return `Detected ${detectedUrl}`;
  }
  return "Run a local dev server; localhost URLs are detected from terminal output.";
}

function previewStatusColor(state: "idle" | "checking" | "ready" | "failed"): "default" | "primary" | "success" | "error" {
  switch (state) {
    case "checking":
      return "primary";
    case "ready":
      return "success";
    case "failed":
      return "error";
    default:
      return "default";
  }
}

function terminalStatusLabel(session: TerminalSession): string {
  switch (session.status) {
    case "running":
      return "Running";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    case "terminated":
      return "Stopped";
    default:
      return session.status;
  }
}

function terminalStatusColor(status: TerminalSession["status"]): "default" | "primary" | "success" | "error" | "warning" {
  switch (status) {
    case "running":
      return "primary";
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "terminated":
      return "default";
    default:
      return "default";
  }
}
