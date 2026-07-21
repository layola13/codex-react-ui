import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Database } from "bun:sqlite";
import { LocalDatabase } from "./localDatabase.js";

export type SystemSettings = {
  registrationEnabled: boolean;
  captchaEnabled: boolean;
  totpEnabled: boolean;
  forceAdminTotp: boolean;
  defaultMemberBalance: number;
  defaultMemberConcurrency: number;
  updatedAt: number;
};

const DEFAULT_SETTINGS: SystemSettings = {
  registrationEnabled: false,
  captchaEnabled: true,
  totpEnabled: true,
  forceAdminTotp: false,
  defaultMemberBalance: 0,
  defaultMemberConcurrency: 5,
  updatedAt: 0
};

type CaptchaRow = {
  id: string;
  answer: string;
  expires_at: number;
  used: number;
};

type PendingLoginRow = {
  id: string;
  user_id: string;
  expires_at: number;
};

/**
 * Sub2API-inspired security config: captcha, registration switch, TOTP, allowed relays.
 */
export class SecurityStore {
  private readonly db: Database;

  public constructor(database = new LocalDatabase()) {
    this.db = database.connection;
  }

  public initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        registration_enabled INTEGER NOT NULL DEFAULT 0,
        captcha_enabled INTEGER NOT NULL DEFAULT 1,
        totp_enabled INTEGER NOT NULL DEFAULT 1,
        force_admin_totp INTEGER NOT NULL DEFAULT 0,
        default_member_balance REAL NOT NULL DEFAULT 0,
        default_member_concurrency INTEGER NOT NULL DEFAULT 5,
        updated_at INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO system_settings (id, updated_at) VALUES (1, 0);

