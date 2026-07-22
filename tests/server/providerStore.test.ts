import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { LocalDatabase, codexUiDataDir } from "../../apps/server/src/localDatabase.ts";
import { ProviderStore } from "../../apps/server/src/providerStore.ts";

const tempDirs: string[] = [];
const originalDataDir = process.env.CODEX_UI_DATA_DIR;

afterEach(() => {
  if (originalDataDir === undefined) {
    delete process.env.CODEX_UI_DATA_DIR;
  } else {
    process.env.CODEX_UI_DATA_DIR = originalDataDir;
  }
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function tempDataDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

test("codexUiDataDir honors CODEX_UI_DATA_DIR so relay storage can live on a persistent volume", () => {
  const dir = tempDataDir("codex-ui-data-dir-");
  process.env.CODEX_UI_DATA_DIR = dir;

  expect(codexUiDataDir()).toBe(dir);
  const database = new LocalDatabase();
  expect(database.file).toBe(join(dir, "codex-ui.sqlite3"));
  database.connection.close();
});

test("ProviderStore persists relay channels in SQLite across store instances", async () => {
  const dir = tempDataDir("codex-ui-provider-store-");
  const db = new Database(join(dir, "codex-ui.sqlite3"));
  db.exec(`
    CREATE TABLE providers (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const first = new ProviderStore({ connection: db });
  const saved = await first.save({
    id: "axon-relay",
    kind: "responsesRelay",
    name: "Axon Relay",
    baseUrl: "https://relay.example/v1",
    nativeModels: ["glm-4.5"],
    modelAliases: [],
    defaultModel: "glm-4.5",
    modelRates: [],
    remark: "persist me"
  });

  const second = new ProviderStore({ connection: db });
  const providers = await second.list();

  expect(saved.id).toBe("axon-relay");
  expect(providers).toHaveLength(1);
  expect(providers[0]?.id).toBe("axon-relay");
  expect(providers[0]?.remark).toBe("persist me");
  db.close();
});
