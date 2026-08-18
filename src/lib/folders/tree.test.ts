import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbs,
  canCreateChildFolder,
  childrenOf,
  descendantIds,
  folderDepth,
  isDescendant,
  wouldCreateCycle,
} from "@/lib/folders/tree";
import { MAX_FOLDER_DEPTH, type FolderListItem } from "@/lib/folders/types";

function folder(
  id: string,
  name: string,
  parentId: string | null = null,
): FolderListItem {
  return {
    id,
    name,
    parentId,
    section: "writing",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const tree = [
  folder("root-a", "A"),
  folder("root-b", "B"),
  folder("child-a1", "A1", "root-a"),
  folder("child-a2", "A2", "root-a"),
  folder("grand-a1x", "A1X", "child-a1"),
];

describe("folder tree", () => {
  it("lists children of a parent, sorted by name", () => {
    expect(childrenOf(tree, "root-a").map((item) => item.id)).toEqual([
      "child-a1",
      "child-a2",
    ]);
    expect(childrenOf(tree, null).map((item) => item.id)).toEqual([
      "root-a",
      "root-b",
    ]);
  });

  it("collects descendant ids", () => {
    expect(descendantIds(tree, "root-a").sort()).toEqual([
      "child-a1",
      "child-a2",
      "grand-a1x",
    ]);
    expect(descendantIds(tree, "root-b")).toEqual([]);
  });

  it("detects descendants and invalid moves", () => {
    expect(isDescendant(tree, "root-a", "grand-a1x")).toBe(true);
    expect(wouldCreateCycle(tree, "root-a", "grand-a1x")).toBe(true);
    expect(wouldCreateCycle(tree, "root-a", "root-a")).toBe(true);
    expect(wouldCreateCycle(tree, "root-a", "root-b")).toBe(false);
    expect(wouldCreateCycle(tree, "root-a", null)).toBe(false);
  });

  it("builds breadcrumbs from root to current folder", () => {
    expect(buildBreadcrumbs(tree, "grand-a1x")).toEqual([
      { id: "root-a", name: "A" },
      { id: "child-a1", name: "A1" },
      { id: "grand-a1x", name: "A1X" },
    ]);
    expect(buildBreadcrumbs(tree, null)).toEqual([]);
  });

  it("caps nested folder depth", () => {
    const deep: FolderListItem[] = [];
    let parent: string | null = null;
    for (let index = 0; index < MAX_FOLDER_DEPTH; index += 1) {
      const id = `d${index}`;
      deep.push(folder(id, id, parent));
      parent = id;
    }
    expect(folderDepth(deep, parent)).toBe(MAX_FOLDER_DEPTH);
    expect(canCreateChildFolder(deep, parent)).toBe(false);
    expect(canCreateChildFolder(tree, "grand-a1x")).toBe(true);
  });
});
