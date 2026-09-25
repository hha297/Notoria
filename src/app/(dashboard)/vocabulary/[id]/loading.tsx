import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function VocabularyDetailLoading() {
  return (
    <PageShell className="vocab-lexicon-shell">
      <div
        aria-busy="true"
        aria-label="Loading"
        className="notoria-route-loading vocab-lexicon writing-atelier flex flex-col gap-8"
      >
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>
        <div className="space-y-6 border-t border-hairline-cloud pt-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </PageShell>
  );
}
