import { mkdirSync } from "node:fs";
import { chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class LocalDatabase {
  public readonly dir = join(homedir(), ".codex-react-ui");
  public readonly file = join(this.dir, "codex-ui.sqlite3");
  private readonly db: DatabaseSync;

  public constructor() {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(this.file);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.migrate();
    void chmod(this.file, 0o600).catch(() => undefined);
  }

  public get connection(): DatabaseSync {
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
