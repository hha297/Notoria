"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireActiveWorkspace, getActiveWorkspace } from "@/lib/workspace";
import {
  exerciseFormSchema,
  type ExerciseFormValues,
} from "@/schemas/exercise";

function revalidateWriting(id?: string) {
  revalidatePath("/writing");
  revalidatePath("/writing/new");
  if (id) {
    revalidatePath(`/writing/${id}`);
    revalidatePath(`/writing/${id}/edit`);
  }
}

export async function getWritingDocuments() {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  return db.query.exercises.findMany({
    where: and(
      eq(exercises.userId, userId),
      eq(exercises.workspaceId, workspace.id),
      eq(exercises.type, "WRITING"),
    ),
    orderBy: [desc(exercises.updatedAt)],
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

export async function createWritingDocument(data: ExerciseFormValues) {
  const parsed = exerciseFormSchema.parse({ ...data, type: "WRITING" });
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const [document] = await db
    .insert(exercises)
    .values({
      userId,
      workspaceId: workspace.id,
      title: parsed.title,
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
