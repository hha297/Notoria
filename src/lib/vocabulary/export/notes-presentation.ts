/**
 * Presentation-only parse of already-flattened export notes.
 * Does not change export data — only how the notes string is drawn.
 */

export type NotesPresentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "rule" }
  | { type: "code"; text: string };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^[-*•●◦]\s+(.*)$/u;
const ORDERED_RE = /^(\d+)[.)]\s+(.*)$/;
const DIVIDER_RE = /^\|?:?-{2,}:?(\|:?-{2,}:?)*\|?$/;

function splitPipeRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, cells) => {
      if (cell.length > 0) return true;
      return index > 0 && index < cells.length - 1;
    });
}

function isPipeTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || DIVIDER_RE.test(trimmed.replace(/\s/g, ""))) return false;
  if (!trimmed.includes("|")) return false;
  return splitPipeRow(trimmed).length >= 2;
}

function padRows(rows: string[][]): string[][] {
  const width = Math.max(2, ...rows.map((row) => row.length));
  return rows.map((row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push("");
    return next;
  });
}

function consumeFencedCode(
  lines: string[],
  start: number,
): { block: NotesPresentBlock; end: number } | null {
  const open = lines[start]?.trim() ?? "";
  if (!open.startsWith("```")) return null;
  const body: string[] = [];
  let i = start + 1;
  while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
    body.push(lines[i]!);
    i += 1;
  }
  if (i < lines.length) i += 1;
  return { block: { type: "code", text: body.join("\n") }, end: i };
}

/**
 * Turn flattened notes (pipe tables, markdown-ish lists/headings) into
 * renderable blocks. Empty lines collapse; content order is preserved.
 */
export function parseNotesForPresentation(notes: string): NotesPresentBlock[] {
  const lines = notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: NotesPresentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    const fence = consumeFencedCode(lines, i);
    if (fence) {
      if (fence.block.type === "code" && fence.block.text.trim()) {
        blocks.push(fence.block);
      }
      i = fence.end;
      continue;
    }

    if (isPipeTableLine(trimmed)) {
      const rows: string[][] = [];
      while (i < lines.length) {
        const line = (lines[i] ?? "").trim();
        if (!line) break;
        if (DIVIDER_RE.test(line.replace(/\s/g, ""))) {
          i += 1;
          continue;
        }
        if (!isPipeTableLine(line)) break;
        rows.push(splitPipeRow(line));
        i += 1;
      }
      if (rows.length > 0) {
        blocks.push({ type: "table", rows: padRows(rows) });
      }
      continue;
    }

    const heading = trimmed.match(HEADING_RE);
    if (heading?.[2]) {
      blocks.push({
        type: "heading",
        level: heading[1]!.length,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (BULLET_RE.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const line = (lines[i] ?? "").trim();
        const match = line.match(BULLET_RE);
        if (!match?.[1]) break;
        items.push(match[1].trim());
        i += 1;
      }
      if (items.length) blocks.push({ type: "bullet", items });
      continue;
    }

    if (ORDERED_RE.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const line = (lines[i] ?? "").trim();
        const match = line.match(ORDERED_RE);
        if (!match?.[2]) break;
        items.push(match[2].trim());
        i += 1;
      }
      if (items.length) blocks.push({ type: "ordered", items });
      continue;
    }

    blocks.push({ type: "paragraph", text: trimmed });
    i += 1;
  }

  return blocks;
}
