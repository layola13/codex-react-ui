import type { ChatWaterfallRow } from "./types";

export function estimateChatRowSize(row: ChatWaterfallRow): number {
  const textLength = row.text.length + (row.reasoning?.length ?? 0);
  switch (row.kind) {
    case "userMessage":
      return clamp(76 + textLength / 18, 80, 160);
    case "assistantMessage":
      return clamp(140 + textLength / 10 + (row.text.includes("```") ? 160 : 0), 180, 560);
    case "reasoningPreview":
      return 96;
    case "commandExecution":
      return clamp(112 + Math.min(textLength, 240) / 16, 128, 240);
    case "fileChange":
      return clamp(220 + textLength / 10, 260, 620);
    case "toolCall":
      return clamp(130 + textLength / 12, 160, 420);
    default:
      return 72;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
