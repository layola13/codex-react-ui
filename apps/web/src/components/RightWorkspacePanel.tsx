import { useEffect, useState, type ReactNode } from "react";
import { alpha } from "@mui/material/styles";
import { Box, Button, Chip, IconButton, Paper, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CodeIcon from "@mui/icons-material/Code";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import TerminalIcon from "@mui/icons-material/Terminal";
import type { FsDirectoryEntry, TerminalSession } from "../state/codexClient";
import type { OpenWorkspaceFile } from "./WorkspaceFilesSettingsPanel";
import type { TranslateFn } from "../i18n";
import { WebDevWorkspacePanel } from "./WebDevWorkspacePanel";

export type RightWorkspaceTab = "sidechat" | "browser" | "terminal" | "webdev";

type Props = {
  activeTab: RightWorkspaceTab;
  sideChat: ReactNode;
  cwd: string;
  fileDirectories: Record<string, FsDirectoryEntry[]>;
  openFile: OpenWorkspaceFile | null;
  filesPanelLayout?: Record<string, number>;
  terminalSessions: TerminalSession[];
  t: TranslateFn;
  onTabChange: (tab: RightWorkspaceTab) => void;
  onClose: () => void;
  onFilesPanelLayoutChange?: (layout: Record<string, number>) => void;
  onReadDirectory: (path: string) => void;
  onReadFile: (path: string) => void;
  onChangeOpenFileContent: (content: string) => void;
  onSaveOpenFile: () => void;
  onRunTerminalCommand: (command: string, cwd: string, size: { rows: number; cols: number }) => void;
  onWriteTerminalInput: (processId: string, input: string) => void;
  onTerminateTerminal: (processId: string) => void;
  onResizeTerminal: (processId: string, size: { rows: number; cols: number }) => void;
};

export function RightWorkspacePanel({
  activeTab,
  sideChat,
  cwd,
  fileDirectories,
  openFile,
  filesPanelLayout,
  terminalSessions,
  t,
  onTabChange,
  onClose,
  onFilesPanelLayoutChange,
  onReadDirectory,
  onReadFile,
  onChangeOpenFileContent,
  onSaveOpenFile,
  onRunTerminalCommand,
  onWriteTerminalInput,
  onTerminateTerminal,
  onResizeTerminal
}: Props) {
  return (
    <Box
      data-testid="right-workspace-panel"
      sx={{
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        display: "grid",
        gridTemplateRows: "44px minmax(0, 1fr)",
        borderLeft: { xs: 0, md: "1px solid" },
        borderTop: { xs: "1px solid", md: 0 },
        borderColor: "divider",
        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.68 : 0.94)
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          px: 1,
          minWidth: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.54 : 0.78)
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) => onTabChange(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Right workspace tabs"
          sx={{ flex: 1, minWidth: 0, minHeight: 42, "& .MuiTab-root": { minHeight: 42, px: 1.25 } }}
        >
          <Tab value="sidechat" label="Side chat" />
          <Tab value="browser" label="Browser" />
          <Tab value="terminal" label="Terminal" />
          <Tab value="webdev" label="Web Dev" icon={<CodeIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
        <Tooltip title="Hide right workspace">
          <IconButton size="small" aria-label="Hide right workspace" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ minHeight: 0, overflow: "hidden", "& [data-testid='sidechat-panel']": { borderLeft: 0 } }}>
        {activeTab === "sidechat" && sideChat}
        {activeTab === "browser" && <BrowserPanel />}
        {activeTab === "terminal" && (
          <TerminalPanel
            cwd={cwd}
            terminalSessions={terminalSessions}
            onRunTerminalCommand={onRunTerminalCommand}
            onWriteTerminalInput={onWriteTerminalInput}
            onTerminateTerminal={onTerminateTerminal}
            onResizeTerminal={onResizeTerminal}
          />
        )}
        {activeTab === "webdev" && (
          <WebDevWorkspacePanel
            cwd={cwd}
            fileDirectories={fileDirectories}
            openFile={openFile}
            filesPanelLayout={filesPanelLayout}
            terminalSessions={terminalSessions}
            t={t}
            onFilesPanelLayoutChange={onFilesPanelLayoutChange}
            onReadDirectory={onReadDirectory}
            onReadFile={onReadFile}
            onChangeOpenFileContent={onChangeOpenFileContent}
            onSaveOpenFile={onSaveOpenFile}
            onRunTerminalCommand={onRunTerminalCommand}
            onWriteTerminalInput={onWriteTerminalInput}
            onTerminateTerminal={onTerminateTerminal}
            onResizeTerminal={onResizeTerminal}
          />
        )}
      </Box>
    </Box>
  );
}

