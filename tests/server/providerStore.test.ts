import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { LocalDatabase, codexUiDataDir } from "../../apps/server/src/localDatabase.ts";
import { ProviderStore } from "../../apps/server/src/providerStore.ts";

const tempDirs: string[] = [];
const originalDataDir = process.env.CODEX_UI_DATA_DIR;
const originalProviderEnv = process.env.CODEX_UI_PROVIDER_ENV_TEST_API_KEY;

afterEach(() => {
  if (originalDataDir === undefined) {
    delete process.env.CODEX_UI_DATA_DIR;
  } else {
    process.env.CODEX_UI_DATA_DIR = originalDataDir;
  }
  if (originalProviderEnv === undefined) {
    delete process.env.CODEX_UI_PROVIDER_ENV_TEST_API_KEY;
  } else {
    process.env.CODEX_UI_PROVIDER_ENV_TEST_API_KEY = originalProviderEnv;
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

test("ProviderStore persists image protocol configuration", async () => {
  const dir = tempDataDir("codex-ui-provider-image-protocols-");
  const db = new Database(join(dir, "codex-ui.sqlite3"));
  db.exec(`
    CREATE TABLE providers (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const store = new ProviderStore({ connection: db });
  await store.save({
    id: "deepkey-image",
    kind: "responsesRelay",
    name: "DeepKey Image",
    baseUrl: "https://deepkey.top/v1",
    nativeModels: ["gpt-5.5", "gemini-3.1-flash-image-preview", "nano_banana_2"],
    modelAliases: [],
    defaultModel: "gpt-5.5",
    image: {
      generations: true,
      edits: true,
      defaultModel: "gemini-3.1-flash-image-preview",
      protocols: ["openaiImages", "openaiImageEdits", "geminiChatCompletions", "geminiGenerateContent", "deepkeyAsyncVideos"],
      defaultProtocol: "geminiChatCompletions"
    }
  });

  const providers = await store.list();

  expect(providers[0]?.image).toEqual({
    generations: true,
    edits: true,
    defaultModel: "gemini-3.1-flash-image-preview",
    protocols: ["openaiImages", "openaiImageEdits", "geminiChatCompletions", "geminiGenerateContent", "deepkeyAsyncVideos"],
    defaultProtocol: "geminiChatCompletions"
  });
  db.close();
});

test("ProviderStore runtimeEnv includes externally supplied provider API keys", () => {
  process.env.CODEX_UI_PROVIDER_ENV_TEST_API_KEY = "sk-runtime-env-test";
  const dir = tempDataDir("codex-ui-provider-env-");
  const db = new Database(join(dir, "codex-ui.sqlite3"));
  const store = new ProviderStore({ connection: db });

  expect(store.runtimeEnv().CODEX_UI_PROVIDER_ENV_TEST_API_KEY).toBe("sk-runtime-env-test");
  db.close();
});
