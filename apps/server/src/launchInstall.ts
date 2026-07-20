import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type LaunchAdapterSpec = {
  id: string;
  repo: string;
  /** Public GitHub clone URL; null if repo is not published */
  cloneUrl: string | null;
  /** Wrapper binary names to look for on PATH */
  wrapperBins: string[];
  /** Upstream product CLI binaries */
  productBins: string[];
  envPrefix: string;
  /** Config directory under ~/.config */
  configDirName: string;
};

/** Only adapters with a verified public GitHub repo are cloneable. */
export const LAUNCH_SPECS: LaunchAdapterSpec[] = [
  {
    id: "code-launch",
    repo: "code-launch",
    cloneUrl: "https://github.com/layola13/code-launch.git",
    wrapperBins: ["code-launch"],
    productBins: ["codex"],
    envPrefix: "CODE_LAUNCH_",
    configDirName: "code-launch"
  },
  {
    id: "agy-launch",
    repo: "agy-launch",
    cloneUrl: "https://github.com/layola13/agy-launch.git",
    wrapperBins: ["agy-launch"],
    productBins: ["agy"],
    envPrefix: "AGY_LAUNCH_",
    configDirName: "agy-launch"
  },
  {
    id: "claude-launch",
    repo: "claude-launch",
    cloneUrl: "https://github.com/layola13/claude-launch.git",
    wrapperBins: ["claude-launch"],
    productBins: ["claude"],
    envPrefix: "CLAUDE_LAUNCH_",
    configDirName: "claude-launch"
  },
  {
    id: "gemini-launch",
    repo: "gemini-launch",
    cloneUrl: "https://github.com/layola13/gemini-launch.git",
    wrapperBins: ["gemini-launch"],
    productBins: ["gemini"],
    envPrefix: "GEMINI_LAUNCH_",
    configDirName: "gemini-launch"
  },
  {
    id: "crush-launch",
    repo: "crush-launch",
    cloneUrl: "https://github.com/layola13/crush-launch.git",
    wrapperBins: ["crush-launch"],
    productBins: ["crush"],
    envPrefix: "CRUSH_LAUNCH_",
    configDirName: "crush-launch"
  },
  {
    id: "auggie-launch",
    repo: "auggie-launch",
    cloneUrl: "https://github.com/layola13/auggie-launch.git",
    wrapperBins: ["auggie-launch"],
    productBins: ["auggie"],
    envPrefix: "AUGGIE_LAUNCH_",
    configDirName: "auggie-launch"
  },
  {
    id: "grok-launch",
    repo: "grok-launch",
    cloneUrl: "https://github.com/layola13/grok-launch.git",
    wrapperBins: ["grok-launch"],
    productBins: ["grok", "agent"],
    envPrefix: "GROK_LAUNCH_",
    configDirName: "grok-launch"
  },
  {
    id: "agent-launch",
    repo: "agent-launch",
    cloneUrl: null,
    wrapperBins: ["agent-launch", "grok-launch"],
    productBins: ["agent", "grok"],
    envPrefix: "GROK_LAUNCH_",
    configDirName: "grok-launch"
  },
  {
    id: "coderabbit-launch",
    repo: "coderabbit-launch",
    cloneUrl: null,
    wrapperBins: ["coderabbit-launch", "cr-launch"],
    productBins: ["coderabbit", "cr"],
    envPrefix: "CODERABBIT_LAUNCH_",
    configDirName: "coderabbit-launch"
  },
  {
    id: "freebuff-launch",
    repo: "freebuff-launch",
    cloneUrl: null,
    wrapperBins: ["freebuff-launch"],
    productBins: ["freebuff"],
    envPrefix: "FREEBUFF_LAUNCH_",
    configDirName: "freebuff-launch"
  }
];

export type LaunchAdapterStatus = {
  id: string;
  repo: string;
  cloneUrl: string | null;
  cloneable: boolean;
  installed: boolean;
  wrapperPath: string | null;
  productCliPath: string | null;
  productCliPresent: boolean;
  sourceDir: string | null;
  sourcePresent: boolean;
  envPath: string;
  envPresent: boolean;
  envConfigured: boolean;
  envPreview: { baseUrl: string | null; model: string | null; hasApiKey: boolean };
  needsInstall: boolean;
};

