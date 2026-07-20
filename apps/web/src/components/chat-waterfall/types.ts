import type { WorkbenchItem } from "../../state/codexClient";

export type ChatRowKind =
  | "userMessage"
  | "assistantMessage"
  | "reasoningPreview"
  | "toolCall"
  | "toolResult"
  | "fileChange"
  | "commandExecution"
  | "status"
  | "error"
  | "checkpoint"
  | "notice";

export type ChatRowRole = "user" | "assistant" | "tool" | "system";

export type ChatRowWidth = "prose" | "wide" | "full";

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
};
