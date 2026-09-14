import { queryOptions } from "@tanstack/react-query";
import { getExerciseStudioData } from "@/lib/actions/exercise-studio";
import { getFolders } from "@/lib/actions/folders";
import type { FolderSection } from "@/lib/folders/types";
import { getListeningLessons } from "@/lib/actions/listening";
import { getSpeakingSessions } from "@/lib/actions/speaking";
import { getTheoryNotes } from "@/lib/actions/theory";
import {
  getVocabularyListWords,
  getVocabularyWord,
  listVocabularySynonymOptions,
} from "@/lib/actions/vocabulary";
import { getActiveWorkspaceCustomTags } from "@/lib/actions/workspaces";
import { getWritingDocuments } from "@/lib/actions/writing";
import { queryKeys } from "@/lib/query/keys";
import {
  serializeVocabularyDetailWord,
  serializeVocabularyListWords,
} from "@/lib/vocabulary/serialize-list";
import { serializeWritingListDocuments } from "@/lib/writing/serialize-list";

export function vocabularyListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.vocabulary.list(workspaceId),
    queryFn: async () => {
      const words = await getVocabularyListWords();
      return serializeVocabularyListWords(words);
    },
    enabled: Boolean(workspaceId),
  });
}

export function vocabularyDetailQueryOptions(
  workspaceId: string,
  wordId: string,
) {
  return queryOptions({
    queryKey: queryKeys.vocabulary.detail(workspaceId, wordId),
    queryFn: async () => {
      const word = await getVocabularyWord(wordId);
      if (!word) return null;
      return serializeVocabularyDetailWord(word);
    },
    enabled: Boolean(workspaceId && wordId),
  });
}

export function vocabularySynonymOptionsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.vocabulary.synonymOptions(workspaceId),
    queryFn: () => listVocabularySynonymOptions(),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  });
}

export function workspaceCustomTagsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.workspace.customTags(workspaceId),
    queryFn: () => getActiveWorkspaceCustomTags(),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  });
}

export function theoryListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.theory.list(workspaceId),
    queryFn: () => getTheoryNotes(),
    enabled: Boolean(workspaceId),
  });
}

export function writingListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.writing.list(workspaceId),
    queryFn: async () => {
      const documents = await getWritingDocuments();
      return serializeWritingListDocuments(documents);
    },
    enabled: Boolean(workspaceId),
  });
}

export function listeningListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.listening.list(workspaceId),
    queryFn: () => getListeningLessons(),
    enabled: Boolean(workspaceId),
  });
}

export function speakingListQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.speaking.list(workspaceId),
    queryFn: () => getSpeakingSessions(),
    enabled: Boolean(workspaceId),
  });
}

export function exerciseStudioQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: queryKeys.exercises.studio(workspaceId),
    queryFn: () => getExerciseStudioData(),
    enabled: Boolean(workspaceId),
  });
}

export function folderListQueryOptions(
  workspaceId: string,
  section: FolderSection,
) {
  return queryOptions({
    queryKey: queryKeys.folders.list(workspaceId, section),
    queryFn: () => getFolders(section),
    enabled: Boolean(workspaceId),
  });
}
