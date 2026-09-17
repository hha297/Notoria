import { describe, expect, it } from "vitest";
import {
  collectPreservedEditorNodes,
  mergePreservedEditorNodes,
} from "@/lib/editor/format-document-ai";

describe("mergePreservedEditorNodes", () => {
  it("re-attaches images the AI plain-text pass cannot see", () => {
    const original = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Before" }],
        },
        {
          type: "image",
          attrs: { src: "https://cdn.example/a.png", alt: "diagram" },
        },
      ],
    };
    const formatted = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Before" }],
        },
        { type: "paragraph" },
      ],
    };

    const merged = mergePreservedEditorNodes(original, formatted);
    expect(collectPreservedEditorNodes(original)).toHaveLength(1);
    expect(merged.content?.some((node) => node.type === "image")).toBe(true);
    expect(
      merged.content?.find((node) => node.type === "image")?.attrs?.src,
    ).toBe("https://cdn.example/a.png");
  });

  it("does not duplicate an image already present after AI format", () => {
    const image = {
      type: "image",
      attrs: { src: "https://cdn.example/a.png", alt: "diagram" },
    };
    const original = { type: "doc", content: [image] };
    const formatted = {
      type: "doc",
      content: [structuredClone(image), { type: "paragraph" }],
    };

    const merged = mergePreservedEditorNodes(original, formatted);
    expect(merged.content?.filter((node) => node.type === "image")).toHaveLength(
      1,
    );
  });
});
