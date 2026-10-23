import { describe, expect, it } from "vitest";
import {
  checkState,
  folderPathLabel,
  groupTheoryPickerNotes,
  toggleMembers,
  UNFILED_GROUP_ID,
} from "@/lib/theory-exercises/group-picker";

const folders = [
  { id: "a", name: "A", parentId: null },
  { id: "b", name: "B", parentId: "a" },
  { id: "c", name: "C", parentId: "b" },
  { id: "empty", name: "Empty", parentId: null },
];

describe("theory exercise picker groups", () => {
  it("groups by immediate folder id with the full path and library order", () => {
    const notes = [
      { id: "n1", folderId: "c" },
      { id: "n2", folderId: "a" },
      { id: "n3", folderId: "c" },
      { id: "n1", folderId: "a" },
      { id: "n4", folderId: null },
      { id: "gone", folderId: "missing" },
    ];
    const grouped = groupTheoryPickerNotes(notes, folders);
    expect(grouped.kind).toBe("grouped");
    if (grouped.kind !== "grouped") return;
    expect(grouped.groups.map((group) => group.id)).toEqual([
      "a",
      "c",
      UNFILED_GROUP_ID,
    ]);
    expect(folderPathLabel(grouped.groups[0]!.path)).toBe("A");
    expect(grouped.groups[0]!.notes.map((note) => note.id)).toEqual(["n2"]);
    expect(folderPathLabel(grouped.groups[1]!.path)).toBe("A → B → C");
    expect(grouped.groups[1]!.notes.map((note) => note.id)).toEqual(["n1", "n3"]);
    expect(grouped.groups[2]!.notes.map((note) => note.id)).toEqual([
      "n4",
      "gone",
    ]);
    expect(grouped.groups.some((group) => group.id === "empty")).toBe(false);
    expect(grouped.groups.some((group) => group.id === "b")).toBe(false);
  });

  it("stays flat when there are no folders or every note is unfiled", () => {
    const notes = [{ id: "n1", folderId: null }];
    expect(groupTheoryPickerNotes(notes, []).kind).toBe("flat");
    expect(groupTheoryPickerNotes(notes, folders).kind).toBe("flat");
  });

  it("selects only the ids it is given", () => {
    const selected = toggleMembers(new Set(["keep"]), ["a", "b"], true);
    expect([...selected].sort()).toEqual(["a", "b", "keep"]);
    expect(checkState(selected, ["a", "b"])).toBe("all");
    expect(checkState(selected, ["a", "c"])).toBe("some");
    const cleared = toggleMembers(selected, ["a", "b"], false);
    expect(cleared.has("keep")).toBe(true);
    expect(cleared.has("a")).toBe(false);
  });
});
