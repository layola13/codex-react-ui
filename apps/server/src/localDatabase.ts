import { mkdirSync } from "node:fs";
import { chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Database } from "bun:sqlite";

export function codexUiDataDir(): string {
  const configured = process.env.CODEX_UI_DATA_DIR?.trim();
  if (!configured) {
    return join(homedir(), ".codex-react-ui");
  }
  if (configured === "~") {
    return homedir();
  }
  if (configured.startsWith("~/")) {
    return join(homedir(), configured.slice(2));
  }
  return resolve(configured);
}

export class LocalDatabase {
  public readonly dir = codexUiDataDir();
  public readonly file = join(this.dir, "codex-ui.sqlite3");
  private readonly db: Database;

  public constructor() {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    this.db = new Database(this.file);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.migrate();
    void chmod(this.file, 0o600).catch(() => undefined);
  }

  public get connection(): Database {
    return this.db;
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        method TEXT NOT NULL,
        severity TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
  }
}
