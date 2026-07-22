import type { WorkbenchItem, WorkbenchTurn } from "../../state/codexClient";
import type { ChatRowKind, ChatRowRole, ChatRowWidth, ChatTokenUsage, ChatWaterfallRow } from "./types";

export type ChatRowFilter = (item: WorkbenchItem) => boolean;

export function buildChatRows(turns: WorkbenchTurn[], filterItem: ChatRowFilter = () => true, tokenUsageByTurnId: Record<string, ChatTokenUsage> = {}): ChatWaterfallRow[] {
  const rows: ChatWaterfallRow[] = [];
  let promptIndex = 0;
  let assistantMessageIndex = 0;

  turns.forEach((turn) => {
    const reasoningBuffer: string[] = [];
    const visibleItems = normalizeTurnItemsForDisplay(turn.items.filter(filterItem));

    visibleItems.forEach((item, index) => {
      if (item.type === "reasoning") {
        const content = reasoningText(item);
        if (content) {
          reasoningBuffer.push(content);
        }
        return;
      }

      if (item.type === "agentMessage") {
        const row = itemToRow(turn, item, index, {
          reasoning: reasoningBuffer.join("\n\n").trim() || undefined,
          tokenUsage: tokenUsageByTurnId[turn.id]
        });
        row.assistantTone = assistantMessageIndex % 2 === 0 ? "plain" : "tinted";
        assistantMessageIndex += 1;
        rows.push(row);
        reasoningBuffer.length = 0;
        return;
      }

      const row = itemToRow(turn, item, index, {});
      if (row.kind === "userMessage") {
        promptIndex += 1;
        row.floor = {
          index: promptIndex,
          label: compactLine(row.text || row.title)
        };
      }
      rows.push(row);
    });

    if (reasoningBuffer.length > 0 && turn.status !== "completed") {
      const lastReasoning = [...visibleItems].reverse().find((item) => item.type === "reasoning");
      if (lastReasoning) {
        rows.push(
          itemToRow(turn, lastReasoning, visibleItems.indexOf(lastReasoning), {
            activeThinking: true,
            reasoning: reasoningBuffer.join("\n\n").trim(),
            tokenUsage: tokenUsageByTurnId[turn.id]
          })
        );
      }
    }
  });

  return applyAssistantHeaderGrouping(compactConsecutiveCommandRows(rows));
}

function normalizeTurnItemsForDisplay(items: WorkbenchItem[]): WorkbenchItem[] {
  const firstUserIndex = items.findIndex((item) => item.type === "userMessage");
  const firstAssistantIndex = items.findIndex((item) => item.type === "agentMessage");
  if (firstUserIndex >= 0 && firstAssistantIndex >= 0 && firstUserIndex > firstAssistantIndex) {
    return [...items].reverse();
  }
  return items;
}

function itemToRow(
  turn: WorkbenchTurn,
  item: WorkbenchItem,
  index: number,
  options: { reasoning?: string; activeThinking?: boolean; tokenUsage?: ChatTokenUsage }
): ChatWaterfallRow {
  const kind = itemKind(item, options.activeThinking);
  const text = primaryText(item, options.reasoning);
  const title = item.title || fallbackTitle(kind);
  const searchParts = [title, item.text, options.reasoning, item.status, item.agentName, item.agentRole, safeJson(item.payload)].filter(
    (part): part is string => Boolean(part)
  );
  return {
    key: `${turn.id}:${item.id}:${options.activeThinking ? "thinking" : index}`,
    turnId: turn.id,
    threadId: turn.threadId,
    itemIds: [item.id],
    kind,
    role: rowRole(kind),
    text,
    title,
    status: item.status,
    item,
    reasoning: options.reasoning,
    searchText: searchParts.join("\n").toLowerCase(),
    width: rowWidth(kind, text),
    isLive: turn.status !== "completed",
    startedAt: turn.startedAt,
    completedAt: turn.completedAt,
    firstTokenAt: item.firstTokenAt,
    tokenUsage: options.tokenUsage
  };
}

function applyAssistantHeaderGrouping(rows: ChatWaterfallRow[]): ChatWaterfallRow[] {
  const seenAssistantKeys = new Set<string>();
  return rows.map((row) => {
    if (row.kind !== "assistantMessage") {
      return row;
    }
    const key = assistantHeaderKey(row);
    const hideHeader = seenAssistantKeys.has(key);
    seenAssistantKeys.add(key);
    return hideHeader ? { ...row, hideHeader: true } : row;
  });
}

function assistantHeaderKey(row: ChatWaterfallRow): string {
  return [row.role, row.item.agentId, row.item.agentThreadId, row.item.agentName, row.title].filter(Boolean).join(":");
}

