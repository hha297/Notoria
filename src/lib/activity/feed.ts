import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  vocabularyWords,
  workspaceActivityEvents,
  type LearningEntityType,
} from "@/db/schema";

export type ActivityFeedItem = {
  id: string;
  verb: string;
  entityType: LearningEntityType;
  entityId: string | null;
  title: string | null;
  href: string | null;
  createdAt: Date;
};

function hrefFor(
  entityType: LearningEntityType,
  entityId: string | null,
): string | null {
  if (!entityId) return null;
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
    case "inbox":
      return `/inbox`;
    default:
      return null;
  }
}

async function entityStillExists(
  entityType: LearningEntityType,
  entityId: string,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const owned = { userId, workspaceId };
  switch (entityType) {
    case "vocabulary": {
      const row = await db.query.vocabularyWords.findFirst({
        where: and(
          eq(vocabularyWords.id, entityId),
          eq(vocabularyWords.userId, owned.userId),
          eq(vocabularyWords.workspaceId, owned.workspaceId),
        ),
        columns: { id: true },
      });
      return Boolean(row);
    }
    case "theory": {
      const row = await db.query.grammarNotes.findFirst({
        where: and(
          eq(grammarNotes.id, entityId),
          eq(grammarNotes.userId, owned.userId),
          eq(grammarNotes.workspaceId, owned.workspaceId),
        ),
        columns: { id: true },
      });
      return Boolean(row);
    }
    case "writing":
    case "exercise": {
      const row = await db.query.exercises.findFirst({
        where: and(
          eq(exercises.id, entityId),
          eq(exercises.userId, owned.userId),
          eq(exercises.workspaceId, owned.workspaceId),
        ),
        columns: { id: true },
      });
      return Boolean(row);
    }
    case "listening": {
      const row = await db.query.listeningLessons.findFirst({
        where: and(
          eq(listeningLessons.id, entityId),
          eq(listeningLessons.userId, owned.userId),
          eq(listeningLessons.workspaceId, owned.workspaceId),
        ),
        columns: { id: true },
      });
      return Boolean(row);
    }
    case "speaking": {
      const row = await db.query.speakingSessions.findFirst({
        where: and(
          eq(speakingSessions.id, entityId),
          eq(speakingSessions.userId, owned.userId),
          eq(speakingSessions.workspaceId, owned.workspaceId),
        ),
        columns: { id: true },
      });
      return Boolean(row);
    }
    case "inbox":
      return true;
    default:
      return false;
  }
}

export async function getRecentActivity(input: {
  userId: string;
  workspaceId: string;
  limit?: number;
}): Promise<ActivityFeedItem[]> {
  const limit = input.limit ?? 12;
  const rows = await db
    .select({
      id: workspaceActivityEvents.id,
      verb: workspaceActivityEvents.verb,
      entityType: workspaceActivityEvents.entityType,
      entityId: workspaceActivityEvents.entityId,
      titleSnapshot: workspaceActivityEvents.titleSnapshot,
      createdAt: workspaceActivityEvents.createdAt,
    })
    .from(workspaceActivityEvents)
    .where(
      and(
        eq(workspaceActivityEvents.userId, input.userId),
        eq(workspaceActivityEvents.workspaceId, input.workspaceId),
      ),
    )
    .orderBy(desc(workspaceActivityEvents.createdAt))
    .limit(limit * 2);

  const items: ActivityFeedItem[] = [];
  for (const row of rows) {
    if (items.length >= limit) break;
    let href = hrefFor(row.entityType, row.entityId);
    if (row.entityId && row.entityType !== "inbox") {
      const exists = await entityStillExists(
        row.entityType,
        row.entityId,
        input.userId,
        input.workspaceId,
      );
      if (!exists) {
        href = null;
      }
    }
    items.push({
      id: row.id,
      verb: row.verb,
      entityType: row.entityType,
      entityId: row.entityId,
      title: row.titleSnapshot,
      href,
      createdAt: row.createdAt,
    });
  }
  return items;
}

/** Unused helper kept for typed filters. */
export function openActivityOnly() {
  return isNull(workspaceActivityEvents.entityId);
}
