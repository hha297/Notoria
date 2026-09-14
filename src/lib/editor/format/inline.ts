import type { JSONContent } from "@tiptap/react";

const BOLD_RE = /\*\*(.+?)\*\*|__(.+?)__/u;
const CODE_RE = /`([^`]+)`/u;
const ITALIC_RE = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/u;

function textNode(text: string, marks?: JSONContent["marks"]): JSONContent {
  return marks?.length ? { type: "text", text, marks } : { type: "text", text };
}

function pushText(target: JSONContent[], text: string, marks?: JSONContent["marks"]) {
  if (!text) return;
  target.push(textNode(text, marks));
}

/**
 * Conservative inline markdown: **bold**, *italic*, `code`.
 * Unmatched markers are left as literal text.
 */
export function parseInlineMarkdown(text: string): JSONContent[] {
  if (!text) return [];
  if (!/[*_`]/u.test(text)) {
    return [{ type: "text", text }];
  }

  const nodes: JSONContent[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const bold = remaining.match(BOLD_RE);
    const code = remaining.match(CODE_RE);
    const italic = remaining.match(ITALIC_RE);

    const candidates = [
      bold ? { index: bold.index ?? 0, kind: "bold" as const, match: bold } : null,
      code ? { index: code.index ?? 0, kind: "code" as const, match: code } : null,
      italic
        ? { index: italic.index ?? 0, kind: "italic" as const, match: italic }
        : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null);

    if (candidates.length === 0) {
      pushText(nodes, remaining);
      break;
    }

    candidates.sort((a, b) => a.index - b.index);
    const next = candidates[0]!;
    pushText(nodes, remaining.slice(0, next.index));

    if (next.kind === "bold") {
      const inner = next.match[1] || next.match[2] || "";
      pushText(nodes, inner, [{ type: "bold" }]);
    } else if (next.kind === "code") {
      pushText(nodes, next.match[1] || "", [{ type: "code" }]);
    } else {
      const inner = next.match[1] || next.match[2] || "";
      pushText(nodes, inner, [{ type: "italic" }]);
    }

    remaining = remaining.slice(next.index + next.match[0].length);
  }

  return nodes.length ? nodes : [{ type: "text", text }];
}

export function hasInlineMarkdown(text: string): boolean {
  return /\*\*.+\*\*|__.+__|`[^`]+`|(?<!\*)\*(?!\*).+(?<!\*)\*(?!\*)/u.test(text);
}
