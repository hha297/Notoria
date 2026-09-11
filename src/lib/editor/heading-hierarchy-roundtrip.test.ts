import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/react";
import { formatTiptapDocument } from "@/lib/editor/format-document";
import {
  parseTheoryContent,
  serializeTheoryContent,
} from "@/lib/theory/content";
import {
  parseWritingContent,
  serializeWritingContent,
} from "@/lib/writing/content";

function heading(level: number, text: string): JSONContent {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function sampleOutlineDoc(): JSONContent {
  return {
    type: "doc",
    content: [
      heading(1, "1. Grammar"),
      heading(1, "1.1 Nouns"),
      heading(1, "1.1.1 Singular"),
      heading(1, "1.2 Verbs"),
      heading(1, "1.2.1 Present tense"),
      heading(1, "2. Vocabulary"),
      heading(1, "2.1 Food"),
      heading(1, "2.1.1 Fruits"),
      heading(1, "1.3.10 Special cases"),
      heading(1, "2.1. Not All Adjectives"),
    ],
  };
}

function expectedLevels(): number[] {
  return [1, 2, 3, 2, 3, 1, 2, 3, 3, 2];
}

function headingLevels(doc: JSONContent): number[] {
  return (doc.content ?? [])
    .filter((node) => node.type === "heading")
    .map((node) =>
      typeof node.attrs?.level === "number" ? node.attrs.level : 1,
    );
}

describe("Format → Save → Load → Edit → Preview heading hierarchy", () => {
  it("keeps H1/H2/H3 through format + TipTap setContent/getJSON", () => {
    const formatted = formatTiptapDocument(sampleOutlineDoc());
    expect(headingLevels(formatted)).toEqual(expectedLevels());

    const editor = new Editor({
      extensions: [StarterKit],
      content: sampleOutlineDoc(),
    });

    editor.commands.setContent(formatted, { emitUpdate: false });
    const fromEditor = editor.getJSON();
    expect(headingLevels(fromEditor)).toEqual(expectedLevels());
    editor.destroy();
  });

  it("keeps heading levels through Theory serialize → parse (Save → Load)", () => {
    const formatted = formatTiptapDocument(sampleOutlineDoc());
    const saved = serializeTheoryContent({
      kind: "theory",
      version: 1,
      category: "grammar",
      description: "",
      doc: formatted,
    });
    const loaded = parseTheoryContent(saved);
    expect(headingLevels(loaded.doc)).toEqual(expectedLevels());

    // Preview / Edit both consume parseTheoryContent(doc) — same tree.
    const editor = new Editor({
      extensions: [StarterKit],
      content: loaded.doc,
    });
    expect(headingLevels(editor.getJSON())).toEqual(expectedLevels());
    editor.destroy();
  });

  it("keeps heading levels through Writing serialize → parse", () => {
    const formatted = formatTiptapDocument(sampleOutlineDoc());
    const saved = serializeWritingContent({
      mode: "rich_document",
      doc: formatted,
      sections: [],
      meta: {
        cefrLevel: "b1",
        topic: "culture",
        formality: "neutral",
      },
    });
    const loaded = parseWritingContent(saved);
    expect(loaded.mode).toBe("rich_document");
    if (loaded.mode !== "rich_document") return;
    expect(headingLevels(loaded.doc)).toEqual(expectedLevels());
  });

  it("does not flatten levels when parent re-applies content after Format", () => {
    const formatted = formatTiptapDocument(sampleOutlineDoc());
    const editor = new Editor({
      extensions: [StarterKit],
      content: sampleOutlineDoc(),
    });

    editor.commands.setContent(formatted, { emitUpdate: false });
    const next = editor.getJSON();

    // Controlled sync: parent receives next, then re-setContent from props.
    editor.commands.setContent(next, { emitUpdate: false });
    expect(headingLevels(editor.getJSON())).toEqual(expectedLevels());
    editor.destroy();
  });
});
