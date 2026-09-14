import type { JSONContent } from "@tiptap/react";
import { LIST_BLOCKS, OPAQUE_BLOCKS, tipTapNodePlainText, type FormatLine, type FormatUnit } from "@/lib/editor/format/types";

function splitParagraphLines(node: JSONContent): FormatLine[] {
  const lines: FormatLine[] = [];
  let buffer: JSONContent[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const source: JSONContent = { type: "paragraph", content: buffer };
    const raw = tipTapNodePlainText(source);
    const indent = Math.floor(
      (raw.match(/^\s*/)?.[0]?.replace(/\t/g, "  ").length ?? 0) / 2,
    );
    lines.push({ text: raw.trim(), indent, source });
    buffer = [];
  };

  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") {
      flush();
      continue;
    }
    buffer.push(child);
  }
  flush();

  if (lines.length === 0) {
    lines.push({
      text: tipTapNodePlainText(node).trim(),
      indent: 0,
      source: node,
    });
  }
  return lines;
}

function isSimpleListItem(item: JSONContent): boolean {
  const children = item.content ?? [];
  if (children.length === 0) return true;
  if (children.some((child) => LIST_BLOCKS.has(child.type ?? ""))) {
    return false;
  }
  return children.every((child) => child.type === "paragraph");
}

function flattenListItems(items: JSONContent[]): FormatLine[] | null {
  const lines: FormatLine[] = [];
  for (const item of items) {
    if (!isSimpleListItem(item)) return null;
    const paragraph = (item.content ?? []).find(
      (child) => child.type === "paragraph",
    );
    if (!paragraph) continue;
    const text = tipTapNodePlainText(paragraph).trim();
    if (!text) continue;
    lines.push({ text, indent: 0, source: paragraph });
  }
  return lines;
}

export function flattenDocument(content: JSONContent[]): FormatUnit[] {
  const units: FormatUnit[] = [];

  for (const node of content) {
    const type = node.type ?? "";
    if (OPAQUE_BLOCKS.has(type)) {
      units.push({ kind: "opaque", node });
      continue;
    }

    if (type === "paragraph") {
      for (const line of splitParagraphLines(node)) {
        units.push({ kind: "line", line });
      }
      continue;
    }

    if (type === "bulletList" || type === "orderedList") {
      const lines = flattenListItems(node.content ?? []);
      if (!lines) {
        units.push({ kind: "opaque", node });
        continue;
      }
      for (const line of lines) {
        units.push({ kind: "line", line });
      }
      continue;
    }

    units.push({ kind: "opaque", node });
  }

  return units;
}

export function splitUnitsIntoRuns(units: FormatUnit[]): FormatUnit[][] {
  const runs: FormatUnit[][] = [];
  let current: FormatUnit[] = [];

  const flush = () => {
    if (current.length) runs.push(current);
    current = [];
  };

  for (const unit of units) {
    if (current.length === 0 || current[0]?.kind === unit.kind) {
      current.push(unit);
      continue;
    }
    flush();
    current.push(unit);
  }
  flush();
  return runs;
}
