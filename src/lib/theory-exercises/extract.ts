import type { JSONContent } from "@tiptap/react";
import { theoryDocPlainText } from "@/lib/theory/content";

export type ExtractedSection = {
  heading: string;
  level: number;
  paragraphs: string[];
};

export type ExtractedList = {
  ordered: boolean;
  items: string[];
  /** Nearby heading, if any. */
  context?: string;
};

export type ExtractedTable = {
  headers: string[];
  rows: string[][];
};

export type ExtractedPair = {
  left: string;
  right: string;
};

export type ExtractedTheoryContent = {
  sections: ExtractedSection[];
  lists: ExtractedList[];
  tables: ExtractedTable[];
  /** Word → form / translation style pairs from tables or "a → b" lines. */
  pairs: ExtractedPair[];
  /** Standalone example-like sentences (quotes, short lines, list items). */
  examples: string[];
  /** Flat factual statements usable for true/false. */
  statements: string[];
  plainText: string;
};

function nodeText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (!node.content?.length) return "";
  return node.content.map(nodeText).join("");
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isExampleLike(text: string) {
  const t = cleanText(text);
  if (t.length < 8 || t.length > 180) return false;
  if (/[→↔=:]/.test(t)) return true;
  if (/^[A-ZÄÖÅ]/.test(t) && /[.!?]$/.test(t) && t.split(" ").length <= 18) {
    return true;
  }
  return false;
}

function parseArrowPair(text: string): ExtractedPair | null {
  const cleaned = cleanText(text);
  const match = cleaned.match(/^(.{1,60}?)\s*(?:→|->|↔|—|:|=)\s*(.{1,80})$/);
  if (!match) return null;
  const left = cleanText(match[1] ?? "");
  const right = cleanText(match[2] ?? "");
  if (!left || !right || left === right) return null;
  if (left.length > 48 || right.length > 72) return null;
  return { left, right };
}

function extractTable(node: JSONContent): ExtractedTable | null {
  const rows = node.content ?? [];
  if (rows.length === 0) return null;

  const parsed = rows.map((row) =>
    (row.content ?? []).map((cell) => cleanText(nodeText(cell))),
  );

  const nonEmpty = parsed.filter((row) => row.some((cell) => cell.length > 0));
  if (nonEmpty.length === 0) return null;

  const first = nonEmpty[0]!;
  const looksLikeHeader =
    first.length >= 2 && first.every((cell) => cell.length > 0 && cell.length < 40);

  if (looksLikeHeader && nonEmpty.length > 1) {
    return {
      headers: first,
      rows: nonEmpty.slice(1).filter((row) => row.some(Boolean)),
    };
  }

  return { headers: [], rows: nonEmpty };
}

/**
 * Deterministic extraction from free-form TipTap theory docs.
 * Does not assume a fixed note schema.
 */
export function extractTheoryContent(doc: JSONContent): ExtractedTheoryContent {
  const sections: ExtractedSection[] = [];
  const lists: ExtractedList[] = [];
  const tables: ExtractedTable[] = [];
  const pairs: ExtractedPair[] = [];
  const examples: string[] = [];
  const statements: string[] = [];

  let currentHeading = "";
  let currentLevel = 1;
  let currentParagraphs: string[] = [];

  function flushSection() {
    if (!currentHeading && currentParagraphs.length === 0) return;
    sections.push({
      heading: currentHeading || "Notes",
      level: currentLevel,
      paragraphs: [...currentParagraphs],
    });
    currentParagraphs = [];
  }

  function pushPair(pair: ExtractedPair | null) {
    if (!pair) return;
    const key = `${pair.left.toLowerCase()}|${pair.right.toLowerCase()}`;
    if (pairs.some((p) => `${p.left.toLowerCase()}|${p.right.toLowerCase()}` === key)) {
      return;
    }
    pairs.push(pair);
  }

  function pushExample(text: string) {
    const cleaned = cleanText(text);
    if (!cleaned || examples.includes(cleaned)) return;
    if (isExampleLike(cleaned)) examples.push(cleaned);
  }

  function pushStatement(text: string) {
    const cleaned = cleanText(text);
    if (!cleaned || statements.includes(cleaned)) return;
    if (cleaned.length >= 20 && cleaned.length <= 160 && /[.!?]$/.test(cleaned)) {
      statements.push(cleaned);
    }
  }

  function walkBlocks(nodes: JSONContent[] | undefined) {
    if (!nodes?.length) return;

    for (const node of nodes) {
      switch (node.type) {
        case "heading": {
          flushSection();
          currentHeading = cleanText(nodeText(node));
          currentLevel =
            typeof node.attrs?.level === "number" ? node.attrs.level : 1;
          break;
        }
        case "paragraph": {
          const text = cleanText(nodeText(node));
          if (!text) break;
          currentParagraphs.push(text);
          pushPair(parseArrowPair(text));
          pushExample(text);
          pushStatement(text);
          break;
        }
        case "bulletList":
        case "orderedList": {
          const items = (node.content ?? [])
            .map((item) => cleanText(nodeText(item)))
            .filter(Boolean);
          if (items.length > 0) {
            lists.push({
              ordered: node.type === "orderedList",
              items,
              context: currentHeading || undefined,
            });
            for (const item of items) {
              pushPair(parseArrowPair(item));
              pushExample(item);
            }
          }
          break;
        }
        case "table": {
          const table = extractTable(node);
          if (table) {
            tables.push(table);
            const colCount = Math.max(
              table.headers.length,
              ...table.rows.map((r) => r.length),
              0,
            );
            if (colCount >= 2) {
              for (const row of table.rows) {
                const left = cleanText(row[0] ?? "");
                const right = cleanText(row[1] ?? "");
                if (left && right) pushPair({ left, right });
              }
            }
            if (colCount >= 4) {
              for (const row of table.rows) {
                const a = cleanText(row[0] ?? "");
                const b = cleanText(row[1] ?? "");
                const c = cleanText(row[2] ?? "");
                const d = cleanText(row[3] ?? "");
                if (a && b) pushPair({ left: a, right: b });
                if (c && d) pushPair({ left: c, right: d });
              }
            }
          }
          break;
        }
        case "blockquote": {
          const text = cleanText(nodeText(node));
          if (text) {
            currentParagraphs.push(text);
            pushExample(text);
          }
          break;
        }
        default: {
          // Dive into unknown wrappers (e.g. columns) without double-counting handled blocks.
          if (node.content?.length) walkBlocks(node.content);
          break;
        }
      }
    }
  }

  if (doc.type === "doc") {
    walkBlocks(doc.content);
  } else {
    walkBlocks([doc]);
  }

  flushSection();

  return {
    sections,
    lists,
    tables,
    pairs,
    examples,
    statements,
    plainText: theoryDocPlainText(doc),
  };
}

export function estimateTheoryExerciseCount(extracted: ExtractedTheoryContent) {
  const fromPairs = Math.min(extracted.pairs.length, 8);
  const fromLists = extracted.lists.reduce(
    (sum, list) => sum + Math.min(list.items.length, 4),
    0,
  );
  const fromTables = Math.min(extracted.tables.length * 3, 9);
  const fromStatements = Math.min(extracted.statements.length, 4);
  const total = fromPairs + fromLists + fromTables + fromStatements;
  if (total <= 0) return 0;
  return Math.min(Math.max(total, 4), 20);
}
