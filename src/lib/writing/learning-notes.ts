import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

export type LatestLearningNote = {
  id: string;
  title: string;
  href: string;
  updatedAt: Date;
};

export async function getLatestLearningNote(
  workspaceId: string,
): Promise<LatestLearningNote | null> {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select({
      id: exercises.id,
      title: exercises.title,
      updatedAt: exercises.updatedAt,
    })
    .from(exercises)
    .where(
      and(
        eq(exercises.userId, userId),
        eq(exercises.workspaceId, workspaceId),
        eq(exercises.type, "WRITING"),
        sql`${exercises.content}->'meta'->>'kind' = 'learning_note'`,
      ),
    )
    .orderBy(desc(exercises.updatedAt))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    href: `/writing/${row.id}`,
    updatedAt: row.updatedAt,
  };
}
