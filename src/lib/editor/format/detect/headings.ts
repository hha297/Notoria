import type { JSONContent } from "@tiptap/react";
import { parseSectionHeading } from "@/lib/editor/format/headings";
import {
  headingFromText,
  listItemFromParagraph,
  orderedList,
  paragraphFromLine,
} from "@/lib/editor/format/nodes";
import { MARKDOWN_HEADING_RE } from "@/lib/editor/format/patterns";
import type { Detection, FormatLine } from "@/lib/editor/format/types";

function numberedPrefix(text: string): { value: number; depth: number } | null {
  const section = parseSectionHeading(text);
  if (!section) return null;
  const last = section.number.split(".").filter(Boolean).at(-1);
  const value = Number(last);
  if (!Number.isInteger(value)) return null;
  return { value, depth: section.depth };
}

function consecutiveDepthOneRun(lines: FormatLine[], index: number): number {
  let count = 0;
  let expected = 1;
  for (let i = index; i < lines.length; i += 1) {
    const parsed = numberedPrefix(lines[i]!.text);
    if (!parsed || parsed.depth !== 1) break;
    if (count === 0 && parsed.value !== 1) break;
    if (parsed.value !== expected) break;
    expected += 1;
    count += 1;
  }
  return count;
}

function runHasNestedNumbering(lines: FormatLine[], index: number): boolean {
  for (let i = index; i < lines.length; i += 1) {
    const section = parseSectionHeading(lines[i]!.text);
    if (!section) break;
    if (section.depth >= 2) return true;
  }
  return false;
}

export function detectMarkdownHeading(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const match = lines[index]?.text.trim().match(MARKDOWN_HEADING_RE);
  if (!match?.[1] || !match[2]) return null;
  return {
    type: "markdown-heading",
    confidence: 0.94,
    consumed: 1,
    nodes: [headingFromText(match[1].length, match[2])],
  };
}

export function detectNumberedHeading(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const line = lines[index];
  if (!line) return null;
  const section = parseSectionHeading(line.text);
  if (!section) return null;

  if (section.depth >= 2) {
    return {
      type: "numbered-heading",
      confidence: 0.98,
      consumed: 1,
      nodes: [headingFromText(section.depth, line.text.trim())],
    };
  }

  if (runHasNestedNumbering(lines, index)) {
    return {
      type: "numbered-heading",
      confidence: 0.97,
      consumed: 1,
      nodes: [headingFromText(1, line.text.trim())],
    };
  }

  const listRun = consecutiveDepthOneRun(lines, index);
  if (listRun >= 2) {
    return null;
  }

  return {
    type: "numbered-heading",
    confidence: 0.8,
    consumed: 1,
    nodes: [headingFromText(1, line.text.trim())],
  };
}

export function detectOrderedList(
  lines: FormatLine[],
  index: number,
): Detection | null {
  if (runHasNestedNumbering(lines, index)) return null;
  const count = consecutiveDepthOneRun(lines, index);
  if (count < 2) return null;

  const items: JSONContent[] = [];
  for (let i = 0; i < count; i += 1) {
    const current = lines[index + i]!;
    const section = parseSectionHeading(current.text);
    const body = section?.title ?? current.text.trim();
    const prefix = current.text.trim().length - body.length;
    items.push(listItemFromParagraph(paragraphFromLine(current, prefix)));
  }

  return {
    type: "ordered-list",
    confidence: 0.86,
    consumed: count,
    nodes: [orderedList(items)],
  };
}
