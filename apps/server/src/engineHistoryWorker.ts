import {
  ENGINE_CATALOG,
  formatEngineHistory,
  getEngineTranscript,
  scanEngineHistory,
  type EngineHistoryItem,
  type EngineId
} from "./engineHistory.js";
import type {
  EngineHistoryWorkerRequest,
  EngineHistoryWorkerResponse
} from "./engineHistoryWorkerProtocol.js";

const SNAPSHOT_TTL_MS = 750;

type Snapshot = {
  expiresAt: number;
  items: EngineHistoryItem[];
};

const snapshots = new Map<EngineId, Snapshot>();

function snapshotFor(engine: EngineId): EngineHistoryItem[] {
  const now = Date.now();
  const cached = snapshots.get(engine);
  if (cached && cached.expiresAt > now) return cached.items;

  const items = scanEngineHistory(engine);
  snapshots.set(engine, { expiresAt: now + SNAPSHOT_TTL_MS, items });
  return items;
}

function listHistory(
  engine: EngineId | "all",
  opts: { q?: string; limit?: number }
) {
  const ids: EngineId[] = engine === "all" ? ENGINE_CATALOG.map((entry) => entry.id) : [engine];
  return formatEngineHistory(ids.flatMap((id) => snapshotFor(id)), opts);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const scope = globalThis as typeof globalThis & {
  onmessage: ((event: MessageEvent<EngineHistoryWorkerRequest>) => void) | null;
  postMessage: (message: EngineHistoryWorkerResponse) => void;
};

scope.onmessage = (event) => {
  const request = event.data;
  try {
    const data = request.operation === "list"
      ? listHistory(request.engine, { q: request.q, limit: request.limit })
      : getEngineTranscript(request.engine, request.historyId, request.historyKind);
    scope.postMessage({ requestId: request.requestId, ok: true, data });
  } catch (error) {
    scope.postMessage({ requestId: request.requestId, ok: false, error: errorMessage(error) });
  }
};