export type LaunchEnvValues = {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

export type InstallLaunchRequest = {
  ids?: string[];
  /** Install all missing adapters that are cloneable */
  missingOnly?: boolean;
  /** When true, run ./install.sh --skip-cli (default true for speed) */
  skipCli?: boolean;
  /** shared: same env for all; separate: per-id map */
  envMode?: "shared" | "separate" | "none";
  sharedEnv?: LaunchEnvValues;
  separateEnv?: Record<string, LaunchEnvValues>;
  /** Force rewrite env even if present */
  forceEnv?: boolean;
};

export type InstallLaunchResultItem = {
  id: string;
  ok: boolean;
  steps: string[];
  error?: string;
  status?: LaunchAdapterStatus;
};

let installLock: Promise<void> | null = null;

function home(): string {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

export function defaultSourceRoot(): string {
  return process.env.CODEX_UI_LAUNCH_SRC_ROOT || join(home(), ".codex-react-ui", "launch-src");
}

function pathDirs(): string[] {
  const extra = [
    join(home(), ".local", "bin"),
    join(home(), ".grok", "bin"),
    join(home(), ".claude", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin"
  ];
  const fromEnv = (process.env.PATH ?? "").split(":").filter(Boolean);
  return [...new Set([...extra, ...fromEnv])];
}

function findOnPath(names: string[]): string | null {
  for (const name of names) {
    for (const dir of pathDirs()) {
      const full = join(dir, name);
      if (existsSync(full)) {
        return full;
      }
    }
  }
  return null;
}

function configEnvPath(spec: LaunchAdapterSpec): string {
  const xdg = process.env.XDG_CONFIG_HOME || join(home(), ".config");
  return join(xdg, spec.configDirName, ".env");
}

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes("your-api-key") ||
    v.includes("sk-your-key") ||
    v.includes("your-gateway") ||
    v === "changeme" ||
    v === "xxx"
  );
}

function resolveSourceDir(spec: LaunchAdapterSpec): string | null {
  const candidates = [
    join(defaultSourceRoot(), spec.repo),
    join(home(), "projects", spec.repo),
    join(home(), "src", spec.repo),
    join("/root/projects", spec.repo)
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "install.sh")) || existsSync(join(dir, "main.py"))) {
      return dir;
    }
  }
  return null;
}

export function getSpec(id: string): LaunchAdapterSpec | undefined {
  return LAUNCH_SPECS.find((s) => s.id === id);
}

export function detectAdapter(spec: LaunchAdapterSpec): LaunchAdapterStatus {
  const wrapperPath = findOnPath(spec.wrapperBins);
  const productCliPath = findOnPath(spec.productBins);
  const sourceDir = resolveSourceDir(spec);
  const envPath = configEnvPath(spec);
  const envMap = parseEnvFile(envPath);
  const baseUrl = envMap[`${spec.envPrefix}BASE_URL`] ?? null;
  const model = envMap[`${spec.envPrefix}MODEL`] ?? null;
  const apiKey = envMap[`${spec.envPrefix}API_KEY`] ?? envMap[`${spec.envPrefix}API_KEYS`] ?? "";
  const hasApiKey = !isPlaceholder(apiKey);
  const envPresent = existsSync(envPath);
  const envConfigured = Boolean(baseUrl && !isPlaceholder(baseUrl) && hasApiKey);
  const installed = Boolean(wrapperPath || sourceDir);
  const needsInstall = !installed || !envConfigured;

  return {
    id: spec.id,
    repo: spec.repo,
    cloneUrl: spec.cloneUrl,
    cloneable: Boolean(spec.cloneUrl),
    installed,
    wrapperPath,
    productCliPath,
    productCliPresent: Boolean(productCliPath),
    sourceDir,
    sourcePresent: Boolean(sourceDir),
    envPath,
    envPresent,
    envConfigured,
    envPreview: {
      baseUrl: baseUrl && !isPlaceholder(baseUrl) ? baseUrl : baseUrl,
      model,
      hasApiKey
    },
    needsInstall
  };
}

