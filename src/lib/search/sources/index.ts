import { vocabularySearchSource } from "@/lib/search/sources/vocabulary";
import { theorySearchSource } from "@/lib/search/sources/theory";
import { writingSearchSource } from "@/lib/search/sources/writing";
import { listeningSearchSource } from "@/lib/search/sources/listening";
import { speakingSearchSource } from "@/lib/search/sources/speaking";
import { folderSearchSource } from "@/lib/search/sources/folders";
import { exerciseSearchSource } from "@/lib/search/sources/exercises";
import type { SearchSource } from "@/lib/search/types";

/**
 * Register a new searchable entity by adding a source here.
 * Each source owns its SQL, ranking fields, and destination href.
 */
export const SEARCH_SOURCES: readonly SearchSource[] = [
  vocabularySearchSource,
  theorySearchSource,
  writingSearchSource,
  listeningSearchSource,
  speakingSearchSource,
  folderSearchSource,
  exerciseSearchSource,
];

