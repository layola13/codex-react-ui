import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual";
import type { TranslateFn } from "../../i18n";
import { ChatRow } from "./ChatRow";
import { ChatFloorRail, type ChatFloorEntry } from "./ChatFloorRail";
import { ChatSearchOverlay, buildChatSearchResults, type ChatSearchScope } from "./ChatSearchOverlay";
import { estimateChatRowSize } from "./chatRowEstimates";
import type { AssistantUsageDisplayMode, ChatWaterfallRow } from "./types";

type Props = {
  rows: ChatWaterfallRow[];
  t: TranslateFn;
  before?: ReactNode;
  assistantUsageDisplay?: AssistantUsageDisplayMode;
};

export function ChatWaterfall({ rows, t, before, assistantUsageDisplay = "summary" }: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const previousRowCountRef = useRef(rows.length);
  const jumpToLatestRef = useRef<() => void>(() => undefined);
  const [nearBottom, setNearBottom] = useState(true);
  const [newRowsCount, setNewRowsCount] = useState(0);
  const [flashRowKey, setFlashRowKey] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchScope, setSearchScope] = useState<ChatSearchScope>("all");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const beforeOffset = before ? 1 : 0;
  const virtualCount = rows.length + beforeOffset;
  const liveIndexes = useMemo(
    () => rows.map((row, index) => (row.isLive || row.kind === "reasoningPreview" ? index + beforeOffset : -1)).filter((index) => index >= 0),
    [beforeOffset, rows]
  );
  const rangeExtractor = useCallback(
    (range: Range) => Array.from(new Set([...defaultRangeExtractor(range), ...liveIndexes])).sort((a, b) => a - b),
    [liveIndexes]
  );
  const virtualizer = useVirtualizer({
    count: virtualCount,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => (before && index === 0 ? "chat-waterfall-before" : rows[index - beforeOffset]?.key ?? index),
    estimateSize: (index) => {
      if (before && index === 0) {
        return 220;
      }
      const row = rows[index - beforeOffset];
      return row ? estimateChatRowSize(row) : 120;
    },
    overscan: 8,
    rangeExtractor
  });
  const virtualRows = virtualizer.getVirtualItems();
  const firstVisibleVirtualIndex =
    virtualRows.find((virtualRow) => virtualRow.index >= beforeOffset && virtualRow.end > (parentRef.current?.scrollTop ?? 0))?.index ?? beforeOffset;
  const firstVisibleRowIndex = Math.max(0, firstVisibleVirtualIndex - beforeOffset);
  const floors = useMemo<ChatFloorEntry[]>(() => {
    const activeFloorRowIndex = [...rows].reverse().find((row, reverseIndex) => {
      const rowIndex = rows.length - reverseIndex - 1;
      return Boolean(row.floor && rowIndex <= firstVisibleRowIndex);
    });
    const activeFloorIndex = activeFloorRowIndex?.floor?.index ?? rows.find((row) => row.floor)?.floor?.index ?? null;
    return rows
      .map((row, rowIndex) =>
        row.floor
          ? {
              rowIndex,
              index: row.floor.index,
              label: row.floor.label,
              active: row.floor.index === activeFloorIndex
            }
          : null
      )
      .filter((entry): entry is ChatFloorEntry => Boolean(entry));
  }, [firstVisibleRowIndex, rows]);
  const searchResults = useMemo(() => buildChatSearchResults(rows, searchTerm, searchScope), [rows, searchScope, searchTerm]);
  const latestActivityKey = useMemo(() => {
    const latest = rows.at(-1);
    if (!latest) {
      return `${rows.length}:empty`;
    }
    return [
      rows.length,
      latest.key,
      latest.status ?? "",
      latest.text.length,
      latest.reasoning?.length ?? 0,
      latest.isLive ? "live" : "settled"
    ].join(":");
  }, [rows]);

  const updateNearBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) {
      return;
    }
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const nextNearBottom = distanceFromBottom < 180;
    setNearBottom(nextNearBottom);
    if (nextNearBottom) {
      setNewRowsCount(0);
    }
  }, []);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) {
      return;
    }
    updateNearBottom();
    element.addEventListener("scroll", updateNearBottom, { passive: true });
    return () => element.removeEventListener("scroll", updateNearBottom);
  }, [updateNearBottom]);

  useEffect(() => {
    const previousCount = previousRowCountRef.current;
    if (rows.length > previousCount && !nearBottom) {
      setNewRowsCount((current) => current + rows.length - previousCount);
    }
    previousRowCountRef.current = rows.length;
  }, [nearBottom, rows.length]);

  useEffect(() => {
    const rowKeys = new Set(rows.map((row) => row.key));
    setExpandedRowKeys((current) => {
      const next = new Set([...current].filter((key) => rowKeys.has(key)));
      return next.size === current.size && [...current].every((key) => next.has(key)) ? current : next;
    });
  }, [rows]);

  useEffect(() => {
    setSelectedSearchIndex(0);
  }, [searchScope, searchTerm]);

  useEffect(() => {
    if (!searchOpen || searchResults.length === 0) {
      return;
    }
    const safeIndex = Math.min(selectedSearchIndex, searchResults.length - 1);
    const result = searchResults[safeIndex];
    if (result) {
      jumpToRow(result.rowIndex);
    }
  }, [searchOpen, searchResults, selectedSearchIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      } else if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === "ArrowDown" || event.key === "End")) {
        event.preventDefault();
        jumpToLatestRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useLayoutEffect(() => {
    if (!nearBottom || rows.length === 0) {
      return;
    }
    scrollToBottom();
    setNewRowsCount(0);
  }, [nearBottom, rows.length, virtualCount, virtualizer]);

  useLayoutEffect(() => {
    if (liveIndexes.length === 0 || rows.length === 0 || searchOpen) {
      return;
    }
    scrollToBottom();
    setNearBottom(true);
    setNewRowsCount(0);
  }, [latestActivityKey, liveIndexes.length, rows.length, searchOpen]);

  function jumpToLatest() {
    if (rows.length === 0) {
      return;
    }
    scrollToBottom();
    setNearBottom(true);
    setNewRowsCount(0);
  }

  function jumpToRow(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row) {
      return;
    }
    virtualizer.scrollToIndex(rowIndex + beforeOffset, { align: "start" });
    setNearBottom(false);
    setFlashRowKey(row.key);
    window.setTimeout(() => setFlashRowKey((current) => (current === row.key ? null : current)), 1400);
  }

  function selectSearchIndex(index: number) {
    if (searchResults.length === 0) {
      setSelectedSearchIndex(0);
      return;
    }
    setSelectedSearchIndex((index + searchResults.length) % searchResults.length);
  }

  function toggleRowExpanded(rowKey: string) {
    setExpandedRowKeys((current) => {
      const next = new Set(current);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }

  jumpToLatestRef.current = jumpToLatest;

  function scrollToBottom() {
    virtualizer.scrollToIndex(virtualCount - 1, { align: "end" });
    requestAnimationFrame(() => {
      const element = parentRef.current;
      if (!element) {
        return;
      }
      element.scrollTop = element.scrollHeight;
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    });
  }

  if (rows.length === 0 && before) {
    return (
      <Box
        ref={parentRef}
        data-testid="chat-waterfall-scroll"
        sx={{
          position: "relative",
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflow: "auto",
          p: { xs: 1, sm: 1.5 }
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "min(100%, 1180px)", my: "auto" }}>
          {before}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      ref={parentRef}
      data-testid="chat-waterfall-scroll"
      sx={{
        position: "relative",
        minHeight: 0,
        overflow: "auto",
        p: { xs: 1.5, sm: 2.5, lg: 3 }
      }}
    >
      {floors.length > 1 && (
        <Box
          sx={{
            position: "sticky",
            top: 12,
            zIndex: 4,
            height: 0,
            display: { xs: "none", lg: "flex" },
            justifyContent: "flex-end",
            pointerEvents: "none",
            pr: 0.5
          }}
        >
          <Box sx={{ pointerEvents: "auto" }}>
            <ChatFloorRail floors={floors} onJump={jumpToRow} />
          </Box>
        </Box>
      )}
      <Box
        sx={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          height: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none"
        }}
      >
        <Box sx={{ pointerEvents: "auto" }}>
          <ChatSearchOverlay
            open={searchOpen}
            rows={rows}
            term={searchTerm}
            scope={searchScope}
            selectedIndex={Math.min(selectedSearchIndex, Math.max(0, searchResults.length - 1))}
            results={searchResults}
            onOpen={() => {
              setSearchOpen(true);
            }}
            onClose={() => setSearchOpen(false)}
            onTermChange={setSearchTerm}
            onScopeChange={setSearchScope}
            onSelectIndex={selectSearchIndex}
          />
        </Box>
      </Box>
      <Box sx={{ maxWidth: "min(100%, 1600px)", mx: "auto" }}>
        <Box
          data-testid="conversation-waterfall"
          data-row-count={rows.length}
          sx={{
            position: "relative",
            width: "100%",
            height: virtualizer.getTotalSize(),
            mt: before ? 1 : 0
          }}
        >
          {virtualRows.map((virtualRow) => {
            if (before && virtualRow.index === 0) {
              return (
                <Box
                  key="chat-waterfall-before"
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    pb: 1.75
                  }}
                >
                  {before}
                </Box>
              );
            }
            const row = rows[virtualRow.index - beforeOffset];
            if (!row) {
              return null;
            }
            return (
              <Box
                key={row.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                data-testid={`conversation-item-${sanitizeTestId(row.item.id)}`}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  pb: 1.1,
                  borderRadius: 1,
                  animation: flashRowKey === row.key ? "chatRowFlash 1400ms ease" : "none",
                  "@keyframes chatRowFlash": {
                    "0%": { boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.primary.main, 0.32)}` },
                    "38%": { boxShadow: (theme) => `0 0 0 6px ${alpha(theme.palette.primary.main, 0.18)}` },
                    "100%": { boxShadow: (theme) => `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}` }
                  }
                }}
              >
                <ChatRow
                  row={row}
                  t={t}
                  expanded={expandedRowKeys.has(row.key)}
                  onToggleExpanded={() => toggleRowExpanded(row.key)}
                  assistantUsageDisplay={assistantUsageDisplay}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
      {!nearBottom && rows.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            bottom: 12,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 2
          }}
        >
          <Stack spacing={0.75} alignItems="center" sx={{ pointerEvents: "auto" }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<KeyboardDoubleArrowDownIcon />}
              onClick={jumpToLatest}
              sx={{ borderRadius: 999, boxShadow: (theme) => theme.customShadows?.z8 }}
            >
              Jump to latest
              {newRowsCount > 0 && <Chip size="small" label={newRowsCount} sx={{ ml: 1, height: 20, bgcolor: "primary.contrastText" }} />}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function sanitizeTestId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-");
}
