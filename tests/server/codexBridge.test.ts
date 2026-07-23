import { afterEach, expect, test } from "bun:test";
import { createCodexRuntimeClient } from "../../apps/server/src/codexBridge.ts";

const originalMode = process.env.CODEX_UI_APP_SERVER_MODE;
const originalSocket = process.env.CODEX_APP_SERVER_SOCKET;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.CODEX_UI_APP_SERVER_MODE;
  } else {
    process.env.CODEX_UI_APP_SERVER_MODE = originalMode;
  }
  if (originalSocket === undefined) {
    delete process.env.CODEX_APP_SERVER_SOCKET;
  } else {
    process.env.CODEX_APP_SERVER_SOCKET = originalSocket;
  }
});

test("createCodexRuntimeClient defaults to shared daemon transport for realtime Web/TUI sync", () => {
  delete process.env.CODEX_UI_APP_SERVER_MODE;
  delete process.env.CODEX_APP_SERVER_SOCKET;

  const client = createCodexRuntimeClient();

  expect(client.getStatus().transport).toBe("daemon-unix");
});

test("createCodexRuntimeClient keeps stdio as explicit legacy opt-out", () => {
  process.env.CODEX_UI_APP_SERVER_MODE = "stdio";

  const client = createCodexRuntimeClient();

  expect(client.getStatus().transport).toBe("stdio");
});

test("createCodexRuntimeClient rejects unknown runtime modes", () => {
  process.env.CODEX_UI_APP_SERVER_MODE = "private-history-only";

  expect(() => createCodexRuntimeClient()).toThrow(/Unsupported CODEX_UI_APP_SERVER_MODE/);
});
