"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import {
  ExerciseSourceSelector,
  type StudioSource,
} from "@/components/exercises/exercise-source-selector";
import { ImportExercisePanel } from "@/components/exercises/import-exercise-panel";
import { TheoryExercisePicker } from "@/components/exercises/theory-exercise-picker";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";
import { ContentTransition } from "@/components/layout/content-transition";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";

const STUDIO_SOURCE_KEY = "notoria.exercise.studioSource";
const STUDIO_SOURCE_EVENT = "notoria-exercise-studio-source";

function isStudioSource(value: unknown): value is StudioSource {
  return value === "vocabulary" || value === "theory" || value === "import";
}

function readStudioSource(): StudioSource {
  try {
    const stored = window.localStorage.getItem(STUDIO_SOURCE_KEY);
    if (isStudioSource(stored)) return stored;
  } catch {
    // Ignore storage access errors.
  }
  return "vocabulary";
}

function subscribeStudioSource(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(STUDIO_SOURCE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STUDIO_SOURCE_EVENT, handler);
  };
}

type ExerciseStudioProps = {
  theories: TheoryExerciseCardItem[];
  imports?: ExerciseImportListItem[];
  workspaceName: string;
  vocabularyCount: number;
};

export function ExerciseStudio({
  theories,
  imports = [],
  workspaceName,
  vocabularyCount,
}: ExerciseStudioProps) {
  const t = useTranslations("exercises");
  const source = useSyncExternalStore(
    subscribeStudioSource,
    readStudioSource,
    () => "vocabulary" as const,
  );

  const setSource = useCallback((next: StudioSource) => {
    try {
      window.localStorage.setItem(STUDIO_SOURCE_KEY, next);
    } catch {
      // Preference persistence is optional.
    }
    window.dispatchEvent(new Event(STUDIO_SOURCE_EVENT));
  }, []);

  return (
    <div className="space-y-8">
      <ExerciseSourceSelector
        value={source}
        onChange={setSource}
        workspaceName={workspaceName}
        vocabularyCount={vocabularyCount}
        theoryCount={theories.length}
        importCount={imports.length}
      />

      <div
        role="tabpanel"
        id={`studio-panel-${source}`}
        aria-labelledby={`studio-tab-${source}`}
      >
        <ContentTransition transitionKey={source}>
          {source === "vocabulary" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("sources.vocabularyHint")}
              </p>
              <ExerciseTypePicker />
            </div>
          ) : source === "theory" ? (
            <TheoryExercisePicker theories={theories} />
          ) : (
            <ImportExercisePanel imports={imports} />
          )}
        </ContentTransition>
      </div>
    </div>
  );
}
