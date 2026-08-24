import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  editorDocHasTransientImages,
  isPersistedImageSrc,
  isTransientMediaSrc,
  normalizeHttpUrl,
  stripTransientImages,
} from "@/lib/editor/images";
import {
  isNotesDocEmpty,
  serializeVocabularyNotes,
} from "@/lib/vocabulary/notes-content";

const blobDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "image",
      attrs: { src: "blob:http://localhost/abc" },
    },
  ],
};

const persistedDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "image",
      attrs: {
        src: "https://res.cloudinary.com/demo/image/upload/v1/note.png",
      },
    },
  ],
};

describe("editor image URLs", () => {
  it("treats blob and data URLs as transient", () => {
    expect(isTransientMediaSrc("blob:http://localhost/1")).toBe(true);
    expect(isTransientMediaSrc("data:image/png;base64,abc")).toBe(true);
    expect(isPersistedImageSrc("https://cdn.example/a.png")).toBe(true);
  });

  it("strips transient images from documents", () => {
    expect(editorDocHasTransientImages(blobDoc)).toBe(true);
    expect(stripTransientImages(blobDoc)).toEqual({
      type: "doc",
      content: [],
    });
    expect(stripTransientImages(persistedDoc)).toEqual(persistedDoc);
  });

  it("normalizes http URLs", () => {
    expect(normalizeHttpUrl("example.com/a")).toBe("https://example.com/a");
    expect(normalizeHttpUrl("https://example.com/a")).toBe(
      "https://example.com/a",
    );
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("notes persistence with images", () => {
  it("does not treat a persisted image as empty notes", () => {
    expect(isNotesDocEmpty(persistedDoc)).toBe(false);
    expect(isNotesDocEmpty(blobDoc)).toBe(true);
  });

  it("does not serialize blob image sources", () => {
    expect(serializeVocabularyNotes(blobDoc)).toBe("");
    expect(JSON.parse(serializeVocabularyNotes(persistedDoc))).toEqual(
      persistedDoc,
    );
  });
});