function itemKind(item: WorkbenchItem, activeThinking?: boolean): ChatRowKind {
  if (item.type === "userMessage") return "userMessage";
  if (item.type === "agentMessage") return "assistantMessage";
  if (item.type === "reasoning" && activeThinking) return "reasoningPreview";
  if (item.type === "commandExecution") return "commandExecution";
  if (item.type === "fileChange") return "fileChange";
  if (item.type === "mcpToolCall" || item.type === "collabAgentToolCall") return "toolCall";
  if (item.type.toLowerCase().includes("error")) return "error";
  return "status";
}

function compactConsecutiveCommandRows(rows: ChatWaterfallRow[]): ChatWaterfallRow[] {
  const next: ChatWaterfallRow[] = [];
  let run: ChatWaterfallRow[] = [];

  function flushRun() {
    if (run.length === 0) {
      return;
    }
    if (run.length === 1) {
      next.push(run[0]!);
      run = [];
      return;
    }
    const visible = run[run.length - 1]!;
    const hidden = run.slice(0, -1);
    next.push(commandGroupRow(hidden));
    next.push(visible);
    run = [];
  }

  for (const row of rows) {
    if (row.kind === "commandExecution" && !row.isLive) {
      run.push(row);
      continue;
    }
    flushRun();
    next.push(row);
  }
  flushRun();
  return next;
}

function commandGroupRow(rows: ChatWaterfallRow[]): ChatWaterfallRow {
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const title = `${rows.length} Bash command${rows.length === 1 ? "" : "s"} hidden`;
  const text = rows.map((row) => `${row.title}\n${row.text}`.trim()).join("\n\n");
  return {
    key: `command-group:${first.key}:${last.key}`,
    turnId: first.turnId,
    threadId: first.threadId,
    itemIds: rows.flatMap((row) => row.itemIds),
    kind: "commandGroup",
    role: "tool",
    text,
    title,
    status: "completed",
    item: {
      id: `command-group-${first.item.id}-${last.item.id}`,
      type: "commandGroup",
      title,
      text,
      status: "completed",
      payload: {
        count: rows.length,
        commands: rows.map((row) => row.item.payload ?? { title: row.title, text: row.text })
      }
    },
    searchText: rows.map((row) => row.searchText).join("\n"),
    width: "wide",
    isLive: false,
    startedAt: first.startedAt,
    completedAt: last.completedAt,
    groupedRows: rows
  };
}

function rowRole(kind: ChatRowKind): ChatRowRole {
  switch (kind) {
    case "userMessage":
      return "user";
    case "assistantMessage":
    case "reasoningPreview":
      return "assistant";
    case "toolCall":
    case "toolResult":
    case "fileChange":
    case "commandExecution":
    case "commandGroup":
      return "tool";
    default:
      return "system";
  }
}

function rowWidth(kind: ChatRowKind, text: string): ChatRowWidth {
  if (kind === "commandExecution" || kind === "commandGroup" || kind === "fileChange" || kind === "toolCall" || text.includes("```")) {
    return "wide";
  }
  if (kind === "status" || kind === "notice" || kind === "checkpoint") {
    return "full";
  }
  return "prose";
}

function primaryText(item: WorkbenchItem, reasoning?: string): string {
  if (item.type === "reasoning") {
    return reasoningText(item) || reasoning || "";
  }
  return item.text;
}

export function reasoningText(item: WorkbenchItem): string {
  if (item.text.trim()) {
    return item.text.trim();
  }
  const payload = isRecord(item.payload) ? item.payload : {};
  const summary = payload.summary;
  if (typeof summary === "string") {
    return summary.trim();
  }
  if (Array.isArray(summary)) {
    return summary.map((entry) => (typeof entry === "string" ? entry : summarizeReasoningEntry(entry))).filter(Boolean).join("\n").trim();
  }
  if (isRecord(summary)) {
    return summarizeReasoningEntry(summary).trim();
  }
  return "";
}

function summarizeReasoningEntry(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (isRecord(value)) {
    for (const key of ["text", "summary", "content", "message"]) {
      const nested = value[key];
      if (typeof nested === "string" && nested.trim()) {
        return nested;
      }
    }
    return safeJson(value);
  }
  return "";
}

function fallbackTitle(kind: ChatRowKind): string {
  switch (kind) {
    case "userMessage":
      return "You";
    case "assistantMessage":
      return "Codex";
    case "reasoningPreview":
      return "Thinking";
    case "commandExecution":
      return "Command";
    case "commandGroup":
      return "Bash commands";
    case "fileChange":
      return "File change";
    case "toolCall":
      return "Tool";
    default:
      return "Status";
  }
}

function compactLine(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}...` : oneLine;
}

function safeJson(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
