"use server";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyWords } from "@/db/schema";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getCurrentUserId } from "@/lib/auth/session";
import { getExerciseImports } from "@/lib/actions/exercise-import";
import { getTheoryExerciseCards } from "@/lib/actions/theory";
import { getActiveWorkspace } from "@/lib/workspace";
import { withTiming } from "@/lib/perf/dev-timing";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";

export type ExerciseStudioData = {
  theories: TheoryExerciseCardItem[];
  imports: ExerciseImportListItem[];
  vocabularyCount: number;
};

async function getWorkspaceVocabularyCount() {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(vocabularyWords)
    .where(
      and(
        eq(vocabularyWords.userId, userId),
        eq(vocabularyWords.workspaceId, workspace.id),
      ),
    );

  return row?.value ?? 0;
}

export async function getExerciseStudioData(): Promise<ExerciseStudioData> {
  return withTiming("exercises.studio", async () => {
    const { hasProAccess } = await getCurrentProAccess();
    const [theories, imports, vocabularyCount] = await Promise.all([
      getTheoryExerciseCards(),
      hasProAccess
        ? getExerciseImports().catch(() => [] as ExerciseImportListItem[])
        : Promise.resolve([] as ExerciseImportListItem[]),
      getWorkspaceVocabularyCount().catch(() => 0),
    ]);

    return { theories, imports, vocabularyCount };
  });
}
