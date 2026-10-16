import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
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
  workspaceFolders,
  workspaces,
  type FolderSection,
  type ListeningStatus,
  type SpeakingStatus,
  type StudyInboxStatus,
  type VocabularyStatus,
} from "@/db/schema";
import type { AdminContentModule } from "@/lib/admin/content-modules";
import {
  adminTotalPages,
  normalizeAdminListParams,
} from "@/lib/admin/pagination";
import { requireAdmin } from "@/lib/auth/require-admin";

export {
  ADMIN_CONTENT_MODULES,
  isAdminContentModule,
  type AdminContentModule,
} from "@/lib/admin/content-modules";

type ListInput = {
  q?: string | null;
  page?: string | number | null;
  userId?: string | null;
  workspaceId?: string | null;
  status?: string | null;
};

export async function listAdminContent(
  module: AdminContentModule,
  input: ListInput,
) {
  await requireAdmin();
  const { q, page, pageSize, offset } = normalizeAdminListParams(input);

  if (module === "vocabulary") {
    const conditions: SQL[] = [];
    if (q) conditions.push(ilike(vocabularyWords.word, `%${q}%`));
    if (input.userId) conditions.push(eq(vocabularyWords.userId, input.userId));
    if (input.workspaceId) {
      conditions.push(eq(vocabularyWords.workspaceId, input.workspaceId));
    }
    if (input.status) {
      conditions.push(
        eq(vocabularyWords.status, input.status as VocabularyStatus),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: vocabularyWords.id,
          title: vocabularyWords.word,
          status: vocabularyWords.status,
          userId: vocabularyWords.userId,
          workspaceId: vocabularyWords.workspaceId,
          createdAt: vocabularyWords.createdAt,
          updatedAt: vocabularyWords.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(vocabularyWords)
        .innerJoin(users, eq(vocabularyWords.userId, users.id))
        .innerJoin(workspaces, eq(vocabularyWords.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(vocabularyWords.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(vocabularyWords).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  if (module === "theory") {
    const conditions: SQL[] = [];
    if (q) conditions.push(ilike(grammarNotes.title, `%${q}%`));
    if (input.userId) conditions.push(eq(grammarNotes.userId, input.userId));
    if (input.workspaceId) {
      conditions.push(eq(grammarNotes.workspaceId, input.workspaceId));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: grammarNotes.id,
          title: grammarNotes.title,
          userId: grammarNotes.userId,
          workspaceId: grammarNotes.workspaceId,
          createdAt: grammarNotes.createdAt,
          updatedAt: grammarNotes.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(grammarNotes)
        .innerJoin(users, eq(grammarNotes.userId, users.id))
        .innerJoin(workspaces, eq(grammarNotes.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(grammarNotes.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(grammarNotes).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  if (module === "writing" || module === "exercises") {
    const conditions: SQL[] = [
      module === "writing"
        ? eq(exercises.type, "WRITING")
        : sql`${exercises.type} <> 'WRITING'`,
    ];
    if (q) conditions.push(ilike(exercises.title, `%${q}%`));
    if (input.userId) conditions.push(eq(exercises.userId, input.userId));
    if (input.workspaceId) {
      conditions.push(eq(exercises.workspaceId, input.workspaceId));
    }
    const where = and(...conditions);
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: exercises.id,
          title: exercises.title,
          status: exercises.type,
          userId: exercises.userId,
          workspaceId: exercises.workspaceId,
          createdAt: exercises.createdAt,
          updatedAt: exercises.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(exercises)
        .innerJoin(users, eq(exercises.userId, users.id))
        .innerJoin(workspaces, eq(exercises.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(exercises.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(exercises).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  if (module === "listening") {
    const conditions: SQL[] = [];
    if (q) {
      conditions.push(
        or(
          ilike(listeningLessons.title, `%${q}%`),
          ilike(listeningLessons.originalFilename, `%${q}%`),
        )!,
      );
    }
    if (input.userId) conditions.push(eq(listeningLessons.userId, input.userId));
    if (input.workspaceId) {
      conditions.push(eq(listeningLessons.workspaceId, input.workspaceId));
    }
    if (input.status) {
      conditions.push(
        eq(listeningLessons.status, input.status as ListeningStatus),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: listeningLessons.id,
          title: listeningLessons.title,
          status: listeningLessons.status,
          userId: listeningLessons.userId,
          workspaceId: listeningLessons.workspaceId,
          createdAt: listeningLessons.createdAt,
          updatedAt: listeningLessons.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(listeningLessons)
        .innerJoin(users, eq(listeningLessons.userId, users.id))
        .innerJoin(workspaces, eq(listeningLessons.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(listeningLessons.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(listeningLessons).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  if (module === "reading") {
    const conditions: SQL[] = [];
    if (q) conditions.push(ilike(readingPassages.title, `%${q}%`));
    if (input.userId) conditions.push(eq(readingPassages.userId, input.userId));
    if (input.workspaceId) {
      conditions.push(eq(readingPassages.workspaceId, input.workspaceId));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: readingPassages.id,
          title: readingPassages.title,
          status: readingPassages.uploadStatus,
          userId: readingPassages.userId,
          workspaceId: readingPassages.workspaceId,
          createdAt: readingPassages.createdAt,
          updatedAt: readingPassages.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(readingPassages)
        .innerJoin(users, eq(readingPassages.userId, users.id))
        .innerJoin(workspaces, eq(readingPassages.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(readingPassages.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(readingPassages).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  if (module === "speaking") {
    const conditions: SQL[] = [];
    if (q) conditions.push(ilike(speakingSessions.title, `%${q}%`));
    if (input.userId) {
      conditions.push(eq(speakingSessions.userId, input.userId));
    }
    if (input.workspaceId) {
      conditions.push(eq(speakingSessions.workspaceId, input.workspaceId));
    }
    if (input.status) {
      conditions.push(
        eq(speakingSessions.status, input.status as SpeakingStatus),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: speakingSessions.id,
          title: speakingSessions.title,
          status: speakingSessions.status,
          userId: speakingSessions.userId,
          workspaceId: speakingSessions.workspaceId,
          createdAt: speakingSessions.createdAt,
          updatedAt: speakingSessions.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(speakingSessions)
        .innerJoin(users, eq(speakingSessions.userId, users.id))
        .innerJoin(workspaces, eq(speakingSessions.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(speakingSessions.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(speakingSessions).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  if (module === "inbox") {
    const conditions: SQL[] = [];
    if (q) conditions.push(ilike(studyInboxItems.content, `%${q}%`));
    if (input.userId) conditions.push(eq(studyInboxItems.userId, input.userId));
    if (input.workspaceId) {
      conditions.push(eq(studyInboxItems.workspaceId, input.workspaceId));
    }
    if (input.status === "unprocessed" || input.status === "processed") {
      conditions.push(
        eq(studyInboxItems.status, input.status as StudyInboxStatus),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: studyInboxItems.id,
          title: sql<string>`left(${studyInboxItems.content}, 120)`,
          status: studyInboxItems.status,
          userId: studyInboxItems.userId,
          workspaceId: studyInboxItems.workspaceId,
          createdAt: studyInboxItems.createdAt,
          updatedAt: studyInboxItems.updatedAt,
          ownerEmail: users.email,
          workspaceName: workspaces.name,
        })
        .from(studyInboxItems)
        .innerJoin(users, eq(studyInboxItems.userId, users.id))
        .innerJoin(workspaces, eq(studyInboxItems.workspaceId, workspaces.id))
        .where(where)
        .orderBy(desc(studyInboxItems.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(studyInboxItems).where(where),
    ]);
    return {
      rows,
      total: Number(totalRow.value),
      page,
      pageSize,
      totalPages: adminTotalPages(Number(totalRow.value), pageSize),
    };
  }

  // folders
  const conditions: SQL[] = [];
  if (q) conditions.push(ilike(workspaceFolders.name, `%${q}%`));
  if (input.userId) conditions.push(eq(workspaceFolders.userId, input.userId));
  if (input.workspaceId) {
    conditions.push(eq(workspaceFolders.workspaceId, input.workspaceId));
  }
  if (input.status) {
    conditions.push(
      eq(workspaceFolders.section, input.status as FolderSection),
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: workspaceFolders.id,
        title: workspaceFolders.name,
        status: workspaceFolders.section,
        userId: workspaceFolders.userId,
        workspaceId: workspaceFolders.workspaceId,
        createdAt: workspaceFolders.createdAt,
        updatedAt: workspaceFolders.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(workspaceFolders)
      .innerJoin(users, eq(workspaceFolders.userId, users.id))
      .innerJoin(workspaces, eq(workspaceFolders.workspaceId, workspaces.id))
      .where(where)
      .orderBy(desc(workspaceFolders.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(workspaceFolders).where(where),
  ]);
  return {
    rows,
    total: Number(totalRow.value),
    page,
    pageSize,
    totalPages: adminTotalPages(Number(totalRow.value), pageSize),
  };
}

/**
 * Metadata-only detail for /admin/content/[module]/[id].
 * Omits transcripts, bodies, and other private content.
 */
export async function getAdminContentDetail(
  contentModule: AdminContentModule,
  id: string,
) {
  await requireAdmin();

  if (contentModule === "vocabulary") {
    const [row] = await db
      .select({
        id: vocabularyWords.id,
        title: vocabularyWords.word,
        status: vocabularyWords.status,
        userId: vocabularyWords.userId,
        workspaceId: vocabularyWords.workspaceId,
        createdAt: vocabularyWords.createdAt,
        updatedAt: vocabularyWords.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(vocabularyWords)
      .innerJoin(users, eq(vocabularyWords.userId, users.id))
      .innerJoin(workspaces, eq(vocabularyWords.workspaceId, workspaces.id))
      .where(eq(vocabularyWords.id, id))
      .limit(1);
    return row ?? null;
  }

  if (contentModule === "theory") {
    const [row] = await db
      .select({
        id: grammarNotes.id,
        title: grammarNotes.title,
        userId: grammarNotes.userId,
        workspaceId: grammarNotes.workspaceId,
        createdAt: grammarNotes.createdAt,
        updatedAt: grammarNotes.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(grammarNotes)
      .innerJoin(users, eq(grammarNotes.userId, users.id))
      .innerJoin(workspaces, eq(grammarNotes.workspaceId, workspaces.id))
      .where(eq(grammarNotes.id, id))
      .limit(1);
    return row ? { ...row, status: null as string | null } : null;
  }

  if (contentModule === "writing" || contentModule === "exercises") {
    const typeFilter =
      contentModule === "writing"
        ? eq(exercises.type, "WRITING")
        : sql`${exercises.type} <> 'WRITING'`;
    const [row] = await db
      .select({
        id: exercises.id,
        title: exercises.title,
        status: exercises.type,
        userId: exercises.userId,
        workspaceId: exercises.workspaceId,
        createdAt: exercises.createdAt,
        updatedAt: exercises.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(exercises)
      .innerJoin(users, eq(exercises.userId, users.id))
      .innerJoin(workspaces, eq(exercises.workspaceId, workspaces.id))
      .where(and(eq(exercises.id, id), typeFilter))
      .limit(1);
    return row ?? null;
  }

  if (contentModule === "listening") {
    const [row] = await db
      .select({
        id: listeningLessons.id,
        title: listeningLessons.title,
        status: listeningLessons.status,
        userId: listeningLessons.userId,
        workspaceId: listeningLessons.workspaceId,
        createdAt: listeningLessons.createdAt,
        updatedAt: listeningLessons.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
        errorCode: listeningLessons.errorCode,
      })
      .from(listeningLessons)
      .innerJoin(users, eq(listeningLessons.userId, users.id))
      .innerJoin(workspaces, eq(listeningLessons.workspaceId, workspaces.id))
      .where(eq(listeningLessons.id, id))
      .limit(1);
    return row ?? null;
  }

  if (contentModule === "reading") {
    const [row] = await db
      .select({
        id: readingPassages.id,
        title: readingPassages.title,
        status: readingPassages.uploadStatus,
        userId: readingPassages.userId,
        workspaceId: readingPassages.workspaceId,
        createdAt: readingPassages.createdAt,
        updatedAt: readingPassages.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(readingPassages)
      .innerJoin(users, eq(readingPassages.userId, users.id))
      .innerJoin(workspaces, eq(readingPassages.workspaceId, workspaces.id))
      .where(eq(readingPassages.id, id))
      .limit(1);
    return row ?? null;
  }

  if (contentModule === "speaking") {
    const [row] = await db
      .select({
        id: speakingSessions.id,
        title: speakingSessions.title,
        status: speakingSessions.status,
        userId: speakingSessions.userId,
        workspaceId: speakingSessions.workspaceId,
        createdAt: speakingSessions.createdAt,
        updatedAt: speakingSessions.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(speakingSessions)
      .innerJoin(users, eq(speakingSessions.userId, users.id))
      .innerJoin(workspaces, eq(speakingSessions.workspaceId, workspaces.id))
      .where(eq(speakingSessions.id, id))
      .limit(1);
    return row ?? null;
  }

  if (contentModule === "inbox") {
    const [row] = await db
      .select({
        id: studyInboxItems.id,
        title: sql<string>`left(${studyInboxItems.content}, 120)`,
        status: studyInboxItems.status,
        userId: studyInboxItems.userId,
        workspaceId: studyInboxItems.workspaceId,
        createdAt: studyInboxItems.createdAt,
        updatedAt: studyInboxItems.updatedAt,
        ownerEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(studyInboxItems)
      .innerJoin(users, eq(studyInboxItems.userId, users.id))
      .innerJoin(workspaces, eq(studyInboxItems.workspaceId, workspaces.id))
      .where(eq(studyInboxItems.id, id))
      .limit(1);
    return row ?? null;
  }

  const [row] = await db
    .select({
      id: workspaceFolders.id,
      title: workspaceFolders.name,
      status: workspaceFolders.section,
      userId: workspaceFolders.userId,
      workspaceId: workspaceFolders.workspaceId,
      createdAt: workspaceFolders.createdAt,
      updatedAt: workspaceFolders.updatedAt,
      ownerEmail: users.email,
      workspaceName: workspaces.name,
    })
    .from(workspaceFolders)
    .innerJoin(users, eq(workspaceFolders.userId, users.id))
    .innerJoin(workspaces, eq(workspaceFolders.workspaceId, workspaces.id))
    .where(eq(workspaceFolders.id, id))
    .limit(1);
  return row ?? null;
}
