import type { JSONContent } from "@tiptap/react";
import { formatTiptapDocument as runFormatPipeline } from "@/lib/editor/format/pipeline";
import {
  hierarchicalHeadingDepth,
  parseSectionHeading,
} from "@/lib/editor/format/headings";
import {
  EMPTY_TIPTAP_DOC,
  isTipTapDoc,
  tipTapNodePlainText,
  type FormatContext,
} from "@/lib/editor/format/types";

export {
  EMPTY_TIPTAP_DOC,
  isTipTapDoc,
  tipTapNodePlainText,
  parseSectionHeading,
  hierarchicalHeadingDepth,
};
export type { FormatContext };

/**
 * Deterministic TipTap document formatter.
 * Cleans whitespace, infers headings/lists/delimiter tables/dictionary structure.
 * Semantic paradigm tables for notes are decided by the AI formatter, not this pass.
 */
export function formatTiptapDocument(
  doc: JSONContent | null | undefined,
  context: FormatContext = {},
): JSONContent {
  return runFormatPipeline(doc, context);
}
