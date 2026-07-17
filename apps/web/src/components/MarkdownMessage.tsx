import type { ReactNode } from "react";
import { Box, Link, Typography, alpha, useTheme } from "@mui/material";
import { marked } from "marked";
import type { Token } from "marked";

type Props = {
  text: string;
};

export function MarkdownMessage({ text }: Props) {
  const theme = useTheme();
  const tokens = marked.lexer(text, { gfm: true, breaks: true });

  return (
    <Box
      sx={{
        mt: 1,
        fontSize: 14,
        lineHeight: 1.7,
        overflowWrap: "anywhere",
        "& > :first-of-type": { mt: 0 },
        "& > :last-child": { mb: 0 }
      }}
    >
      {tokens.map((token, index) => renderBlock(token, index, theme.palette.mode))}
    </Box>
  );
}

function renderBlock(token: Token, index: number, mode: "light" | "dark"): ReactNode {
  const raw = token as Record<string, unknown>;
  switch (token.type) {
    case "space":
      return null;
    case "heading":
      return (
        <Typography key={index} variant="subtitle1" sx={{ mt: 1.5, mb: 0.75, fontWeight: 800 }}>
          {renderInline(asTokenArray(raw.tokens), mode)}
        </Typography>
      );
    case "paragraph":
      return (
        <Typography key={index} component="p" sx={{ my: 0.75, fontSize: 14, lineHeight: 1.7 }}>
          {renderInline(asTokenArray(raw.tokens), mode)}
        </Typography>
      );
    case "text":
      return (
        <Typography key={index} component="p" sx={{ my: 0.75, fontSize: 14, lineHeight: 1.7 }}>
          {String(raw.text ?? "")}
        </Typography>
      );
    case "code":
      return <CodeBlock key={index} code={String(raw.text ?? "")} language={typeof raw.lang === "string" ? raw.lang : ""} mode={mode} />;
    case "blockquote":
      return (
        <Box
          key={index}
          sx={{
            my: 1,
            pl: 1.5,
            borderLeft: "3px solid",
            borderColor: "primary.main",
            color: "text.secondary"
          }}
        >
          {asTokenArray(raw.tokens).map((child, childIndex) => renderBlock(child, childIndex, mode))}
        </Box>
      );
    case "list": {
      const ordered = Boolean(raw.ordered);
      return (
        <Box key={index} component={ordered ? "ol" : "ul"} sx={{ my: 0.75, pl: 2.75 }}>
          {asTokenArray(raw.items).map((item, itemIndex) => (
            <Box key={itemIndex} component="li" sx={{ my: 0.25 }}>
              {renderInline(asTokenArray((item as Record<string, unknown>).tokens), mode)}
            </Box>
          ))}
        </Box>
      );
    }
    case "hr":
      return <Box key={index} sx={{ my: 1.5, borderTop: "1px solid", borderColor: "divider" }} />;
    default:
      return raw.raw ? (
        <Typography key={index} component="p" sx={{ my: 0.75, fontSize: 14, lineHeight: 1.7 }}>
          {String(raw.raw)}
        </Typography>
      ) : null;
  }
}

function renderInline(tokens: Token[], mode: "light" | "dark"): ReactNode[] {
  return tokens.map((token, index) => {
    const raw = token as Record<string, unknown>;
    switch (token.type) {
      case "text":
        return <span key={index}>{String(raw.text ?? "")}</span>;
      case "strong":
        return <strong key={index}>{renderInline(asTokenArray(raw.tokens), mode)}</strong>;
      case "em":
        return <em key={index}>{renderInline(asTokenArray(raw.tokens), mode)}</em>;
      case "codespan":
        return (
          <Box
            key={index}
            component="code"
            sx={{
              px: 0.5,
              py: 0.125,
              borderRadius: 0.75,
              bgcolor: mode === "dark" ? "rgba(97, 243, 243, 0.12)" : "rgba(24, 119, 242, 0.08)",
              color: mode === "dark" ? "#CAFDF5" : "#0C44AE",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.9em"
            }}
          >
            {String(raw.text ?? "")}
          </Box>
        );
      case "link":
        return (
          <Link key={index} href={String(raw.href ?? "#")} target="_blank" rel="noreferrer" underline="hover">
            {renderInline(asTokenArray(raw.tokens), mode)}
          </Link>
        );
      case "br":
        return <br key={index} />;
      case "del":
        return <del key={index}>{renderInline(asTokenArray(raw.tokens), mode)}</del>;
      default:
        return <span key={index}>{String(raw.text ?? raw.raw ?? "")}</span>;
    }
  });
}