      CREATE TABLE IF NOT EXISTS captcha_challenges (
        id TEXT PRIMARY KEY,
        answer TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS captcha_expires_idx ON captcha_challenges (expires_at);

      CREATE TABLE IF NOT EXISTS pending_logins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS pending_logins_expires_idx ON pending_logins (expires_at);

      CREATE TABLE IF NOT EXISTS user_allowed_providers (
        user_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        PRIMARY KEY (user_id, provider_id)
      );
      CREATE INDEX IF NOT EXISTS user_allowed_providers_user_idx ON user_allowed_providers (user_id);

      CREATE TABLE IF NOT EXISTS totp_setup (
        user_id TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Best-effort column adds for users table (TOTP).
    this.ensureUserColumn("totp_secret", "TEXT NOT NULL DEFAULT ''");
    this.ensureUserColumn("totp_enabled", "INTEGER NOT NULL DEFAULT 0");
    this.ensureUserColumn("totp_enabled_at", "INTEGER");
  }

  public getSettings(): SystemSettings {
    const row = this.db.prepare(`SELECT * FROM system_settings WHERE id = 1`).get() as
      | {
          registration_enabled: number;
          captcha_enabled: number;
          totp_enabled: number;
          force_admin_totp: number;
          default_member_balance: number;
          default_member_concurrency: number;
          updated_at: number;
        }
      | undefined;
    if (!row) {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      registrationEnabled: Boolean(row.registration_enabled),
      captchaEnabled: Boolean(row.captcha_enabled),
      totpEnabled: Boolean(row.totp_enabled),
      forceAdminTotp: Boolean(row.force_admin_totp),
      defaultMemberBalance: Number(row.default_member_balance) || 0,
      defaultMemberConcurrency: Math.max(1, Math.floor(row.default_member_concurrency || 5)),
      updatedAt: row.updated_at
    };
  }

  public updateSettings(input: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const next: SystemSettings = {
      registrationEnabled: input.registrationEnabled ?? current.registrationEnabled,
      captchaEnabled: input.captchaEnabled ?? current.captchaEnabled,
      totpEnabled: input.totpEnabled ?? current.totpEnabled,
      forceAdminTotp: input.forceAdminTotp ?? current.forceAdminTotp,
      defaultMemberBalance:
        input.defaultMemberBalance !== undefined ? Math.max(0, Number(input.defaultMemberBalance) || 0) : current.defaultMemberBalance,
      defaultMemberConcurrency:
        input.defaultMemberConcurrency !== undefined
          ? Math.max(1, Math.floor(Number(input.defaultMemberConcurrency) || 1))
          : current.defaultMemberConcurrency,
      updatedAt: Date.now()
    };
    this.db
      .prepare(
        `UPDATE system_settings SET
          registration_enabled = ?, captcha_enabled = ?, totp_enabled = ?, force_admin_totp = ?,
          default_member_balance = ?, default_member_concurrency = ?, updated_at = ?
         WHERE id = 1`
      )
      .run(
        next.registrationEnabled ? 1 : 0,
        next.captchaEnabled ? 1 : 0,
        next.totpEnabled ? 1 : 0,
        next.forceAdminTotp ? 1 : 0,
        next.defaultMemberBalance,
        next.defaultMemberConcurrency,
        next.updatedAt
      );
    return next;
  }

  public publicAuthConfig(): {
    registrationEnabled: boolean;
    captchaEnabled: boolean;
    totpEnabled: boolean;
  } {
    const s = this.getSettings();
    return {
      registrationEnabled: s.registrationEnabled,
      captchaEnabled: s.captchaEnabled,
      totpEnabled: s.totpEnabled
    };
  }

  public createCaptcha(): { id: string; svg: string; expiresAt: number } {
    this.cleanupExpired();
    const a = randomInt(3, 15);
    const b = randomInt(2, 12);
    const answer = String(a + b);
    const id = randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    this.db.prepare(`INSERT INTO captcha_challenges (id, answer, expires_at, used) VALUES (?, ?, ?, 0)`).run(id, answer, expiresAt);
    const text = `${a} + ${b} = ?`;
    return { id, svg: renderCaptchaSvg(text), expiresAt };
  }

  public consumeCaptcha(id: string | undefined, answer: string | undefined): boolean {
    if (!id || !answer) {
      return false;
    }
    this.cleanupExpired();
    const row = this.db.prepare(`SELECT * FROM captcha_challenges WHERE id = ? LIMIT 1`).get(id) as CaptchaRow | undefined;
    if (!row || row.used || row.expires_at < Date.now()) {
      return false;
    }
    const expected = row.answer.trim().toLowerCase();
    const provided = answer.trim().toLowerCase();
    const ok = expected.length === provided.length && timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    this.db.prepare(`UPDATE captcha_challenges SET used = 1 WHERE id = ?`).run(id);
    return ok;
  }

  public createPendingLogin(userId: string): { pendingToken: string; expiresAt: number } {
    this.cleanupExpired();
    const id = randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    this.db.prepare(`INSERT INTO pending_logins (id, user_id, expires_at) VALUES (?, ?, ?)`).run(id, userId, expiresAt);
    return { pendingToken: id, expiresAt };
  }

  public consumePendingLogin(pendingToken: string): string | null {
    this.cleanupExpired();
    const row = this.db.prepare(`SELECT * FROM pending_logins WHERE id = ? LIMIT 1`).get(pendingToken) as PendingLoginRow | undefined;
    if (!row || row.expires_at < Date.now()) {
      return null;
    }
    this.db.prepare(`DELETE FROM pending_logins WHERE id = ?`).run(pendingToken);
    return row.user_id;
  }

  public getAllowedProviders(userId: string): string[] {
    const rows = this.db
      .prepare(`SELECT provider_id FROM user_allowed_providers WHERE user_id = ? ORDER BY provider_id ASC`)
      .all(userId) as Array<{ provider_id: string }>;
    return rows.map((row) => row.provider_id);
  }

  public setAllowedProviders(userId: string, providerIds: string[]): string[] {
    const unique = [...new Set(providerIds.map((id) => id.trim()).filter(Boolean))];
    this.db.prepare(`DELETE FROM user_allowed_providers WHERE user_id = ?`).run(userId);
    const insert = this.db.prepare(`INSERT INTO user_allowed_providers (user_id, provider_id) VALUES (?, ?)`);
    for (const providerId of unique) {
      insert.run(userId, providerId);
    }
    return unique;
  }

  public isProviderAllowed(userId: string, providerId: string, isAdmin: boolean): boolean {
    if (isAdmin) {
      return true;
    }
    const allowed = this.getAllowedProviders(userId);
    // Empty allow-list means no relay access for members (admin must assign).
    return allowed.includes(providerId);
  }

  public storeTotpSetup(userId: string, secret: string): void {
    this.db
      .prepare(
        `INSERT INTO totp_setup (user_id, secret, created_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET secret = excluded.secret, created_at = excluded.created_at`
      )
      .run(userId, secret, Date.now());
  }

  public takeTotpSetup(userId: string): string | null {
    const row = this.db.prepare(`SELECT secret FROM totp_setup WHERE user_id = ? LIMIT 1`).get(userId) as { secret: string } | undefined;
    if (!row) {
      return null;
    }
    this.db.prepare(`DELETE FROM totp_setup WHERE user_id = ?`).run(userId);
    return row.secret;
  }

  private ensureUserColumn(name: string, ddl: string): void {
    try {
      const cols = this.db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
      if (cols.some((col) => col.name === name)) {
        return;
      }
      this.db.exec(`ALTER TABLE users ADD COLUMN ${name} ${ddl}`);
    } catch {
      // users table may not exist yet; AuthStore.initialize creates it first.
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    this.db.prepare(`DELETE FROM captcha_challenges WHERE expires_at < ? OR used = 1`).run(now - 60_000);
    this.db.prepare(`DELETE FROM pending_logins WHERE expires_at < ?`).run(now);
  }
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function verifyTotpCode(secretBase32: string, code: string, window = 1): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) {
    return false;
  }
  const secret = base32Decode(secretBase32);
  if (!secret.length) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  const step = 30;
  const counter = Math.floor(now / step);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secret, counter + offset);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))) {
      return true;
    }
  }
  return false;
}

