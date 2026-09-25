export const SEARCH_RESULT_TYPES = [
  "vocabulary",
  "theory",
  "writing",
  "listening",
  "speaking",
  "folder",
  "exercise",
  "inbox",
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export type SearchGroupKind = "pos" | "category" | "folder" | "section";

export type SearchScope = {
  userId: string;
  workspaceId: string;
};

export type PreparedQuery = {
  raw: string;
  normalized: string;
  firstToken: string;
  like: string;
  prefixLike: string;
  tsQuery: string;
};

export type SearchHit = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  group: string | null;
  groupKind: SearchGroupKind | null;
  snippetCandidates: Array<string | null | undefined>;
  href: string;
  score: number;
};

export type SearchSource = {
  type: SearchResultType;
  search: (
    scope: SearchScope,
    query: PreparedQuery,
    limit: number,
  ) => Promise<SearchHit[]>;
};

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  collection: string;
  snippet: string | null;
  href: string;
};

export type SearchLabels = {
  typeLabel: (type: SearchResultType) => string;
  posGroup: (pos: string) => string;
  posSingular: (pos: string) => string;
  theoryCategory: (category: string) => string;
  folderNoun: string;
  sectionLabel: (section: string) => string;
};

export const PER_SOURCE_LIMIT = 12;
export const GLOBAL_RESULT_LIMIT = 24;
export const SNIPPET_MAX_LENGTH = 140;
