import {
  BorderStyle,
  HeadingLevel,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
} from "docx";
import type { JSONContent } from "@tiptap/react";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";

/** Match Notoria body font across the exported worksheet. */
const FONT_SANS = "Chakra Petch";

const BODY_SIZE = 22;
const HEADING_SIZES: Record<number, number> = {
  1: 32,
  2: 26,
  3: 24,
};

type MarkAttrs = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  strike?: boolean;
};

function getMarks(node: JSONContent): MarkAttrs {
  const result: MarkAttrs = {};
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        result.bold = true;
        break;
      case "italic":
        result.italic = true;
        break;
      case "underline":
        result.underline = true;
        break;
      case "highlight":
        result.highlight = true;
        break;
      case "strike":
        result.strike = true;
        break;
      default:
        break;
    }
  }
  return result;
}

function collectPlainText(node: JSONContent): string {
  if (node.type === "text" && typeof node.text === "string") {
    return sanitizeExportText(node.text);
  }
  if (!node.content?.length) return "";
  return node.content.map(collectPlainText).join("");
}

function collectInlineNodes(item: JSONContent): JSONContent[] {
  return (
    item.content?.flatMap((child) =>
      child.type === "paragraph" ? (child.content ?? []) : [child],
    ) ?? []
  );
}

function textRunFromNode(node: JSONContent, size: number): TextRun {
  const marks = getMarks(node);
  return new TextRun({
    text: node.text ?? "",
    font: FONT_SANS,
    size,
    bold: marks.bold,
    italics: marks.italic,
    underline: marks.underline ? {} : undefined,
    highlight: marks.highlight ? "yellow" : undefined,
    strike: marks.strike,
    color: "2F4A08",
  });
}

function collectRuns(
  nodes: JSONContent[] | undefined,
  size: number,
): TextRun[] {
  if (!nodes?.length) return [];
  const runs: TextRun[] = [];

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push(new TextRun({ break: 1 }));
      continue;
    }
    if (node.type === "text" && typeof node.text === "string") {
      const text = sanitizeExportText(node.text);
      if (!text) continue;
      runs.push(textRunFromNode({ ...node, text }, size));
      continue;
    }
    if (node.content?.length) {
      runs.push(...collectRuns(node.content, size));
    }
  }

  return runs;
}

function paragraphFromNodes(
  nodes: JSONContent[] | undefined,
  {
    size = BODY_SIZE,
    heading,
    prefix,
    indent,
    border,
    shading,
  }: Pick<IParagraphOptions, "heading" | "indent" | "border" | "shading"> & {
    size?: number;
    prefix?: string;
  } = {},
): Paragraph {
  const runs = collectRuns(nodes, size);
  const children: TextRun[] = [];

  if (prefix) {
    children.push(
      new TextRun({
        text: `${prefix} `,
        font: FONT_SANS,
        size,
        bold: Boolean(heading),
        color: "1A1528",
      }),
    );
  }

  if (runs.length > 0) {
    children.push(...runs);
  } else if (!prefix) {
    children.push(new TextRun({ text: " ", font: FONT_SANS, size }));
  }

  return new Paragraph({
    heading,
    spacing: { after: heading ? 120 : 160 },
    indent,
    shading,
    border,
    children,
  });
}

function headingLevel(level: number) {
  if (level <= 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

function renderListItems(
  items: JSONContent[] | undefined,
  ordered: boolean,
  indentLeft = 360,
): Paragraph[] {
  if (!items?.length) return [];

  return items.flatMap((item, index) => {
    const marker = ordered ? `${index + 1}.` : "•";
    return paragraphFromNodes(collectInlineNodes(item), {
      prefix: marker,
      indent: { left: indentLeft },
    });
  });
}

function renderTable(node: JSONContent): Table {
  const rows = node.content ?? [];
  const columnCount = Math.max(
    1,
    ...rows.map((row) => row.content?.length ?? 0),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: (row.content ?? []).map((cell) => {
            const isHeader = cell.type === "tableHeader";
            return new TableCell({
              width: {
                size: Math.round(100 / columnCount),
                type: WidthType.PERCENTAGE,
              },
              shading: isHeader
                ? { type: ShadingType.CLEAR, fill: "F4F2F8" }
                : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: collectPlainText(cell) || " ",
                      font: FONT_SANS,
                      size: 20,
                      bold: isHeader,
                    }),
                  ],
                }),
              ],
            });
          }),
        }),
    ),
  });
}

function renderBlock(
  node: JSONContent,
): Array<Paragraph | Table> {
  switch (node.type) {
    case "paragraph":
      return [paragraphFromNodes(node.content)];
    case "heading": {
      const level =
        typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      return [
        paragraphFromNodes(node.content, {
          heading: headingLevel(level),
          size: HEADING_SIZES[level] ?? HEADING_SIZES[3],
        }),
      ];
    }
    case "bulletList":
      return renderListItems(node.content, false);
    case "orderedList":
      return renderListItems(node.content, true);
    case "taskList":
      return (node.content ?? []).map((item) => {
        const checked = Boolean(item.attrs?.checked);
        return paragraphFromNodes(collectInlineNodes(item), {
          prefix: checked ? "[x]" : "[ ]",
          indent: { left: 360 },
        });
      });
    case "blockquote":
      return (node.content ?? []).map((child) =>
        paragraphFromNodes(child.content, {
          indent: { left: 240 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: "C8C2D6",
              space: 8,
            },
          },
        }),
      );
    case "codeBlock":
      return [
        paragraphFromNodes(
          [{ type: "text", text: collectPlainText(node) || " " }],
          {
            shading: { type: ShadingType.CLEAR, fill: "F4F2F8" },
          },
        ),
      ];
    case "horizontalRule":
      return [
        new Paragraph({
          spacing: { before: 80, after: 160 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "D5D0E0",
              space: 1,
            },
          },
          children: [new TextRun({ text: "", font: FONT_SANS, size: 4 })],
        }),
      ];
    case "table":
      return [renderTable(node)];
    default:
      if (node.content?.length) {
        return node.content.flatMap((child) => renderBlock(child));
      }
      return [];
  }
}

/** Continuous TipTap → DOCX body, matching Writing rich-document structure. */
export function renderTipTapDocToDocx(
  doc: JSONContent | null,
): Array<Paragraph | Table> {
  if (!doc?.content?.length) {
    return [paragraphFromNodes(undefined)];
  }

  const blocks = doc.content.flatMap((node) => renderBlock(node));
  return blocks.length > 0 ? blocks : [paragraphFromNodes(undefined)];
}
