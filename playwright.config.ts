import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const localChromiumPath = "/home/vscode/.local/bin/chromium";
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync(localChromiumPath) ? localChromiumPath : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02
    }
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined
      }
    }
  ],
  webServer: {
    command: "pnpm --filter @codex-ui/web dev -- --host 127.0.0.1 --port 5173",
    env: { CHOKIDAR_USEPOLLING: "true" },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
