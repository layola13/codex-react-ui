import type { WorkbenchItem } from "../../state/codexClient";

export type ChatTokenUsage = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  estimatedCostUsd?: number;
  costBreakdownUsd?: {
    input: number;
    cachedInput: number;
    cacheWrite: number;
    output: number;
  };
};

export type ChatRowKind =
  | "userMessage"
  | "assistantMessage"
  | "reasoningPreview"
  | "toolCall"
  | "toolResult"
  | "fileChange"
  | "commandExecution"
  | "commandGroup"
  | "imageGeneration"
  | "status"
  | "error"
  | "checkpoint"
  | "notice";

export type ChatRowRole = "user" | "assistant" | "tool" | "system";

export type ChatRowWidth = "prose" | "wide" | "full";

export type AssistantUsageDisplayMode = "summary" | "details";

export type ChatWaterfallRow = {
  key: string;
  turnId: string;
  threadId: string;
  itemIds: string[];
  kind: ChatRowKind;
  role: ChatRowRole;
  text: string;
  title: string;
  status?: string;
  item: WorkbenchItem;
  reasoning?: string;
  searchText: string;
  floor?: {
    index: number;
    label: string;
  };
  width: ChatRowWidth;
  isLive: boolean;
  hideHeader?: boolean;
  assistantTone?: "plain" | "tinted";
  startedAt?: number;
  completedAt?: number;
  firstTokenAt?: number;
  tokenUsage?: ChatTokenUsage;
  groupedRows?: ChatWaterfallRow[];
};
