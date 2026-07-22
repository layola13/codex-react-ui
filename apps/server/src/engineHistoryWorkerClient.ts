import type {
  EngineHistoryItem,
  EngineId,
  EngineTranscript
} from "./engineHistory.js";
import type {
  EngineHistoryWorkerData,
  EngineHistoryListResult,
  EngineHistoryWorkerPayload,
  EngineHistoryWorkerRequest,
  EngineHistoryWorkerResponse
} from "./engineHistoryWorkerProtocol.js";

const REQUEST_TIMEOUT_MS = 10_000;
const RESPONSE_CACHE_TTL_MS = 750;

type PendingRequest = {
  resolve: (data: EngineHistoryWorkerData) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  worker: Worker;
};

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

export class EngineHistoryWorkerClient {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listCache = new Map<string, CacheEntry<EngineHistoryListResult>>();
  private readonly listInFlight = new Map<string, Promise<EngineHistoryListResult>>();

  list(
    engine: EngineId | "all",
    opts: { q?: string; limit?: number } = {}
  ): Promise<EngineHistoryListResult> {
    const q = opts.q?.trim() || undefined;
    const limit = opts.limit;
    const cacheKey = JSON.stringify([engine, q ?? "", limit ?? null]);
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);

    const inFlight = this.listInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const promise = this.request({ operation: "list", engine, q, limit })
      .then((data) => {
        const result = data as EngineHistoryListResult;
        this.listCache.set(cacheKey, {
          expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
          data: result
        });
        return result;
      })
      .finally(() => {
        if (this.listInFlight.get(cacheKey) === promise) this.listInFlight.delete(cacheKey);
      });
    this.listInFlight.set(cacheKey, promise);
    return promise;
  }

  transcript(
    engine: EngineId,
    historyId: string,
    historyKind?: EngineHistoryItem["historyKind"]
  ): Promise<EngineTranscript | null> {
    return this.request({ operation: "transcript", engine, historyId, historyKind }) as Promise<EngineTranscript | null>;
  }

  close(): void {
    const worker = this.worker;
    if (worker) this.failWorker(worker, new Error("Engine history worker closed"));
  }

  private request(
    payload: EngineHistoryWorkerPayload
  ): Promise<EngineHistoryWorkerData> {
    let worker: Worker;
    try {
      worker = this.ensureWorker();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }

    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(requestId);
        if (!pending) return;
        this.pending.delete(requestId);
        pending.reject(new Error(`Engine history worker timed out after ${REQUEST_TIMEOUT_MS}ms`));
        this.failWorker(worker, new Error("Engine history worker was restarted after a timeout"));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(requestId, { resolve, reject, timer, worker });
      try {
        worker.postMessage({ ...payload, requestId } as EngineHistoryWorkerRequest);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
        this.failWorker(worker, new Error("Engine history worker postMessage failed"));
      }
    });
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const workerEntry = import.meta.url.endsWith(".ts")
      ? new URL("./engineHistoryWorker.ts", import.meta.url)
      : new URL("./engineHistoryWorker.js", import.meta.url);
    const worker = new Worker(workerEntry, {
      name: "codex-engine-history",
      type: "module",
      smol: true
    });
    this.worker = worker;

    worker.onmessage = (event: MessageEvent<EngineHistoryWorkerResponse>) => {
      if (this.worker !== worker) return;
      const response = event.data;
      const pending = this.pending.get(response.requestId);
      if (!pending || pending.worker !== worker) return;
      clearTimeout(pending.timer);
      this.pending.delete(response.requestId);
      if (response.ok) pending.resolve(response.data);
      else pending.reject(new Error(response.error));
    };
    worker.onerror = (event) => {
      const eventMessage = (event as { message?: unknown }).message;
      const message = typeof eventMessage === "string" && eventMessage
        ? eventMessage
        : "Engine history worker crashed";
      this.failWorker(worker, new Error(message));
    };
    worker.onmessageerror = () => {
      this.failWorker(worker, new Error("Engine history worker returned an unreadable message"));
    };
    return worker;
  }

  private failWorker(worker: Worker, error: Error): void {
    if (this.worker === worker) this.worker = null;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    try {
      worker.terminate();
    } catch {
      // Worker is already gone.
    }
    for (const [requestId, pending] of this.pending) {
      if (pending.worker !== worker) continue;
      clearTimeout(pending.timer);
      this.pending.delete(requestId);
      pending.reject(error);
    }
  }
}
