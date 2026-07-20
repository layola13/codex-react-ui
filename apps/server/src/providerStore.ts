import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { AsyncEntry } from "@napi-rs/keyring";
import type { ProviderConfig, UiProfile, UiProfileImportResult } from "@codex-ui/shared";
import { LocalDatabase } from "./localDatabase.js";

type StoreShape = {
  providers: ProviderConfig[];
};

export class ProviderStore {
  private readonly dir = join(homedir(), ".codex-react-ui");
  private readonly file = join(this.dir, "providers.json");
  private readonly db: Database;
  private memorySecrets = new Map<string, string>();

  public constructor(database = new LocalDatabase()) {
    this.db = database.connection;
  }

  public async initialize(): Promise<void> {
    await this.migrateLegacyProviders();
    const store = await this.read();
    let changed = false;
    for (const provider of store.providers) {
      if (!provider.apiKeyRef) {
        if (provider.apiKeyStorage !== "none") {
          provider.apiKeyStorage = "none";
          changed = true;
        }
        continue;
      }
      try {
        const secret = await keyringEntry(provider.id).getPassword();
        if (secret) {
          this.memorySecrets.set(provider.id, secret);
          if (provider.apiKeyStorage !== "keyring") {
            provider.apiKeyStorage = "keyring";
            changed = true;
          }
        } else if (provider.apiKeyStorage !== "memory") {
          provider.apiKeyStorage = "memory";
          changed = true;
        }
      } catch {
        if (provider.apiKeyStorage !== "memory") {
          provider.apiKeyStorage = "memory";
          changed = true;
        }
      }
    }
    if (changed) {
      await this.write(store);
    }
  }

  public async list(): Promise<ProviderConfig[]> {
    return (await this.read()).providers;
  }

  public async get(id: string): Promise<ProviderConfig | null> {
    return (await this.read()).providers.find((provider) => provider.id === id) ?? null;
  }

  public async save(provider: ProviderConfig, apiKey?: string): Promise<ProviderConfig> {
    const now = Date.now();
    const id = provider.id || providerIdFromName(provider.name);
    const apiKeyRef = apiKey ? `env:${envKeyForProvider(id)}` : provider.apiKeyRef;
    let apiKeyStorage = provider.apiKeyStorage ?? (provider.apiKeyRef ? "memory" : "none");
    if (apiKey) {
      this.memorySecrets.set(id, apiKey);
      try {
        await keyringEntry(id).setPassword(apiKey);
        apiKeyStorage = "keyring";
      } catch {
        apiKeyStorage = "memory";
      }
    }
    const clean: ProviderConfig = {
      ...provider,
      id,
      apiKeyRef,
      apiKeyPreview: apiKey ? previewSecret(apiKey) : provider.apiKeyPreview,
      apiKeyStorage,
      createdAt: provider.createdAt || now,
      updatedAt: now
    };
    const store = await this.read();
    const next = store.providers.filter((entry) => entry.id !== id);
    next.push(clean);
    await this.write({ providers: next });
    return clean;
  }

  public runtimeEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    for (const [id, secret] of this.memorySecrets.entries()) {
      env[envKeyForProvider(id)] = secret;
    }
    return env;
  }

  public async delete(id: string): Promise<void> {
    this.memorySecrets.delete(id);
    try {
      await keyringEntry(id).deleteCredential();
    } catch {
      // Missing or unavailable keyrings do not block provider deletion.
    }
    const store = await this.read();
    await this.write({ providers: store.providers.filter((entry) => entry.id !== id) });
  }

  public async exportProfile(): Promise<UiProfile> {
    const store = await this.read();
    return {
      schema: "codex-react-ui.profile.v1",
      exportedAt: Date.now(),
      providers: store.providers.map((provider) => profileProvider(provider))
    };
  }

  public async importProfile(profile: unknown): Promise<UiProfileImportResult> {
    const record = asRecord(profile);
    if (record.schema !== "codex-react-ui.profile.v1") {
      throw new Error("Unsupported UI profile schema");
    }
    if (!Array.isArray(record.providers)) {
      throw new Error("UI profile is missing providers");
    }

    const store = await this.read();
    const providersById = new Map(store.providers.map((provider) => [provider.id, provider]));
    const imported = record.providers.map((entry) => {
      const existingId = stringValue(asRecord(entry).id);
      return normalizeProfileProvider(entry, existingId ? providersById.get(existingId) : undefined);
    });

    for (const provider of imported) {
      providersById.set(provider.id, provider);
    }
    const providers = Array.from(providersById.values());
    await this.write({ providers });
    return {
      importedProviders: imported.length,
      providers
    };
  }

  private async read(): Promise<StoreShape> {
    const rows = this.db
      .prepare("SELECT payload FROM providers ORDER BY created_at ASC, id ASC")
      .all() as Array<{ payload: string }>;
    return {
      providers: rows.map((row) => parseProvider(row.payload)).filter((provider): provider is ProviderConfig => Boolean(provider))
    };
  }

  private async write(store: StoreShape): Promise<void> {
    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM providers").run();
      const insert = this.db.prepare("INSERT INTO providers (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)");
      for (const provider of store.providers) {
        insert.run(provider.id, JSON.stringify(provider), provider.createdAt ?? Date.now(), provider.updatedAt ?? Date.now());
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private async migrateLegacyProviders(): Promise<void> {
    const existing = this.db.prepare("SELECT COUNT(*) AS count FROM providers").get() as { count: number } | undefined;
    if ((existing?.count ?? 0) > 0) {
      return;
    }
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      const providers = Array.isArray(parsed.providers) ? parsed.providers.filter(isProviderLike) : [];
      if (providers.length > 0) {
        await this.write({ providers });
      }
    } catch {
      // Fresh installs have no legacy provider file.
    }
  }
}

