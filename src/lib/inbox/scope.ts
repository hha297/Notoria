export type InboxFolderScope = "all" | "unfiled" | string;

export type InboxScopedItem = {
  folderId: string | null;
};

/** Filter captures for All / Unfiled / a concrete folder id. */
export function filterInboxByFolderScope<T extends InboxScopedItem>(
  items: T[],
  scope: InboxFolderScope,
): T[] {
  if (scope === "all") return items;
  if (scope === "unfiled") return items.filter((item) => !item.folderId);
  return items.filter((item) => item.folderId === scope);
}

/** Keep a selected folder scope valid after folders are removed. */
export function resolveInboxFolderScope(
  scope: InboxFolderScope,
  folderIds: Iterable<string>,
): InboxFolderScope {
  if (scope === "all" || scope === "unfiled") return scope;
  for (const id of folderIds) {
    if (id === scope) return scope;
  }
  return "all";
}
