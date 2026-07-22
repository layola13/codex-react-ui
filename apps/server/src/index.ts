import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import type { Server, ServerWebSocket } from "bun";
import {
  type AuthUser,
  type ClientToServerMessage,
  type JsonRpcMessage,
  type JsonValue,
  type ProviderActivation,
  type ProviderConfig,
  type ServerToClientMessage
} from "@codex-ui/shared";
import { CodexBridge } from "./codexBridge.js";
import { LocalDatabase } from "./localDatabase.js";
import { ProviderStore } from "./providerStore.js";
import { AuditLogStore } from "./auditLogStore.js";
import { AuthStore } from "./authStore.js";
import {
  SecurityStore,
  generateTotpSecret,
  totpUri,
  verifyTotpCode
} from "./securityStore.js";
import {
  detectAll,
  installLaunchAdapters,
  writeEnvsOnly,
  testOpenAiApi,
  createInstallJob,
  getInstallJob,
  type InstallLaunchRequest,
  type LaunchEnvValues
} from "./launchInstall.js";
import {
  ENGINE_CATALOG,
  getEngineTranscript,
  isEngineId,
  listEngineHistory,
  type EngineId
} from "./engineHistory.js";
import { fetchProviderModels } from "./providerModels.js";

type SocketData = {
  user: AuthUser | null;
  token: string | null;
};

/** In-flight turns per user for concurrency enforcement. */
const activeTurnsByUser = new Map<string, Set<string>>();

function activeTurnCount(userId: string): number {
  return activeTurnsByUser.get(userId)?.size ?? 0;
}

function trackTurnStart(userId: string, turnKey: string): void {
  let set = activeTurnsByUser.get(userId);
  if (!set) {
    set = new Set();
    activeTurnsByUser.set(userId, set);
  }
  set.add(turnKey);
}

function trackTurnEnd(userId: string, turnKey: string): void {
  const set = activeTurnsByUser.get(userId);
  if (!set) return;
  set.delete(turnKey);
  if (set.size === 0) {
    activeTurnsByUser.delete(userId);
  }
}

function releaseAllTurnsForUser(userId: string): void {
  activeTurnsByUser.delete(userId);
}

function extractTurnKey(result: JsonValue, params: Record<string, unknown>): string | null {
  const record = asRecord(result);
  const turn = asRecord(record.turn);
  const turnId = stringValue(turn.id) ?? stringValue(record.turnId) ?? stringValue(record.id);
  const threadId = stringValue(params.threadId) ?? stringValue(asRecord(params.thread).id) ?? stringValue(turn.threadId);
  if (turnId) {
    return `turn:${turnId}`;
  }
  if (threadId) {
    return `thread:${threadId}:${Date.now()}`;
  }
  return null;
}


const PORT = Number(process.env.CODEX_UI_PORT ?? 43110);
const HOST = process.env.CODEX_UI_HOST ?? "127.0.0.1";
const sessionToken = process.env.CODEX_UI_TOKEN ?? randomBytes(24).toString("base64url");
const localDatabase = new LocalDatabase();
const providerStore = new ProviderStore(localDatabase);
const auditLogStore = new AuditLogStore(localDatabase);
const authStore = AuthStore.fromEnv(process.env, localDatabase);
const securityStore = new SecurityStore(localDatabase);
const bridge = new CodexBridge(() => providerStore.runtimeEnv());
const clients = new Set<ServerWebSocket<SocketData>>();

await providerStore.initialize();
await authStore?.initialize();
securityStore.initialize();

const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
const hasWebBuild = existsSync(join(webDist, "index.html"));
const webDistRoot = resolve(webDist);

bridge.on("status", (status) => {
  broadcast({ type: "engine.status", status });
});

bridge.on("message", (message: JsonRpcMessage) => {
  if ("method" in message && "id" in message) {
    // Server requests may need operator confirmation; fan out only to connected sessions.
    broadcast({ type: "codex.serverRequest", message });
  } else if ("method" in message) {
    routeCodexNotification(message);
  }
});

bridge.on("stderr", (message) => {
  console.warn("[codex]", message as string);
});

try {
  await bridge.start();
} catch (error) {
  console.warn("Codex app-server did not start during boot; UI can retry", error);
}

const server = Bun.serve<SocketData>({
  hostname: HOST,
  port: PORT,
  fetch: handleHttpRequest,
  websocket: {
    open(ws) {
      clients.add(ws);
      send(ws, { type: "engine.status", status: bridge.getStatus() });
    },
    async message(ws, raw) {
      try {
        const message = JSON.parse(raw.toString()) as ClientToServerMessage;
        await handleClientMessage(ws, message);
      } catch (error) {
        send(ws, {
          type: "server.error",
          message: errorToMessage(error)
        });
      }
    },
    close(ws) {
      clients.delete(ws);
      if (ws.data.user?.id) {
        releaseAllTurnsForUser(ws.data.user.id);
      }
    }
  }
});

console.info(
  authStore
    ? `Codex React UI listening at http://${HOST}:${PORT}/ with membership login enabled`
    : `Codex React UI listening at http://${HOST}:${PORT}/?token=${sessionToken}`
);

