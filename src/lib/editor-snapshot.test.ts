import { describe, expect, it } from "vitest";
import { createEmptyTheoryDoc } from "@/lib/theory/content";
import {
  buildTheoryEditorSnapshot,
  theoryEditorHasRequiredContent,
  theoryEditorSnapshotsEqual,
} from "@/lib/theory/editor-snapshot";
import {
  buildWritingEditorSnapshot,
  writingEditorHasRequiredContent,
  writingEditorSnapshotsEqual,
} from "@/lib/writing/editor-snapshot";
import type { WritingEditorState } from "@/lib/writing/content";

describe("theory editor snapshot", () => {
  it("requires a title and detects dirty content", () => {
    const empty = buildTheoryEditorSnapshot({
      title: "",
      category: "grammar",
      description: "",
      doc: createEmptyTheoryDoc(),
    });
    expect(theoryEditorHasRequiredContent(empty)).toBe(false);

    const original = buildTheoryEditorSnapshot({
      title: "Cases",
      category: "grammar",
      description: "Notes",
      doc: createEmptyTheoryDoc(),
    });
    const edited = buildTheoryEditorSnapshot({
      title: "Cases",
      category: "grammar",
      description: "Updated notes",
      doc: createEmptyTheoryDoc(),
    });
    expect(theoryEditorSnapshotsEqual(original, edited)).toBe(false);
    expect(theoryEditorSnapshotsEqual(original, original)).toBe(true);
  });
});

describe("writing editor snapshot", () => {
  const richState: WritingEditorState = {
    mode: "rich_document",
    doc: { type: "doc", content: [{ type: "paragraph" }] },
    sections: [],
    meta: { cefrLevel: null, topic: null, formality: null },
  };

  it("requires a title for rich documents", () => {
    expect(writingEditorHasRequiredContent("", richState)).toBe(false);
    expect(writingEditorHasRequiredContent("Essay", richState)).toBe(true);
  });

  it("detects title edits as dirty", () => {
    const a = buildWritingEditorSnapshot({
      title: "Draft",
      description: "",
      editorState: richState,
    });
    const b = buildWritingEditorSnapshot({
      title: "Draft 2",
      description: "",
      editorState: richState,
    });
    expect(writingEditorSnapshotsEqual(a, b)).toBe(false);
  });
});
