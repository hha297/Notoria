"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exercises, workspaceFolders } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { resolveFolderId } from "@/lib/actions/folders";
import { requireActiveWorkspace, getActiveWorkspace } from "@/lib/workspace";
import { withTiming } from "@/lib/perf/dev-timing";
import {
  exerciseFormSchema,
  type ExerciseFormValues,
} from "@/schemas/exercise";
import {
  writingListMetaFromParts,
  type WritingListMeta,
} from "@/lib/writing/content";
import { isUniqueNameTaken } from "@/lib/unique-name";

export type WritingDocumentListItem = {
  id: string;
  title: string;
  description: string | null;
  type: "WRITING";
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
  /** Derived server-side so list clients never receive full content JSONB. */
  listMeta: WritingListMeta;
};

/** Page-scoped revalidation for document CRUD. Folder tree ops use folders.ts layout revalidate. */
function revalidateWriting(id?: string) {
  revalidatePath("/writing");
  if (id) {
    revalidatePath(`/writing/${id}`);
    revalidatePath(`/writing/${id}/edit`);
  }
}

async function assertUniqueWritingTitle(input: {
  userId: string;
  workspaceId: string;
  title: string;
  excludeId?: string;
}) {
  const [documents, folders] = await Promise.all([
    db
      .select({
        id: exercises.id,
        title: exercises.title,
      })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, input.userId),
          eq(exercises.workspaceId, input.workspaceId),
          eq(exercises.type, "WRITING"),
        ),
      ),
    db
      .select({
        name: workspaceFolders.name,
      })
      .from(workspaceFolders)
      .where(
        and(
          eq(workspaceFolders.userId, input.userId),
          eq(workspaceFolders.workspaceId, input.workspaceId),
          eq(workspaceFolders.section, "writing"),
        ),
      ),
  ]);

  const occupied = [
    ...documents
      .filter((document) => document.id !== input.excludeId)
      .map((document) => document.title),
    ...folders.map((folder) => folder.name),
  ];

  if (isUniqueNameTaken(input.title, occupied)) {
    throw new Error("NAME_TAKEN");
  }
}

export async function getWritingDocuments(): Promise<WritingDocumentListItem[]> {
  return withTiming("writing.list", async () => {
    const userId = await getCurrentUserId();
    const workspace = await getActiveWorkspace();

    if (!workspace) {
      return [];
    }

    const documents = await db
      .select({
        id: exercises.id,
        title: exercises.title,
        description: exercises.description,
        folderId: exercises.folderId,
        createdAt: exercises.createdAt,
        updatedAt: exercises.updatedAt,
        userId: exercises.userId,
        workspaceId: exercises.workspaceId,
        mode: sql<string>`coalesce(${exercises.content}->>'mode', 'question_set')`,
        sectionCount: sql<number>`coalesce(jsonb_array_length(${exercises.content}->'sections'), 0)`,
        questionCount: sql<number>`coalesce((
          SELECT sum(jsonb_array_length(coalesce(section->'questions', '[]'::jsonb)))
          FROM jsonb_array_elements(
            coalesce(${exercises.content}->'sections', '[]'::jsonb)
          ) AS section
        ), 0)`,
        meta: sql<unknown>`coalesce(${exercises.content}->'meta', '{}'::jsonb)`,
      })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          eq(exercises.workspaceId, workspace.id),
          eq(exercises.type, "WRITING"),
        ),
      )
      .orderBy(desc(exercises.updatedAt));

    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      description: document.description,
      type: "WRITING" as const,
      folderId: document.folderId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      userId: document.userId,
      workspaceId: document.workspaceId,
      listMeta: writingListMetaFromParts({
        mode: document.mode,
        sectionCount: document.sectionCount,
        questionCount: document.questionCount,
        meta: document.meta,
      }),
    }));
  });
}

export async function getWritingDocument(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const document = await db.query.exercises.findFirst({
    where: eq(exercises.id, id),
  });

  if (
    !document ||
    document.userId !== userId ||
    document.workspaceId !== workspace.id ||
    document.type !== "WRITING"
  ) {
    return null;
  }

  return document;
}

export async function createWritingDocument(
  data: ExerciseFormValues,
  options?: { folderId?: string | null },
) {
  const parsed = exerciseFormSchema.parse({ ...data, type: "WRITING" });
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const folderId = await resolveFolderId(options?.folderId, "writing");

  await assertUniqueWritingTitle({
    userId,
    workspaceId: workspace.id,
    title: parsed.title,
  });

  const [document] = await db
    .insert(exercises)
    .values({
      userId,
      workspaceId: workspace.id,
      folderId,
      title: parsed.title,
      description: parsed.description.trim() || null,
      type: "WRITING",
      content: parsed.content,
    })
    .returning();

  revalidateWriting(document.id);
  return document;
}

export async function updateWritingDocument(
  id: string,
  data: ExerciseFormValues,
) {
  const parsed = exerciseFormSchema.parse({ ...data, type: "WRITING" });
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const existing = await db.query.exercises.findFirst({
    where: eq(exercises.id, id),
  });

  if (
    !existing ||
    existing.userId !== userId ||
    existing.workspaceId !== workspace.id ||
    existing.type !== "WRITING"
  ) {
    throw new Error("Writing document not found");
  }

  await assertUniqueWritingTitle({
    userId,
    workspaceId: workspace.id,
    title: parsed.title,
    excludeId: id,
  });

  const [document] = await db
    .update(exercises)
    .set({
      title: parsed.title,
      description: parsed.description.trim() || null,
      type: "WRITING",
      content: parsed.content,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id))
    .returning();

  revalidateWriting(id);
  return document;
}

export async function deleteWritingDocument(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const existing = await db.query.exercises.findFirst({
    where: eq(exercises.id, id),
  });

  if (
    !existing ||
    existing.userId !== userId ||
    existing.workspaceId !== workspace.id ||
    existing.type !== "WRITING"
  ) {
    throw new Error("Writing document not found");
  }

  await db.delete(exercises).where(eq(exercises.id, id));
  revalidateWriting(id);
}
