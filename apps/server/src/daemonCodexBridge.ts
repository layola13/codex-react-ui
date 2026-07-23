import { spawn } from "node:child_process";
import { mkdirSync, constants, accessSync, existsSync, statSync, rmSync } from "node:fs";
import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import {
  type EngineStatus,
  type JsonRpcFailure,
  type JsonRpcId,
  type JsonRpcMessage,
  type JsonValue
} from "@codex-ui/shared";

type PendingRequest = {
  resolve: (value: JsonValue) => void;
  reject: (error: JsonRpcFailure["error"]) => void;
  method: string;
};

export interface CodexRuntimeClient extends EventEmitter {
  getStatus(): EngineStatus;
  start(): Promise<EngineStatus>;
  stop(): void;
  restart(): Promise<EngineStatus>;
  request(method: string, params?: JsonValue, timeoutMs?: number): Promise<JsonValue>;
  notify(method: string, params?: JsonValue): Promise<void>;
  respond(id: JsonRpcId, result?: JsonValue, error?: JsonRpcFailure["error"]): void;
}

const DEFAULT_CODEX_BIN = "/root/projects/codex/codex-rs/target/debug/codex";

function canExecute(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function redactSecrets(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer ***")
    .replace(/api[_-]?key["'=:\s]+[A-Za-z0-9._~+/=-]{8,}/gi, "api_key=***");
}

export function resolveCodexHome(): string {
  if (process.env.CODEX_HOME) {
    return process.env.CODEX_HOME;
  }
  return path.join(os.homedir(), ".codex");
}

export function resolveDefaultSocketPath(): string {
  if (process.env.CODEX_APP_SERVER_SOCKET) {
    return process.env.CODEX_APP_SERVER_SOCKET;
  }
  const codexHome = resolveCodexHome();
  return path.join(codexHome, "app-server-control", "app-server-control.sock");
}

export class DaemonCodexBridge extends EventEmitter implements CodexRuntimeClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<string, PendingRequest>();
  private status: EngineStatus = { phase: "idle", transport: "daemon-unix" };
  private connectionEpoch = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isStopping = false;
  private readonly socketPath: string;

  public constructor(
    socketPath = resolveDefaultSocketPath(),
    private readonly runtimeEnv: () => NodeJS.ProcessEnv = () => ({})
  ) {
    super();
    this.socketPath = socketPath;
  }

  public getStatus(): EngineStatus {
    return { ...this.status };
  }

  private setStatus(status: EngineStatus): void {
    this.status = status;
    this.emit("status", this.getStatus());
  }

  public async start(): Promise<EngineStatus> {
    if (this.status.phase === "ready" || this.status.phase === "starting") {
      return this.getStatus();
    }
    this.isStopping = false;
    const codexBin = this.resolveCodexBin();
    this.setStatus({
      phase: "starting",
      transport: "daemon-unix",
      realtimeSync: "available",
      connectionEpoch: this.connectionEpoch,
      codexBin,
      startedAt: Date.now(),
      message: "Connecting to Codex app-server daemon"
    });

    try {
      await this.ensureDaemonRunning(codexBin);
      await this.connectWebSocket();
      return this.getStatus();
    } catch (error) {
      const message = stringifyError(error);
      this.setStatus({
        phase: "error",
        transport: "daemon-unix",
        realtimeSync: "unavailable",
        connectionEpoch: this.connectionEpoch,
        codexBin,
        codexHome: resolveCodexHome(),
        message
      });
      throw new Error(message);
    }
  }

  public stop(): void {
    this.isStopping = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const request of this.pending.values()) {
      request.reject({ message: "Codex daemon bridge stopped" });
    }
    this.pending.clear();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus({ ...this.status, phase: "stopped", message: "Stopped" });
  }

  public async restart(): Promise<EngineStatus> {
    this.stop();
    return this.start();
  }

  public async request(method: string, params?: JsonValue, timeoutMs = 15000): Promise<JsonValue> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Codex daemon connection is not open");
    }
    const id = this.nextId++;
    const payload: JsonRpcMessage = { id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(String(id))) {
          this.pending.delete(String(id));
          reject({ message: `Request '${method}' timed out after ${timeoutMs}ms` });
        }
      }, timeoutMs);
      this.pending.set(String(id), {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        method
      });
      this.sendPayload(payload);
    });
  }

  public async notify(method: string, params?: JsonValue): Promise<void> {
    this.sendPayload({ method, params });
  }

  public respond(id: JsonRpcId, result?: JsonValue, error?: JsonRpcFailure["error"]): void {
    if (error) {
      this.sendPayload({ id, error });
    } else {
      this.sendPayload({ id, result: result ?? {} });
    }
  }

  private sendPayload(message: JsonRpcMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Codex daemon connection is not open");
    }
    this.ws.send(JSON.stringify(message));
  }

  private async ensureDaemonRunning(codexBin: string): Promise<void> {
    if (this.hasUsableSocket()) {
      return;
    }

    const socketDir = path.dirname(this.socketPath);
    mkdirSync(socketDir, { recursive: true, mode: 0o700 });
    const spawnArgs = ["app-server", "daemon", "start"];

    await new Promise<void>((resolve, reject) => {
      const daemonProc = spawn(codexBin, spawnArgs, {
        cwd: process.cwd(),
        env: { ...process.env, ...this.runtimeEnv() },
        stdio: ["ignore", "pipe", "pipe"]
      });

      let output = "";
      let errOutput = "";
      daemonProc.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      daemonProc.stderr.on("data", (chunk: Buffer) => {
        errOutput += chunk.toString("utf8");
      });

      daemonProc.once("exit", (code) => {
        if (code === 0 || this.hasUsableSocket()) {
          resolve();
        } else {
          const details = [errOutput.trim(), output.trim()].filter(Boolean).join("\n");
          reject(new Error(`Failed to start daemon (code ${code}): ${redactSecrets(details)}`));
        }
      });

      daemonProc.once("error", (err) => {
        reject(err);
      });
    });

    for (let i = 0; i < 40; i += 1) {
      if (this.hasUsableSocket()) {
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    throw new Error(`Codex daemon socket did not become ready: ${this.socketPath}`);
  }

  private hasUsableSocket(): boolean {
    if (!existsSync(this.socketPath)) {
      return false;
    }
    try {
      const stat = statSync(this.socketPath);
      if (stat.isSocket()) {
        return true;
      }
      rmSync(this.socketPath, { force: true, recursive: false });
    } catch {
      return false;
    }
    return false;
  }

  private async connectWebSocket(): Promise<void> {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws+unix://${this.socketPath}:/`, {
        perMessageDeflate: false
      });
      let resolved = false;

      ws.on("open", async () => {
        this.ws = ws;
        this.connectionEpoch += 1;
        try {
          const initialize = await this.request("initialize", {
            clientInfo: {
              name: "codex_react_ui",
              title: "Codex React UI",
              version: "0.1.0"
            },
            capabilities: {
              experimentalApi: true,
              mcpServerOpenaiFormElicitation: true
            }
          });
          await this.notify("initialized", {});
          const init = initialize as Record<string, JsonValue>;
          const codexBin = this.resolveCodexBin();
          const codexVersion = await this.readCodexVersion(codexBin);

          this.setStatus({
            phase: "ready",
            transport: "daemon-unix",
            realtimeSync: "available",
            connectionEpoch: this.connectionEpoch,
            codexBin,
            codexVersion,
            appServerUserAgent: typeof init.userAgent === "string" ? init.userAgent : undefined,
            codexHome: typeof init.codexHome === "string" ? init.codexHome : resolveCodexHome(),
            message: `Connected to Codex app-server daemon at ${this.socketPath}`,
            startedAt: Date.now()
          });

          if (!resolved) {
            resolved = true;
            resolve();
          }
        } catch (err) {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        }
      });

      ws.on("message", (data: WebSocket.RawData) => {
        const text = data.toString("utf8");
        this.handleMessageLine(text);
      });

      ws.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        } else {
          this.emit("stderr", `WebSocket error: ${stringifyError(err)}`);
        }
      });

      ws.on("close", () => {
        this.ws = null;
        for (const req of this.pending.values()) {
          req.reject({ message: "Daemon WebSocket connection closed" });
        }
        this.pending.clear();

        if (!this.isStopping) {
          this.setStatus({
            ...this.status,
            phase: "reconnecting",
            realtimeSync: "degraded",
            message: "Connection to daemon lost, reconnecting..."
          });
          this.scheduleReconnect();
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isStopping) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isStopping) return;
      try {
        await this.start();
      } catch {
        this.scheduleReconnect();
      }
    }, 2000);
  }

  private handleMessageLine(text: string): void {
    if (!text.trim()) return;
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(text) as JsonRpcMessage;
    } catch {
      this.emit("stderr", `Unparseable WebSocket frame: ${redactSecrets(text)}`);
      return;
    }

    if ("id" in message && this.pending.has(String(message.id))) {
      const pending = this.pending.get(String(message.id));
      this.pending.delete(String(message.id));
      if (!pending) return;
      if ("error" in message) {
        pending.reject(message.error);
      } else if ("result" in message) {
        pending.resolve(message.result);
      } else {
        pending.resolve({});
      }
      return;
    }

    this.emit("message", message);
  }

  private resolveCodexBin(): string {
    const configured = process.env.CODEX_BIN;
    if (configured && canExecute(configured)) {
      return configured;
    }
    if (canExecute(DEFAULT_CODEX_BIN)) {
      return DEFAULT_CODEX_BIN;
    }
    return "codex";
  }

  private async readCodexVersion(codexBin: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      let resolved = false;
      const version = spawn(codexBin, ["--version"], { stdio: ["ignore", "pipe", "ignore"] });
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { version.kill(); } catch {}
          resolve(undefined);
        }
      }, 3000);
      let output = "";
      version.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      version.once("exit", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(output.trim() || undefined);
        }
      });
      version.once("error", () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(undefined);
        }
      });
    });
  }
}