function BrowserPanel() {
  const [draftUrl, setDraftUrl] = useState("https://example.com");
  const [url, setUrl] = useState("https://example.com");

  const load = () => {
    const trimmed = draftUrl.trim();
    if (!trimmed) {
      return;
    }
    setUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  };

  return (
    <Box sx={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", p: 1 }}>
      <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            size="small"
            label="Address"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                load();
              }
            }}
            sx={{ flex: 1 }}
          />
          <Button size="small" startIcon={<RefreshIcon />} onClick={load}>
            Go
          </Button>
          <Button size="small" href={url} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />}>
            Open
          </Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ minHeight: 0, overflow: "hidden" }}>
        <Box component="iframe" title="Browser" src={url} sx={{ width: "100%", height: "100%", border: 0, bgcolor: "background.paper" }} />
      </Paper>
    </Box>
  );
}

function TerminalPanel({
  cwd,
  terminalSessions,
  onRunTerminalCommand,
  onWriteTerminalInput,
  onTerminateTerminal,
  onResizeTerminal
}: {
  cwd: string;
  terminalSessions: TerminalSession[];
  onRunTerminalCommand: Props["onRunTerminalCommand"];
  onWriteTerminalInput: Props["onWriteTerminalInput"];
  onTerminateTerminal: Props["onTerminateTerminal"];
  onResizeTerminal: Props["onResizeTerminal"];
}) {
  const [terminalCommand, setTerminalCommand] = useState("pwd");
  const [terminalCwd, setTerminalCwd] = useState(cwd);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalSize, setTerminalSize] = useState({ rows: 24, cols: 80 });
  const activeTerminal = terminalSessions.find((session) => session.status === "running") ?? null;

  useEffect(() => {
    setTerminalCwd(cwd);
  }, [cwd]);

  return (
    <Box sx={{ height: "100%", minHeight: 0, overflow: "auto", p: 1 }}>
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TerminalIcon fontSize="small" color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Terminal
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {terminalCwd}
            </Typography>
          </Box>
          <Chip size="small" label={`${terminalSessions.length} sessions`} />
        </Stack>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Command"
            value={terminalCommand}
            onChange={(event) => setTerminalCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                onRunTerminalCommand(terminalCommand, terminalCwd, terminalSize);
              }
            }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" label="Command cwd" value={terminalCwd} onChange={(event) => setTerminalCwd(event.target.value)} sx={{ flex: 1 }} />
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
            <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => onRunTerminalCommand(terminalCommand, terminalCwd, terminalSize)}>
              Run
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
        </Stack>
      </Paper>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {terminalSessions.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
            No terminal sessions yet.
          </Typography>
        )}
        {terminalSessions.map((session) => (
          <Paper key={session.processId} variant="outlined" sx={{ p: 1 }}>
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
                minHeight: 120,
                maxHeight: 260,
                overflow: "auto",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere"
              }}
            >
              {session.output || "Waiting for output..."}
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

function terminalStatusColor(status: TerminalSession["status"]): "default" | "success" | "error" | "warning" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "terminated":
      return "warning";
    default:
      return "default";
  }
}

function terminalStatusLabel(session: TerminalSession): string {
  if (session.status === "completed") {
    return session.exitCode == null ? "exit" : `exit ${session.exitCode}`;
  }
  return session.exitCode == null ? session.status : `${session.status} ${session.exitCode}`;
}
