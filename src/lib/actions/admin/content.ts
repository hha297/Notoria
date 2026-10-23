"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  readingPassages,
  speakingSessions,
  studyInboxItems,
  vocabularyWords,
  workspaceFolders,
} from "@/db/schema";
import { sanitizeAdminMeta, writeAdminAudit } from "@/lib/admin/audit";
import {
  isAdminContentModule,
  type AdminContentModule,
} from "@/lib/admin/content-modules";
import { requireAdmin } from "@/lib/auth/require-admin";

const deleteSchema = z.object({
  module: z.string(),
  id: z.string().uuid(),
});

const updateTitleSchema = z.object({
  module: z.string(),
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

function revalidateContent(contentModule: AdminContentModule, id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/audit");
  revalidatePath(`/admin/content/${contentModule}`);
  if (id) revalidatePath(`/admin/content/${contentModule}/${id}`);
}

/**
 * Updates the display title (or vocabulary word / folder name) for a content row.
 * Inbox content and private bodies are not edited here.
 */
export async function adminUpdateContent(input: {
  module: string;
  id: string;
  title: string;
}) {
  const admin = await requireAdmin();
  const parsed = updateTitleSchema.parse(input);
  if (!isAdminContentModule(parsed.module)) {
    throw new Error("INVALID_CONTENT_MODULE");
  }
  if (parsed.module === "inbox") {
    throw new Error("CONTENT_TITLE_UNSUPPORTED");
  }

  const contentModule = parsed.module;
  const id = parsed.id;
  const title = parsed.title;

  const before = await loadContentMeta(contentModule, id);
  if (!before) throw new Error("CONTENT_NOT_FOUND");

  await db.transaction(async (tx) => {
    switch (contentModule) {
      case "vocabulary":
        await tx
          .update(vocabularyWords)
          .set({ word: title, updatedAt: new Date() })
          .where(eq(vocabularyWords.id, id));
        break;
      case "theory":
        await tx
          .update(grammarNotes)
          .set({ title, updatedAt: new Date() })
          .where(eq(grammarNotes.id, id));
        break;
      case "writing":
      case "exercises":
        await tx
          .update(exercises)
          .set({ title, updatedAt: new Date() })
          .where(eq(exercises.id, id));
        break;
      case "listening":
        await tx
          .update(listeningLessons)
          .set({ title, updatedAt: new Date() })
          .where(eq(listeningLessons.id, id));
        break;
      case "reading":
        await tx
          .update(readingPassages)
          .set({ title, updatedAt: new Date() })
          .where(eq(readingPassages.id, id));
        break;
      case "speaking":
        await tx
          .update(speakingSessions)
          .set({ title, updatedAt: new Date() })
          .where(eq(speakingSessions.id, id));
        break;
      case "folders":
        await tx
          .update(workspaceFolders)
          .set({ name: title, updatedAt: new Date() })
          .where(eq(workspaceFolders.id, id));
        break;
    }

    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "content.update_title",
        entityType: contentModule,
        entityId: id,
        targetUserId: before.userId,
        meta: sanitizeAdminMeta({
          before: { title: before.title },
          after: { title },
          workspaceId: before.workspaceId,
        }),
      },
      tx,
    );
  });

  revalidateContent(contentModule, id);
  return { ok: true as const };
}

/**
 * Deletes a known user-authored content row.
 * Does not call AI providers. Listening media cleanup is best-effort elsewhere.
 */
