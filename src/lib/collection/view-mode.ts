export const COLLECTION_VIEW_MODES = ["list", "cards"] as const;
export type CollectionViewMode = (typeof COLLECTION_VIEW_MODES)[number];

export type CollectionViewSection =
  | "writing"
  | "listening"
  | "speaking"
  | "reading";

export function isCollectionViewMode(
  value: string | null | undefined,
): value is CollectionViewMode {
  return value === "list" || value === "cards";
}

export function collectionViewModeKey(section: CollectionViewSection) {
  return `notoria.${section}.viewMode`;
}
