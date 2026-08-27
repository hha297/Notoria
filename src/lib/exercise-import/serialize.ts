import type {
  ExerciseImport,
  ExerciseImportStatus,
  ImportedExercise,
} from "@/db/schema";
import type {
  ExerciseImportDetail,
  ExerciseImportListItem,
} from "@/lib/exercise-import/types";
import type { TheoryExercise } from "@/lib/theory-exercises/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStoredExercise(raw: unknown): TheoryExercise | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  return raw as unknown as TheoryExercise;
}

export function toImportListItem(
  row: ExerciseImport & {
    exercises?: Pick<ImportedExercise, "id">[];
  },
): ExerciseImportListItem {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.sourceType,
    status: row.status as ExerciseImportStatus,
    errorCode: row.errorCode,
    exerciseCount: row.exercises?.length ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sourceUrl: row.sourceUrl,
    originalFilename: row.originalFilename,
  };
}

export function toImportDetail(
  row: ExerciseImport & {
    exercises: ImportedExercise[];
  },
): ExerciseImportDetail {
  const exercises = row.exercises
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => parseStoredExercise(item.data))
    .filter((item): item is TheoryExercise => item !== null);

  return {
    ...toImportListItem({
      ...row,
      exercises: row.exercises.map((e) => ({ id: e.id })),
    }),
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    extractedText: row.extractedText,
    exercises,
  };
}