function parseProvider(payload: string): ProviderConfig | null {
  try {
    const provider = JSON.parse(payload) as ProviderConfig;
    return isProviderLike(provider) ? provider : null;
  } catch {
    return null;
  }
}

function isProviderLike(value: unknown): value is ProviderConfig {
  const record = asRecord(value);
  return typeof record.id === "string" && typeof record.name === "string" && typeof record.kind === "string";
}

const KEYRING_SERVICE = "codex-react-ui";

function keyringEntry(id: string): AsyncEntry {
  return new AsyncEntry(KEYRING_SERVICE, `provider:${id}`);
}

function providerIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || randomUUID();
}

function envKeyForProvider(id: string): string {
  return `CODEX_UI_PROVIDER_${id.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}_API_KEY`;
}

function previewSecret(secret: string): string {
  if (secret.length <= 8) {
    return "********";
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

function profileProvider(provider: ProviderConfig): ProviderConfig {
  return {
    ...provider,
    apiKeyPreview: undefined,
    apiKeyStorage: "none"
  };
}

function normalizeProfileProvider(value: unknown, existing?: ProviderConfig): ProviderConfig {
  const record = asRecord(value);
  const now = Date.now();
  const name = stringValue(record.name) || "Imported provider";
  const id = stringValue(record.id) || providerIdFromName(name);
  const kind = providerKindValue(record.kind);
  const apiKeyRef = envKeyRefValue(record.apiKeyRef) ?? existing?.apiKeyRef;
  const preserveExistingKey = existing?.apiKeyRef && apiKeyRef === existing.apiKeyRef;

  return {
    id,
    kind,
    name,
    baseUrl: stringValue(record.baseUrl),
    apiKeyRef,
    apiKeyPreview: preserveExistingKey ? existing.apiKeyPreview : undefined,
    apiKeyStorage: preserveExistingKey ? existing.apiKeyStorage : "none",
    defaultModel: stringValue(record.defaultModel),
    nativeModels: stringArray(record.nativeModels),
    modelAliases: aliasArray(record.modelAliases),
    modelRates: modelRateArray(record.modelRates),
    createdAt: numberValue(record.createdAt) ?? existing?.createdAt ?? now,
    updatedAt: now
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(stringValue).filter((entry): entry is string => Boolean(entry)) : [];
}

function aliasArray(value: unknown): ProviderConfig["modelAliases"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const record = asRecord(entry);
      const alias = stringValue(record.alias);
      const model = stringValue(record.model);
      return alias && model ? { alias, model } : null;
    })
    .filter((entry): entry is { alias: string; model: string } => Boolean(entry));
}

function modelRateArray(value: unknown): ProviderConfig["modelRates"] {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const rates: NonNullable<ProviderConfig["modelRates"]> = [];
  for (const entry of value) {
      const record = asRecord(entry);
      const model = stringValue(record.model);
      const inputUsdPerMillion = numberValue(record.inputUsdPerMillion);
      const cachedInputUsdPerMillion = numberValue(record.cachedInputUsdPerMillion);
      const cacheWriteUsdPerMillion = numberValue(record.cacheWriteUsdPerMillion);
      const outputUsdPerMillion = numberValue(record.outputUsdPerMillion);
      const multiplier = numberValue(record.multiplier) ?? 1;
      if (model && inputUsdPerMillion != null && outputUsdPerMillion != null) {
        rates.push({ model, inputUsdPerMillion, cachedInputUsdPerMillion, cacheWriteUsdPerMillion, outputUsdPerMillion, multiplier });
      }
  }
  return rates.length > 0 ? rates : undefined;
}

function envKeyRefValue(value: unknown): string | undefined {
  const ref = stringValue(value);
  return ref?.startsWith("env:") ? ref : undefined;
}

function providerKindValue(value: unknown): ProviderConfig["kind"] {
  switch (value) {
    case "chatgpt":
    case "openai":
    case "responsesRelay":
    case "ollama":
    case "lmstudio":
    case "bedrock":
      return value;
    default:
      return "responsesRelay";
  }
}
