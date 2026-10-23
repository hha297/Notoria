export const UNFILED_GROUP_ID = "__unfiled__";

export type TheoryPickerFolder = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TheoryPickerGroup<T> = {
  id: string;
  folderId: string | null;
  unfiled: boolean;
  /** Ancestor names ending with this folder. Empty for unfiled. */
  path: string[];
  notes: T[];
};

type GroupableNote = {
  id: string;
  folderId?: string | null;
};

export type CheckState = "none" | "some" | "all";

function dedupeNotes<T extends GroupableNote>(notes: readonly T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const note of notes) {
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    unique.push(note);
  }
  return unique;
}

function pathNames(
  folderId: string,
  byId: ReadonlyMap<string, TheoryPickerFolder>,
) {
  const names: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names;
}

/**
 * Group theory notes by their immediate folder id.
 * Flat when the library has no folders, or every note is unfiled.
 */
export function groupTheoryPickerNotes<T extends GroupableNote>(
  notes: readonly T[],
  folders: readonly TheoryPickerFolder[],
): { kind: "flat"; notes: T[] } | { kind: "grouped"; groups: TheoryPickerGroup<T>[] } {
  const unique = dedupeNotes(notes);
  if (folders.length === 0) return { kind: "flat", notes: unique };

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const filed = unique.some(
    (note) => Boolean(note.folderId) && byId.has(note.folderId ?? ""),
  );
  if (!filed) return { kind: "flat", notes: unique };

  const buckets = new Map<string, T[]>();
  for (const note of unique) {
    const folderId =
      note.folderId && byId.has(note.folderId) ? note.folderId : null;
    const key = folderId ?? UNFILED_GROUP_ID;
    const list = buckets.get(key) ?? [];
    list.push(note);
    buckets.set(key, list);
  }

  const groups: TheoryPickerGroup<T>[] = [];
  for (const [key, members] of buckets) {
    if (members.length === 0) continue;
    if (key === UNFILED_GROUP_ID) {
      groups.push({
        id: UNFILED_GROUP_ID,
        folderId: null,
        unfiled: true,
        path: [],
        notes: members,
      });
      continue;
    }
    groups.push({
      id: key,
      folderId: key,
      unfiled: false,
      path: pathNames(key, byId),
      notes: members,
    });
  }

  const treeOrder = folderTreeOrder(folders, byId);
  const noteOrder = new Map(unique.map((note, index) => [note.id, index]));
  groups.sort((left, right) => {
    if (left.unfiled !== right.unfiled) return left.unfiled ? 1 : -1;
    const leftTree = left.folderId ? (treeOrder.get(left.folderId) ?? 0) : 0;
    const rightTree = right.folderId ? (treeOrder.get(right.folderId) ?? 0) : 0;
    if (leftTree !== rightTree) return leftTree - rightTree;
    const leftIndex = Math.min(
      ...left.notes.map((note) => noteOrder.get(note.id) ?? 0),
    );
    const rightIndex = Math.min(
      ...right.notes.map((note) => noteOrder.get(note.id) ?? 0),
    );
    return leftIndex - rightIndex;
  });

  return { kind: "grouped", groups };
}

/** Depth-first folder order: siblings by name, parents before descendants. */
function folderTreeOrder(
  folders: readonly TheoryPickerFolder[],
  byId: ReadonlyMap<string, TheoryPickerFolder>,
) {
  const children = new Map<string | null, TheoryPickerFolder[]>();
  for (const folder of folders) {
    const parentId =
      folder.parentId && byId.has(folder.parentId) ? folder.parentId : null;
    const list = children.get(parentId) ?? [];
    list.push(folder);
    children.set(parentId, list);
  }
  for (const list of children.values()) {
    list.sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );
  }
  const order = new Map<string, number>();
  let index = 0;
  const walk = (parentId: string | null) => {
    for (const child of children.get(parentId) ?? []) {
      order.set(child.id, index);
      index += 1;
      walk(child.id);
    }
  };
  walk(null);
  return order;
}

export function folderPathLabel(path: readonly string[], separator = " → ") {
  return path.filter(Boolean).join(separator);
}

export function checkState(
  selectedIds: ReadonlySet<string>,
  memberIds: readonly string[],
): CheckState {
  if (memberIds.length === 0) return "none";
  let count = 0;
  for (const id of memberIds) {
    if (selectedIds.has(id)) count += 1;
  }
  if (count === 0) return "none";
  if (count === memberIds.length) return "all";
  return "some";
}

/** Toggle only the given member ids. Other selections stay. */
export function toggleMembers(
  selectedIds: ReadonlySet<string>,
  memberIds: readonly string[],
  select: boolean,
) {
  const next = new Set(selectedIds);
  for (const id of memberIds) {
    if (select) next.add(id);
    else next.delete(id);
  }
  return next;
}
