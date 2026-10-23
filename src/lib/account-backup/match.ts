import { normalizeListeningFilename } from "@/lib/listening/utils";

/**
 * Shared name matching for backup preview + import.
 * Trim + Unicode NFC only — case and accents are preserved (exact match).
 */
export function normalizeBackupName(value: string): string {
  return value.trim().normalize("NFC");
}

/** Prefer the lexicographically smallest id when several rows share a key. */
export function setCanonicalId(
  map: Map<string, string>,
  key: string,
  id: string,
) {
  const previous = map.get(key);
  if (!previous || id.localeCompare(previous) < 0) {
    map.set(key, id);
  }
}

export function indexCanonicalIds(
  entries: Array<{ key: string; id: string }>,
): { map: Map<string, string>; ambiguousCount: number } {
  const buckets = new Map<string, string[]>();
  for (const entry of entries) {
    const list = buckets.get(entry.key) ?? [];
    list.push(entry.id);
    buckets.set(entry.key, list);
  }

  const map = new Map<string, string>();
  let ambiguousCount = 0;
  for (const [key, ids] of buckets) {
    ids.sort((a, b) => a.localeCompare(b));
    map.set(key, ids[0]!);
    if (ids.length > 1) ambiguousCount += 1;
  }
  return { map, ambiguousCount };
}

export function folderMatchKey(
  workspaceId: string,
  section: string,
  parentId: string | null,
  name: string,
) {
  return `${workspaceId}::${section}::${parentId ?? ""}::${normalizeBackupName(name)}`;
}

/** Content titles match within workspace + section/type, ignoring folder. */
export function contentTitleKey(
  workspaceId: string,
  section: string,
  title: string,
) {
  return `${workspaceId}::${section}::${normalizeBackupName(title)}`;
}

/** Vocabulary duplicates by word only (POS ignored). */
export function vocabWordKey(workspaceId: string, word: string) {
  return `${workspaceId}::${normalizeBackupName(word)}`;
}

export function tagMatchKey(workspaceId: string, name: string) {
  return `${workspaceId}::${normalizeBackupName(name)}`;
}

/**
 * Listening also has a DB unique index on lower(trim(originalFilename)).
 * Filename matching stays case-insensitive to match that constraint.
 */
export function listeningFilenameKey(
  workspaceId: string,
  originalFilename: string | null | undefined,
) {
  if (!originalFilename?.trim()) return null;
  const normalized = normalizeListeningFilename(originalFilename);
  return normalized ? `${workspaceId}::${normalized}` : null;
}

export function exerciseSectionKey(type: string) {
  return type.toUpperCase() === "WRITING" ? "writing" : `exercise:${type.toUpperCase()}`;
}

export type ExistingInventory = {
  workspaces: Array<{ id: string; language: string; name: string }>;
  /** key -> destination folder id */
  folders: Map<string, string>;
  folderAmbiguous: number;
  /** key -> tag already present */
  tags: Set<string>;
  vocabulary: Set<string>;
  theory: Set<string>;
  writing: Set<string>;
  exercises: Set<string>;
  listeningTitles: Set<string>;
  listeningFilenames: Set<string>;
  speaking: Set<string>;
};

export function emptyInventory(
  workspaces: ExistingInventory["workspaces"] = [],
): ExistingInventory {
  return {
    workspaces,
    folders: new Map(),
    folderAmbiguous: 0,
    tags: new Set(),
    vocabulary: new Set(),
    theory: new Set(),
    writing: new Set(),
    exercises: new Set(),
    listeningTitles: new Set(),
    listeningFilenames: new Set(),
    speaking: new Set(),
  };
}
