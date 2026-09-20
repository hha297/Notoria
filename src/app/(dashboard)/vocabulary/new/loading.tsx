import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="notoria-route-loading mx-auto max-w-5xl space-y-8 pt-1 sm:pt-2"
    >
      <Skeleton className="h-4 w-36" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(13rem,0.55fr)]">
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-11 w-36" />
      </div>
    </div>
  );
}
