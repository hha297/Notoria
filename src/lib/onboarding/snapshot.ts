import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  flashcardProgress,
  grammarNotes,
  vocabularyWords,
  workspaces,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  EMPTY_WORKSPACE_SNAPSHOT,
  type WorkspaceActivitySnapshot,
} from "./requirements";

export async function getWorkspaceActivitySnapshot(
  workspaceId: string,
): Promise<WorkspaceActivitySnapshot> {
  const userId = await getCurrentUserId();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace || workspace.userId !== userId) {
    return EMPTY_WORKSPACE_SNAPSHOT;
  }

  const owned = and(
    eq(vocabularyWords.workspaceId, workspaceId),
    eq(vocabularyWords.userId, userId),
  );

  const [vocab, writing, theory, practice] = await Promise.all([
    db
      .select({ value: count() })
      .from(vocabularyWords)
      .where(owned),
    db
      .select({ value: count() })
      .from(exercises)
      .where(
        and(
          eq(exercises.workspaceId, workspaceId),
          eq(exercises.userId, userId),
          eq(exercises.type, "WRITING"),
        ),
      ),
    db
      .select({ value: count() })
      .from(grammarNotes)
      .where(
        and(
          eq(grammarNotes.workspaceId, workspaceId),
          eq(grammarNotes.userId, userId),
        ),
      ),
    db
      .select({ value: count() })
      .from(flashcardProgress)
      .where(
        and(
          eq(flashcardProgress.workspaceId, workspaceId),
          eq(flashcardProgress.userId, userId),
        ),
      ),
  ]);

  return {
    vocabularyCount: vocab[0]?.value ?? 0,
    writingCount: writing[0]?.value ?? 0,
    theoryCount: theory[0]?.value ?? 0,
    practiceCount: practice[0]?.value ?? 0,
  };
}
