import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Button, Chip } from "@mui/material";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual";
import type { TranslateFn } from "../../i18n";
import { ChatRow } from "./ChatRow";
import { estimateChatRowSize } from "./chatRowEstimates";
import type { ChatWaterfallRow } from "./types";

type Props = {
  rows: ChatWaterfallRow[];
  t: TranslateFn;
  before?: ReactNode;
};

export function ChatWaterfall({ rows, t, before }: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const previousRowCountRef = useRef(rows.length);
  const [nearBottom, setNearBottom] = useState(true);
  const [newRowsCount, setNewRowsCount] = useState(0);
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

  useLayoutEffect(() => {
    if (!nearBottom || rows.length === 0) {
      return;
    }
    scrollToBottom();
    setNewRowsCount(0);
  }, [nearBottom, rows.length, virtualCount, virtualizer]);

  function jumpToLatest() {
    if (rows.length === 0) {
      return;
    }
    scrollToBottom();
    setNearBottom(true);
    setNewRowsCount(0);
  }

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

  return (
    <Box
      ref={parentRef}
      data-testid="chat-waterfall-scroll"
      sx={{
        minHeight: 0,
        overflow: "auto",
        p: { xs: 1.5, sm: 2.5, lg: 3 }
      }}
    >
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
                  pb: 1.1
                }}
              >
                <ChatRow row={row} t={t} />
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
          <Button
            size="small"
            variant="contained"
            startIcon={<KeyboardDoubleArrowDownIcon />}
            onClick={jumpToLatest}
            sx={{ borderRadius: 999, pointerEvents: "auto", boxShadow: (theme) => theme.customShadows?.z8 }}
          >
            Jump to latest
            {newRowsCount > 0 && <Chip size="small" label={newRowsCount} sx={{ ml: 1, height: 20, bgcolor: "primary.contrastText" }} />}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function sanitizeTestId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-");
}
