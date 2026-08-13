"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { grammarNotes } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import {
  parseTheoryContent,
  serializeTheoryContent,
} from "@/lib/theory/content";
import {
  theoryFormSchema,
  type TheoryFormValues,
} from "@/schemas/theory";

function revalidateTheory(id?: string) {
  revalidatePath("/theory");
  revalidatePath("/theory/new");
  if (id) {
    revalidatePath(`/theory/${id}`);
    revalidatePath(`/theory/${id}/edit`);
  }
}

function contentFromForm(data: TheoryFormValues) {
  const parsed = parseTheoryContent(data.content);
  return serializeTheoryContent({
    ...parsed,
    category: data.category,
    description: data.description ?? "",
  });
}

export async function getTheoryNotes() {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  return db.query.grammarNotes.findMany({
    where: and(
      eq(grammarNotes.userId, userId),
      eq(grammarNotes.workspaceId, workspace.id),
    ),
    orderBy: [desc(grammarNotes.updatedAt)],
  });
}

export async function getTheoryNote(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const note = await db.query.grammarNotes.findFirst({
    where: eq(grammarNotes.id, id),
  });

  if (!note || note.userId !== userId || note.workspaceId !== workspace.id) {
    return null;
  }

  return note;
}

export async function createTheoryNote(data: TheoryFormValues) {
  const parsed = theoryFormSchema.parse(data);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const [note] = await db
    .insert(grammarNotes)
    .values({
      userId,
      workspaceId: workspace.id,
      title: parsed.title,
      content: contentFromForm(parsed),
    })
    .returning();

  revalidateTheory(note.id);
  return note;
}

export async function updateTheoryNote(id: string, data: TheoryFormValues) {
  const parsed = theoryFormSchema.parse(data);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const existing = await db.query.grammarNotes.findFirst({
    where: eq(grammarNotes.id, id),
  });

  if (
    !existing ||
    existing.userId !== userId ||
    existing.workspaceId !== workspace.id
  ) {
    throw new Error("Theory note not found");
  }

  const [note] = await db
    .update(grammarNotes)
    .set({
      title: parsed.title,
      content: contentFromForm(parsed),
      updatedAt: new Date(),
    })
    .where(eq(grammarNotes.id, id))
    .returning();

  revalidateTheory(id);
  return note;
}

export async function deleteTheoryNote(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const existing = await db.query.grammarNotes.findFirst({
    where: eq(grammarNotes.id, id),
  });

  if (
    !existing ||
    existing.userId !== userId ||
    existing.workspaceId !== workspace.id
  ) {
    throw new Error("Theory note not found");
  }

  await db.delete(grammarNotes).where(eq(grammarNotes.id, id));
  revalidateTheory(id);
}
