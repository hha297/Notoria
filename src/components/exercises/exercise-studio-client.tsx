"use client";

import { useQuery } from "@tanstack/react-query";
import { ExerciseStudio } from "@/components/exercises/exercise-studio";
import { ListPageLoading } from "@/components/layout/page-loading";
import { exerciseStudioQueryOptions } from "@/lib/query/options";

export function ExerciseStudioClient({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useQuery(exerciseStudioQueryOptions(workspaceId));

  if (isPending || !data) {
    return <ListPageLoading />;
  }

  return <ExerciseStudio theories={data.theories} imports={data.imports} />;
}
