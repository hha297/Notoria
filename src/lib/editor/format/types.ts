import type { JSONContent } from "@tiptap/react";

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const MIN_DETECTION_CONFIDENCE = 0.6;
export const MISSING_FORM = "—";

export const TEXTISH_BLOCKS = new Set(["paragraph", "heading", "codeBlock"]);
export const LIST_BLOCKS = new Set(["bulletList", "orderedList", "taskList"]);
export const OPAQUE_BLOCKS = new Set([
  "image",
  "codeBlock",
  "table",
  "horizontalRule",
  "blockquote",
  "taskList",
  "heading",
]);

export type FormatLine = {
  text: string;
  indent: number;
  source?: JSONContent;
};

export type FormatUnit =
  | { kind: "line"; line: FormatLine }
  | { kind: "opaque"; node: JSONContent };

export type Detection = {
  type: string;
  confidence: number;
  consumed: number;
  nodes: JSONContent[];
};

export type Detector = {
  id: string;
  detect: (lines: FormatLine[], index: number) => Detection | null;
};

export type FormatContext = {
  language?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTipTapDoc(value: unknown): value is JSONContent {
  return isRecord(value) && value.type === "doc";
}

export function tipTapNodePlainText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  const children = node.content ?? [];
  const childText = children.map(tipTapNodePlainText).join("");

  switch (node.type) {
    case "bulletList":
    case "orderedList":
    case "taskList":
      return children.map(tipTapNodePlainText).join("\n");
    case "table":
      return children
        .map((row) =>
          (row.content ?? [])
            .map((cell) => tipTapNodePlainText(cell).trim())
            .join(" | "),
        )
        .join("\n");
    default:
      return childText;
  }
}
