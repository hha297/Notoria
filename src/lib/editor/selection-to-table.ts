import type { JSONContent } from "@tiptap/react";

export type ParsedTableMatrix = {
  rows: string[][];
  columnCount: number;
};

type Delimiter = "pipe" | "tab" | "spaces";

function splitPipe(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, arr) => {
      // Keep empty middle cells; drop only empty edges from markdown-style pipes.
      if (cell.length > 0) return true;
      return index > 0 && index < arr.length - 1;
    });
}

function splitTab(line: string): string[] {
  return line.split("\t").map((cell) => cell.trim());
}

function splitSpaces(line: string): string[] {
  return line
    .split(/[ \t]{2,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function splitLine(line: string, delimiter: Delimiter): string[] {
  switch (delimiter) {
    case "pipe":
      return splitPipe(line);
    case "tab":
      return splitTab(line);
    case "spaces":
      return splitSpaces(line);
  }
}

function scoreDelimiter(lines: string[], delimiter: Delimiter): number {
  return lines.filter((line) => splitLine(line, delimiter).length >= 2).length;
}

function detectDelimiter(lines: string[]): Delimiter | null {
  const pipe = scoreDelimiter(lines, "pipe");
  const tab = scoreDelimiter(lines, "tab");
  const spaces = scoreDelimiter(lines, "spaces");
  const needed = Math.max(1, Math.ceil(lines.length / 2));

  // Prefer explicit separators over whitespace guessing.
  if (pipe >= needed) return "pipe";
  if (tab >= needed) return "tab";
  if (spaces >= needed) return "spaces";
  return null;
}

/**
 * Parse selected plain text into a table matrix.
 * Supports pipe-, tab-, and multi-space-separated rows.
 * Returns null when the text is not reasonably tabular (caller must not destroy selection).
 */
export function parseTextToTable(text: string): ParsedTableMatrix | null {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return null;

  const delimiter = detectDelimiter(lines);
  if (!delimiter) return null;

  const rawRows = lines.map((line) => splitLine(line, delimiter));
  const multiColCount = rawRows.filter((row) => row.length >= 2).length;
  if (multiColCount === 0) return null;
  if (lines.length >= 2 && multiColCount < Math.ceil(lines.length / 2)) {
    return null;
  }

  const columnCount = Math.max(...rawRows.map((row) => row.length));
  if (columnCount < 2) return null;

  const rows = rawRows.map((row) => {
    const next = row.map((cell) => cell.trim());
    while (next.length < columnCount) next.push("");
    return next.slice(0, columnCount);
  });

  return { rows, columnCount };
}

function cellParagraph(text: string): JSONContent {
  if (!text) return { type: "paragraph" };
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

function tableCell(
  text: string,
  header: boolean,
): JSONContent {
  return {
    type: header ? "tableHeader" : "tableCell",
    content: [cellParagraph(text)],
  };
}

/**
 * Build a TipTap table node from a parsed matrix.
 * First row becomes header when `withHeaderRow` is true (matches empty insertTable).
 */
export function buildTipTapTableFromMatrix(
  rows: string[][],
  options: { withHeaderRow?: boolean } = {},
): JSONContent {
  const withHeaderRow = options.withHeaderRow !== false;
  if (rows.length === 0) {
    return {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [tableCell("", true), tableCell("", true)],
        },
      ],
    };
  }

  const tableRows: JSONContent[] = rows.map((row, rowIndex) => ({
    type: "tableRow",
    content: row.map((cell) =>
      tableCell(cell, withHeaderRow && rowIndex === 0),
    ),
  }));

  return { type: "table", content: tableRows };
}
