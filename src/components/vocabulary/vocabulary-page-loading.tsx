"use client";

import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { Skeleton } from "@/components/ui/skeleton";
import { useVocabularyViewMode } from "@/hooks/use-vocabulary-view-mode";

export function VocabularyPageLoading() {
  const [viewMode] = useVocabularyViewMode();

  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={mx(featureStyles, "notoria-route-loading vocab-lexicon writing-atelier flex flex-col gap-10 lg:gap-12")}
    >
      <div className="writing-hero">
        <div className="writing-hero-copy space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex flex-wrap gap-4 pt-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-24" />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <Skeleton className="h-0.5 w-full rounded-full" />

      {viewMode === "cards" ? <CardSkeletons /> : <ListSkeletons />}
    </div>
  );
}

function ListSkeletons() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-3 w-20" />
      <div className="space-y-0">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[3px_minmax(0,1fr)] gap-4 border-t border-hairline-cloud/60 py-4 first:border-t-0"
          >
            <Skeleton className="w-full self-stretch rounded-full" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardSkeletons() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-20" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
