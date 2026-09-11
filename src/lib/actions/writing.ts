"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { resolveFolderId } from "@/lib/actions/folders";
import { requireActiveWorkspace, getActiveWorkspace } from "@/lib/workspace";
import {
  exerciseFormSchema,
  type ExerciseFormValues,
} from "@/schemas/exercise";
import {
  getWritingListMeta,
  type WritingListMeta,
} from "@/lib/writing/content";

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

export async function getWritingDocuments(): Promise<WritingDocumentListItem[]> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  // Content is read server-side only to derive lean listMeta, then discarded.
  const documents = await db.query.exercises.findMany({
    where: and(
      eq(exercises.userId, userId),
      eq(exercises.workspaceId, workspace.id),
      eq(exercises.type, "WRITING"),
    ),
    columns: {
      id: true,
      title: true,
      description: true,
      type: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      workspaceId: true,
      content: true,
    },
    orderBy: [desc(exercises.updatedAt)],
  });

  return documents.map(({ content, ...document }) => ({
    ...document,
    type: "WRITING" as const,
    listMeta: getWritingListMeta(content),
  }));
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
