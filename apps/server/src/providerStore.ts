import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { AsyncEntry } from "@napi-rs/keyring";
import type { ProviderConfig } from "@codex-ui/shared";

type StoreShape = {
  providers: ProviderConfig[];
};

export class ProviderStore {
  private readonly dir = join(homedir(), ".codex-react-ui");
  private readonly file = join(this.dir, "providers.json");
  private memorySecrets = new Map<string, string>();

  public async initialize(): Promise<void> {
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

  private async read(): Promise<StoreShape> {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      return { providers: Array.isArray(parsed.providers) ? parsed.providers : [] };
    } catch {
      return { providers: [] };
    }
  }

  private async write(store: StoreShape): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  }
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
