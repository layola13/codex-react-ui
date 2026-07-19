#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const bun = process.platform === "win32" ? "bun.exe" : "bun";
const runtime = process.execPath;
const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"));

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: bun run launch [--build|--skip-build]

Builds missing production assets, then starts the local Codex React UI server.

Options:
  --build       Force bun build before starting.
  --skip-build  Start from existing dist files without running bun build first.
`);
  process.exit(0);
}

if (args.has("--build") && args.has("--skip-build")) {
  console.error("Choose only one of --build or --skip-build.");
  process.exit(1);
}

const requiredOutputs = [
  "apps/server/dist/index.js",
  "apps/web/dist/index.html",
  "packages/shared/dist/index.js"
];

const missingOutputs = requiredOutputs.filter((path) => !existsSync(join(rootDir, path)));
const shouldBuild = args.has("--build") || (!args.has("--skip-build") && missingOutputs.length > 0);

if (shouldBuild) {
  if (missingOutputs.length > 0 && !args.has("--build")) {
    console.log(`Building missing assets: ${missingOutputs.join(", ")}`);
  }
  await run(bun, ["run", "build"]);
}

const remainingMissingOutputs = requiredOutputs.filter((path) => !existsSync(join(rootDir, path)));
if (remainingMissingOutputs.length > 0) {
  console.error(`Missing launch assets: ${remainingMissingOutputs.join(", ")}`);
  console.error("Run bun run launch -- --build to create production assets.");
  process.exit(1);
}

const server = spawn(runtime, [join(rootDir, "apps/server/dist/index.js")], {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit"
});

let terminating = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    terminating = true;
    server.kill(signal);
  });
}

server.on("exit", (code, signal) => {
  if (terminating) {
    process.exit(0);
    return;
  }
  if (signal) {
    console.error(`Server exited with ${signal}.`);
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});

async function run(command, commandArgs) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${signal}`));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}`));
    });
  });
}
