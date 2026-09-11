"use client";

import { useQuery, type QueryKey, type UseQueryResult } from "@tanstack/react-query";

type HydratedQueryOptions<T> = {
  queryKey: QueryKey;
  initialData: T;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
};

/**
 * Hydrate a TanStack Query from RSC props, then refetch/invalidate from cache.
 */
export function useHydratedQuery<T>({
  queryKey,
  initialData,
  queryFn,
  enabled = true,
  staleTime = 60_000,
}: HydratedQueryOptions<T>): UseQueryResult<T> {
  return useQuery({
    queryKey,
    queryFn,
    initialData,
    enabled,
    staleTime,
  });
}
