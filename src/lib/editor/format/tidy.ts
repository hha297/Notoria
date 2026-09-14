import type { JSONContent } from "@tiptap/react";
import { isPersistedImageSrc } from "@/lib/editor/images";
import {
  LIST_BLOCKS,
  TEXTISH_BLOCKS,
  tipTapNodePlainText,
} from "@/lib/editor/format/types";

const NESTED_CONTAINERS = new Set(["blockquote", "table", "tableRow"]);
const ITEM_OR_CELL = new Set([
  "listItem",
  "taskItem",
  "tableCell",
  "tableHeader",
]);

function collapseSpaces(text: string): string {
  const leading = text.match(/^[ \t]*/)?.[0] ?? "";
  const indent = leading.replace(/\t/g, "  ");
  const rest = text.slice(leading.length).replace(/[ \t]+/g, " ");
  return indent + rest;
}

function hasCodeMark(node: JSONContent): boolean {
  return (node.marks ?? []).some((mark) => mark.type === "code");
}

function tidyInlineNodes(
  nodes: JSONContent[] | undefined,
  inCodeBlock: boolean,
): JSONContent[] | undefined {
  if (!nodes?.length) return nodes;

  const next: JSONContent[] = [];

  for (const node of nodes) {
    if (node.type === "text" && typeof node.text === "string") {
      const text =
        inCodeBlock || hasCodeMark(node)
          ? node.text
          : collapseSpaces(node.text);
      if (text.length === 0) continue;
      next.push({ ...node, text });
      continue;
    }

    if (node.type === "hardBreak") {
      next.push({ type: "hardBreak" });
      continue;
    }

    const cloned: JSONContent = { ...node };
    if (cloned.content) {
      cloned.content = tidyInlineNodes(cloned.content, inCodeBlock);
    }
    next.push(cloned);
  }

  return next;
}

export function isVisuallyEmptyBlock(node: JSONContent): boolean {
  if (node.type === "horizontalRule") return false;
  if (node.type === "image") {
    return !isPersistedImageSrc(
      typeof node.attrs?.src === "string" ? node.attrs.src : "",
    );
  }
  if (LIST_BLOCKS.has(node.type ?? "")) {
    return (node.content ?? []).length === 0;
  }
  if (node.type === "table" || node.type === "blockquote") {
    return tipTapNodePlainText(node).trim().length === 0;
  }
  return tipTapNodePlainText(node).trim().length === 0;
}

function tidyListItems(items: JSONContent[] | undefined): JSONContent[] {
  if (!items?.length) return [];
  return items
    .map((item) => tidyBlockNode(item))
    .filter((item) => tipTapNodePlainText(item).trim().length > 0);
}

function trimTextBlockEdges(content: JSONContent[]): JSONContent[] {
  const next = [...content];
  const first = next[0];
  const last = next[next.length - 1];
  if (first?.type === "text" && typeof first.text === "string") {
    if (!/^[ \t]+[-*+•●◦.]/.test(first.text)) {
      first.text = first.text.replace(/^[ \t]+/, "");
    }
  }
  if (last?.type === "text" && typeof last.text === "string") {
    last.text = last.text.replace(/[ \t]+$/, "");
  }
  return next.filter(
    (child) => child.type !== "text" || (child.text?.length ?? 0) > 0,
  );
}

export function tidyBlockNode(node: JSONContent): JSONContent {
  const inCodeBlock = node.type === "codeBlock";
  const next: JSONContent = { ...node };
  if (!next.content) return next;

  const type = node.type ?? "";

  if (TEXTISH_BLOCKS.has(type)) {
    next.content = tidyInlineNodes(next.content, inCodeBlock);
    if (!inCodeBlock && next.content?.length) {
      next.content = trimTextBlockEdges(next.content);
    }
  } else if (LIST_BLOCKS.has(type)) {
    next.content = tidyListItems(next.content);
  } else if (NESTED_CONTAINERS.has(type) || ITEM_OR_CELL.has(type)) {
    next.content = next.content.map(tidyBlockNode);
  } else {
    next.content = tidyInlineNodes(next.content, false);
  }

  return next;
}

export function collapseEmptyParagraphs(nodes: JSONContent[]): JSONContent[] {
  const collapsed: JSONContent[] = [];
  let prevEmpty = false;

  for (const node of nodes) {
    const empty = isVisuallyEmptyBlock(node);
    if (empty) {
      if (
        node.type === "heading" ||
        node.type === "bulletList" ||
        node.type === "orderedList"
      ) {
        continue;
      }
      if (prevEmpty || collapsed.length === 0) continue;
      collapsed.push({ type: "paragraph" });
      prevEmpty = true;
      continue;
    }
    prevEmpty = false;
    collapsed.push(node);
  }

  while (
    collapsed.length > 0 &&
    isVisuallyEmptyBlock(collapsed[collapsed.length - 1]!)
  ) {
    collapsed.pop();
  }

  return collapsed;
}
