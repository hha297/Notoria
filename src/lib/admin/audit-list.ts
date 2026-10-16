import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditEvents, users } from "@/db/schema";
import {
  adminTotalPages,
  normalizeAdminListParams,
} from "@/lib/admin/pagination";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function listAdminAuditEvents(input: {
  q?: string | null;
  page?: string | number | null;
}) {
  await requireAdmin();
  const { q, page, pageSize, offset } = normalizeAdminListParams(input);

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(adminAuditEvents.action, `%${q}%`),
        ilike(adminAuditEvents.entityType, `%${q}%`),
        ilike(adminAuditEvents.entityId, `%${q}%`),
        ilike(users.email, `%${q}%`),
      ),
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: adminAuditEvents.id,
        actorUserId: adminAuditEvents.actorUserId,
        action: adminAuditEvents.action,
        entityType: adminAuditEvents.entityType,
        entityId: adminAuditEvents.entityId,
        targetUserId: adminAuditEvents.targetUserId,
        success: adminAuditEvents.success,
        meta: adminAuditEvents.meta,
        createdAt: adminAuditEvents.createdAt,
        actorEmail: users.email,
      })
      .from(adminAuditEvents)
      .leftJoin(users, eq(adminAuditEvents.actorUserId, users.id))
      .where(where)
      .orderBy(desc(adminAuditEvents.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(adminAuditEvents)
      .leftJoin(users, eq(adminAuditEvents.actorUserId, users.id))
      .where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: adminTotalPages(total, pageSize),
  };
}
