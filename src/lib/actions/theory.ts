"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { grammarNotes } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { recordActivity } from "@/lib/activity/record";
import { resolveFolderId } from "@/lib/actions/folders";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import { withTiming } from "@/lib/perf/dev-timing";
import {
  parseTheoryContent,
  serializeTheoryContent,
  toTheoryListItemFromMeta,
  type TheoryListItem,
} from "@/lib/theory/content";
import { toTheoryExerciseCard } from "@/lib/theory-exercises/cards";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";
import {
  theoryFormErrorCode,
  theoryFormSchema,
  type TheoryFormErrorCode,
  type TheoryFormValues,
} from "@/schemas/theory";

/** Page-scoped revalidation for note CRUD. Folder tree ops use folders.ts layout revalidate. */
function revalidateTheory(id?: string) {
  revalidatePath("/theory");
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

export type TheoryNoteActionResult =
  | { ok: true; id: string }
  | { ok: false; code: TheoryFormErrorCode | "NOT_FOUND" | "SAVE_FAILED" };

async function loadTheoryNoteRows() {
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

/** Lean library rows — TipTap `doc` stays in Postgres; only list metadata is loaded. */
export async function getTheoryNotes(): Promise<TheoryListItem[]> {
  return withTiming("theory.list", async () => {
    const userId = await getCurrentUserId();
    const workspace = await getActiveWorkspace();

    if (!workspace) {
      return [];
    }

    const notes = await db
      .select({
        id: grammarNotes.id,
        title: grammarNotes.title,
        folderId: grammarNotes.folderId,
        updatedAt: grammarNotes.updatedAt,
        category: sql<string>`coalesce(${grammarNotes.content}->>'category', 'grammar')`,
        description: sql<string>`coalesce(${grammarNotes.content}->>'description', '')`,
        docBytes: sql<number>`octet_length(coalesce(${grammarNotes.content}->'doc', '{}'::jsonb)::text)`,
        hasExportableContent: sql<boolean>`
          coalesce((${grammarNotes.content}->'doc')::text, '')
            ~ '"text"[[:space:]]*:[[:space:]]*"[^[:space:]"]'
        `,
      })
      .from(grammarNotes)
      .where(
        and(
          eq(grammarNotes.userId, userId),
          eq(grammarNotes.workspaceId, workspace.id),
        ),
      )
      .orderBy(desc(grammarNotes.updatedAt));

    return notes.map((note) => toTheoryListItemFromMeta(note));
  });
}

/** Lean exercise-studio cards derived from the same notes without client content. */
export async function getTheoryExerciseCards(): Promise<TheoryExerciseCardItem[]> {
  return withTiming("theory.exerciseCards", async () => {
    const notes = await loadTheoryNoteRows();
    return notes.map((note) => toTheoryExerciseCard(note));
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

export async function createTheoryNote(
  data: TheoryFormValues,
  options?: { folderId?: string | null },
): Promise<TheoryNoteActionResult> {
  const parsed = theoryFormSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, code: theoryFormErrorCode(parsed.error) };
  }

  try {
    const userId = await getCurrentUserId();
    const workspace = await requireActiveWorkspace();
    const folderId = await resolveFolderId(options?.folderId, "theory");

    const [note] = await db
      .insert(grammarNotes)
      .values({
        userId,
        workspaceId: workspace.id,
        folderId,
        title: parsed.data.title,
        content: contentFromForm(parsed.data),
      })
      .returning({ id: grammarNotes.id, title: grammarNotes.title });

    await recordActivity({
      userId,
      workspaceId: workspace.id,
      verb: "created",
      entityType: "theory",
      entityId: note.id,
      titleSnapshot: note.title,
    });

    revalidateTheory(note.id);
    return { ok: true, id: note.id };
  } catch {
    return { ok: false, code: "SAVE_FAILED" };
  }
}

export async function updateTheoryNote(
  id: string,
  data: TheoryFormValues,
): Promise<TheoryNoteActionResult> {
  const parsed = theoryFormSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, code: theoryFormErrorCode(parsed.error) };
  }

  try {
    const userId = await getCurrentUserId();
    const workspace = await requireActiveWorkspace();

    const existing = await db.query.grammarNotes.findFirst({
      where: eq(grammarNotes.id, id),
      columns: { id: true, userId: true, workspaceId: true },
    });

    if (
      !existing ||
      existing.userId !== userId ||
      existing.workspaceId !== workspace.id
    ) {
      return { ok: false, code: "NOT_FOUND" };
    }

    await db
      .update(grammarNotes)
      .set({
        title: parsed.data.title,
        content: contentFromForm(parsed.data),
        updatedAt: new Date(),
      })
      .where(eq(grammarNotes.id, id));

    revalidateTheory(id);
    return { ok: true, id };
  } catch {
    return { ok: false, code: "SAVE_FAILED" };
  }
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
