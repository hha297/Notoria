import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import {
  adminTotalPages,
  normalizeAdminListParams,
} from "@/lib/admin/pagination";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function listAdminWorkspaces(input: {
  q?: string | null;
  page?: string | number | null;
  userId?: string | null;
}) {
  await requireAdmin();
  const { q, page, pageSize, offset } = normalizeAdminListParams(input);

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(workspaces.name, `%${q}%`),
        ilike(workspaces.language, `%${q}%`),
        ilike(users.email, `%${q}%`),
      ),
    );
  }
  if (input.userId) {
    conditions.push(eq(workspaces.userId, input.userId));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        language: workspaces.language,
        userId: workspaces.userId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(workspaces)
      .innerJoin(users, eq(workspaces.userId, users.id))
      .where(where)
      .orderBy(desc(workspaces.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(workspaces)
      .innerJoin(users, eq(workspaces.userId, users.id))
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

export async function getAdminWorkspaceDetail(workspaceId: string) {
  await requireAdmin();
  const [row] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      language: workspaces.language,
      userId: workspaces.userId,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(workspaces)
    .innerJoin(users, eq(workspaces.userId, users.id))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return row ?? null;
}
