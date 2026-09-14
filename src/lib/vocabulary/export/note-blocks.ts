import type { JSONContent } from "@tiptap/react";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import { isTipTapDoc } from "@/lib/vocabulary/notes-content";
import { parseNotesForPresentation } from "@/lib/vocabulary/export/notes-presentation";

export type ExportTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type NoteBlock =
  | { type: "paragraph"; runs: ExportTextRun[] }
  | { type: "heading"; level: number; runs: ExportTextRun[] }
  | { type: "list"; ordered: boolean; items: ExportTextRun[][] }
  | { type: "table"; rows: ExportTextRun[][][] }
  | { type: "code"; text: string }
  | { type: "rule" };

function runsFromText(text: string): ExportTextRun[] {
  const clean = sanitizeExportText(text).trim();
  return clean ? [{ text: clean }] : [];
}

function getMarks(node: JSONContent): Pick<ExportTextRun, "bold" | "italic"> {
  const marks: Pick<ExportTextRun, "bold" | "italic"> = {};
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") marks.bold = true;
    if (mark.type === "italic") marks.italic = true;
  }
  return marks;
}

function collectRuns(nodes: JSONContent[] | undefined): ExportTextRun[] {
  if (!nodes?.length) return [];
  const runs: ExportTextRun[] = [];

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push({ text: "\n" });
      continue;
    }
    if (node.type === "text" && typeof node.text === "string") {
      const text = sanitizeExportText(node.text);
      if (!text) continue;
      runs.push({ text, ...getMarks(node) });
      continue;
    }
    if (node.content?.length) {
      runs.push(...collectRuns(node.content));
    }
  }

  return mergeRuns(runs);
}

function mergeRuns(runs: ExportTextRun[]): ExportTextRun[] {
  const merged: ExportTextRun[] = [];
  for (const run of runs) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.bold === run.bold &&
      prev.italic === run.italic &&
      !prev.text.endsWith("\n") &&
      run.text !== "\n"
    ) {
      prev.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

function runsAreEmpty(runs: ExportTextRun[]): boolean {
  return !runs.some((run) => run.text.replace(/\n/g, "").trim());
}

function listItemRuns(item: JSONContent): {
  primary: ExportTextRun[];
  nested: JSONContent[];
} {
  const nested: JSONContent[] = [];
  const inline: JSONContent[] = [];

  for (const child of item.content ?? []) {
    if (
      child.type === "bulletList" ||
      child.type === "orderedList" ||
      child.type === "taskList"
    ) {
      nested.push(child);
      continue;
    }
    if (child.type === "paragraph") {
      inline.push(...(child.content ?? []));
      continue;
    }
    inline.push(child);
  }

  return { primary: collectRuns(inline), nested };
}

function listItems(node: JSONContent): ExportTextRun[][] {
  const items: ExportTextRun[][] = [];
  for (const item of node.content ?? []) {
    const { primary, nested } = listItemRuns(item);
    if (!runsAreEmpty(primary)) items.push(primary);
    for (const child of nested) {
      items.push(...listItems(child));
    }
  }
  return items;
}

function cellRuns(cell: JSONContent): ExportTextRun[] {
  return collectRuns(cell.content);
}

function tableRows(node: JSONContent): ExportTextRun[][][] {
  const rows = (node.content ?? [])
    .map((row) => (row.content ?? []).map(cellRuns))
    .filter((row) => row.some((cell) => !runsAreEmpty(cell)));
  if (!rows.length) return [];
  const width = Math.max(...rows.map((row) => row.length), 1);
  return rows.map((row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push([]);
    return next;
  });
}

function blocksFromTipTap(doc: JSONContent): NoteBlock[] {
  const blocks: NoteBlock[] = [];

  for (const node of doc.content ?? []) {
    switch (node.type) {
      case "heading": {
        const runs = collectRuns(node.content);
        if (runsAreEmpty(runs)) break;
        blocks.push({
          type: "heading",
          level: coerceHeadingLevel(node.attrs?.level),
          runs,
        });
        break;
      }
      case "bulletList":
      case "taskList": {
        const items = listItems(node);
        if (items.length) blocks.push({ type: "list", ordered: false, items });
        break;
      }
      case "orderedList": {
        const items = listItems(node);
        if (items.length) blocks.push({ type: "list", ordered: true, items });
        break;
      }
      case "table": {
        const rows = tableRows(node);
        if (rows.length) blocks.push({ type: "table", rows });
        break;
      }
      case "codeBlock": {
        const text = sanitizeExportText(
          (node.content ?? [])
            .map((child) => (child.type === "text" ? (child.text ?? "") : ""))
            .join(""),
        ).trim();
        if (text) blocks.push({ type: "code", text });
        break;
      }
      case "horizontalRule":
        blocks.push({ type: "rule" });
        break;
      case "blockquote":
        blocks.push(...blocksFromTipTap({ type: "doc", content: node.content }));
        break;
      case "paragraph": {
        const runs = collectRuns(node.content);
        if (runsAreEmpty(runs)) break;
        blocks.push({ type: "paragraph", runs });
        break;
      }
      default:
        break;
    }
  }

  return blocks;
}

function blocksFromPlain(notes: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];

  for (const block of parseNotesForPresentation(notes)) {
    if (block.type === "paragraph") {
      const runs = runsFromText(block.text);
      if (runs.length) blocks.push({ type: "paragraph", runs });
      continue;
    }
    if (block.type === "heading") {
      const runs = runsFromText(block.text);
      if (runs.length) blocks.push({ type: "heading", level: block.level, runs });
      continue;
    }
    if (block.type === "bullet" || block.type === "ordered") {
      const items = block.items.map(runsFromText).filter((item) => item.length);
      if (items.length) {
        blocks.push({
          type: "list",
          ordered: block.type === "ordered",
          items,
        });
      }
      continue;
    }
    if (block.type === "table") {
      blocks.push({
        type: "table",
        rows: block.rows.map((row) => row.map(runsFromText)),
      });
      continue;
    }
    if (block.type === "code") {
      const text = sanitizeExportText(block.text).trim();
      if (text) blocks.push({ type: "code", text });
      continue;
    }
    blocks.push({ type: "rule" });
  }

  return blocks;
}

export function runsToPlain(runs: ExportTextRun[]): string {
  return runs.map((run) => run.text).join("").replace(/\s+/g, " ").trim();
}

export function noteBlocksToPlainText(blocks: NoteBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        lines.push(runsToPlain(block.runs));
        break;
      case "heading":
        lines.push(runsToPlain(block.runs));
        break;
      case "list":
        block.items.forEach((item, index) => {
          const marker = block.ordered ? `${index + 1}. ` : "- ";
          lines.push(`${marker}${runsToPlain(item)}`);
        });
        break;
      case "table":
        for (const row of block.rows) {
          lines.push(row.map((cell) => runsToPlain(cell) || " ").join(" | "));
        }
        break;
      case "code":
        lines.push(block.text);
        break;
      case "rule":
        break;
    }
  }

  return lines.filter(Boolean).join("\n");
}

/** Parse stored notes once into document blocks. Does not mount an editor. */
export function notesToBlocks(raw: string | null | undefined): NoteBlock[] {
  const notes = raw?.trim();
  if (!notes) return [];

  if (notes.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(notes);
      if (isTipTapDoc(parsed)) {
        return blocksFromTipTap(parsed);
      }
    } catch {
      // Fall through to plain-text presentation.
    }
  }

  return blocksFromPlain(notes);
}
