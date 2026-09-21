import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { joinMeanings, joinTags } from "@/lib/vocabulary/export/build-document";
import type {
  ExportTextRun,
  NoteBlock,
} from "@/lib/vocabulary/export/note-blocks";
import {
  reportProgress,
  yieldToMain,
  type VocabularyExportProgressHandler,
} from "@/lib/vocabulary/export/progress";
import type {
  VocabularyExportDocument,
  VocabularyExportLabels,
  VocabularyExportOptions,
  VocabularyExportRow,
} from "@/lib/vocabulary/export/types";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import {
  DOCX_FONT_SANS,
  PRINT_ACCENT,
  PRINT_HAIRLINE,
  PRINT_INK,
  PRINT_LEDE_WASH,
  PRINT_MUTED,
  PRINT_RULE,
  hexForDocx,
} from "@/lib/export/print-theme";

const FONT_SANS = DOCX_FONT_SANS;
const YIELD_EVERY = 30;
const INK = hexForDocx(PRINT_INK);
const MUTED = hexForDocx(PRINT_MUTED);
const ACCENT = hexForDocx(PRINT_ACCENT.vocabulary);
const HAIRLINE = hexForDocx(PRINT_HAIRLINE);
const RULE = hexForDocx(PRINT_RULE);
const WASH = hexForDocx(PRINT_LEDE_WASH);

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: HAIRLINE,
};

const borders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

function txt(value: string) {
  return sanitizeExportText(value);
}

function run(
  text: string,
  opts: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
  } = {},
) {
  return new TextRun({
    text: txt(text),
    font: FONT_SANS,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? 20,
    color: opts.color ?? INK,
  });
}

function runsFromExport(
  items: ExportTextRun[],
  size: number,
  extras: { bold?: boolean; color?: string } = {},
) {
  const children = items
    .map((item) =>
      run(item.text, {
        bold: extras.bold || item.bold,
        italics: item.italic,
        size,
        color: extras.color,
      }),
    )
    .filter((item) => item);
  return children.length ? children : [run(" ")];
}

function paragraphFromRuns(
  items: ExportTextRun[],
  opts: {
    size?: number;
    bold?: boolean;
    color?: string;
    after?: number;
    before?: number;
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    indent?: number;
  } = {},
) {
  return new Paragraph({
    heading: opts.heading,
    spacing: {
      after: opts.after ?? 80,
      before: opts.before ?? 0,
      line: 276,
    },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: runsFromExport(items, opts.size ?? 20, {
      bold: opts.bold,
      color: opts.color,
    }),
  });
}

function nestedTable(rows: ExportTextRun[][][]): Table {
  const colCount = Math.max(1, ...rows.map((row) => row.length));
  const colWidth = Math.floor(100 / colCount);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: Array.from({ length: colCount }, (_, cellIndex) => {
            const cell = row[cellIndex] ?? [];
            return new TableCell({
              borders,
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading:
                rowIndex === 0
                  ? { type: ShadingType.CLEAR, fill: WASH }
                  : undefined,
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              verticalAlign: VerticalAlign.TOP,
              children: [
                paragraphFromRuns(cell.length ? cell : [{ text: " " }], {
                  size: 16,
                  bold: rowIndex === 0,
                  color: rowIndex === 0 ? MUTED : undefined,
                  after: 0,
                }),
              ],
            });
          }),
        }),
    ),
  });
}

function noteChildren(blocks: NoteBlock[]): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      children.push(
        paragraphFromRuns(block.runs, {
          size: block.level <= 1 ? 22 : block.level === 2 ? 20 : 18,
          bold: true,
          after: 80,
          before: 80,
        }),
      );
      continue;
    }
    if (block.type === "paragraph") {
      children.push(paragraphFromRuns(block.runs, { size: 18, after: 80 }));
      continue;
    }
    if (block.type === "code") {
      children.push(
        paragraphFromRuns([{ text: block.text }], {
          size: 16,
          color: INK,
          after: 80,
        }),
      );
      continue;
    }
    if (block.type === "rule") {
      children.push(
        new Paragraph({
          spacing: { after: 120, before: 80 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE },
          },
          children: [run(" ")],
        }),
      );
      continue;
    }
    if (block.type === "table") {
      children.push(nestedTable(block.rows));
      children.push(
        new Paragraph({ spacing: { after: 120 }, children: [run(" ")] }),
      );
      continue;
    }
    block.items.forEach((item, index) => {
      const marker = block.ordered ? `${index + 1}.  ` : "•  ";
      children.push(
        paragraphFromRuns([{ text: marker }, ...item], {
          size: 18,
          after: 40,
          indent: 120,
        }),
      );
    });
  }

  return children;
}

function metaLine(row: VocabularyExportRow, options: VocabularyExportOptions) {
  const parts: string[] = [];
  if (options.includePartOfSpeech && row.partOfSpeech.trim()) {
    parts.push(row.partOfSpeech.trim());
  }
  if (options.includeTags) {
    const tags = joinTags(row.tags);
    if (tags) parts.push(tags);
  }
  if (options.includeLastUpdated && row.updatedAt.trim()) {
    parts.push(row.updatedAt.trim());
  }
  return parts.join("   ·   ");
}

export async function generateVocabularyDocxBlob(
  documentModel: VocabularyExportDocument,
  labels: VocabularyExportLabels,
  options: VocabularyExportOptions,
  onProgress?: VocabularyExportProgressHandler,
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        run(labels.documentHeading, { bold: true, size: 18, color: ACCENT }),
      ],
    }),
  ];

  if (documentModel.workspaceName.trim()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 60 },
        children: [
          run(documentModel.workspaceName, { bold: true, size: 40, color: INK }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 280 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: ACCENT,
          space: 8,
        },
      },
      children: [run(labels.wordCount, { size: 20, color: MUTED })],
    }),
  );

  for (let index = 0; index < documentModel.rows.length; index += 1) {
    const row = documentModel.rows[index]!;
    const meanings = joinMeanings(row.meanings);
    const meta = metaLine(row, options);

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: index === 0 ? 80 : 200, after: 40 },
        keepNext: true,
        border:
          index === 0
            ? undefined
            : {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: HAIRLINE,
                  space: 12,
                },
              },
        children: [run(row.word || "—", { bold: true, size: 26, color: INK })],
      }),
    );

    if (meta) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [run(meta, { size: 16, color: MUTED })],
        }),
      );
    }

    if (meanings) {
      children.push(
        new Paragraph({
          spacing: {
            after: options.includeNotes && row.noteBlocks.length ? 80 : 40,
          },
          children: [run(meanings, { size: 20 })],
        }),
      );
    }

    if (options.includeNotes && row.noteBlocks.length) {
      children.push(
        new Paragraph({
          spacing: { after: 60, before: 40 },
          children: [
            run(labels.notesHeading, { bold: true, size: 16, color: MUTED }),
          ],
        }),
      );
      children.push(...noteChildren(row.noteBlocks));
    }

    if (
      (index + 1) % YIELD_EVERY === 0 ||
      index + 1 === documentModel.rows.length
    ) {
      reportProgress(onProgress, {
        phase: "generating",
        current: index + 1,
        total: documentModel.rows.length,
      });
      await yieldToMain();
    }
  }

  reportProgress(onProgress, {
    phase: "saving",
    current: documentModel.rows.length,
    total: documentModel.rows.length,
  });

  const doc = new Document({
    creator: "Notoria",
    title: labels.documentHeading,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
