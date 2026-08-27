"use client";

import { ImportExercisePicker } from "@/components/exercises/import-exercise-picker";
import { ImportMaterialForm } from "@/components/exercises/import-material-form";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";

type ImportExercisePanelProps = {
  imports: ExerciseImportListItem[];
};

export function ImportExercisePanel({ imports }: ImportExercisePanelProps) {
  return (
    <div className="space-y-8">
      <ImportMaterialForm />
      <ImportExercisePicker imports={imports} />
    </div>
  );
}
