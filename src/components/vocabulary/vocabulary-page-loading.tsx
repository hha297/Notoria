"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useVocabularyViewMode } from "@/hooks/use-vocabulary-view-mode";

export function VocabularyPageLoading() {
  const [viewMode] = useVocabularyViewMode();

  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="notoria-route-loading space-y-5"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-14 w-full rounded-xl" />

      {viewMode === "cards" ? <CardSkeletons /> : <ListSkeletons />}
    </div>
  );
}

function ListSkeletons() {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline-cloud">
      <div className="border-b border-hairline-cloud bg-muted/30 px-4 py-2.5">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="divide-y divide-hairline-cloud">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex gap-4 px-4 py-3.5">
            <Skeleton className="w-1 self-stretch rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardSkeletons() {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline-cloud">
      <div className="border-b border-hairline-cloud bg-muted/30 px-4 py-2.5">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