function CodeBlock({ code, language, mode }: { code: string; language: string; mode: "light" | "dark" }) {
  const theme = useTheme();
  const dark = mode === "dark";
  return (
    <Box
      sx={{
        my: 1,
        border: "1px solid",
        borderColor: dark ? alpha("#FFFFFF", 0.14) : alpha("#1877F2", 0.24),
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: dark ? "#070A0E" : "#F8FBFF"
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          color: "text.secondary",
          fontSize: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
        }}
      >
        <span>{language || "code"}</span>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.25,
          overflowX: "auto",
          color: theme.palette.text.primary,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12.5,
          lineHeight: 1.65,
          whiteSpace: "pre"
        }}
      >
        <code>{highlightCodeBlock(code, language, dark)}</code>
      </Box>
    </Box>
  );
}

function highlightCodeBlock(code: string, language: string, dark: boolean): ReactNode[] {
  const lower = language.toLowerCase();
  if (lower === "diff" || lower.includes("patch")) {
    return code.split(/(\n)/).map((line, index) => {
      if (line === "\n") {
        return line;
      }
      const color = line.startsWith("+")
        ? dark
          ? "#77ED8B"
          : "#118D57"
        : line.startsWith("-")
          ? dark
            ? "#FFAC82"
            : "#B71D18"
          : line.startsWith("@@")
            ? dark
              ? "#61F3F3"
              : "#0C44AE"
            : undefined;
      return color ? (
        <span key={index} style={{ color }}>
          {line}
        </span>
      ) : (
        line
      );
    });
  }
  return highlightCode(code, language, dark);
}

function highlightCode(code: string, language: string, dark: boolean): ReactNode[] {
  const keywordColor = dark ? "#61F3F3" : "#0C44AE";
  const stringColor = dark ? "#FFD666" : "#B76E00";
  const commentColor = dark ? "#637381" : "#919EAB";
  const numberColor = dark ? "#77ED8B" : "#118D57";
  const operatorColor = dark ? "#C684FF" : "#8E33FF";
  const keywords = keywordSet(language);
  const pattern =
    /(\/\/.*|#.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,:;=+\-*/<>!&|?]+)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    if (match.index > last) {
      nodes.push(code.slice(last, match.index));
    }
    const value = match[0];
    let color: string | undefined;
    if (value.startsWith("//") || value.startsWith("#") || value.startsWith("/*")) {
      color = commentColor;
    } else if (value.startsWith("\"") || value.startsWith("'") || value.startsWith("`")) {
      color = stringColor;
    } else if (/^\d/.test(value)) {
      color = numberColor;
    } else if (keywords.has(value)) {
      color = keywordColor;
    } else if (/^[{}()[\].,:;=+\-*/<>!&|?]+$/.test(value)) {
      color = operatorColor;
    }
    nodes.push(color ? <span key={`${match.index}-${value}`} style={{ color }}>{value}</span> : value);
    last = pattern.lastIndex;
  }
  if (last < code.length) {
    nodes.push(code.slice(last));
  }
  return nodes;
}

function keywordSet(language: string): Set<string> {
  const common = ["async", "await", "break", "case", "catch", "const", "continue", "default", "else", "enum", "export", "false", "for", "from", "function", "if", "import", "in", "let", "null", "return", "switch", "throw", "true", "try", "type", "undefined", "while"];
  const rust = ["as", "crate", "dyn", "fn", "impl", "let", "match", "mod", "move", "mut", "pub", "ref", "self", "Self", "struct", "trait", "use", "where"];
  const zig = ["align", "allowzero", "anytype", "asm", "comptime", "const", "defer", "errdefer", "error", "fn", "inline", "noalias", "nosuspend", "opaque", "orelse", "packed", "pub", "resume", "struct", "suspend", "test", "threadlocal", "try", "union", "usingnamespace", "var", "volatile"];
  const shell = ["cd", "do", "done", "echo", "elif", "else", "esac", "fi", "for", "function", "if", "in", "then", "while"];
  const lower = language.toLowerCase();
  if (lower.includes("rust") || lower === "rs") {
    return new Set([...common, ...rust]);
  }
  if (lower.includes("zig")) {
    return new Set([...common, ...zig]);
  }
  if (lower.includes("bash") || lower.includes("shell") || lower === "sh" || lower === "zsh") {
    return new Set([...common, ...shell]);
  }
  return new Set([...common, ...rust, ...zig]);
}

function asTokenArray(value: unknown): Token[] {
  return Array.isArray(value) ? (value as Token[]) : [];
}