export function detectAll(): { sourceRoot: string; adapters: LaunchAdapterStatus[] } {
  return {
    sourceRoot: defaultSourceRoot(),
    adapters: LAUNCH_SPECS.map(detectAdapter)
  };
}

function upsertEnvKeys(path: string, updates: Record<string, string>): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const next: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      next.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      next.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (keys.has(key)) {
      next.push(`${key}=${updates[key]}`);
      seen.add(key);
    } else {
      next.push(line);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      next.push(`${key}=${value}`);
    }
  }
  if (next.length === 0 || next[next.length - 1] !== "") {
    next.push("");
  }
  writeFileSync(path, next.join("\n"), { mode: 0o600 });
}

export function writeAdapterEnv(
  spec: LaunchAdapterSpec,
  values: LaunchEnvValues,
  force: boolean
): { path: string; wrote: boolean; skipped: boolean } {
  const path = configEnvPath(spec);
  if (!force && existsSync(path)) {
    const map = parseEnvFile(path);
    const hasBase = !isPlaceholder(map[`${spec.envPrefix}BASE_URL`]);
    const hasKey = !isPlaceholder(map[`${spec.envPrefix}API_KEY`] ?? map[`${spec.envPrefix}API_KEYS`]);
    if (hasBase && hasKey && !values.baseUrl && !values.apiKey && !values.model) {
      return { path, wrote: false, skipped: true };
    }
  }
  const updates: Record<string, string> = {};
  if (values.baseUrl !== undefined && values.baseUrl !== "") {
    updates[`${spec.envPrefix}BASE_URL`] = values.baseUrl.trim();
  }
  if (values.model !== undefined && values.model !== "") {
    updates[`${spec.envPrefix}MODEL`] = values.model.trim();
  }
  if (values.apiKey !== undefined && values.apiKey !== "") {
    updates[`${spec.envPrefix}API_KEY`] = values.apiKey.trim();
  }
  if (Object.keys(updates).length === 0) {
    // Ensure file exists with comments only if missing
    if (!existsSync(path)) {
      mkdirSync(resolve(path, ".."), { recursive: true });
      writeFileSync(
        path,
        `# ${spec.id} — created by Codex React UI\n# Fill ${spec.envPrefix}BASE_URL / MODEL / API_KEY\n${spec.envPrefix}BASE_URL=\n${spec.envPrefix}MODEL=\n${spec.envPrefix}API_KEY=\n`,
        { mode: 0o600 }
      );
      return { path, wrote: true, skipped: false };
    }
    return { path, wrote: false, skipped: true };
  }
  upsertEnvKeys(path, updates);
  return { path, wrote: true, skipped: false };
}

async function runCmd(
  cmd: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number }> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PATH: `${join(home(), ".local", "bin")}:${process.env.PATH ?? ""}`,
      GIT_TERMINAL_PROMPT: "0"
    }
  });
  const timer = setTimeout(() => {
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
  }, timeoutMs);
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);
  clearTimeout(timer);
  return { ok: code === 0, stdout, stderr, code };
}

async function ensureCloned(spec: LaunchAdapterSpec, steps: string[]): Promise<string> {
  const existing = resolveSourceDir(spec);
  if (existing) {
    steps.push(`source present: ${existing}`);
    return existing;
  }
  if (!spec.cloneUrl) {
    throw new Error(
      `${spec.id}: no public GitHub clone URL (repo not published under layola13). Provide the source manually or publish the repo.`
    );
  }
  const root = defaultSourceRoot();
  mkdirSync(root, { recursive: true });
  const target = join(root, spec.repo);
  if (existsSync(target)) {
    steps.push(`using existing checkout: ${target}`);
    return target;
  }
  steps.push(`git clone ${spec.cloneUrl}`);
  const result = await runCmd(
    ["git", "clone", "--depth", "1", spec.cloneUrl, target],
    root,
    180_000
  );
  if (!result.ok) {
    throw new Error(`git clone failed: ${result.stderr || result.stdout || `exit ${result.code}`}`);
  }
  return target;
}

