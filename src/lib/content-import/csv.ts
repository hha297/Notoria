import { normalizeHeader } from "@/lib/content-import/fields";

/**
 * Minimal RFC4180-ish CSV parser (no dependency).
 * Handles quoted cells, escaped quotes, CRLF/LF, and BOM.
 */

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  headerRowIndex: number;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function splitCsvLines(text: string): string[] {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (ch === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.length > 0 || lines.length === 0) {
    lines.push(current);
  }
  return lines;
}

const HEADER_HINTS = [
  "word",
  "meaning",
  "meanings",
  "title",
  "content",
  "definition",
  "translation",
  "example",
  "sentence",
  "part of speech",
  "pos",
  "tags",
  "notes",
  "category",
  "finnish",
  "english",
];

/** Score how likely a row is a header (field-like labels beat meta banners). */
function headerScore(cells: string[]): number {
  if (cells.length < 2) return 0;
  const nonEmpty = cells.filter((c) => c.length > 0);
  if (nonEmpty.length < 2) return 0;
  const numeric = nonEmpty.filter((c) => /^\d+([.,]\d+)?$/.test(c)).length;
  let score = nonEmpty.length * 2 - numeric * 3;

  for (const cell of nonEmpty) {
    const normalized = normalizeHeader(cell);
    for (const hint of HEADER_HINTS) {
      if (normalized === hint) {
        score += 40;
      } else if (hint.length >= 5 && normalized.includes(hint)) {
        score += 20;
      }
    }
  }
  return score;
}

/**
 * Parse CSV text. Skips a leading meta/title row when the first real header
 * looks more like column names (older Notoria exports put a meta line first).
 */
export function parseCsv(text: string): ParsedCsv {
  const lines = splitCsvLines(text).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], headerRowIndex: 0 };
  }

  const candidates = lines
    .slice(0, Math.min(4, lines.length))
    .map((line, index) => {
      const cells = parseCsvLine(line);
      return {
        index,
        cells,
        score: headerScore(cells),
      };
    });

  let best = candidates[0]!;
  for (const candidate of candidates) {
    if (candidate.score > best.score) best = candidate;
  }

  const headers = best.cells.map((h, i) => h || `Column ${i + 1}`);
  const rows = lines
    .slice(best.index + 1)
    .map(parseCsvLine)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      while (row.length < headers.length) row.push("");
      return row.slice(0, headers.length);
    });

  return {
    headers,
    rows,
    headerRowIndex: best.index,
  };
}
