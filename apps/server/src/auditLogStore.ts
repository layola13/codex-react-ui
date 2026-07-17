import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DangerousPermissionAuditEvent, JsonValue } from "@codex-ui/shared";

export class AuditLogStore {
  private readonly dir = join(homedir(), ".codex-react-ui");
  private readonly file = join(this.dir, "audit-log.jsonl");

  public async recordDangerousPermission(method: string, params: JsonValue | undefined): Promise<DangerousPermissionAuditEvent | null> {
    if (method !== "thread/start" && method !== "turn/start") {
      return null;
    }
    const record = asRecord(params);
    const reasons = dangerousPermissionReasons(record);
    if (reasons.length === 0) {
      return null;
    }
    const event: DangerousPermissionAuditEvent = {
      id: randomUUID(),
      createdAt: Date.now(),
      method,
      severity: record.approvalPolicy === "never" ? "critical" : "warning",
      reasons,
      cwd: stringValue(record.cwd),
      threadId: stringValue(record.threadId),
      model: stringValue(record.model),
      approvalPolicy: stringValue(record.approvalPolicy),
      sandbox: stringValue(record.sandbox),
      sandboxPolicyType: sandboxPolicyType(record.sandboxPolicy),
      inputSummary: inputSummary(record.input)
    };
    await mkdir(this.dir, { recursive: true });
    await appendFile(this.file, `${JSON.stringify(event)}\n`, { mode: 0o600 });
    return event;
  }

  public async list(limit = 50): Promise<DangerousPermissionAuditEvent[]> {
    try {
      const raw = await readFile(this.file, "utf8");
      return raw
        .split(/\r?\n/)
        .filter(Boolean)
        .map(parseAuditLine)
        .filter(isAuditEvent)
        .slice(-limit)
        .reverse();
    } catch {
      return [];
    }
  }
}

function parseAuditLine(line: string): DangerousPermissionAuditEvent | null {
  try {
    return JSON.parse(line) as DangerousPermissionAuditEvent;
  } catch {
    return null;
  }
}

function dangerousPermissionReasons(record: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  if (record.approvalPolicy === "never") {
    reasons.push("approvalPolicy=never");
  }
  if (record.sandbox === "danger-full-access") {
    reasons.push("sandbox=danger-full-access");
  }
  if (sandboxPolicyType(record.sandboxPolicy) === "dangerFullAccess") {
    reasons.push("sandboxPolicy=dangerFullAccess");
  }
  return reasons;
}

function inputSummary(value: unknown): DangerousPermissionAuditEvent["inputSummary"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  let textItems = 0;
  let imageItems = 0;
  let mentionItems = 0;
  for (const item of value) {
    const record = asRecord(item);
    if (record.type === "text" || record.type === "input_text") {
      textItems += 1;
    }
    if (record.type === "localImage" || record.type === "input_image") {
      imageItems += 1;
    }
    if (record.type === "mention") {
      mentionItems += 1;
    }
  }
  return {
    items: value.length,
    textItems,
    imageItems,
    mentionItems
  };
}

function isAuditEvent(value: DangerousPermissionAuditEvent | null): value is DangerousPermissionAuditEvent {
  return (
    Boolean(value) &&
    typeof value?.id === "string" &&
    typeof value.createdAt === "number" &&
    (value.method === "thread/start" || value.method === "turn/start") &&
    (value.severity === "warning" || value.severity === "critical")
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sandboxPolicyType(value: unknown): string | undefined {
  return stringValue(asRecord(value).type);
}
