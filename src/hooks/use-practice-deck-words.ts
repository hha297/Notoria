"use client";

import { useQuery } from "@tanstack/react-query";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import {
  isFlashcardFiltersActive,
} from "@/lib/flashcards/session";
import { queryKeys } from "@/lib/query/keys";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";

/**
 * Default SSR deck is capped (~500). When the user applies filters, reload from
 * the full workspace so tags like a small custom set are not missing.
 */
export function usePracticeDeckWords(
  workspaceId: string,
  initialWords: FlashcardWord[],
  filters: FlashcardFilters,
) {
  const filtersActive = isFlashcardFiltersActive(filters);

  const query = useQuery({
    queryKey: queryKeys.exercises.deck(workspaceId, "practice", {
      tag: filters.tag,
      partOfSpeech: filters.partOfSpeech,
      status: filters.status,
    }),
    queryFn: () => getFlashcardWords({ filters }),
    enabled: Boolean(workspaceId) && filtersActive,
  });

  if (!filtersActive) {
    return { words: initialWords, isLoading: false };
  }

  return {
    words: query.data ?? [],
    isLoading: query.isPending || (query.isFetching && !query.data),
  };
}
