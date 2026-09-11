import type { JSONContent } from "@tiptap/react";

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

/**
 * Coerce TipTap heading `attrs.level` to a valid 1–6 integer.
 * String/"2" and invalid values must not silently fall through as H1 in renderers
 * that use `levels.includes(level)` (strict equality).
 */
export function coerceHeadingLevel(value: unknown): HeadingLevel {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric)) return 1;
  const level = Math.trunc(numeric);
  if (level < 1) return 1;
  if (level > 6) return 6;
  return level as HeadingLevel;
}

export function headingTagForLevel(level: unknown): `h${HeadingLevel}` {
  return `h${coerceHeadingLevel(level)}`;
}

/** Ensure every heading node stores a numeric `attrs.level` (mutates a clone). */
export function normalizeTipTapHeadingLevels(
  doc: JSONContent | null | undefined,
): JSONContent {
  if (!doc || doc.type !== "doc") {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  return walk(doc);
}

function walk(node: JSONContent): JSONContent {
  const next: JSONContent = { ...node };

  if (node.type === "heading") {
    next.attrs = {
      ...(node.attrs ?? {}),
      level: coerceHeadingLevel(node.attrs?.level),
    };
  }

  if (node.content?.length) {
    next.content = node.content.map(walk);
  }

  return next;
}
