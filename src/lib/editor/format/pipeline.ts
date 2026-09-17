import type { JSONContent } from "@tiptap/react";
import {
  detectMarkdownHeading,
  detectNumberedHeading,
  detectOrderedList,
} from "@/lib/editor/format/detect/headings";
import {
  detectMarkedBulletList,
  detectParenOrderedList,
  detectUnmarkedList,
} from "@/lib/editor/format/detect/lists";
import {
  detectEmphasisLabel,
  detectParagraph,
  detectSectionHeading,
  detectTitle,
} from "@/lib/editor/format/detect/sections";
import { detectGenericTable } from "@/lib/editor/format/detect/tables";
import {
  flattenDocument,
  splitUnitsIntoRuns,
} from "@/lib/editor/format/tokenize";
import {
  collapseEmptyParagraphs,
  tidyBlockNode,
} from "@/lib/editor/format/tidy";
import { parseSectionHeading } from "@/lib/editor/format/headings";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";
import { tipTapNodePlainText } from "@/lib/editor/format/types";
import {
  EMPTY_TIPTAP_DOC,
  MIN_DETECTION_CONFIDENCE,
  isTipTapDoc,
  type Detection,
  type Detector,
  type FormatContext,
  type FormatLine,
} from "@/lib/editor/format/types";

function detectorsFor(_context: FormatContext): Detector[] {
  return [
    { id: "table", detect: detectGenericTable },
    { id: "markdown-heading", detect: detectMarkdownHeading },
    { id: "numbered-heading", detect: detectNumberedHeading },
    { id: "title", detect: detectTitle },
    { id: "section", detect: detectSectionHeading },
    { id: "ordered-list", detect: detectOrderedList },
    { id: "paren-ordered-list", detect: detectParenOrderedList },
    { id: "marked-list", detect: detectMarkedBulletList },
    { id: "emphasis-label", detect: detectEmphasisLabel },
    { id: "unmarked-list", detect: detectUnmarkedList },
    { id: "paragraph", detect: detectParagraph },
  ];
}

function pickDetection(
  lines: FormatLine[],
  index: number,
  detectors: Detector[],
): Detection {
  const found: Detection[] = [];
  for (const detector of detectors) {
    const detection = detector.detect(lines, index);
    if (detection && detection.confidence >= MIN_DETECTION_CONFIDENCE) {
      found.push(detection);
    }
  }

  found.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.consumed - a.consumed;
  });

  return (
    found[0] ?? {
      type: "paragraph",
      confidence: 0,
      consumed: 1,
      nodes: detectParagraph(lines, index)?.nodes ?? [{ type: "paragraph" }],
    }
  );
}

function classifyLines(
  lines: FormatLine[],
  context: FormatContext,
): JSONContent[] {
  const detectors = detectorsFor(context);
  const nodes: JSONContent[] = [];
  let index = 0;
  while (index < lines.length) {
    const detection = pickDetection(lines, index, detectors);
    nodes.push(...detection.nodes);
    index += Math.max(1, detection.consumed);
  }
  return nodes;
}

function applySectionHeadingLevel(
  node: JSONContent,
  level: number,
): JSONContent {
  const coerced = coerceHeadingLevel(level);
  if (node.type === "heading") {
    return {
      ...node,
      attrs: { ...(node.attrs ?? {}), level: coerced },
    };
  }
  return {
    type: "heading",
    attrs: { ...(node.attrs ?? {}), level: coerced },
    content: node.content,
  };
}

function normalizeHierarchicalHeadings(nodes: JSONContent[]): JSONContent[] {
  return nodes.map((node) => {
    if (node.type !== "paragraph" && node.type !== "heading") return node;
    const text = tipTapNodePlainText(node).trim();
    if (!text) return node;
    const section = parseSectionHeading(text);
    if (!section) return node;
    return applySectionHeadingLevel(node, section.depth);
  });
}

export function formatTiptapDocument(
  doc: JSONContent | null | undefined,
  context: FormatContext = {},
): JSONContent {
  if (!doc || !isTipTapDoc(doc)) {
    return structuredClone(EMPTY_TIPTAP_DOC);
  }

  const tidied = (doc.content ?? []).map(tidyBlockNode);
  const units = flattenDocument(tidied);
  const content: JSONContent[] = [];

  for (const run of splitUnitsIntoRuns(units)) {
    if (run[0]?.kind === "opaque") {
      for (const unit of run) {
        if (unit.kind === "opaque") content.push(unit.node);
      }
      continue;
    }
    const lines = run.flatMap((unit) =>
      unit.kind === "line" ? [unit.line] : [],
    );
    content.push(...classifyLines(lines, context));
  }

  let next = collapseEmptyParagraphs(content);
  next = normalizeHierarchicalHeadings(next);
  next = collapseEmptyParagraphs(next);

  if (next.length === 0) {
    return structuredClone(EMPTY_TIPTAP_DOC);
  }

  return { type: "doc", content: next };
}
