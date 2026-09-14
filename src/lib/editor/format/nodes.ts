import type { JSONContent } from "@tiptap/react";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";
import { hasInlineMarkdown, parseInlineMarkdown } from "@/lib/editor/format/inline";
import { EMPHASIS_LABELS } from "@/lib/editor/format/patterns";
import { tipTapNodePlainText, type FormatLine } from "@/lib/editor/format/types";

export function paragraphFromText(text: string): JSONContent {
  const trimmed = text.trim();
  if (!trimmed) return { type: "paragraph" };
  return {
    type: "paragraph",
    content: parseInlineMarkdown(trimmed),
  };
}

export function headingFromText(level: number, text: string): JSONContent {
  const trimmed = text.trim();
  return {
    type: "heading",
    attrs: { level: coerceHeadingLevel(level) },
    content: trimmed ? parseInlineMarkdown(trimmed) : undefined,
  };
}

export function listItemFromParagraph(paragraph: JSONContent): JSONContent {
  return { type: "listItem", content: [paragraph] };
}

export function bulletList(items: JSONContent[]): JSONContent {
  return { type: "bulletList", content: items };
}

export function orderedList(items: JSONContent[]): JSONContent {
  return { type: "orderedList", content: items };
}

function stripPrefixFromNode(node: JSONContent, prefixLength: number): JSONContent {
  if (prefixLength <= 0) {
    return { type: "paragraph", content: node.content };
  }

  let remaining = prefixLength;
  const nextContent: JSONContent[] = [];

  for (const child of node.content ?? []) {
    if (remaining <= 0) {
      nextContent.push(child);
      continue;
    }

    if (child.type === "text" && typeof child.text === "string") {
      if (child.text.length <= remaining) {
        remaining -= child.text.length;
        continue;
      }
      nextContent.push({ ...child, text: child.text.slice(remaining) });
      remaining = 0;
      continue;
    }

    if (child.type === "hardBreak") {
      remaining -= 1;
      continue;
    }

    nextContent.push(child);
  }

  return {
    type: "paragraph",
    content: nextContent.length ? nextContent : undefined,
  };
}

export function paragraphFromLine(
  line: FormatLine,
  prefixLength = 0,
): JSONContent {
  if (hasInlineMarkdown(line.text)) {
    return paragraphFromText(line.text);
  }

  if (line.source?.content) {
    const sourceText = tipTapNodePlainText(line.source);
    if (sourceText.trim() === line.text.trim() || prefixLength > 0) {
      const stripped = stripPrefixFromNode(line.source, prefixLength);
      if (stripped.content?.length) return stripped;
    }
  }

  return paragraphFromText(line.text);
}

const LABEL_RE = new RegExp(
  `^(${EMPHASIS_LABELS.join("|")})\\s*:`,
  "iu",
);

export function applyEmphasisLabels(text: string): JSONContent {
  const match = text.match(LABEL_RE);
  if (!match?.[1]) return paragraphFromText(text);

  const label = text.slice(0, match[0].length);
  const rest = text.slice(match[0].length);
  const content: JSONContent[] = [
    { type: "text", text: label, marks: [{ type: "bold" }] },
  ];
  if (rest) content.push(...parseInlineMarkdown(rest));
  return { type: "paragraph", content };
}

export function lineLooksLikeSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/[.!?…]$/u.test(trimmed)) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 9 || trimmed.length > 90;
}

export function lineLooksLikeShortLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes("\n")) return false;
  if (lineLooksLikeSentence(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 6 && trimmed.length <= 48;
}
