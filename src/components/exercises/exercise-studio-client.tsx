"use client";

import { useQuery } from "@tanstack/react-query";
import { ExerciseStudio } from "@/components/exercises/exercise-studio";
import { Skeleton } from "@/components/ui/skeleton";
import { exerciseStudioQueryOptions } from "@/lib/query/options";

type ExerciseStudioClientProps = {
  workspaceId: string;
  workspaceName: string;
};

export function ExerciseStudioClient({
  workspaceId,
  workspaceName,
}: ExerciseStudioClientProps) {
  const { data, isPending } = useQuery(exerciseStudioQueryOptions(workspaceId));

  if (isPending || !data) {
    return <ExerciseStudioLoading />;
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
