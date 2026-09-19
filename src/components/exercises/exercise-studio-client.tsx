"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExerciseStudio } from "@/components/exercises/exercise-studio";
import { ImportExercisePanelLoading } from "@/components/exercises/import-exercise-panel";
import { TheoryExercisePickerLoading } from "@/components/exercises/theory-exercise-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { exerciseStudioQueryOptions } from "@/lib/query/options";

type ExerciseStudioClientProps = {
  workspaceId: string;
  workspaceName: string;
};

function isStudioSource(value: unknown): value is "vocabulary" | "theory" | "import" {
  return value === "vocabulary" || value === "theory" || value === "import";
}

function readStudioSource() {
  try {
    const stored = window.localStorage.getItem("notoria.exercise.studioSource");
    if (isStudioSource(stored)) return stored;
  } catch {
    // Ignore storage access errors.
  }
  return "vocabulary" as const;
}

function subscribeStudioSource(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("notoria-exercise-studio-source", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("notoria-exercise-studio-source", onStoreChange);
  };
}

export function ExerciseStudioClient({
  workspaceId,
  workspaceName,
}: ExerciseStudioClientProps) {
  const source = useSyncExternalStore(
    subscribeStudioSource,
    readStudioSource,
    () => "vocabulary" as const,
  );
  const { data, isPending } = useQuery(exerciseStudioQueryOptions(workspaceId));

  if (isPending || !data) {
    return source === "theory" ? (
      <TheoryExercisePickerLoading />
    ) : source === "import" ? (
      <ImportExercisePanelLoading />
    ) : (
      <ExerciseStudioLoading />
    );
  }

  return (
    <ExerciseStudio
      theories={data.theories}
      imports={data.imports}
      workspaceName={workspaceName}
      vocabularyCount={data.vocabularyCount}
    />
  );
}

function ExerciseStudioLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-8">
      <Skeleton className="h-16 w-full rounded-md" />
      <div className="divide-y divide-hairline-cloud">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid gap-6 py-8 md:grid-cols-12 md:items-center"
          >
            <div className="space-y-3 md:col-span-6">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-10 w-28" />
            </div>
            <Skeleton className="h-28 w-full rounded-md md:col-span-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
