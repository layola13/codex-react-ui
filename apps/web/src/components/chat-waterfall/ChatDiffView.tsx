import { useMemo } from "react";
import { generateDiffFile } from "@git-diff-view/file";
import { DiffModeEnum, DiffView } from "@git-diff-view/react";
import "@git-diff-view/react/styles/diff-view.css";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export function GitFileDiffView({ beforeText, afterText, filePath }: { beforeText: string; afterText: string; filePath?: string }) {
  const theme = useTheme();
  const lang = guessLangFromPath(filePath);
  const diffFile = useMemo(() => {
    if (!beforeText && !afterText) {
      return null;
    }
    try {
      const instance = generateDiffFile(filePath ?? "old", beforeText, filePath ?? "new", afterText, lang, lang);
      instance.init();
      instance.buildUnifiedDiffLines();
      return instance;
    } catch {
      return null;
    }
  }, [afterText, beforeText, filePath, lang]);

  if (!diffFile) {
    return <UnifiedDiffBlock text={fallbackUnifiedDiff(beforeText, afterText)} />;
  }

  return (
    <Box
      data-testid="file-diff-view"
      sx={{
        maxHeight: "min(54vh, 620px)",
        overflow: "auto",
        bgcolor: (muiTheme) => alpha(muiTheme.palette.background.paper, muiTheme.palette.mode === "dark" ? 0.3 : 0.82),
        "& .diff-view": {
          minWidth: 640
        }
      }}
    >
      <DiffView
        diffFile={diffFile}
        diffViewMode={DiffModeEnum.Unified}
        diffViewTheme={theme.palette.mode === "dark" ? "dark" : "light"}
        diffViewHighlight
        diffViewAddWidget={false}
        diffViewWrap={false}
        diffViewFontSize={12}
      />
    </Box>
  );
}

export function UnifiedDiffBlock({ text }: { text: string }) {
  return (
    <Box
      data-testid="file-unified-diff"
      component="pre"
      sx={{
        m: 0,
        p: 1,
        maxHeight: "min(54vh, 620px)",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.5,
        color: "text.primary",
        bgcolor: (theme) => alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.2 : 0.035),
        "& .diff-add": { color: (theme) => theme.palette.success.main },
        "& .diff-del": { color: (theme) => theme.palette.error.main },
        "& .diff-meta": { color: "text.secondary" }
      }}
    >
      {text}
    </Box>
  );
}

export function diffTextStats(beforeText: string, afterText: string, filePath?: string): { additions: number; deletions: number } | undefined {
  try {
    const lang = guessLangFromPath(filePath);
    const diff = generateDiffFile(filePath ?? "old", beforeText, filePath ?? "new", afterText, lang, lang);
    diff.initRaw();
    return { additions: diff.additionLength, deletions: diff.deletionLength };
  } catch {
    return undefined;
  }
}

export function diffLineStats(text: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) {
      additions += 1;
    } else if (line.startsWith("-")) {
      deletions += 1;
    }
  }
  return { additions, deletions };
}

export function fileChangeStatsLabel(additions: number, deletions: number): string {
  if (additions === 0 && deletions === 0) {
    return "";
  }
  return `(+${additions} -${deletions})`;
}

function fallbackUnifiedDiff(beforeText: string, afterText: string): string {
  const beforeLines = beforeText.split(/\r?\n/).filter((line) => line.length > 0).map((line) => `-${line}`);
  const afterLines = afterText.split(/\r?\n/).filter((line) => line.length > 0).map((line) => `+${line}`);
  return [...beforeLines, ...afterLines].join("\n");
}

function guessLangFromPath(filePath?: string): string {
  if (!filePath) return "txt";
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    rb: "ruby",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    css: "css",
    scss: "scss",
    html: "html",
    vue: "vue",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    zsh: "bash",
    bash: "bash",
    dockerfile: "dockerfile",
    lua: "lua",
    php: "php",
    dart: "dart"
  };
  return (ext && map[ext]) || "txt";
}
