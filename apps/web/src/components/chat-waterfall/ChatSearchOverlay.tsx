import { Box, Button, IconButton, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import type { ChatWaterfallRow } from "./types";

export type ChatSearchScope = "all" | "user" | "assistant" | "tools" | "files" | "commands";

export type ChatSearchResult = {
  rowIndex: number;
  row: ChatWaterfallRow;
};

type Props = {
  open: boolean;
  rows: ChatWaterfallRow[];
  term: string;
  scope: ChatSearchScope;
  selectedIndex: number;
  results: ChatSearchResult[];
  onOpen: () => void;
  onClose: () => void;
  onTermChange: (term: string) => void;
  onScopeChange: (scope: ChatSearchScope) => void;
  onSelectIndex: (index: number) => void;
};

export function buildChatSearchResults(rows: ChatWaterfallRow[], term: string, scope: ChatSearchScope): ChatSearchResult[] {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => rowMatchesScope(row, scope) && row.searchText.includes(needle));
}

export function ChatSearchOverlay({
  open,
  rows,
  term,
  scope,
  selectedIndex,
  results,
  onOpen,
  onClose,
  onTermChange,
  onScopeChange,
  onSelectIndex
}: Props) {
  if (!open) {
    return (
      <Tooltip title="Search transcript">
        <IconButton
          data-testid="chat-search-open"
          aria-label="Search transcript"
          size="small"
          onClick={onOpen}
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: (theme) => theme.customShadows?.z4,
            "&:hover": { bgcolor: "action.hover" }
          }}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  const hasResults = results.length > 0;
  const currentResult = hasResults ? selectedIndex + 1 : 0;

  function selectPrevious() {
    if (!hasResults) {
      return;
    }
    onSelectIndex((selectedIndex - 1 + results.length) % results.length);
  }

  function selectNext() {
    if (!hasResults) {
      return;
    }
    onSelectIndex((selectedIndex + 1) % results.length);
  }

  return (
    <Paper
      data-testid="chat-search-overlay"
      variant="outlined"
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: 560 },
        p: 1,
        borderRadius: 1,
        bgcolor: "background.paper",
        boxShadow: (theme) => theme.customShadows?.z8
      }}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <SearchIcon fontSize="small" color="disabled" />
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={term}
            onChange={(event) => onTermChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault();
                selectPrevious();
              } else if (event.key === "Enter") {
                event.preventDefault();
                selectNext();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Search transcript"
            inputProps={{ "aria-label": "Search transcript" }}
          />
          <Select
            data-testid="chat-search-scope"
            size="small"
            value={scope}
            onChange={(event) => onScopeChange(event.target.value as ChatSearchScope)}
            inputProps={{ "aria-label": "Search scope" }}
            sx={{ minWidth: 132 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="assistant">Assistant</MenuItem>
            <MenuItem value="tools">Tools</MenuItem>
            <MenuItem value="files">Files</MenuItem>
            <MenuItem value="commands">Commands</MenuItem>
          </Select>
          <IconButton aria-label="Close transcript search" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0, flex: 1 }}>
            {term.trim() ? `${currentResult}/${results.length} results in ${rows.length} rows` : `Search ${rows.length} transcript rows`}
          </Typography>
          <Button size="small" startIcon={<KeyboardArrowUpIcon />} disabled={!hasResults} onClick={selectPrevious}>
            Previous
          </Button>
          <Button size="small" endIcon={<KeyboardArrowDownIcon />} disabled={!hasResults} onClick={selectNext}>
            Next
          </Button>
        </Stack>
        {term.trim() && !hasResults && (
          <Box sx={{ px: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              No transcript rows match this search.
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

function rowMatchesScope(row: ChatWaterfallRow, scope: ChatSearchScope): boolean {
  switch (scope) {
    case "user":
      return row.kind === "userMessage";
    case "assistant":
      return row.kind === "assistantMessage" || row.kind === "reasoningPreview";
    case "tools":
      return row.kind === "toolCall" || row.kind === "toolResult";
    case "files":
      return row.kind === "fileChange";
    case "commands":
      return row.kind === "commandExecution" || row.kind === "commandGroup";
    default:
      return true;
  }
}