async function handleHttpRequest(request: Request, server: Server<SocketData>): Promise<Response | undefined> {
  const url = new URL(request.url);
  const headers = securityHeaders();

  try {
    if (url.pathname === "/ws") {
      const auth = await resolveAuth(request, url);
      if (!auth.ok) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      if (
        server.upgrade(request, {
          data: {
            user: auth.user,
            token: auth.token
          }
        })
      ) {
        return;
      }
      return jsonResponse({ error: "WebSocket upgrade failed" }, 400, headers);
    }

    if (url.pathname === "/api/session" && request.method === "GET") {
      if (authStore) {
        const token = bearerOrUiToken(request, url);
        const user = await authStore.getUserByToken(token);
        if (!user) {
          return jsonResponse({ authenticated: false, loginRequired: true, token: "", user: null }, 200, headers);
        }
        return jsonResponse({ authenticated: true, token, user }, 200, headers);
      }
      return jsonResponse({ authenticated: true, token: sessionToken, user: null }, 200, headers);
    }

    // Public auth config (registration / captcha / totp flags) — no auth required
    if (url.pathname === "/api/auth/config" && request.method === "GET") {
      if (!authStore) {
        return jsonResponse({ registrationEnabled: false, captchaEnabled: false, totpEnabled: false }, 200, headers);
      }
      return jsonResponse(securityStore.publicAuthConfig(), 200, headers);
    }

    if (url.pathname === "/api/auth/captcha" && request.method === "GET") {
      if (!authStore) {
        return jsonResponse({ error: "Auth disabled" }, 400, headers);
      }
      const captcha = securityStore.createCaptcha();
      const captchaHeaders = new Headers(headers);
      captchaHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      captchaHeaders.set("Pragma", "no-cache");
      captchaHeaders.set("Expires", "0");
      return jsonResponse(captcha, 200, captchaHeaders);
    }

    if (url.pathname === "/api/register" && request.method === "POST") {
      if (!authStore) {
        return jsonResponse({ error: "Auth disabled" }, 400, headers);
      }
      const settings = securityStore.getSettings();
      if (!settings.registrationEnabled) {
        return jsonResponse({ error: "Registration is closed" }, 403, headers);
      }
      const body = asRecord(await request.json().catch(() => ({})));
      if (settings.captchaEnabled) {
        const ok = securityStore.consumeCaptcha(stringValue(body.captchaId), stringValue(body.captchaAnswer));
        if (!ok) {
          return jsonResponse({ error: "Invalid captcha" }, 400, headers);
        }
      }
      try {
        const created = await authStore.createUser({
          email: stringValue(body.email) ?? "",
          password: stringValue(body.password) ?? "",
          username: stringValue(body.username),
          role: "user",
          status: "active",
          balance: settings.defaultMemberBalance,
          concurrency: settings.defaultMemberConcurrency,
          maxPermission: "workspaceAsk",
          allowWrite: true,
          allowNetwork: false,
          allowDangerBypass: false
        });
        return jsonResponse({ data: created }, 201, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      if (!authStore) {
        return jsonResponse({ token: sessionToken, user: null }, 200, headers);
      }
      const body = asRecord(await request.json().catch(() => ({})));
      const settings = securityStore.getSettings();
      if (settings.captchaEnabled) {
        const ok = securityStore.consumeCaptcha(stringValue(body.captchaId), stringValue(body.captchaAnswer));
        if (!ok) {
          return jsonResponse({ error: "Invalid captcha" }, 401, headers);
        }
      }
      const userRow = await authStore.verifyPassword(stringValue(body.email) ?? "", stringValue(body.password) ?? "");
      if (!userRow) {
        return jsonResponse({ error: "Invalid email or password" }, 401, headers);
      }
      const systemTotpOn = settings.totpEnabled;
      const userTotpOn = Boolean(userRow.totp_enabled) && Boolean(userRow.totp_secret);
      if (systemTotpOn && userTotpOn) {
        const pending = securityStore.createPendingLogin(userRow.id);
        return jsonResponse(
          {
            requires_2fa: true,
            pendingToken: pending.pendingToken,
            expiresAt: pending.expiresAt
          },
          200,
          headers
        );
      }
      if (systemTotpOn && settings.forceAdminTotp && userRow.role === "admin" && !userTotpOn) {
        // Still allow login, but client can prompt setup; do not block cold start.
      }
      const result = authStore.issueSessionForUser(userRow.id);
      return jsonResponse(result, 200, headers);
    }

    if (url.pathname === "/api/login/2fa" && request.method === "POST") {
      if (!authStore) {
        return jsonResponse({ error: "Auth disabled" }, 400, headers);
      }
      const body = asRecord(await request.json().catch(() => ({})));
      const pendingToken = stringValue(body.pendingToken) ?? "";
      const code = stringValue(body.totpCode) ?? stringValue(body.code) ?? "";
      const userId = securityStore.consumePendingLogin(pendingToken);
      if (!userId) {
        return jsonResponse({ error: "2FA session expired" }, 401, headers);
      }
      const secret = authStore.getTotpSecret(userId);
      if (!secret || !verifyTotpCode(secret, code)) {
        return jsonResponse({ error: "Invalid authenticator code" }, 401, headers);
      }
      const result = authStore.issueSessionForUser(userId);
      return jsonResponse(result, 200, headers);
    }

    if (url.pathname.startsWith("/api")) {
      const auth = await resolveAuth(request, url);
      if (!auth.ok) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      return await handleApiRequest(request, url, headers, auth.user);
    }

    return serveStatic(request, url, headers);
  } catch (error) {
    console.error("Request failed", error);
    return jsonResponse({ error: errorToMessage(error) }, 500, headers);
  }
}

async function handleApiRequest(
  request: Request,
  url: URL,
  headers: Headers,
  user: AuthUser | null
): Promise<Response> {
  const route = `${request.method} ${url.pathname}`;
  switch (route) {
    case "GET /api/health":
      return jsonResponse({ ok: true, status: bridge.getStatus(), auth: Boolean(authStore) }, 200, headers);
    case "GET /api/engine/status":
      return jsonResponse(bridge.getStatus(), 200, headers);
    case "POST /api/engine/start":
      return jsonResponse(await bridge.start(), 200, headers);
    case "GET /api/providers": {
      const data = await providerStore.list();
      if (user && user.role !== "admin") {
        const allowed = new Set(securityStore.getAllowedProviders(user.id));
        // Members only see relays assigned by admin; secrets masked.
        return jsonResponse({
          data: data
            .filter((provider) => allowed.has(provider.id))
            .map((provider) => ({
              ...provider,
              apiKeyPreview: provider.apiKeyPreview ? "••••" : undefined,
              apiKeyRef: provider.apiKeyRef ? "env:REDACTED" : undefined
            }))
        }, 200, headers);
      }
      return jsonResponse({ data }, 200, headers);
    }
    case "GET /api/profile/export": {
      if (user && user.role !== "admin") {
        return jsonResponse({ error: "Admin only: profile export" }, 403, headers);
      }
      return jsonResponse(await providerStore.exportProfile(), 200, headers);
    }
    case "POST /api/profile/import": {
      if (user && user.role !== "admin") {
        return jsonResponse({ error: "Admin only: profile import" }, 403, headers);
      }
      try {
        return jsonResponse(await providerStore.importProfile(await request.json()), 200, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }
    case "POST /api/provider/fetch-models": {
      // Mirror axonhub fetchModels: admin-only when membership is on.
      if (user && user.role !== "admin") {
        return jsonResponse({ error: "Admin only: fetch provider models" }, 403, headers);
      }
      try {
        const body = asRecord(await request.json().catch(() => ({})));
        const baseUrl = stringValue(body.baseUrl) ?? stringValue(body.baseURL) ?? "";
        const apiKey = stringValue(body.apiKey) ?? "";
        const kind = stringValue(body.kind) ?? stringValue(body.channelType) ?? "responsesRelay";
        const providerId = stringValue(body.providerId) ?? stringValue(body.channelID);

        let resolvedKey = apiKey;
        if (!resolvedKey && providerId) {
          const existing = await providerStore.get(providerId);
          if (existing) {
            const envKey = existing.apiKeyRef?.startsWith("env:") ? existing.apiKeyRef.slice(4) : null;
            const runtime = providerStore.runtimeEnv();
            if (envKey && runtime[envKey]) {
              resolvedKey = runtime[envKey] ?? "";
            }
          }
        }

        const result = await fetchProviderModels({
          baseUrl,
          apiKey: resolvedKey || undefined,
          kind
        });
        return jsonResponse(
          {
            models: result.models.map((id) => ({ id })),
            error: result.error ?? null,
            endpoint: result.endpoint
          },
          result.error && result.models.length === 0 ? 400 : 200,
          headers
        );
      } catch (error) {
        return jsonResponse({ models: [], error: errorToMessage(error) }, 400, headers);
      }
    }
    case "GET /api/audit/events": {
      if (user && user.role !== "admin") {
        return jsonResponse({ error: "Admin only: audit events" }, 403, headers);
      }
      return jsonResponse({ data: await auditLogStore.list() }, 200, headers);
    }
    case "GET /api/members": {
      if (!authStore) {
        return jsonResponse({ error: "Membership is disabled (CODEX_UI_AUTH=off)" }, 400, headers);
      }
      if (!user || user.role !== "admin") {
        return jsonResponse({ error: "Admin only" }, 403, headers);
      }
      const data = authStore.listUsers().map((member) => ({
        ...member,
        allowedProviderIds: securityStore.getAllowedProviders(member.id)
      }));
      return jsonResponse({ data }, 200, headers);
    }
    case "GET /api/admin/settings": {
      if (!authStore) {
        return jsonResponse({ error: "Membership is disabled" }, 400, headers);
      }
      if (!user || user.role !== "admin") {
        return jsonResponse({ error: "Admin only" }, 403, headers);
      }
      return jsonResponse({ data: securityStore.getSettings() }, 200, headers);
    }
    case "PATCH /api/admin/settings": {
      if (!authStore) {
        return jsonResponse({ error: "Membership is disabled" }, 400, headers);
      }
      if (!user || user.role !== "admin") {
        return jsonResponse({ error: "Admin only" }, 403, headers);
      }
      const body = asRecord(await request.json().catch(() => ({})));
      const updated = securityStore.updateSettings({
        registrationEnabled: typeof body.registrationEnabled === "boolean" ? body.registrationEnabled : undefined,
        captchaEnabled: typeof body.captchaEnabled === "boolean" ? body.captchaEnabled : undefined,
        totpEnabled: typeof body.totpEnabled === "boolean" ? body.totpEnabled : undefined,
        forceAdminTotp: typeof body.forceAdminTotp === "boolean" ? body.forceAdminTotp : undefined,
        defaultMemberBalance: numberValue(body.defaultMemberBalance),
        defaultMemberConcurrency: numberValue(body.defaultMemberConcurrency)
      });
      return jsonResponse({ data: updated }, 200, headers);
    }
    case "GET /api/totp/status": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      const settings = securityStore.getSettings();
      return jsonResponse(
        {
          systemEnabled: settings.totpEnabled,
          enabled: Boolean(user.totpEnabled),
          forceAdminTotp: settings.forceAdminTotp
        },
        200,
        headers
      );
    }
    case "POST /api/totp/setup": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      if (!securityStore.getSettings().totpEnabled) {
        return jsonResponse({ error: "TOTP is disabled by admin" }, 403, headers);
      }
      const secret = generateTotpSecret();
      securityStore.storeTotpSetup(user.id, secret);
      return jsonResponse(
        {
          secret,
          otpauthUrl: totpUri(secret, user.email),
          qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpUri(secret, user.email))}`
        },
        200,
        headers
      );
    }
    case "POST /api/totp/enable": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      const body = asRecord(await request.json().catch(() => ({})));
      const code = stringValue(body.totpCode) ?? stringValue(body.code) ?? "";
      const secret = securityStore.takeTotpSetup(user.id);
      if (!secret) {
        return jsonResponse({ error: "Run /api/totp/setup first" }, 400, headers);
      }
      if (!verifyTotpCode(secret, code)) {
        // put secret back if failed
        securityStore.storeTotpSetup(user.id, secret);
        return jsonResponse({ error: "Invalid authenticator code" }, 400, headers);
      }
      const updated = authStore.enableTotp(user.id, secret);
      return jsonResponse({ data: updated }, 200, headers);
    }
    case "POST /api/totp/disable": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      const body = asRecord(await request.json().catch(() => ({})));
      const code = stringValue(body.totpCode) ?? stringValue(body.code) ?? "";
      const password = stringValue(body.password) ?? "";
      const secret = authStore.getTotpSecret(user.id);
      if (secret) {
        if (!verifyTotpCode(secret, code)) {
          // allow password fallback
          const row = await authStore.verifyPassword(user.email, password);
          if (!row) {
            return jsonResponse({ error: "Invalid code or password" }, 400, headers);
          }
        }
      }
      const updated = authStore.disableTotp(user.id);
      return jsonResponse({ data: updated }, 200, headers);
    }
    case "POST /api/members": {
      if (!authStore) {
        return jsonResponse({ error: "Membership is disabled" }, 400, headers);
      }
      if (!user || user.role !== "admin") {
        return jsonResponse({ error: "Admin only" }, 403, headers);
      }
      try {
        const body = asRecord(await request.json().catch(() => ({})));
        const created = await authStore.createUser({
          email: stringValue(body.email) ?? "",
          password: stringValue(body.password) ?? "",
          username: stringValue(body.username),
          role: body.role === "admin" ? "admin" : "user",
          status: body.status === "disabled" ? "disabled" : "active",
          balance: numberValue(body.balance),
          concurrency: numberValue(body.concurrency),
          maxPermission:
            body.maxPermission === "readonlyAsk" ||
            body.maxPermission === "workspaceAsk" ||
            body.maxPermission === "fullAsk" ||
            body.maxPermission === "dangerBypass"
              ? body.maxPermission
              : undefined,
          allowWrite: typeof body.allowWrite === "boolean" ? body.allowWrite : undefined,
          allowNetwork: typeof body.allowNetwork === "boolean" ? body.allowNetwork : undefined,
          allowDangerBypass: typeof body.allowDangerBypass === "boolean" ? body.allowDangerBypass : undefined,
          notes: stringValue(body.notes)
        });
        let allowedProviderIds: string[] = [];
        if (Array.isArray(body.allowedProviderIds)) {
          allowedProviderIds = securityStore.setAllowedProviders(
            created.id,
            body.allowedProviderIds.filter((entry): entry is string => typeof entry === "string")
          );
        }
        return jsonResponse({ data: { ...created, allowedProviderIds } }, 201, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }

    case "GET /api/usage/summary": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      const daysRaw = Number(url.searchParams.get("days") ?? "7");
      const days = Number.isFinite(daysRaw) ? daysRaw : 7;
      const filterUserId = stringValue(url.searchParams.get("userId"));
      const isAdmin = user.role === "admin";
      if (filterUserId && !isAdmin && filterUserId !== user.id) {
        return jsonResponse({ error: "Forbidden" }, 403, headers);
      }
      if (!isAdmin) {
        const scoped = authStore.getUsageSummary({ userId: user.id, days, isAdmin: false });
        return jsonResponse({ data: scoped }, 200, headers);
      }
      const summary = authStore.getUsageSummary({
        userId: filterUserId ?? undefined,
        days,
        isAdmin: true
      });
      return jsonResponse({ data: summary }, 200, headers);
    }
    case "GET /api/usage/ledger": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      const limitRaw = Number(url.searchParams.get("limit") ?? "50");
      const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
      const filterUserId = stringValue(url.searchParams.get("userId"));
      if (user.role === "admin") {
        const data = authStore.listBalanceLedgerForAdmin(limit, filterUserId ?? undefined);
        return jsonResponse({ data }, 200, headers);
      }
      return jsonResponse({ data: authStore.listBalanceLedger(user.id, limit) }, 200, headers);
    }
    case "GET /api/me/ledger": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      const limitRaw = Number(url.searchParams.get("limit") ?? "50");
      const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
      return jsonResponse({ data: authStore.listBalanceLedger(user.id, limit) }, 200, headers);
    }
    case "POST /api/me/password": {
      if (!authStore || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, headers);
      }
      try {
        const body = asRecord(await request.json().catch(() => ({})));
        // Always require animated captcha for self-service password change.
        const captchaOk = securityStore.consumeCaptcha(stringValue(body.captchaId), stringValue(body.captchaAnswer));
        if (!captchaOk) {
          return jsonResponse({ error: "Invalid captcha" }, 401, headers);
        }
        const updated = await authStore.changeOwnPassword(
          user.id,
          stringValue(body.currentPassword) ?? stringValue(body.oldPassword) ?? "",
          stringValue(body.newPassword) ?? ""
        );
        return jsonResponse({ data: updated }, 200, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }
    case "GET /api/me": {
      if (!user) {
        return jsonResponse({ user: null }, 200, headers);
      }
      return jsonResponse({
        user: {
          ...user,
          allowedProviderIds: securityStore.getAllowedProviders(user.id)
        }
      }, 200, headers);
    }
    case "GET /api/engine-history": {
      const engineParam = url.searchParams.get("engine") || "all";
      const q = url.searchParams.get("q") || undefined;
      const limitRaw = url.searchParams.get("limit");
      const limit = limitRaw ? Number(limitRaw) : undefined;
      if (engineParam !== "all" && !isEngineId(engineParam)) {
        return jsonResponse({ error: `Unknown engine: ${engineParam}` }, 400, headers);
      }
      const data = listEngineHistory(engineParam as EngineId | "all", {
        q,
        limit: Number.isFinite(limit) ? limit : undefined
      });
      return jsonResponse(data, 200, headers);
    }
    case "GET /api/engine-history/engines": {
      return jsonResponse({ engines: ENGINE_CATALOG }, 200, headers);
    }
    case "GET /api/launch-adapters": {
      // Host-local install detection; any authenticated session (or token mode) may read.
      return jsonResponse(detectAll(), 200, headers);
    }
    case "GET /api/launch-adapters/job-status": {
      const jobId = url.searchParams.get("jobId");
      if (!jobId) {
        return jsonResponse({ error: "Missing jobId parameter" }, 400, headers);
      }
      const job = getInstallJob(jobId);
      if (!job) {
        return jsonResponse({ error: `Job not found: ${jobId}` }, 404, headers);
      }
      return jsonResponse(job, 200, headers);
    }
    case "POST /api/launch-adapters/install": {
      // Mutates host filesystem (git clone, install.sh, ~/.config/*-launch/.env).
      // Prefer admin when membership is on; allow any authed session in token-only mode.
      if (authStore && user && user.role !== "admin") {
        return jsonResponse({ error: "Admin only: install launch adapters on the host" }, 403, headers);
      }
      try {
        const body = asRecord(await request.json().catch(() => ({})));
        const ids = Array.isArray(body.ids)
          ? body.ids.filter((entry): entry is string => typeof entry === "string")
          : undefined;
        const envMode =
          body.envMode === "shared" || body.envMode === "separate" || body.envMode === "none"
            ? body.envMode
            : "none";
        const sharedEnv = parseLaunchEnv(body.sharedEnv);
        const separateEnv = parseSeparateLaunchEnv(body.separateEnv);
        const installRequest: InstallLaunchRequest = {
          ids,
          missingOnly: body.missingOnly === true || (!ids?.length && body.missingOnly !== false),
          skipCli: body.skipCli !== false,
          envMode,
          sharedEnv,
          separateEnv,
          forceEnv: body.forceEnv === true,
          sourceRoot: typeof body.sourceRoot === "string" ? body.sourceRoot : undefined,
          skipModelTest: body.skipModelTest === true
        };
        const jobId = createInstallJob(installRequest);
        return jsonResponse({ jobId, status: "running" }, 202, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }
    case "POST /api/launch-adapters/test-model": {
      try {
        const body = asRecord(await request.json().catch(() => ({})));
        const values = parseLaunchEnv(body);
        if (!values) {
          return jsonResponse({ ok: false, message: "Missing baseUrl / model / apiKey" }, 400, headers);
        }
        const result = await testOpenAiApi(values);
        return jsonResponse(result, result.ok ? 200 : 400, headers);
      } catch (error) {
        return jsonResponse({ ok: false, message: errorToMessage(error) }, 400, headers);
      }
    }
    case "POST /api/launch-adapters/env": {
      if (authStore && user && user.role !== "admin") {
        return jsonResponse({ error: "Admin only: write launch adapter .env" }, 403, headers);
      }
      try {
        const body = asRecord(await request.json().catch(() => ({})));
        const mode = body.mode === "separate" ? "separate" : "shared";
        const ids = Array.isArray(body.ids)
          ? body.ids.filter((entry): entry is string => typeof entry === "string")
          : undefined;
        const result = await writeEnvsOnly(
          mode,
          parseLaunchEnv(body.sharedEnv),
          parseSeparateLaunchEnv(body.separateEnv),
          ids,
          body.force === true
        );
        return jsonResponse({ ...result, adapters: detectAll().adapters }, 200, headers);
      } catch (error) {
        return jsonResponse({ error: errorToMessage(error) }, 400, headers);
      }
    }
    default: {
      // GET /api/engine-history/:engine/:id — read-only transcript
      const engineHistMatch = url.pathname.match(/^\/api\/engine-history\/([^/]+)\/([^/]+)$/);
      if (engineHistMatch && request.method === "GET") {
        const engine = decodeURIComponent(engineHistMatch[1] ?? "");
        const id = decodeURIComponent(engineHistMatch[2] ?? "");
        if (!isEngineId(engine)) {
          return jsonResponse({ error: `Unknown engine: ${engine}` }, 400, headers);
        }
        if (!id) {
          return jsonResponse({ error: "Missing history id" }, 400, headers);
        }
        const transcript = getEngineTranscript(engine, id);
        if (!transcript) {
          return jsonResponse({ error: "Transcript not found" }, 404, headers);
        }
        return jsonResponse(transcript, 200, headers);
      }
      // POST /api/members/:id/balance  admin allocate credit
      const balanceMatch = url.pathname.match(/^\/api\/members\/([^/]+)\/balance$/);
      if (balanceMatch && request.method === "POST" && authStore) {
        if (!user || user.role !== "admin") {
          return jsonResponse({ error: "Admin only" }, 403, headers);
        }
        try {
          const memberId = decodeURIComponent(balanceMatch[1] ?? "");
          const body = asRecord(await request.json().catch(() => ({})));
          const operation = body.operation === "set" || body.operation === "add" || body.operation === "subtract" ? body.operation : "add";
          const amount = numberValue(body.amount) ?? numberValue(body.balance);
          if (amount === undefined) {
            return jsonResponse({ error: "amount is required" }, 400, headers);
          }
          const updated = authStore.adjustBalance(memberId, amount, operation, stringValue(body.notes) ?? "");
          return jsonResponse({ data: updated }, 200, headers);
        } catch (error) {
          return jsonResponse({ error: errorToMessage(error) }, 400, headers);
        }
      }
      const memberMatch = url.pathname.match(/^\/api\/members\/([^/]+)$/);
      if (memberMatch && authStore) {
        if (!user || user.role !== "admin") {
          return jsonResponse({ error: "Admin only" }, 403, headers);
        }
        const memberId = decodeURIComponent(memberMatch[1] ?? "");
        if (request.method === "PATCH") {
          try {
            const body = asRecord(await request.json().catch(() => ({})));
            const updated = await authStore.updateUser(memberId, {
              email: stringValue(body.email),
              username: stringValue(body.username),
              role: body.role === "admin" || body.role === "user" ? body.role : undefined,
              status: body.status === "active" || body.status === "disabled" ? body.status : undefined,
              balance: numberValue(body.balance),
              concurrency: numberValue(body.concurrency),
              maxPermission:
                body.maxPermission === "readonlyAsk" ||
                body.maxPermission === "workspaceAsk" ||
                body.maxPermission === "fullAsk" ||
                body.maxPermission === "dangerBypass"
                  ? body.maxPermission
                  : undefined,
              allowWrite: typeof body.allowWrite === "boolean" ? body.allowWrite : undefined,
              allowNetwork: typeof body.allowNetwork === "boolean" ? body.allowNetwork : undefined,
              allowDangerBypass: typeof body.allowDangerBypass === "boolean" ? body.allowDangerBypass : undefined,
              notes: stringValue(body.notes),
              password: stringValue(body.password)
            });
            let allowedProviderIds = securityStore.getAllowedProviders(memberId);
            if (Array.isArray(body.allowedProviderIds)) {
              allowedProviderIds = securityStore.setAllowedProviders(
                memberId,
                body.allowedProviderIds.filter((entry): entry is string => typeof entry === "string")
              );
            }
            return jsonResponse({ data: { ...updated, allowedProviderIds } }, 200, headers);
          } catch (error) {
            return jsonResponse({ error: errorToMessage(error) }, 400, headers);
          }
        }
        if (request.method === "DELETE") {
          try {
            authStore.softDeleteUser(memberId);
            return jsonResponse({ ok: true }, 200, headers);
          } catch (error) {
            return jsonResponse({ error: errorToMessage(error) }, 400, headers);
          }
        }
      }
      return jsonResponse({ error: "Not found" }, 404, headers);
    }
  }
}

function serveStatic(request: Request, url: URL, headers: Headers): Response {
  if (!hasWebBuild || (request.method !== "GET" && request.method !== "HEAD")) {
    return jsonResponse({ error: "Not found" }, 404, headers);
  }

  const path = decodeURIComponent(url.pathname);
  const normalized = resolve(webDistRoot, `.${path === "/" ? "/index.html" : path}`);
  const isInsideWebDist = normalized === webDistRoot || normalized.startsWith(`${webDistRoot}${sep}`);
  const fileToServe = isInsideWebDist && existsSync(normalized) && statSync(normalized).isFile()
    ? Bun.file(normalized)
    : Bun.file(join(webDistRoot, "index.html"));

  const responseHeaders = new Headers(headers);
  if (fileToServe.type) {
    responseHeaders.set("Content-Type", fileToServe.type);
  } else if (normalized.endsWith(".js")) {
    responseHeaders.set("Content-Type", "application/javascript; charset=utf-8");
  } else if (normalized.endsWith(".css")) {
    responseHeaders.set("Content-Type", "text/css; charset=utf-8");
  } else if (normalized.endsWith(".html")) {
    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  }

  return new Response(request.method === "HEAD" ? null : fileToServe, { headers: responseHeaders });
}

async function resolveAuth(
  request: Request,
  url: URL
): Promise<{ ok: true; user: AuthUser | null; token: string | null } | { ok: false }> {
  if (authStore) {
    const token = bearerOrUiToken(request, url);
    const user = await authStore.getUserByToken(token);
    if (!user) {
      return { ok: false };
    }
    return { ok: true, user, token };
  }
  const queryToken = url.searchParams.get("token");
  const headerToken = request.headers.get("x-codex-ui-token");
  const token = headerToken ?? queryToken;
  if (token !== sessionToken) {
    return { ok: false };
  }
  return { ok: true, user: null, token };
}

function bearerOrUiToken(request: Request, url: URL): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }
  return request.headers.get("x-codex-ui-token") ?? url.searchParams.get("token");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseLaunchEnv(value: unknown): LaunchEnvValues | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const out: LaunchEnvValues = {};
  if (typeof record.baseUrl === "string") out.baseUrl = record.baseUrl;
  if (typeof record.model === "string") out.model = record.model;
  if (typeof record.apiKey === "string") out.apiKey = record.apiKey;
  return out;
}

function parseSeparateLaunchEnv(value: unknown): Record<string, LaunchEnvValues> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const out: Record<string, LaunchEnvValues> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const parsed = parseLaunchEnv(entry);
    if (parsed) {
      out[key] = parsed;
    }
  }
  return out;
}

function jsonResponse(value: unknown, status = 200, headers = securityHeaders()): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers: responseHeaders });
}

function securityHeaders(): Headers {
  return new Headers({
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff"
  });
}

async function handleClientMessage(ws: ServerWebSocket<SocketData>, message: ClientToServerMessage): Promise<void> {
  switch (message.type) {
    case "rpc": {
      try {
        const user = ws.data.user;
        let params = message.params;
        if (authStore && user) {
          // Full member policy: config writes admin-only, workspace paths clamped, permission caps.
          params = authStore.enforceMemberRpc(user, message.method, message.params) as JsonValue;
          if (message.method === "turn/start") {
            authStore.assertCanStartTurn(user);
          }
          if (message.method === "turn/start" || message.method === "thread/resume" || message.method === "thread/read" || message.method === "thread/archive" || message.method === "thread/delete" || message.method === "thread/name/set" || message.method === "thread/goal/set" || message.method === "thread/goal/get" || message.method === "thread/goal/clear") {
            const threadId = stringValue(asRecord(params).threadId);
            if (threadId && !authStore.ownsThread(threadId, user.id) && user.role !== "admin") {
              throw new Error("Thread belongs to another member");
            }
          }
          // fs write only if allowWrite and within workspace (path already checked in enforceMemberRpc)
          if (message.method === "fs/writeFile" && user.role !== "admin" && !user.allowWrite) {
            throw new Error("Member policy forbids filesystem writes");
          }
        }

        try {
          await auditLogStore.recordDangerousPermission(message.method, params);
        } catch (error) {
          console.warn("Failed to write dangerous permission audit event", { error, method: message.method });
        }

        // Concurrency + balance gates before starting a turn (admins still tracked but high limit).
        if (authStore && user && message.method === "turn/start") {
          // Refresh user from DB so admin concurrency edits apply immediately.
          const fresh = authStore.getUser(user.id) ?? user;
          ws.data.user = fresh;
          const limit = authStore.getConcurrencyLimit(fresh.id);
          const inFlight = activeTurnCount(fresh.id);
          if (inFlight >= limit) {
            throw new Error(`Concurrency limit reached (${inFlight}/${limit}). Wait for a turn to finish or ask admin to raise concurrency.`);
          }
          if (fresh.role !== "admin") {
            // Pre-check balance so we do not start a turn that cannot be paid.
            const bal = Number(fresh.balance);
            if (!(bal > 0)) {
              throw new Error("Insufficient balance. Ask an admin to allocate credit.");
            }
          }
        }

        let result = await bridge.request(message.method, params);

        if (authStore && user) {
          if (message.method === "thread/start") {
            const threadId = extractThreadId(result);
            if (threadId) {
              authStore.claimThread(threadId, user.id);
            }
          }
          if (message.method === "thread/list") {
            result = authStore.filterThreadsForUser(user, result) as JsonValue;
          }
          if (message.method === "turn/start") {
            const turnKey = extractTurnKey(result, asRecord(params));
            if (turnKey) {
              trackTurnStart(user.id, turnKey);
              // Also index by thread for notifications that only carry threadId.
              const threadId = stringValue(asRecord(params).threadId);
              if (threadId) {
                trackTurnStart(user.id, `thread-active:${threadId}`);
              }
            }
            if (user.role !== "admin") {
              try {
                const cost = 0.01; // base unit per turn; refine with token usage later
                const updated = authStore.debitBalance(user.id, cost, {
                  reason: "turn/start",
                  threadId: stringValue(asRecord(params).threadId) ?? "",
                  method: message.method
                });
                ws.data.user = updated;
              } catch (error) {
                console.warn("Balance debit failed after turn/start", error);
              }
            }
          }
        }

        send(ws, { type: "rpc.result", id: message.id, result });
      } catch (error) {
        send(ws, {
          type: "rpc.error",
          id: message.id,
          error: {
            message: errorToMessage(error)
          }
        });
      }
      return;
    }
    case "serverResponse": {
      bridge.respond(message.requestId, message.result, message.error);
      return;
    }
    case "provider.save": {
      if (ws.data.user && ws.data.user.role !== "admin") {
        send(ws, { type: "server.error", message: "Admin only: provider management" });
        return;
      }
      const provider = await providerStore.save(message.provider, message.apiKey);
      send(ws, { type: "provider.saved", id: message.id, provider });
      return;
    }
    case "provider.delete": {
      if (ws.data.user && ws.data.user.role !== "admin") {
        send(ws, { type: "server.error", message: "Admin only: provider management" });
        return;
      }
      await providerStore.delete(message.providerId);
      send(ws, { type: "provider.deleted", id: message.id, providerId: message.providerId });
      return;
    }
    case "provider.activate": {
      try {
        const actor = ws.data.user;
        if (actor && actor.role !== "admin") {
          if (!securityStore.isProviderAllowed(actor.id, message.providerId, false)) {
            send(ws, { type: "server.error", message: "Relay not assigned to this member" });
            return;
          }
        }
        const activation = await activateProvider(message.providerId, message.model);
        send(ws, { type: "provider.activated", id: message.id, activation });
      } catch (error) {
        send(ws, {
          type: "server.error",
          message: errorToMessage(error)
        });
      }
      return;
    }
  }
}

function extractThreadId(result: JsonValue): string | null {
  const record = asRecord(result);
  const thread = asRecord(record.thread);
  const id = stringValue(thread.id) ?? stringValue(record.id) ?? stringValue(record.threadId);
  return id ?? null;
}

function routeCodexNotification(message: JsonRpcMessage & { method: string; params?: JsonValue }): void {
  const params = asRecord(message.params);
  const threadId =
    stringValue(params.threadId) ??
    stringValue(asRecord(params.thread).id) ??
    stringValue(asRecord(params.turn).threadId);
  const turnId =
    stringValue(asRecord(params.turn).id) ??
    stringValue(params.turnId) ??
    stringValue(params.id);

  // Free concurrency slots when turns complete / fail / are interrupted.
  const method = message.method;
  const isTerminal =
    method.includes("turn/completed") ||
    method.includes("turn/failed") ||
    method.includes("turn/interrupted") ||
    method.endsWith("turn/complete") ||
    method.endsWith("turn/error") ||
    method === "turn/completed" ||
    method === "turn/failed";
  if (isTerminal && authStore) {
    for (const client of clients) {
      const user = client.data.user;
      if (!user) continue;
      if (threadId && (user.role === "admin" || authStore.ownsThread(threadId, user.id))) {
        if (turnId) trackTurnEnd(user.id, `turn:${turnId}`);
        if (threadId) trackTurnEnd(user.id, `thread-active:${threadId}`);
      }
    }
  }

  if (!authStore || !threadId) {
    broadcast({ type: "codex.notification", message });
    return;
  }

  for (const client of clients) {
    const user = client.data.user;
    if (!user) {
      send(client, { type: "codex.notification", message });
      continue;
    }
    if (user.role === "admin" || authStore.ownsThread(threadId, user.id)) {
      send(client, { type: "codex.notification", message });
    }
  }
}

async function activateProvider(providerId: string, model?: string): Promise<ProviderActivation> {
  const provider = await providerStore.get(providerId);
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  await bridge.start();

  const modelProvider = provider.kind === "chatgpt" ? "openai" : provider.id;
  const selectedModel = resolveProviderModel(provider, model || provider.defaultModel || provider.nativeModels[0]);
  const edits: Array<{ keyPath: string; value: JsonValue; mergeStrategy: "replace" }> = [];

  if (provider.kind !== "chatgpt") {
    edits.push({
      keyPath: `model_providers.${provider.id}`,
      value: providerToCodexConfig(provider),
      mergeStrategy: "replace"
    });
  }

  edits.push({ keyPath: "model_provider", value: modelProvider, mergeStrategy: "replace" });
  if (selectedModel) {
    edits.push({ keyPath: "model", value: selectedModel, mergeStrategy: "replace" });
  }

  await bridge.request("config/batchWrite", {
    edits,
    reloadUserConfig: true
  });
  await bridge.restart();

  return {
    providerId: provider.id,
    modelProvider,
    model: selectedModel,
    restartedAt: Date.now()
  };
}

function resolveProviderModel(provider: ProviderConfig, selectedModel?: string): string | undefined {
  if (!selectedModel) {
    return undefined;
  }
  let model = selectedModel;
  const seen = new Set<string>();
  for (let index = 0; index < 8; index += 1) {
    if (seen.has(model)) {
      return model;
    }
    seen.add(model);
    const next = provider.modelAliases.find((entry) => entry.alias === model)?.model;
    if (!next || next === model) {
      return model;
    }
    model = next;
  }
  return model;
}

function providerToCodexConfig(provider: ProviderConfig): JsonValue {
  const config: Record<string, JsonValue> = {
    name: provider.name,
    wire_api: "responses",
    supports_websockets: false
  };
  if (provider.baseUrl) {
    config.base_url = provider.baseUrl;
  }
  if (provider.apiKeyRef?.startsWith("env:")) {
    config.env_key = provider.apiKeyRef.slice("env:".length);
  }
  return config;
}

function send(ws: ServerWebSocket<SocketData>, message: ServerToClientMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    clients.delete(ws);
  }
}

function broadcast(message: ServerToClientMessage): void {
  for (const client of clients) {
    send(client, message);
  }
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "reason"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    try {
      return JSON.stringify(record);
    } catch {
      return String(error);
    }
  }
  return String(error);
}
