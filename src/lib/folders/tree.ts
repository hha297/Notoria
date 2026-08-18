import { MAX_FOLDER_DEPTH, type FolderListItem } from "@/lib/folders/types";

export function childrenOf(
  folders: FolderListItem[],
  parentId: string | null,
) {
  return folders
    .filter((folder) => (folder.parentId ?? null) === parentId)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

export function findFolder(folders: FolderListItem[], id: string | null) {
  if (!id) return null;
  return folders.find((folder) => folder.id === id) ?? null;
}

export function descendantIds(
  folders: FolderListItem[],
  rootId: string,
): string[] {
  const childrenByParent = new Map<string | null, FolderListItem[]>();
  for (const folder of folders) {
    const parentId = folder.parentId ?? null;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(folder);
    childrenByParent.set(parentId, list);
  }

  const ids: string[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    ids.push(current.id);
    const children = childrenByParent.get(current.id);
    if (children) stack.push(...children);
  }
  return ids;
}

export function isDescendant(
  folders: FolderListItem[],
  ancestorId: string,
  candidateId: string,
) {
  return descendantIds(folders, ancestorId).includes(candidateId);
}

export function wouldCreateCycle(
  folders: FolderListItem[],
  folderId: string,
  nextParentId: string | null,
) {
  if (!nextParentId) return false;
  if (nextParentId === folderId) return true;
  return isDescendant(folders, folderId, nextParentId);
}

export function folderDepth(
  folders: FolderListItem[],
  folderId: string | null,
): number {
  if (!folderId) return 0;
  const seen = new Set<string>();
  let current = findFolder(folders, folderId);
  let depth = 0;
  while (current) {
    depth += 1;
    if (seen.has(current.id)) return depth;
    seen.add(current.id);
    current = findFolder(folders, current.parentId);
  }
  return depth;
}

export function canCreateChildFolder(
  folders: FolderListItem[],
  parentId: string | null,
) {
  return folderDepth(folders, parentId) < MAX_FOLDER_DEPTH;
}

export function buildBreadcrumbs(
  folders: FolderListItem[],
  folderId: string | null,
): { id: string; name: string }[] {
  if (!folderId) return [];
  const crumbs: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  let current = findFolder(folders, folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    crumbs.unshift({ id: current.id, name: current.name });
    current = findFolder(folders, current.parentId);
  }
  return crumbs;
}

export function countItemsInFolders<T extends { folderId?: string | null }>(
  items: T[],
  folderIds: Iterable<string>,
) {
  const ids = new Set(folderIds);
  return items.filter((item) => item.folderId && ids.has(item.folderId)).length;
}

export function folderMatchesQuery(folder: FolderListItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return folder.name.toLowerCase().includes(needle);
}

export function itemsInFolder<T extends { folderId?: string | null }>(
  items: T[],
  folderId: string | null,
) {
  return items.filter((item) => (item.folderId ?? null) === folderId);
}
