#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const codexRootArg = process.argv.find((arg) => arg.startsWith("--codex-root="));
const codexRoot = resolve(rootDir, codexRootArg?.slice("--codex-root=".length) || "../codex");
const sourcePath = join(codexRoot, "codex-rs/core/config.schema.json");
const targetPath = join(rootDir, "apps/web/src/state/codexConfigSchema.json");

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: bun scripts/sync-codex-config-schema.mjs [--write] [--codex-root=/path/to/codex]

Checks that the web UI's bundled Codex config schema matches the local Codex repo.

Options:
  --write             Copy the schema from Codex into the web app.
  --codex-root=PATH   Codex repo root. Defaults to ../codex from this project.
`);
  process.exit(0);
}

const sourceRaw = await readFile(sourcePath, "utf8");
const source = JSON.parse(sourceRaw);

if (write) {
  await writeFile(targetPath, `${JSON.stringify(source, null, 2)}\n`);
  console.log(`Synced Codex config schema from ${sourcePath}`);
  process.exit(0);
}

const targetRaw = await readFile(targetPath, "utf8");
const target = JSON.parse(targetRaw);
const sourceNormalized = `${JSON.stringify(source, null, 2)}\n`;
const targetNormalized = `${JSON.stringify(target, null, 2)}\n`;

if (sourceNormalized !== targetNormalized) {
  const sourceKeys = Object.keys(source.properties ?? {}).sort();
  const targetKeys = Object.keys(target.properties ?? {}).sort();
  const missing = sourceKeys.filter((key) => !targetKeys.includes(key));
  const extra = targetKeys.filter((key) => !sourceKeys.includes(key));
  console.error("Bundled Codex config schema is out of sync.");
  console.error(`Source: ${sourcePath}`);
  console.error(`Target: ${targetPath}`);
  console.error(`Top-level source keys: ${sourceKeys.length}`);
  console.error(`Top-level target keys: ${targetKeys.length}`);
  if (missing.length > 0) {
    console.error(`Missing keys: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    console.error(`Extra keys: ${extra.join(", ")}`);
  }
  console.error("Run: bun run sync:codex-config-schema");
  process.exit(1);
}

console.log(
  `Codex config schema is current: ${Object.keys(target.properties ?? {}).length} top-level settings from ${sourcePath}`
);
