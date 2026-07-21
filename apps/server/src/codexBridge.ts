import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { constants, accessSync } from "node:fs";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
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

const DEFAULT_CODEX_BIN = "/root/projects/codex/codex-rs/target/debug/codex";

function canExecute(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class CodexBridge extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<string, PendingRequest>();
  private status: EngineStatus = { phase: "idle" };

  public constructor(private readonly runtimeEnv: () => NodeJS.ProcessEnv = () => ({})) {
    super();
  }

  public getStatus(): EngineStatus {
    return { ...this.status };
  }

  public async start(): Promise<EngineStatus> {
    if (this.status.phase === "ready" || this.status.phase === "starting") {
      return this.getStatus();
    }

    const codexBin = this.resolveCodexBin();
    this.setStatus({
      phase: "starting",
      codexBin,
      startedAt: Date.now(),
      message: "Starting codex app-server"
    });

    const child = spawn(codexBin, ["app-server", "--stdio"], {
      cwd: process.cwd(),
      env: { ...process.env, ...this.runtimeEnv() },
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.child = child;

    child.once("exit", (code, signal) => {
      if (this.child !== child) {
        return;
      }
      const message = `codex app-server exited with code ${code ?? "null"} signal ${signal ?? "null"}`;
      for (const request of this.pending.values()) {
        request.reject({ message });
      }
      this.pending.clear();
      this.child = null;
      if (this.status.phase !== "stopped") {
        this.setStatus({ ...this.status, phase: "error", message });
      }
    });

    child.once("error", (error) => {
      if (this.child !== child) {
        return;
      }
      this.setStatus({
        ...this.status,
        phase: "error",
        message: stringifyError(error)
      });
    });

    const stdout = createInterface({ input: child.stdout });
    stdout.on("line", (line) => this.handleLine(line));
    child.stderr.on("data", (chunk: Buffer) => {
      const message = redactSecrets(chunk.toString("utf8").trim());
      if (message.length > 0) {
        this.emit("stderr", message);
      }
    });

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
      this.setStatus({
        phase: "ready",
        codexBin,
        codexVersion: undefined,
        appServerUserAgent: typeof init.userAgent === "string" ? init.userAgent : undefined,
        codexHome: typeof init.codexHome === "string" ? init.codexHome : undefined,
        startedAt: this.status.startedAt,
        message: "Codex app-server ready"
      });
      void this.readCodexVersion(codexBin).then((ver) => {
        if (ver && this.status.phase === "ready") {
          this.setStatus({ ...this.status, codexVersion: ver });
        }
      });
      return this.getStatus();
    } catch (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : stringifyError(error);
      this.stop();
      this.setStatus({ phase: "error", codexBin, message });
      throw new Error(message);
    }
  }

  public stop(): void {
    for (const request of this.pending.values()) {
      request.reject({ message: "Codex app-server stopped" });
    }
    this.pending.clear();
    this.setStatus({ ...this.status, phase: "stopped", message: "Stopped" });
    this.child?.kill("SIGTERM");
    this.child = null;
  }

  public async restart(): Promise<EngineStatus> {
    this.stop();
    return this.start();
  }

  public async request(method: string, params?: JsonValue, timeoutMs = 15000): Promise<JsonValue> {
    if (!this.child) {
      throw new Error("Codex app-server is not running");
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
      this.send(payload);
    });
  }

  public async notify(method: string, params?: JsonValue): Promise<void> {
    this.send({ method, params });
  }

  public respond(id: JsonRpcId, result?: JsonValue, error?: JsonRpcFailure["error"]): void {
    if (error) {
      this.send({ id, error });
    } else {
      this.send({ id, result: result ?? {} });
    }
  }

  private send(message: JsonRpcMessage): void {
    if (!this.child) {
      throw new Error("Codex app-server is not running");
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleLine(line: string): void {
    if (line.trim().length === 0) {
      return;
    }
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      this.emit("stderr", `Unparseable app-server stdout: ${redactSecrets(line)}`);
      return;
    }

    if ("id" in message && this.pending.has(String(message.id))) {
      const pending = this.pending.get(String(message.id));
      this.pending.delete(String(message.id));
      if (!pending) {
        return;
      }
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

  private setStatus(status: EngineStatus): void {
    this.status = status;
    this.emit("status", this.getStatus());
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
          try {
            version.kill();
          } catch {
            /* ignore */
          }
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

function redactSecrets(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer ***")
    .replace(/api[_-]?key["'=:\s]+[A-Za-z0-9._~+/=-]{8,}/gi, "api_key=***");
}
