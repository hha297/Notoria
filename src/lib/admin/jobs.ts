import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  aiJobLocks,
  exerciseImports,
  listeningLessons,
  users,
  workspaces,
} from "@/db/schema";
import {
  adminTotalPages,
  normalizeAdminListParams,
} from "@/lib/admin/pagination";
import { requireAdmin } from "@/lib/auth/require-admin";

export type AdminJobKind = "ai_lock" | "listening" | "exercise_import";

export type AdminJobRow = {
  id: string;
  kind: AdminJobKind;
  title: string;
  status: string;
  errorCode: string | null;
  userId: string | null;
  workspaceId: string | null;
  ownerEmail: string | null;
  workspaceName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Failed / running background jobs for /admin/jobs.
 * Metadata only — no transcripts, extracted text, or provider payloads.
 */
export async function listAdminJobs(input: {
  q?: string | null;
  page?: string | number | null;
  kind?: string | null;
}) {
  await requireAdmin();
  const { q, page, pageSize, offset } = normalizeAdminListParams(input);
  const kindFilter =
    input.kind === "ai_lock" ||
    input.kind === "listening" ||
    input.kind === "exercise_import"
      ? input.kind
      : null;

  const [lockRows, listeningRows, importRows] = await Promise.all([
    kindFilter && kindFilter !== "ai_lock"
      ? Promise.resolve([] as AdminJobRow[])
      : loadAiLocks(q),
    kindFilter && kindFilter !== "listening"
      ? Promise.resolve([] as AdminJobRow[])
      : loadFailedListening(q),
    kindFilter && kindFilter !== "exercise_import"
      ? Promise.resolve([] as AdminJobRow[])
      : loadFailedImports(q),
  ]);

  const merged = [...lockRows, ...listeningRows, ...importRows].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  const total = merged.length;
  const rows = merged.slice(offset, offset + pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: adminTotalPages(total, pageSize),
  };
}

async function loadAiLocks(q: string): Promise<AdminJobRow[]> {
  const conditions = [inArray(aiJobLocks.status, ["running", "failed"])];
  if (q) {
    conditions.push(
      or(
        ilike(aiJobLocks.operation, `%${q}%`),
        ilike(aiJobLocks.subjectId, `%${q}%`),
        ilike(aiJobLocks.ownerId, `%${q}%`),
      )!,
    );
  }
  const rows = await db
    .select({
      id: aiJobLocks.id,
      title: aiJobLocks.operation,
      status: aiJobLocks.status,
      subjectId: aiJobLocks.subjectId,
      createdAt: aiJobLocks.createdAt,
      updatedAt: aiJobLocks.updatedAt,
    })
    .from(aiJobLocks)
    .where(and(...conditions))
    .orderBy(desc(aiJobLocks.updatedAt))
    .limit(500);

  return rows.map((row) => ({
    id: row.id,
    kind: "ai_lock" as const,
    title: row.title,
    status: row.status,
    errorCode: null,
    userId: null,
    workspaceId: null,
    ownerEmail: null,
    workspaceName: row.subjectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function loadFailedListening(q: string): Promise<AdminJobRow[]> {
  const conditions = [eq(listeningLessons.status, "FAILED")];
  if (q) {
    conditions.push(
      or(
        ilike(listeningLessons.title, `%${q}%`),
        ilike(listeningLessons.errorCode, `%${q}%`),
        ilike(users.email, `%${q}%`),
      )!,
    );
  }
  const rows = await db
    .select({
      id: listeningLessons.id,
      title: listeningLessons.title,
      status: listeningLessons.status,
      errorCode: listeningLessons.errorCode,
      userId: listeningLessons.userId,
      workspaceId: listeningLessons.workspaceId,
      ownerEmail: users.email,
      workspaceName: workspaces.name,
      createdAt: listeningLessons.createdAt,
      updatedAt: listeningLessons.updatedAt,
    })
    .from(listeningLessons)
    .innerJoin(users, eq(listeningLessons.userId, users.id))
    .innerJoin(workspaces, eq(listeningLessons.workspaceId, workspaces.id))
    .where(and(...conditions))
    .orderBy(desc(listeningLessons.updatedAt))
    .limit(500);

  return rows.map((row) => ({
    id: row.id,
    kind: "listening" as const,
    title: row.title,
    status: row.status,
    errorCode: row.errorCode,
    userId: row.userId,
    workspaceId: row.workspaceId,
    ownerEmail: row.ownerEmail,
    workspaceName: row.workspaceName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function loadFailedImports(q: string): Promise<AdminJobRow[]> {
  const conditions = [eq(exerciseImports.status, "FAILED")];
  if (q) {
    conditions.push(
      or(
        ilike(exerciseImports.title, `%${q}%`),
        ilike(exerciseImports.errorCode, `%${q}%`),
        ilike(users.email, `%${q}%`),
      )!,
    );
  }
  const rows = await db
    .select({
      id: exerciseImports.id,
      title: exerciseImports.title,
      status: exerciseImports.status,
      errorCode: exerciseImports.errorCode,
      userId: exerciseImports.userId,
      workspaceId: exerciseImports.workspaceId,
      ownerEmail: users.email,
      workspaceName: workspaces.name,
      createdAt: exerciseImports.createdAt,
      updatedAt: exerciseImports.updatedAt,
    })
    .from(exerciseImports)
    .innerJoin(users, eq(exerciseImports.userId, users.id))
    .innerJoin(workspaces, eq(exerciseImports.workspaceId, workspaces.id))
    .where(and(...conditions))
    .orderBy(desc(exerciseImports.updatedAt))
    .limit(500);

  return rows.map((row) => ({
    id: row.id,
    kind: "exercise_import" as const,
    title: row.title,
    status: row.status,
    errorCode: row.errorCode,
    userId: row.userId,
    workspaceId: row.workspaceId,
    ownerEmail: row.ownerEmail,
    workspaceName: row.workspaceName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** Counts for overview chips — avoids loading row payloads. */
export async function countAdminJobBuckets() {
  await requireAdmin();
  const [[runningLocks], [failedLocks], [failedListening], [failedImports]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(aiJobLocks)
        .where(eq(aiJobLocks.status, "running")),
      db
        .select({ value: count() })
        .from(aiJobLocks)
        .where(eq(aiJobLocks.status, "failed")),
      db
        .select({ value: count() })
        .from(listeningLessons)
        .where(eq(listeningLessons.status, "FAILED")),
      db
        .select({ value: count() })
        .from(exerciseImports)
        .where(eq(exerciseImports.status, "FAILED")),
    ]);

  return {
    runningLocks: Number(runningLocks.value),
    failedLocks: Number(failedLocks.value),
    failedListening: Number(failedListening.value),
    failedImports: Number(failedImports.value),
  };
}
