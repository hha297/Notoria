import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  vocabularyWords,
  workspaceBookmarks,
} from "@/db/schema";
import { recordActivity } from "@/lib/activity/record";
import {
  isReviewLaterEntityType,
  type ReviewLaterEntityType,
} from "@/lib/review-later/entity-type";

export type { ReviewLaterEntityType };
export { isReviewLaterEntityType };

export type ReviewLaterItem = {
  id: string;
  entityType: ReviewLaterEntityType;
  entityId: string;
  title: string;
  href: string;
  createdAt: Date;
};

function hrefFor(entityType: ReviewLaterEntityType, entityId: string) {
  switch (entityType) {
    case "vocabulary":
      return `/vocabulary/${entityId}`;
    case "theory":
      return `/theory/${entityId}`;
    case "writing":
      return `/writing/${entityId}`;
    case "exercise":
      return `/exercises`;
    case "listening":
      return `/listening/${entityId}`;
    case "speaking":
      return `/speaking/${entityId}`;
  }
}

async function resolveTitle(
  entityType: ReviewLaterEntityType,
  entityId: string,
  userId: string,
  workspaceId: string,
  snapshot: string | null,
): Promise<string | null> {
  switch (entityType) {
    case "vocabulary": {
      const row = await db.query.vocabularyWords.findFirst({
        where: and(
          eq(vocabularyWords.id, entityId),
          eq(vocabularyWords.userId, userId),
          eq(vocabularyWords.workspaceId, workspaceId),
        ),
        columns: { word: true },
      });
      return row?.word ?? snapshot;
    }
    case "theory": {
      const row = await db.query.grammarNotes.findFirst({
        where: and(
          eq(grammarNotes.id, entityId),
          eq(grammarNotes.userId, userId),
          eq(grammarNotes.workspaceId, workspaceId),
        ),
        columns: { title: true },
      });
      return row?.title ?? snapshot;
    }
    case "writing":
    case "exercise": {
      const row = await db.query.exercises.findFirst({
        where: and(
          eq(exercises.id, entityId),
          eq(exercises.userId, userId),
          eq(exercises.workspaceId, workspaceId),
        ),
        columns: { title: true },
      });
      return row?.title ?? snapshot;
    }
    case "listening": {
      const row = await db.query.listeningLessons.findFirst({
        where: and(
          eq(listeningLessons.id, entityId),
          eq(listeningLessons.userId, userId),
          eq(listeningLessons.workspaceId, workspaceId),
        ),
        columns: { title: true },
      });
      return row?.title ?? snapshot;
    }
    case "speaking": {
      const row = await db.query.speakingSessions.findFirst({
        where: and(
          eq(speakingSessions.id, entityId),
          eq(speakingSessions.userId, userId),
          eq(speakingSessions.workspaceId, workspaceId),
        ),
        columns: { title: true },
      });
      return row?.title ?? snapshot;
    }
  }
}

export async function isMarkedReviewLater(input: {
  userId: string;
  workspaceId: string;
  entityType: ReviewLaterEntityType;
  entityId: string;
}) {
  const row = await db.query.workspaceBookmarks.findFirst({
    where: and(
      eq(workspaceBookmarks.userId, input.userId),
      eq(workspaceBookmarks.workspaceId, input.workspaceId),
      eq(workspaceBookmarks.entityType, input.entityType),
      eq(workspaceBookmarks.entityId, input.entityId),
      eq(workspaceBookmarks.purpose, "review_later"),
    ),
    columns: { id: true },
  });
  return Boolean(row);
}

export async function setReviewLater(input: {
  userId: string;
  workspaceId: string;
  entityType: ReviewLaterEntityType;
  entityId: string;
  titleSnapshot?: string | null;
  marked: boolean;
}) {
  const where = and(
    eq(workspaceBookmarks.userId, input.userId),
    eq(workspaceBookmarks.workspaceId, input.workspaceId),
    eq(workspaceBookmarks.entityType, input.entityType),
    eq(workspaceBookmarks.entityId, input.entityId),
    eq(workspaceBookmarks.purpose, "review_later"),
  );

  if (!input.marked) {
    const existing = await db.query.workspaceBookmarks.findFirst({
      where,
      columns: { id: true, titleSnapshot: true },
    });
    if (!existing) return { marked: false as const };
    await db.delete(workspaceBookmarks).where(eq(workspaceBookmarks.id, existing.id));
    await recordActivity({
      userId: input.userId,
      workspaceId: input.workspaceId,
      verb: "review_later_removed",
      entityType: input.entityType,
      entityId: input.entityId,
      titleSnapshot: existing.titleSnapshot ?? input.titleSnapshot,
    });
    return { marked: false as const };
  }

  const existing = await db.query.workspaceBookmarks.findFirst({
    where,
    columns: { id: true },
  });
  if (existing) return { marked: true as const };

  await db.insert(workspaceBookmarks).values({
    userId: input.userId,
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    purpose: "review_later",
    titleSnapshot: input.titleSnapshot?.trim() || null,
  });
  await recordActivity({
    userId: input.userId,
    workspaceId: input.workspaceId,
    verb: "review_later_added",
    entityType: input.entityType,
    entityId: input.entityId,
    titleSnapshot: input.titleSnapshot,
  });
  return { marked: true as const };
}

export async function listReviewLater(input: {
  userId: string;
  workspaceId: string;
  limit?: number;
}): Promise<ReviewLaterItem[]> {
  const limit = input.limit ?? 40;
  const rows = await db
    .select()
    .from(workspaceBookmarks)
    .where(
      and(
        eq(workspaceBookmarks.userId, input.userId),
        eq(workspaceBookmarks.workspaceId, input.workspaceId),
        eq(workspaceBookmarks.purpose, "review_later"),
      ),
    )
    .orderBy(desc(workspaceBookmarks.createdAt))
    .limit(limit);

  const items: ReviewLaterItem[] = [];
  for (const row of rows) {
    if (!isReviewLaterEntityType(row.entityType)) continue;
    const title = await resolveTitle(
      row.entityType,
      row.entityId,
      input.userId,
      input.workspaceId,
      row.titleSnapshot,
    );
    if (!title) continue;
    items.push({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      title,
      href: hrefFor(row.entityType, row.entityId),
      createdAt: row.createdAt,
    });
  }
  return items;
}

export async function countReviewLater(input: {
  userId: string;
  workspaceId: string;
}) {
  const items = await listReviewLater({ ...input, limit: 200 });
  return items.length;
}
