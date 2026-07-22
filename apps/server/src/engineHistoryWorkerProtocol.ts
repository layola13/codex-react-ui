import type {
  EngineHistoryItem,
  EngineId,
  EngineMeta,
  EngineTranscript
} from "./engineHistory.js";

export type EngineHistoryListResult = {
  engines: EngineMeta[];
  items: EngineHistoryItem[];
};

export type EngineHistoryWorkerRequest =
  | {
      requestId: number;
      operation: "list";
      engine: EngineId | "all";
      q?: string;
      limit?: number;
    }
  | {
      requestId: number;
      operation: "transcript";
      engine: EngineId;
      historyId: string;
      historyKind?: EngineHistoryItem["historyKind"];
    };

export type EngineHistoryWorkerResponse =
  | {
      requestId: number;
      ok: true;
      data: EngineHistoryListResult | EngineTranscript | null;
    }
  | {
      requestId: number;
      ok: false;
      error: string;
    };