export async function adminDeleteContent(input: {
  module: string;
  id: string;
}) {
  const admin = await requireAdmin();
  const parsed = deleteSchema.parse(input);
  if (!isAdminContentModule(parsed.module)) {
    throw new Error("INVALID_CONTENT_MODULE");
  }
  const contentModule = parsed.module;
  const id = parsed.id;

  const before = await loadContentMeta(contentModule, id);
  if (!before) throw new Error("CONTENT_NOT_FOUND");

  await db.transaction(async (tx) => {
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "content.delete",
        entityType: contentModule,
        entityId: id,
        targetUserId: before.userId,
        meta: sanitizeAdminMeta({
          title: before.title,
          workspaceId: before.workspaceId,
        }),
      },
      tx,
    );

    switch (contentModule) {
      case "vocabulary":
        await tx.delete(vocabularyWords).where(eq(vocabularyWords.id, id));
        break;
      case "theory":
        await tx.delete(grammarNotes).where(eq(grammarNotes.id, id));
        break;
      case "writing":
      case "exercises":
        await tx.delete(exercises).where(eq(exercises.id, id));
        break;
      case "listening":
        await tx.delete(listeningLessons).where(eq(listeningLessons.id, id));
        break;
      case "reading":
        await tx.delete(readingPassages).where(eq(readingPassages.id, id));
        break;
      case "speaking":
        await tx.delete(speakingSessions).where(eq(speakingSessions.id, id));
        break;
      case "inbox":
        await tx.delete(studyInboxItems).where(eq(studyInboxItems.id, id));
        break;
      case "folders":
        await tx.delete(workspaceFolders).where(eq(workspaceFolders.id, id));
        break;
    }
  });

  revalidateContent(contentModule);
  return { ok: true as const };
}

async function loadContentMeta(
  contentModule: AdminContentModule,
  id: string,
): Promise<{
  title: string;
  userId: string;
  workspaceId: string;
} | null> {
  if (contentModule === "vocabulary") {
    const row = await db.query.vocabularyWords.findFirst({
      where: eq(vocabularyWords.id, id),
      columns: { word: true, userId: true, workspaceId: true },
    });
    return row
      ? { title: row.word, userId: row.userId, workspaceId: row.workspaceId }
      : null;
  }
  if (contentModule === "theory") {
    const row = await db.query.grammarNotes.findFirst({
      where: eq(grammarNotes.id, id),
      columns: { title: true, userId: true, workspaceId: true },
    });
    return row ?? null;
  }
  if (contentModule === "writing" || contentModule === "exercises") {
    const row = await db.query.exercises.findFirst({
      where: eq(exercises.id, id),
      columns: { title: true, userId: true, workspaceId: true, type: true },
    });
    if (!row) return null;
    if (contentModule === "writing" && row.type !== "WRITING") return null;
    if (contentModule === "exercises" && row.type === "WRITING") return null;
    return {
      title: row.title,
      userId: row.userId,
      workspaceId: row.workspaceId,
    };
  }
  if (contentModule === "listening") {
    const row = await db.query.listeningLessons.findFirst({
      where: eq(listeningLessons.id, id),
      columns: { title: true, userId: true, workspaceId: true },
    });
    return row ?? null;
  }
  if (contentModule === "reading") {
    const row = await db.query.readingPassages.findFirst({
      where: eq(readingPassages.id, id),
      columns: { title: true, userId: true, workspaceId: true },
    });
    return row ?? null;
  }
  if (contentModule === "speaking") {
    const row = await db.query.speakingSessions.findFirst({
      where: eq(speakingSessions.id, id),
      columns: { title: true, userId: true, workspaceId: true },
    });
    return row ?? null;
  }
  if (contentModule === "inbox") {
    const row = await db.query.studyInboxItems.findFirst({
      where: eq(studyInboxItems.id, id),
      columns: { content: true, userId: true, workspaceId: true },
    });
    return row
      ? {
          title: row.content.slice(0, 120),
          userId: row.userId,
          workspaceId: row.workspaceId,
        }
      : null;
  }
  const row = await db.query.workspaceFolders.findFirst({
    where: eq(workspaceFolders.id, id),
    columns: { name: true, userId: true, workspaceId: true },
  });
  return row
    ? { title: row.name, userId: row.userId, workspaceId: row.workspaceId }
    : null;
}
