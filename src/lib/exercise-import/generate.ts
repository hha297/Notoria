import { ExerciseImportError } from "@/lib/exercise-import/errors";
import { generateExercisesFromSourceText } from "@/lib/exercise-import/generate-from-source";
import type { TheoryExercise } from "@/lib/theory-exercises/types";

/**
 * Generate exercises from extracted import text with source fidelity
 * (no invented sentences / vocabulary — worksheet cues only).
 */
export async function generateExercisesFromImport(input: {
  importId: string;
  title: string;
  extractedText: string;
  studyLanguage?: string;
  /** Ignored — import does not pad to a fixed count. */
  count?: number;
}): Promise<TheoryExercise[]> {
  try {
    return await generateExercisesFromSourceText({
      importId: input.importId,
      title: input.title,
      extractedText: input.extractedText,
      studyLanguage: input.studyLanguage,
    });
  } catch (error) {
    if (error instanceof ExerciseImportError) throw error;
    if (error instanceof Error && error.message === "OPENAI_NOT_CONFIGURED") {
      throw new ExerciseImportError("OPENAI_NOT_CONFIGURED");
    }
    if (error instanceof Error && error.message === "AI_INVALID_RESPONSE") {
      throw new ExerciseImportError("GENERATION_FAILED");
    }
    throw error;
  }
}
