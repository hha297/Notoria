import { Skeleton } from "@/components/ui/skeleton";

export function WritingListLoading() {
  return (
    <div
      aria-busy
      aria-label="Loading"
      className="notoria-route-loading writing-atelier flex flex-col gap-10 lg:gap-12"
    >
      <div className="writing-hero">
        <div className="writing-hero-copy space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="writing-hero-actions">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="writing-workspace space-y-4">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-12 w-64" />
      </div>
      <div
        className="writing-atelier-rule h-1.5 w-full shrink-0 rounded-full"
        aria-hidden="true"
      />
      <div className="writing-stage space-y-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export function WritingDetailLoading() {
  return (
    <div
      aria-busy
      aria-label="Loading"
      className="notoria-route-loading writing-paper mx-auto max-w-6xl space-y-8"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="min-h-[18rem] w-full" />
    </div>
  );
}
