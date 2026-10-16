import { and, count, eq, isNull, ne } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";

type AdminTx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

type DbLike = typeof db | AdminTx;

/** Active = role ADMIN and not suspended. */
export async function countActiveAdmins(
  excludeUserId?: string,
  executor: DbLike = db,
) {
  const conditions = [eq(users.role, "ADMIN"), isNull(users.suspendedAt)];
  if (excludeUserId) {
    conditions.push(ne(users.id, excludeUserId));
  }
  const [row] = await executor
    .select({ value: count() })
    .from(users)
    .where(and(...conditions));
  return Number(row?.value ?? 0);
}

/**
 * Throws LAST_ADMIN if the target is the sole active admin.
 * Pass the surrounding transaction when mutating so the check is locked.
 */
export async function assertNotLastActiveAdmin(
  targetUserId: string,
  executor: DbLike = db,
): Promise<void> {
  const [target] = await executor
    .select({
      id: users.id,
      role: users.role,
      suspendedAt: users.suspendedAt,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .for("update");

  if (!target) {
    throw new Error("USER_NOT_FOUND");
  }

  const isActiveAdmin = target.role === "ADMIN" && !target.suspendedAt;
  if (!isActiveAdmin) return;

  const others = await countActiveAdmins(targetUserId, executor);
  if (others === 0) {
    throw new Error("LAST_ADMIN");
  }
}
