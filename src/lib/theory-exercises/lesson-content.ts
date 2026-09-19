import type { JSONContent } from "@tiptap/react";
import { theoryDocPlainText } from "@/lib/theory/content";

export type TheoryLessonBeatKind = "idea" | "examples" | "detail";

export type TheoryLessonBeat = {
  id: string;
  kind: TheoryLessonBeatKind;
  title: string | null;
  doc: JSONContent;
  examples: JSONContent[];
};

function collectText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (!node.content?.length) return "";
  return node.content.map(collectText).join(" ");
}

function isEmptyBlock(block: JSONContent): boolean {
  if (block.type === "horizontalRule" || block.type === "image" || block.type === "table") {
    return false;
  }
  return collectText(block).replace(/\s+/g, " ").trim().length === 0;
}

function isExampleBlock(block: JSONContent): boolean {
  return (
    block.type === "bulletList" ||
    block.type === "orderedList" ||
    block.type === "blockquote"
  );
}

function listItemToDoc(item: JSONContent): JSONContent {
  const content = (item.content ?? []).filter((block) => !isEmptyBlock(block));
  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

function extractExamples(block: JSONContent): JSONContent[] {
  if (block.type === "blockquote") {
    return [
      {
        type: "doc",
        content: block.content?.length ? block.content : [{ type: "paragraph" }],
      },
    ];
  }
  if (block.type === "bulletList" || block.type === "orderedList") {
    return (block.content ?? [])
      .filter((item) => item.type === "listItem")
      .map(listItemToDoc)
      .filter((doc) => theoryDocPlainText(doc).trim().length > 0);
  }
  return [];
}

function expandParagraphLines(block: JSONContent): JSONContent[] {
  if (block.type !== "paragraph") return [block];
  const parts: JSONContent[][] = [[]];

  for (const node of block.content ?? []) {
    if (node.type === "hardBreak") {
      parts.push([]);
      continue;
    }
    if (node.type === "text" && typeof node.text === "string" && node.text.includes("\n")) {
      const lines = node.text.split("\n");
      lines.forEach((line, lineIndex) => {
        if (line.length > 0) {
          parts[parts.length - 1].push({ ...node, text: line });
        }
        if (lineIndex < lines.length - 1) parts.push([]);
      });
      continue;
    }
    parts[parts.length - 1].push(node);
  }

  const paragraphs = parts
    .map((content) => ({ type: "paragraph" as const, content }))
    .filter((paragraph) => !isEmptyBlock(paragraph));
  return paragraphs.length > 0 ? paragraphs : [block];
}

function toDoc(blocks: JSONContent[]): JSONContent {
  const content = blocks.filter((block) => !isEmptyBlock(block));
  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

function blockText(block: JSONContent): string {
  return collectText(block).replace(/\s+/g, " ").trim();
}

function isLabelParagraph(block: JSONContent): boolean {
  if (block.type !== "paragraph") return false;
  const text = blockText(block);
  if (!text || /[.!?…]$/u.test(text)) return false;
  return text.split(/\s+/).length <= 4 && text.length <= 40;
}

function isShortExampleParagraph(block: JSONContent): boolean {
  if (block.type !== "paragraph") return false;
  const text = blockText(block);
  return text.length > 0 && text.length <= 180;
}

function toExampleDocs(blocks: JSONContent[]): JSONContent[] {
  return blocks
    .filter((block) => !isEmptyBlock(block))
    .map((block) => toDoc([block]));
}

type ProsePiece = {
  examples: boolean;
  title: string | null;
  blocks: JSONContent[];
};

/**
 * Present existing short follow-on paragraphs as examples when the note
 * did not use a list or blockquote. Does not invent or rewrite text.
 */
function splitProsePieces(
  blocks: JSONContent[],
  groupTitle: string | null,
): ProsePiece[] {
  const meaningful = blocks.filter((block) => !isEmptyBlock(block));
  if (meaningful.length === 0) return [];

  const pieces: ProsePiece[] = [];
  let index = 0;

  while (index < meaningful.length) {
    const block = meaningful[index];
    if (
      isLabelParagraph(block) &&
      meaningful.slice(index + 1).some(isShortExampleParagraph)
    ) {
      const examples: JSONContent[] = [];
      let cursor = index + 1;
      while (
        cursor < meaningful.length &&
        isShortExampleParagraph(meaningful[cursor])
      ) {
        examples.push(meaningful[cursor]);
        cursor += 1;
      }
      if (examples.length > 0) {
        pieces.push({
          examples: true,
          title: blockText(block) || groupTitle,
          blocks: examples,
        });
        index = cursor;
        continue;
      }
    }
    const prose: JSONContent[] = [];
    while (index < meaningful.length) {
      const current = meaningful[index];
      const next = meaningful[index + 1];
      if (
        isLabelParagraph(current) &&
        next &&
        isShortExampleParagraph(next)
      ) {
        break;
      }
      prose.push(current);
      index += 1;
    }
    if (prose.length === 0) continue;

    const firstText = blockText(prose[0]);
    const trailing = prose.slice(1);
    if (
      firstText.length > 80 &&
      trailing.length >= 2 &&
      trailing.every(isShortExampleParagraph)
    ) {
      pieces.push({ examples: false, title: groupTitle, blocks: [prose[0]] });
      pieces.push({ examples: true, title: groupTitle, blocks: trailing });
    } else if (
      groupTitle &&
      prose.length >= 2 &&
      prose.every(isShortExampleParagraph)
    ) {
      pieces.push({ examples: true, title: groupTitle, blocks: prose });
    } else {
      pieces.push({ examples: false, title: groupTitle, blocks: prose });
    }
  }

  return pieces;
}

/**
 * Split a Theory TipTap document into lesson beats.
 * Presentation only — does not alter stored content.
 */
export function buildTheoryLessonBeats(
  doc: JSONContent | null | undefined,
): TheoryLessonBeat[] {
  const blocks = (doc?.type === "doc" ? (doc.content ?? []) : []).flatMap(
    expandParagraphLines,
  );
  type Group = {
    title: string | null;
    chunks: Array<{ examples: boolean; blocks: JSONContent[] }>;
  };
  const groups: Group[] = [];
  let current: Group = { title: null, chunks: [] };

  const pushBlock = (block: JSONContent) => {
    const example = isExampleBlock(block);
    const last = current.chunks[current.chunks.length - 1];
    if (last && last.examples === example) {
      last.blocks.push(block);
      return;
    }
    current.chunks.push({ examples: example, blocks: [block] });
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      const title = collectText(block).replace(/\s+/g, " ").trim();
      if (current.title || current.chunks.length) groups.push(current);
      current = { title: title || null, chunks: [] };
      continue;
    }
    if (block.type === "horizontalRule") continue;
    if (block.type === "paragraph" && isEmptyBlock(block)) continue;
    pushBlock(block);
  }
  if (current.title || current.chunks.length) groups.push(current);

  const beats: TheoryLessonBeat[] = [];
  let ideaUsed = false;
  let pieceIndex = 0;

  for (const group of groups) {
    for (const chunk of group.chunks) {
      const pieces = chunk.examples
        ? [{ examples: true, title: group.title, blocks: chunk.blocks }]
        : splitProsePieces(chunk.blocks, group.title);

      for (const piece of pieces) {
        if (piece.examples) {
          const examples = chunk.examples
            ? piece.blocks.flatMap(extractExamples)
            : toExampleDocs(piece.blocks);
          if (examples.length === 0) continue;
          beats.push({
            id: `ex-${pieceIndex}`,
            kind: "examples",
            title: piece.title,
            doc: toDoc(piece.blocks),
            examples,
          });
          pieceIndex += 1;
          continue;
        }
        const meaningful = piece.blocks.filter((block) => !isEmptyBlock(block));
        if (!piece.title && meaningful.length === 0) continue;
        const kind: TheoryLessonBeatKind = ideaUsed ? "detail" : "idea";
        ideaUsed = true;
        beats.push({
          id: `tx-${pieceIndex}`,
          kind,
          title: piece.title,
          doc: toDoc(meaningful.length ? meaningful : piece.blocks),
          examples: [],
        });
        pieceIndex += 1;
      }
    }
  }

  return beats;
}

export type TheoryLessonSection = {
  id: string;
  kind: TheoryLessonBeatKind;
  title: string | null;
  docs: JSONContent[];
  examples: JSONContent[];
};

/**
 * Merge consecutive beats of the same kind and heading so short notes
 * are not split into a long staircase of sections.
 */
export function groupTheoryLessonBeats(
  beats: TheoryLessonBeat[],
): TheoryLessonSection[] {
  const sections: TheoryLessonSection[] = [];
  for (const beat of beats) {
    const last = sections[sections.length - 1];
    if (last && last.kind === beat.kind && last.title === beat.title) {
      if (beat.kind !== "examples") last.docs.push(beat.doc);
      last.examples.push(...beat.examples);
      continue;
    }
    sections.push({
      id: beat.id,
      kind: beat.kind,
      title: beat.title,
      docs: beat.kind === "examples" ? [] : [beat.doc],
      examples: [...beat.examples],
    });
  }
  return sections;
}

export function splitExampleLayers(doc: JSONContent): {
  primary: JSONContent;
  note: JSONContent | null;
} {
  const content = (doc.content ?? []).filter((block) => !isEmptyBlock(block));
  if (content.length <= 1) {
    return {
      primary: {
        type: "doc",
        content: content.length > 0 ? content : [{ type: "paragraph" }],
      },
      note: null,
    };
  }
  return {
    primary: { type: "doc", content: [content[0]] },
    note: { type: "doc", content: content.slice(1) },
  };
}

export function theoryLessonHasMaterial(input: {
  description?: string | null;
  beats: TheoryLessonBeat[];
}): boolean {
  if (input.description?.trim()) return true;
  return input.beats.some(
    (beat) =>
      beat.title ||
      beat.examples.length > 0 ||
      theoryDocPlainText(beat.doc).trim().length > 0,
  );
}

const QUICK_EXAMPLE_LIMIT = 4;

/**
 * A short refresher from existing sections only: the core idea plus
 * a handful of examples. Does not invent or summarize new copy.
 */
export function selectTheoryQuickReview(
  sections: TheoryLessonSection[],
): TheoryLessonSection[] {
  if (sections.length === 0) return [];
  const idea = sections.find((section) => section.kind === "idea");
  const examples = sections.find((section) => section.kind === "examples");
  const picked: TheoryLessonSection[] = [];

  if (idea) {
    picked.push({
      ...idea,
      examples: examples ? [] : idea.examples.slice(0, QUICK_EXAMPLE_LIMIT),
    });
  }
  if (examples) {
    picked.push({
      ...examples,
      examples: examples.examples.slice(0, QUICK_EXAMPLE_LIMIT),
    });
  }
  if (picked.length === 0) return [sections[0]];
  return picked;
}

export function theoryHasQuickReview(sections: TheoryLessonSection[]): boolean {
  if (sections.length >= 2) return true;
  return sections.some((section) => section.examples.length > 1);
}
