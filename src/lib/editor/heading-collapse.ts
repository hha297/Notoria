import type { JSONContent } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";

/**
 * End index (exclusive) of the section owned by `blocks[headingIndex]`.
 * Section = following siblings until a heading with level <= this heading's level.
 */
export function getSectionEndIndex(
  blocks: JSONContent[],
  headingIndex: number,
): number {
  const heading = blocks[headingIndex];
  if (!heading || heading.type !== "heading") return headingIndex + 1;

  const level = coerceHeadingLevel(heading.attrs?.level);
  for (let i = headingIndex + 1; i < blocks.length; i += 1) {
    const block = blocks[i]!;
    if (
      block.type === "heading" &&
      coerceHeadingLevel(block.attrs?.level) <= level
    ) {
      return i;
    }
  }
  return blocks.length;
}

export function headingHasSectionContent(
  blocks: JSONContent[],
  headingIndex: number,
): boolean {
  return getSectionEndIndex(blocks, headingIndex) > headingIndex + 1;
}

/** Block indices hidden because an ancestor heading is collapsed. */
export function computeHiddenBlockIndices(
  blocks: JSONContent[],
  collapsedHeadingIndices: ReadonlySet<number>,
): Set<number> {
  const hidden = new Set<number>();
  for (const headingIndex of collapsedHeadingIndices) {
    if (blocks[headingIndex]?.type !== "heading") continue;
    const end = getSectionEndIndex(blocks, headingIndex);
    for (let i = headingIndex + 1; i < end; i += 1) {
      hidden.add(i);
    }
  }
  return hidden;
}

export type HeadingSectionRange = {
  /** Position of the heading node. */
  headingPos: number;
  /** Start of section content (immediately after the heading). */
  from: number;
  /** End of section content (before next same/higher heading, or doc end). */
  to: number;
  level: number;
};

/**
 * Section range for a top-level heading at `headingPos` in a ProseMirror doc.
 */
export function getHeadingSectionRange(
  doc: PMNode,
  headingPos: number,
): HeadingSectionRange | null {
  const heading = doc.nodeAt(headingPos);
  if (!heading || heading.type.name !== "heading") return null;

  const level = coerceHeadingLevel(heading.attrs.level);
  const from = headingPos + heading.nodeSize;
  let to = from;

  let pos = 0;
  let seenHeading = false;
  for (let i = 0; i < doc.childCount; i += 1) {
    const child = doc.child(i);
    if (pos === headingPos) {
      seenHeading = true;
      pos += child.nodeSize;
      continue;
    }
    if (seenHeading) {
      if (
        child.type.name === "heading" &&
        coerceHeadingLevel(child.attrs.level) <= level
      ) {
        to = pos;
        return { headingPos, from, to, level };
      }
      to = pos + child.nodeSize;
    }
    pos += child.nodeSize;
  }

  if (!seenHeading) return null;
  return { headingPos, from, to, level };
}

export function headingSectionHasContent(
  doc: PMNode,
  headingPos: number,
): boolean {
  const range = getHeadingSectionRange(doc, headingPos);
  return Boolean(range && range.to > range.from);
}
