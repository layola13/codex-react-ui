import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(webRoot, "dist");
const publicDir = join(webRoot, "public");
const entryPoint = join(webRoot, "src/main.tsx");
const templatePath = join(webRoot, "index.html");
const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [entryPoint],
  outdir: outDir,
  target: "browser",
  format: "esm",
  minify: true,
  naming: {
    entry: "assets/[name]-[hash].[ext]",
    chunk: "assets/[name]-[hash].[ext]",
    asset: "assets/[name]-[hash].[ext]"
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  }
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await cp(publicDir, outDir, { recursive: true, force: true });
await refreshServiceWorkerBuildId(buildId);

const outputs = result.outputs.map((output) => toRootPath(relative(outDir, output.path)));
const scripts = outputs.filter((path) => path.endsWith(".js")).sort();
const stylesheets = outputs.filter((path) => path.endsWith(".css")).sort();

if (scripts.length === 0) {
  console.error("Bun web build did not produce a JavaScript entry.");
  process.exit(1);
}

const template = await readFile(templatePath, "utf8");
const headAssets = stylesheets.map((path) => `    <link rel="stylesheet" href="${path}" />`).join("\n");
const scriptAssets = scripts.map((path) => `    <script type="module" src="${path}"></script>`).join("\n");
const html = template
  .replace(/\s*<script type="module" src="\/src\/main\.tsx"><\/script>\s*/, `\n${scriptAssets}\n`)
  .replace("</head>", `    <meta name="codex-react-ui-build" content="${buildId}" />\n${headAssets ? `${headAssets}\n` : ""}  </head>`);

await writeFile(join(outDir, "index.html"), html);

const totalBytes = result.outputs.reduce((sum, output) => sum + output.size, 0);
console.log(`Bun web build ${buildId} wrote ${result.outputs.length} outputs (${formatBytes(totalBytes)}) to ${relative(process.cwd(), outDir) || basename(outDir)}`);

function toRootPath(path: string): string {
  return `/${path.split(sep).join("/")}`;
}

async function refreshServiceWorkerBuildId(id: string): Promise<void> {
  const swPath = join(outDir, "sw.js");
  const sw = await readFile(swPath, "utf8");
  await writeFile(swPath, sw.replaceAll("__BUILD_ID__", id));
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} kB`;
  }
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
