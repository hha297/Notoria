"use client";

import { useTranslations } from "next-intl";
import { ImportExercisePicker } from "@/components/exercises/import-exercise-picker";
import { ImportMaterialForm } from "@/components/exercises/import-material-form";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";

type ImportExercisePanelProps = {
  imports: ExerciseImportListItem[];
};

export function ImportExercisePanel({ imports }: ImportExercisePanelProps) {
  const t = useTranslations("exercises.import");
  const tSources = useTranslations("exercises.sources");

  return (
    <div className="space-y-10" data-exercise="import">
      <header className="import-hero relative -mx-1 px-4 py-7 sm:px-6 sm:py-8">
        <ImportDecor />
        <div className="relative max-w-2xl space-y-2">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="font-heading text-[1.65rem] font-bold tracking-tight text-pretty text-ink sm:text-[1.95rem]">
            {t("hubTitle")}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-ink/75 sm:text-[15px]">
            {tSources("importHint")}
          </p>
        </div>
      </header>

      <ImportMaterialForm />

      {imports.length > 0 ? (
        <ImportExercisePicker imports={imports} />
      ) : null}
    </div>
  );
}

function ImportDecor() {
  return (
    <div aria-hidden className="theory-decor">
      <span className="theory-blob top-[-28%] left-[-8%] size-40 bg-(--exercise-accent)" />
      <span className="theory-blob right-[-10%] bottom-[-36%] size-36 bg-module-writing-fg" />
      <span className="theory-diamond top-6 right-8 text-module-listen-fg" />
    </div>
  );
}

export function ImportExercisePanelLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="space-y-10"
      data-exercise="import"
    >
      <div className="import-hero h-32 w-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 bg-(--module-exercise-bg)/50" />
        ))}
      </div>
      <div className="import-stage h-56 w-full" />
    </div>
  );
}
