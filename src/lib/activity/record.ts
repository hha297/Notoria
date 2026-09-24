import { db } from "@/db";
import {
  workspaceActivityEvents,
  type ActivityVerb,
  type LearningEntityType,
} from "@/db/schema";

export type RecordActivityInput = {
  userId: string;
  workspaceId: string;
  verb: ActivityVerb;
  entityType: LearningEntityType;
  entityId?: string | null;
  titleSnapshot?: string | null;
  meta?: Record<string, unknown> | null;
};

/** Append one meaningful learning event. Never call for UI clicks/hovers. */
export async function recordActivity(input: RecordActivityInput) {
  await db.insert(workspaceActivityEvents).values({
    userId: input.userId,
    workspaceId: input.workspaceId,
    verb: input.verb,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    titleSnapshot: input.titleSnapshot?.trim() || null,
    meta: input.meta ?? null,
  });
}
