import type { QueryClient } from "@tanstack/react-query";
import {
  exerciseStudioQueryOptions,
  folderListQueryOptions,
  listeningListQueryOptions,
  speakingListQueryOptions,
  theoryListQueryOptions,
  vocabularyListQueryOptions,
  writingListQueryOptions,
} from "@/lib/query/options";

async function prefetchQuietly(queryClient: QueryClient, options: object) {
  try {
    await queryClient.prefetchQuery(options as never);
  } catch {
    // Speculative prefetch must never break navigation.
  }
}

/**
 * Prefetch TanStack data for a likely dashboard destination.
 * Failures are swallowed; a later click uses the normal fetch path.
 */
export async function prefetchDashboardDestination(
  queryClient: QueryClient,
  href: string,
  workspaceId: string | null | undefined,
) {
  if (!workspaceId) return;

  const path = href.split("?")[0] ?? href;

  if (path === "/vocabulary") {
    await prefetchQuietly(queryClient, vocabularyListQueryOptions(workspaceId));
    return;
  }

  if (path === "/theory" || path.startsWith("/theory/folders/")) {
    await Promise.all([
      prefetchQuietly(queryClient, theoryListQueryOptions(workspaceId)),
      prefetchQuietly(queryClient, folderListQueryOptions(workspaceId, "theory")),
    ]);
    return;
  }

  if (path === "/writing" || path.startsWith("/writing/folders/")) {
    await Promise.all([
      prefetchQuietly(queryClient, writingListQueryOptions(workspaceId)),
      prefetchQuietly(
        queryClient,
        folderListQueryOptions(workspaceId, "writing"),
      ),
    ]);
    return;
  }

  if (path === "/listening" || path.startsWith("/listening/folders/")) {
    await Promise.all([
      prefetchQuietly(queryClient, listeningListQueryOptions(workspaceId)),
      prefetchQuietly(
        queryClient,
        folderListQueryOptions(workspaceId, "listening"),
      ),
    ]);
    return;
  }

  if (path === "/speaking") {
    await prefetchQuietly(queryClient, speakingListQueryOptions(workspaceId));
    return;
  }

  if (path === "/exercises") {
    await prefetchQuietly(queryClient, exerciseStudioQueryOptions(workspaceId));
  }
}
