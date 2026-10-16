import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  readingPassages,
  speakingSessions,
  studyInboxItems,
  users,
  vocabularyWords,
  workspaces,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminTotalPages,
  normalizeAdminListParams,
} from "@/lib/admin/pagination";

export async function listAdminUsers(input: {
  q?: string | null;
  page?: string | number | null;
  role?: string | null;
  status?: string | null;
}) {
  await requireAdmin();
  const { q, page, pageSize, offset } = normalizeAdminListParams(input);

  const conditions = [];
  if (q) {
    conditions.push(
      or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)),
    );
  }
  if (input.role === "ADMIN" || input.role === "USER") {
    conditions.push(eq(users.role, input.role));
  }
  if (input.status === "suspended") {
    conditions.push(sql`${users.suspendedAt} is not null`);
  } else if (input.status === "active") {
    conditions.push(sql`${users.suspendedAt} is null`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        suspendedAt: users.suspendedAt,
        subscriptionPlan: users.subscriptionPlan,
        createdAt: users.createdAt,
        workspaceCount: sql<number>`(
          select count(*)::int from ${workspaces}
          where ${workspaces.userId} = ${users.id}
        )`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(users).where(where),
  ]);

  const total = Number(totalRow.value);
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: adminTotalPages(total, pageSize),
  };
}

export async function getAdminUserDetail(userId: string) {
  await requireAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspendedAt: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
      image: true,
      // Never select passwordHash
    },
  });
  if (!user) return null;

  const [
    [workspaceCount],
    [vocabCount],
    [theoryCount],
    [writingCount],
    [listeningCount],
    [readingCount],
    [speakingCount],
    [inboxCount],
    workspaceRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(workspaces)
      .where(eq(workspaces.userId, userId)),
    db
      .select({ value: count() })
      .from(vocabularyWords)
      .where(eq(vocabularyWords.userId, userId)),
    db
      .select({ value: count() })
      .from(grammarNotes)
      .where(eq(grammarNotes.userId, userId)),
    db
      .select({ value: count() })
      .from(exercises)
      .where(and(eq(exercises.userId, userId), eq(exercises.type, "WRITING"))),
    db
      .select({ value: count() })
      .from(listeningLessons)
      .where(eq(listeningLessons.userId, userId)),
    db
      .select({ value: count() })
      .from(readingPassages)
      .where(eq(readingPassages.userId, userId)),
    db
      .select({ value: count() })
      .from(speakingSessions)
      .where(eq(speakingSessions.userId, userId)),
    db
      .select({ value: count() })
      .from(studyInboxItems)
      .where(eq(studyInboxItems.userId, userId)),
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        language: workspaces.language,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .where(eq(workspaces.userId, userId))
      .orderBy(desc(workspaces.createdAt))
      .limit(50),
  ]);

  return {
    user,
    counts: {
      workspaces: Number(workspaceCount.value),
      vocabulary: Number(vocabCount.value),
      theory: Number(theoryCount.value),
      writing: Number(writingCount.value),
      listening: Number(listeningCount.value),
      reading: Number(readingCount.value),
      speaking: Number(speakingCount.value),
      inbox: Number(inboxCount.value),
    },
    workspaces: workspaceRows,
  };
}
