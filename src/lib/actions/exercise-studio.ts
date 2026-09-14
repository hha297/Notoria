"use server";

import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getExerciseImports } from "@/lib/actions/exercise-import";
import { getTheoryExerciseCards } from "@/lib/actions/theory";
import { withTiming } from "@/lib/perf/dev-timing";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";

export type ExerciseStudioData = {
  theories: TheoryExerciseCardItem[];
  imports: ExerciseImportListItem[];
};

export async function getExerciseStudioData(): Promise<ExerciseStudioData> {
  return withTiming("exercises.studio", async () => {
    const { hasProAccess } = await getCurrentProAccess();
    const [theories, imports] = await Promise.all([
      getTheoryExerciseCards(),
      hasProAccess
        ? getExerciseImports().catch(() => [] as ExerciseImportListItem[])
        : Promise.resolve([] as ExerciseImportListItem[]),
    ]);

    return { theories, imports };
  });
}
