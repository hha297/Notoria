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
} from "@/lib/editor/format/types";

export {
  EMPTY_TIPTAP_DOC,
  isTipTapDoc,
  tipTapNodePlainText,
  parseSectionHeading,
  hierarchicalHeadingDepth,
};

/**
 * Deterministic TipTap document formatter.
 * Cleans whitespace, infers headings/lists/tables/dictionary structure,
 * never rewrites wording or calls AI.
 */
export function formatTiptapDocument(
  doc: JSONContent | null | undefined,
): JSONContent {
  return runFormatPipeline(doc);
}
