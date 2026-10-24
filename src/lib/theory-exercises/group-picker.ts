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

export type TheoryPickerTreeNode<T> = {
  id: string;
  folderId: string | null;
  unfiled: boolean;
  name: string;
  depth: number;
  children: TheoryPickerTreeNode<T>[];
  /** Notes filed directly in this folder. */
  notes: T[];
  /** Notes in this folder + all descendants. */
  totalNotes: number;
};

/**
 * Nested folder tree for the exercise picker.
 * Intermediate folders appear even when only descendants hold notes.
 */
export function buildTheoryPickerTree<T extends GroupableNote>(
  notes: readonly T[],
  folders: readonly TheoryPickerFolder[],
):
  | { kind: "flat"; notes: T[] }
  | { kind: "tree"; roots: TheoryPickerTreeNode<T>[] } {
  const unique = dedupeNotes(notes);
  if (folders.length === 0) return { kind: "flat", notes: unique };

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const filed = unique.some(
    (note) => Boolean(note.folderId) && byId.has(note.folderId ?? ""),
  );
  if (!filed) return { kind: "flat", notes: unique };

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

  const notesByFolder = new Map<string | null, T[]>();
  for (const note of unique) {
    const folderId =
      note.folderId && byId.has(note.folderId) ? note.folderId : null;
    const list = notesByFolder.get(folderId) ?? [];
    list.push(note);
    notesByFolder.set(folderId, list);
  }

  const build = (
    folder: TheoryPickerFolder,
    depth: number,
  ): TheoryPickerTreeNode<T> | null => {
    const childNodes = (children.get(folder.id) ?? [])
      .map((child) => build(child, depth + 1))
      .filter((node): node is TheoryPickerTreeNode<T> => node !== null);
    const directNotes = notesByFolder.get(folder.id) ?? [];
    if (directNotes.length === 0 && childNodes.length === 0) return null;
    const totalNotes =
      directNotes.length +
      childNodes.reduce((sum, child) => sum + child.totalNotes, 0);
    return {
      id: folder.id,
      folderId: folder.id,
      unfiled: false,
      name: folder.name,
      depth,
      children: childNodes,
      notes: directNotes,
      totalNotes,
    };
  };

  const roots: TheoryPickerTreeNode<T>[] = (children.get(null) ?? [])
    .map((folder) => build(folder, 0))
    .filter((node): node is TheoryPickerTreeNode<T> => node !== null);

  const unfiledNotes = notesByFolder.get(null) ?? [];
  if (unfiledNotes.length > 0) {
    roots.push({
      id: UNFILED_GROUP_ID,
      folderId: null,
      unfiled: true,
      name: "",
      depth: 0,
      children: [],
      notes: unfiledNotes,
      totalNotes: unfiledNotes.length,
    });
  }

  return { kind: "tree", roots };
}

/** Keep branches that still have matching notes after a filter. */
export function filterTheoryPickerTree<T extends GroupableNote>(
  roots: readonly TheoryPickerTreeNode<T>[],
  noteIds: ReadonlySet<string>,
): TheoryPickerTreeNode<T>[] {
  const walk = (
    node: TheoryPickerTreeNode<T>,
  ): TheoryPickerTreeNode<T> | null => {
    const notes = node.notes.filter((note) => noteIds.has(note.id));
    const children = node.children
      .map(walk)
      .filter((child): child is TheoryPickerTreeNode<T> => child !== null);
    if (notes.length === 0 && children.length === 0) return null;
    const totalNotes =
      notes.length + children.reduce((sum, child) => sum + child.totalNotes, 0);
    return { ...node, notes, children, totalNotes };
  };
  return roots
    .map(walk)
    .filter((node): node is TheoryPickerTreeNode<T> => node !== null);
}

export function collectTheoryTreeNoteIds<T extends GroupableNote>(
  nodes: readonly TheoryPickerTreeNode<T>[],
): string[] {
  const ids: string[] = [];
  const walk = (node: TheoryPickerTreeNode<T>) => {
    for (const note of node.notes) ids.push(note.id);
    for (const child of node.children) walk(child);
  };
  for (const node of nodes) walk(node);
  return ids;
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
