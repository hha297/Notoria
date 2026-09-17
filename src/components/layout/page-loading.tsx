import { Skeleton } from "@/components/ui/skeleton";

const loadingProps = {
  "aria-busy": true as const,
  "aria-label": "Loading",
  className: "notoria-route-loading space-y-8",
};

export function ListPageLoading() {
  return (
    <div {...loadingProps}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DetailPageLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="notoria-route-loading mx-auto max-w-3xl space-y-8"
    >
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-[28rem] w-full rounded-xl" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/** Form / editor shells (theory, writing, vocabulary edit). */
export function FormPageLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="notoria-route-loading mx-auto max-w-4xl space-y-8"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="space-y-4 rounded-xl border border-hairline-cloud p-4 sm:p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2 max-w-xs" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="min-h-[16rem] w-full rounded-lg sm:min-h-[22rem]" />
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

export function DashboardPageLoading() {
  return (
    <div {...loadingProps}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Compact session / practice shell. */
export function SessionPageLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="notoria-route-loading mx-auto max-w-3xl space-y-6"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
