"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";

function filterById<T extends { id: string }>(
  items: T[] | undefined,
  id: string,
): T[] | undefined {
  if (!items) return items;
  return items.filter((item) => item.id !== id);
}

export function useInvalidateWorkspaceQueries(
  workspaceId: string | null | undefined,
) {
  const queryClient = useQueryClient();

  return {
    invalidateVocabulary: () => {
      if (!workspaceId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.vocabulary.all(workspaceId),
      });
    },
    invalidateWriting: () => {
      if (!workspaceId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.writing.all(workspaceId),
      });
    },
    invalidateTheory: () => {
      if (!workspaceId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.theory.all(workspaceId),
      });
    },
    invalidateListening: () => {
      if (!workspaceId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listening.all(workspaceId),
      });
    },
    invalidateSpeaking: () => {
      if (!workspaceId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.speaking.all(workspaceId),
      });
    },
    removeVocabularyWord: (id: string) => {
      if (!workspaceId) return;
      queryClient.setQueriesData(
        { queryKey: queryKeys.vocabulary.all(workspaceId) },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return filterById(old as Array<{ id: string }>, id);
        },
      );
      queryClient.removeQueries({
        queryKey: queryKeys.vocabulary.detail(workspaceId, id),
      });
    },
    removeWritingDocument: (id: string) => {
      if (!workspaceId) return;
      queryClient.setQueriesData(
        { queryKey: queryKeys.writing.all(workspaceId) },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return filterById(old as Array<{ id: string }>, id);
        },
      );
      queryClient.removeQueries({
        queryKey: queryKeys.writing.detail(workspaceId, id),
      });
    },
    removeTheoryNote: (id: string) => {
      if (!workspaceId) return;
      queryClient.setQueriesData(
        { queryKey: queryKeys.theory.all(workspaceId) },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return filterById(old as Array<{ id: string }>, id);
        },
      );
      queryClient.removeQueries({
        queryKey: queryKeys.theory.detail(workspaceId, id),
      });
    },
  };
}
