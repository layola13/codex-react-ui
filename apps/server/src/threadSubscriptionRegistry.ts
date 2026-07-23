import { EventEmitter } from "node:events";
import { type CodexRuntimeClient } from "./daemonCodexBridge.js";

type ThreadEntry = {
  threadId: string;
  watchers: Set<string>;
  activeTurnHolds: Set<string>;
  subscribed: boolean;
};

export class ThreadSubscriptionRegistry extends EventEmitter {
  private threads = new Map<string, ThreadEntry>();

  public constructor(private readonly getClient: () => CodexRuntimeClient) {
    super();
  }

  public registerClient(client: CodexRuntimeClient): void {
    client.on("status", (status) => {
      if (status.phase === "ready") {
        void this.reAttachAll(client);
      }
    });
  }

  public watch(threadId: string, clientId: string): void {
    let entry = this.threads.get(threadId);
    if (!entry) {
      entry = {
        threadId,
        watchers: new Set<string>(),
        activeTurnHolds: new Set<string>(),
        subscribed: false
      };
      this.threads.set(threadId, entry);
    }
    entry.watchers.add(clientId);
    void this.ensureSubscribed(entry);
  }

  public unwatch(threadId: string, clientId: string): void {
    const entry = this.threads.get(threadId);
    if (!entry) return;
    entry.watchers.delete(clientId);
    void this.evaluateUnsubscribe(entry);
  }

  public unwatchAllForClient(clientId: string): void {
    for (const entry of this.threads.values()) {
      if (entry.watchers.has(clientId)) {
        entry.watchers.delete(clientId);
        void this.evaluateUnsubscribe(entry);
      }
    }
  }

  public addTurnHold(threadId: string, turnId: string): void {
    let entry = this.threads.get(threadId);
    if (!entry) {
      entry = {
        threadId,
        watchers: new Set<string>(),
        activeTurnHolds: new Set<string>(),
        subscribed: false
      };
      this.threads.set(threadId, entry);
    }
    entry.activeTurnHolds.add(turnId);
    void this.ensureSubscribed(entry);
  }

  public removeTurnHold(threadId: string, turnId: string): void {
    const entry = this.threads.get(threadId);
    if (!entry) return;
    entry.activeTurnHolds.delete(turnId);
    void this.evaluateUnsubscribe(entry);
  }

  private async ensureSubscribed(entry: ThreadEntry): Promise<void> {
    if (entry.subscribed) return;
    const client = this.getClient();
    const status = client.getStatus();
    if (status.phase !== "ready") return;

    try {
      entry.subscribed = true;
      await client.request("thread/resume", { threadId: entry.threadId });
    } catch (error) {
      entry.subscribed = false;
      this.emit("error", { threadId: entry.threadId, error });
    }
  }

  private async evaluateUnsubscribe(entry: ThreadEntry): Promise<void> {
    if (entry.watchers.size > 0 || entry.activeTurnHolds.size > 0) return;
    if (!entry.subscribed) {
      this.threads.delete(entry.threadId);
      return;
    }

    const client = this.getClient();
    const status = client.getStatus();
    entry.subscribed = false;
    this.threads.delete(entry.threadId);

    if (status.phase === "ready") {
      try {
        await client.request("thread/unsubscribe", { threadId: entry.threadId });
      } catch {}
    }
  }

  private async reAttachAll(client: CodexRuntimeClient): Promise<void> {
    for (const entry of this.threads.values()) {
      if (entry.watchers.size > 0 || entry.activeTurnHolds.size > 0) {
        entry.subscribed = false;
        await this.ensureSubscribed(entry);
      }
    }
  }
}
