"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { studyInboxItems } from "@/db/schema";
import { recordActivity } from "@/lib/activity/record";
import { getCurrentUserId } from "@/lib/auth/session";
import { withTiming } from "@/lib/perf/dev-timing";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import {
  studyInboxCaptureSchema,
  studyInboxProcessTargetSchema,
  type StudyInboxCaptureValues,
  type StudyInboxProcessTarget,
} from "@/schemas/study-inbox";

function revalidateInbox(id?: string) {
  revalidatePath("/");
  revalidatePath("/inbox");
  if (id) revalidatePath(`/inbox/${id}`);
}

async function requireOwnedInboxItem(id: string, userId: string, workspaceId: string) {
  const item = await db.query.studyInboxItems.findFirst({
    where: and(
      eq(studyInboxItems.id, id),
      eq(studyInboxItems.userId, userId),
      eq(studyInboxItems.workspaceId, workspaceId),
    ),
  });
  if (!item) throw new Error("NOT_FOUND");
  return item;
}

export async function getStudyInboxItems(filter: "unprocessed" | "processed" | "all" = "unprocessed") {
  return withTiming("inbox.list", async () => {
    const userId = await getCurrentUserId();
    const workspace = await getActiveWorkspace();
    if (!workspace) return [];

    const conditions = [
      eq(studyInboxItems.userId, userId),
      eq(studyInboxItems.workspaceId, workspace.id),
    ];
    if (filter !== "all") {
      conditions.push(eq(studyInboxItems.status, filter));
    }

    const rows = await db
      .select()
      .from(studyInboxItems)
      .where(and(...conditions))
      .orderBy(desc(studyInboxItems.createdAt));

    return rows;
  });
}

export async function countUnprocessedInboxItems(workspaceId: string) {
  const userId = await getCurrentUserId();
  const rows = await db
    .select({ id: studyInboxItems.id })
    .from(studyInboxItems)
    .where(
      and(
        eq(studyInboxItems.userId, userId),
        eq(studyInboxItems.workspaceId, workspaceId),
        eq(studyInboxItems.status, "unprocessed"),
      ),
    );
  return rows.length;
}

export async function createStudyInboxItem(input: StudyInboxCaptureValues) {
  const parsed = studyInboxCaptureSchema.parse(input);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const [row] = await db
    .insert(studyInboxItems)
    .values({
      userId,
      workspaceId: workspace.id,
      content: parsed.content,
      note: parsed.note || null,
      source: parsed.source || null,
      status: "unprocessed",
    })
    .returning();

  await recordActivity({
    userId,
    workspaceId: workspace.id,
    verb: "created",
    entityType: "inbox",
    entityId: row.id,
    titleSnapshot: parsed.content.slice(0, 120),
  });

  revalidateInbox(row.id);
  return row;
}

export async function updateStudyInboxItem(
  id: string,
  input: StudyInboxCaptureValues,
) {
  const parsed = studyInboxCaptureSchema.parse(input);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  await requireOwnedInboxItem(id, userId, workspace.id);

  const [row] = await db
    .update(studyInboxItems)
    .set({
      content: parsed.content,
      note: parsed.note || null,
      source: parsed.source || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(studyInboxItems.id, id),
        eq(studyInboxItems.userId, userId),
        eq(studyInboxItems.workspaceId, workspace.id),
      ),
    )
    .returning();

  revalidateInbox(id);
  return row;
}

export async function deleteStudyInboxItem(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  await requireOwnedInboxItem(id, userId, workspace.id);

  await db
    .delete(studyInboxItems)
    .where(
      and(
        eq(studyInboxItems.id, id),
        eq(studyInboxItems.userId, userId),
        eq(studyInboxItems.workspaceId, workspace.id),
      ),
    );

  revalidateInbox();
}

/**
 * Start converting an inbox item. Does NOT mark processed yet — that happens
 * only after the linked create flow succeeds (`completeStudyInboxItem`).
 */
export async function processStudyInboxItem(input: {
  id: string;
  target: StudyInboxProcessTarget;
}) {
  const target = studyInboxProcessTargetSchema.parse(input.target);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const item = await requireOwnedInboxItem(input.id, userId, workspace.id);

  if (target === "keep") {
    return { ok: true as const, redirectTo: null as string | null };
  }

  if (target === "delete") {
    await deleteStudyInboxItem(input.id);
    return { ok: true as const, redirectTo: null as string | null };
  }

  const q = encodeURIComponent(item.content.slice(0, 200));
  const note = item.note ? encodeURIComponent(item.note.slice(0, 400)) : "";
  const redirectTo =
    target === "vocabulary"
      ? `/vocabulary/new?fromInbox=${item.id}&prefill=${q}${note ? `&note=${note}` : ""}`
      : target === "theory"
        ? `/theory/new?fromInbox=${item.id}&prefill=${q}`
        : target === "writing"
          ? `/writing/new?fromInbox=${item.id}&prefill=${q}${note ? `&note=${note}` : ""}`
          : `/exercises?fromInbox=${item.id}`;

  return { ok: true as const, redirectTo };
}

/**
 * Mark an inbox item processed after the user actually creates the linked item.
 * Idempotent if already processed.
 */
export async function completeStudyInboxItem(input: {
  id: string;
  linkedEntityType: "vocabulary" | "theory" | "writing" | "exercise";
  linkedEntityId: string;
}) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const item = await requireOwnedInboxItem(input.id, userId, workspace.id);

  if (item.status === "processed") {
    return { ok: true as const };
  }

  const now = new Date();
  await db
    .update(studyInboxItems)
    .set({
      status: "processed",
      processedAt: now,
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
      updatedAt: now,
    })
    .where(eq(studyInboxItems.id, item.id));

  await recordActivity({
    userId,
    workspaceId: workspace.id,
    verb: "processed",
    entityType: "inbox",
    entityId: item.id,
    titleSnapshot: item.content.slice(0, 120),
    meta: {
      target: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
    },
  });

  revalidateInbox(item.id);
  return { ok: true as const };
}
