import { describe, expect, it } from "vitest";
import {
  filterInboxByFolderScope,
  resolveInboxFolderScope,
} from "@/lib/inbox/scope";

const items = [
  { id: "1", folderId: null },
  { id: "2", folderId: "folder-a" },
  { id: "3", folderId: "folder-b" },
  { id: "4", folderId: "folder-a" },
];

describe("filterInboxByFolderScope", () => {
  it("returns everything for all", () => {
    expect(filterInboxByFolderScope(items, "all")).toHaveLength(4);
  });

  it("returns only null folderId for unfiled", () => {
    expect(filterInboxByFolderScope(items, "unfiled").map((i) => i.id)).toEqual(
      ["1"],
    );
  });

  it("returns items in a concrete folder", () => {
    expect(
      filterInboxByFolderScope(items, "folder-a").map((i) => i.id),
    ).toEqual(["2", "4"]);
  });
});

describe("resolveInboxFolderScope", () => {
  it("keeps virtual scopes", () => {
    expect(resolveInboxFolderScope("all", ["folder-a"])).toBe("all");
    expect(resolveInboxFolderScope("unfiled", ["folder-a"])).toBe("unfiled");
  });

  it("falls back when a folder is gone", () => {
    expect(resolveInboxFolderScope("folder-a", ["folder-b"])).toBe("all");
  });

  it("keeps an existing folder", () => {
    expect(resolveInboxFolderScope("folder-a", ["folder-a", "folder-b"])).toBe(
      "folder-a",
    );
  });
});
