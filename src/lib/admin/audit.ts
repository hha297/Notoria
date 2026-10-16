import { db } from "@/db";
import { adminAuditEvents } from "@/db/schema";

export type AdminAuditInput = {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  targetUserId?: string | null;
  meta?: Record<string, unknown> | null;
  success?: boolean;
};

/** Persist an admin audit row. Call inside the same DB transaction when possible. */
export async function writeAdminAudit(
  input: AdminAuditInput,
  executor: Pick<typeof db, "insert"> = db,
) {
  const [row] = await executor
    .insert(adminAuditEvents)
    .values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      targetUserId: input.targetUserId ?? null,
      meta: input.meta ?? null,
      success: input.success ?? true,
    })
    .returning({ id: adminAuditEvents.id });
  return row;
}

/** Strip oversized / sensitive values before storing in audit meta. */
export function sanitizeAdminMeta(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("hash") ||
      lower.includes("transcript") ||
      lower.includes("content")
    ) {
      continue;
    }
    if (typeof value === "string" && value.length > 500) {
      out[key] = `${value.slice(0, 497)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}
