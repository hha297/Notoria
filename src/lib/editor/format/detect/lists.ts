import type { JSONContent } from "@tiptap/react";
import { parseSectionHeading } from "@/lib/editor/format/headings";
import {
  bulletList,
  lineLooksLikeShortLabel,
  listItemFromParagraph,
  orderedList,
  paragraphFromLine,
} from "@/lib/editor/format/nodes";
import {
  BULLET_MARKER_RE,
  ORDERED_MARKER_RE,
  matchSectionPattern,
  SECTION_PATTERNS,
  TITLE_PATTERNS,
} from "@/lib/editor/format/patterns";
import type { Detection, FormatLine } from "@/lib/editor/format/types";

export function stripBulletPrefix(text: string): {
  body: string;
  prefixLength: number;
  marked: boolean;
} {
  const trimmed = text.trim();
  const match = trimmed.match(BULLET_MARKER_RE);
  if (match?.[2]) {
    return {
      body: match[2],
      prefixLength: text.length - match[2].length,
      marked: true,
    };
  }
  return { body: trimmed, prefixLength: 0, marked: false };
}

function isSectionish(text: string): boolean {
  const body = stripBulletPrefix(text).body;
  return Boolean(
    matchSectionPattern(body, TITLE_PATTERNS) ||
    matchSectionPattern(body, SECTION_PATTERNS) ||
    parseSectionHeading(body),
  );
}

function matchParenOrdered(text: string): string | null {
  const match = text.trim().match(ORDERED_MARKER_RE);
  if (!match?.[2]) return null;
  if (parseSectionHeading(text.trim())) return null;
  return match[2];
}

function toBulletItem(
  line: FormatLine,
  stripped: { body: string; prefixLength: number },
) {
  return listItemFromParagraph(paragraphFromLine(line, stripped.prefixLength));
}

function nestMarkedItems(
  entries: Array<{
    line: FormatLine;
    stripped: ReturnType<typeof stripBulletPrefix>;
  }>,
): JSONContent[] {
  const items: JSONContent[] = [];
  let i = 0;
  while (i < entries.length) {
    const current = entries[i]!;
    const item = toBulletItem(current.line, current.stripped);
    i += 1;
    const nested: typeof entries = [];
    while (
      i < entries.length &&
      entries[i]!.line.indent > current.line.indent
    ) {
      nested.push(entries[i]!);
      i += 1;
    }
    if (nested.length > 0) {
      item.content = [
        ...(item.content ?? []),
        bulletList(nestMarkedItems(nested)),
      ];
    }
    items.push(item);
  }
  return items;
}

export function detectMarkedBulletList(
  lines: FormatLine[],
  index: number,
): Detection | null {
  if (!stripBulletPrefix(lines[index]?.text ?? "").marked) return null;

  const entries: Array<{
    line: FormatLine;
    stripped: ReturnType<typeof stripBulletPrefix>;
  }> = [];
  let i = index;
  while (i < lines.length) {
    const current = lines[i]!;
    const stripped = stripBulletPrefix(current.text);
    if (!stripped.marked) break;
    if (isSectionish(current.text)) break;
    entries.push({ line: current, stripped });
    i += 1;
  }

  if (entries.length === 0) return null;
  return {
    type: "bullet-list",
    confidence: entries.length >= 2 ? 0.9 : 0.7,
    consumed: entries.length,
    nodes: [bulletList(nestMarkedItems(entries))],
  };
}

export function detectParenOrderedList(
  lines: FormatLine[],
  index: number,
): Detection | null {
  if (!matchParenOrdered(lines[index]?.text ?? "")) return null;

  const items: JSONContent[] = [];
  let i = index;
  while (i < lines.length) {
    const current = lines[i]!;
    const body = matchParenOrdered(current.text);
    if (!body) break;
    const prefix = current.text.trim().length - body.length;
    items.push(listItemFromParagraph(paragraphFromLine(current, prefix)));
    i += 1;
  }

  if (items.length < 2) return null;
  return {
    type: "ordered-list",
    confidence: 0.88,
    consumed: items.length,
    nodes: [orderedList(items)],
  };
}

export function detectUnmarkedList(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const start = lines[index];
  if (!start) return null;
  if (stripBulletPrefix(start.text).marked) return null;
  if (isSectionish(start.text)) return null;
  if (!lineLooksLikeShortLabel(stripBulletPrefix(start.text).body)) return null;

  const items: JSONContent[] = [];
  let i = index;
  while (i < lines.length) {
    const current = lines[i]!;
    if (stripBulletPrefix(current.text).marked) break;
    if (isSectionish(current.text)) break;
    const body = stripBulletPrefix(current.text).body;
    if (!lineLooksLikeShortLabel(body)) break;
    items.push(listItemFromParagraph(paragraphFromLine(current)));
    i += 1;
  }

  if (items.length < 3) return null;
  return {
    type: "unmarked-list",
    confidence: 0.72,
    consumed: items.length,
    nodes: [bulletList(items)],
  };
}