async function runInstallSh(sourceDir: string, skipCli: boolean, steps: string[]): Promise<void> {
  const script = join(sourceDir, "install.sh");
  if (!existsSync(script)) {
    throw new Error(`install.sh not found in ${sourceDir}`);
  }
  try {
    chmodSync(script, 0o755);
  } catch {
    /* ignore */
  }
  const args = ["bash", script];
  if (skipCli) {
    args.push("--skip-cli");
  }
  steps.push(args.join(" "));
  const result = await runCmd(args, sourceDir, skipCli ? 120_000 : 600_000);
  if (!result.ok) {
    throw new Error(
      `install.sh failed (exit ${result.code}): ${(result.stderr || result.stdout).slice(-2000)}`
    );
  }
  steps.push("install.sh ok");
}

async function installOne(
  id: string,
  opts: InstallLaunchRequest
): Promise<InstallLaunchResultItem> {
  const steps: string[] = [];
  const spec = getSpec(id);
  if (!spec) {
    return { id, ok: false, steps, error: `Unknown adapter: ${id}` };
  }
  try {
    const sourceDir = await ensureCloned(spec, steps);
    const skipCli = opts.skipCli !== false; // default true
    await runInstallSh(sourceDir, skipCli, steps);

    if (opts.envMode && opts.envMode !== "none") {
      let values: LaunchEnvValues = {};
      if (opts.envMode === "shared") {
        values = opts.sharedEnv ?? {};
      } else if (opts.envMode === "separate") {
        values = opts.separateEnv?.[id] ?? {};
      }
      const envResult = writeAdapterEnv(spec, values, Boolean(opts.forceEnv));
      steps.push(
        envResult.skipped
          ? `env skip (existing): ${envResult.path}`
          : `env wrote: ${envResult.path}`
      );
    }

    return { id, ok: true, steps, status: detectAdapter(spec) };
  } catch (error) {
    return {
      id,
      ok: false,
      steps,
      error: error instanceof Error ? error.message : String(error),
      status: detectAdapter(spec)
    };
  }
}

export async function installLaunchAdapters(
  opts: InstallLaunchRequest
): Promise<{ results: InstallLaunchResultItem[]; adapters: LaunchAdapterStatus[] }> {
  // Serialize installs to avoid concurrent git/npm races
  while (installLock) {
    await installLock;
  }
  let release!: () => void;
  installLock = new Promise<void>((r) => {
    release = r;
  });
  try {
    let ids = opts.ids?.length ? [...opts.ids] : [];
    if (opts.missingOnly || ids.length === 0) {
      const all = detectAll().adapters;
      ids = all
        .filter((a) => (opts.missingOnly ? a.needsInstall : true))
        .filter((a) => a.cloneable || a.sourcePresent)
        .map((a) => a.id);
      if (opts.ids?.length) {
        ids = ids.filter((id) => opts.ids!.includes(id));
      }
    }
    // De-dupe
    ids = [...new Set(ids)];
    const results: InstallLaunchResultItem[] = [];
    for (const id of ids) {
      results.push(await installOne(id, opts));
    }
    return { results, adapters: detectAll().adapters };
  } finally {
    release();
    installLock = null;
  }
}

export function writeEnvsOnly(
  mode: "shared" | "separate",
  sharedEnv: LaunchEnvValues | undefined,
  separateEnv: Record<string, LaunchEnvValues> | undefined,
  ids: string[] | undefined,
  force: boolean
): { results: Array<{ id: string; ok: boolean; path: string; wrote: boolean; error?: string }> } {
  const targets = (ids?.length ? ids : LAUNCH_SPECS.map((s) => s.id)).filter((id) => getSpec(id));
  const results = targets.map((id) => {
    const spec = getSpec(id)!;
    try {
      const values = mode === "shared" ? sharedEnv ?? {} : separateEnv?.[id] ?? {};
      const r = writeAdapterEnv(spec, values, force);
      return { id, ok: true, path: r.path, wrote: r.wrote };
    } catch (error) {
      return {
        id,
        ok: false,
        path: configEnvPath(spec),
        wrote: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  return { results };
}

