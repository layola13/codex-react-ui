import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { SecurityStore } from "../../apps/server/src/securityStore.ts";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempSecurityStore(): { db: Database; store: SecurityStore } {
  const dir = mkdtempSync(join(tmpdir(), "codex-ui-captcha-"));
  tempDirs.push(dir);
  const db = new Database(join(dir, "security.sqlite3"));
  db.exec("PRAGMA foreign_keys = ON");
  const store = new SecurityStore({ connection: db });
  store.initialize();
  return { db, store };
}

test("createCaptcha emits an animated readable inline SVG captcha", () => {
  const { db, store } = createTempSecurityStore();
  const challenge = store.createCaptcha();

  expect(challenge.id).toMatch(/^[a-f0-9]{32}$/);
  expect(challenge.expiresAt).toBeGreaterThan(Date.now());
  expect(challenge.svg).toContain("<svg");
  expect(challenge.svg).toContain("<animate");
  expect(challenge.svg).toContain("<text");
  expect(challenge.svg).not.toContain("rgba(");
  expect(challenge.svg).toContain('fill="#f8fafc"');
  expect(challenge.svg).toContain('stroke="#020617"');
  expect(challenge.svg).toMatch(/\d+ \+ \d+ = \?/);

  const expression = challenge.svg.match(/(\d+) \+ (\d+) = \?/);
  expect(expression).not.toBeNull();
  const answer = Number(expression?.[1]) + Number(expression?.[2]);
  expect(store.consumeCaptcha(challenge.id, String(answer))).toBe(true);

  db.close();
});
