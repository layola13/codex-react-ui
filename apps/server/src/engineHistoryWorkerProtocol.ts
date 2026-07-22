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

export type EngineHistoryWorkerData = EngineHistoryListResult | EngineTranscript | null;

export type EngineHistoryWorkerPayload =
  | {
      operation: "list";
      engine: EngineId | "all";
      q?: string;
      limit?: number;
    }
  | {
      operation: "transcript";
      engine: EngineId;
      historyId: string;
      historyKind?: EngineHistoryItem["historyKind"];
    };

export type EngineHistoryWorkerRequest = EngineHistoryWorkerPayload & {
  requestId: number;
};

export type EngineHistoryWorkerResponse =
  | {
      requestId: number;
      ok: true;
      data: EngineHistoryWorkerData;
    }
  | {
      requestId: number;
      ok: false;
      error: string;
    };