export function totpUri(secret: string, accountName: string, issuer = "Codex React UI"): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30"
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx < 0) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function renderCaptchaSvg(text: string): string {
  const noise: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const x1 = randomInt(0, 220);
    const y1 = randomInt(0, 72);
    const x2 = randomInt(0, 220);
    const y2 = randomInt(0, 72);
    noise.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-opacity="0.28" stroke-width="1">` +
        `<animate attributeName="x1" values="${x1};${x2};${x1}" dur="${2 + (i % 3)}s" repeatCount="indefinite"/>` +
        `<animate attributeName="y2" values="${y2};${y1};${y2}" dur="${2.4 + (i % 2)}s" repeatCount="indefinite"/>` +
      `</line>`
    );
  }
  for (let i = 0; i < 22; i += 1) {
    const cx = randomInt(6, 214);
    const cy = randomInt(6, 66);
    const r = randomInt(1, 3);
    const opacity = (0.15 + (i % 4) * 0.05).toFixed(2);
    noise.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#38bdf8" fill-opacity="${opacity}">` +
        `<animate attributeName="cy" values="${cy};${Math.max(4, cy - 10)};${cy}" dur="${1.6 + (i % 5) * 0.35}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0.25;0.7;0.25" dur="${1.2 + (i % 3) * 0.4}s" repeatCount="indefinite"/>` +
      `</circle>`
    );
  }
  const rotate = randomInt(-10, 10);
  const uid = randomBytes(3).toString("hex");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="72" viewBox="0 0 220 72" role="img" aria-label="captcha">
  <defs>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220">
        <animate attributeName="stop-color" values="#0b1220;#111827;#0b1220" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#1e293b">
        <animate attributeName="stop-color" values="#1e293b;#0f766e;#1e293b" dur="5s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <filter id="glow${uid}">
      <feGaussianBlur stdDeviation="1.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="220" height="72" rx="14" fill="url(#bg${uid})"/>
  <rect x="2" y="2" width="216" height="68" rx="12" fill="none" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="1.5">
    <animate attributeName="stroke-opacity" values="0.25;0.8;0.25" dur="2.2s" repeatCount="indefinite"/>
  </rect>
  ${noise.join("")}
  <text x="110" y="44" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" font-weight="900"
    fill="#f8fafc" stroke="#020617" stroke-width="0.7" paint-order="stroke fill" filter="url(#glow${uid})" transform="rotate(${rotate} 110 36)" letter-spacing="2">
    <animate attributeName="opacity" values="0.85;1;0.85" dur="1.5s" repeatCount="indefinite"/>
    ${escapeXml(text)}
  </text>
  <text x="110" y="44" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" font-weight="900"
    fill="#38bdf8" fill-opacity="0.22" transform="rotate(${rotate + 2} 112 38)" letter-spacing="2">${escapeXml(text)}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
