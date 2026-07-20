import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import {
  joinMeanings,
  joinTags,
  visibleColumns,
} from "@/lib/vocabulary/export/build-document";
import type {
  VocabularyExportDocument,
  VocabularyExportLabels,
  VocabularyExportOptions,
  VocabularyExportRow,
} from "@/lib/vocabulary/export/types";

const FONT_SANS = "Chakra Petch";

type ColumnKey = "word" | "partOfSpeech" | "meanings" | "tags" | "notes" | "updated";

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "D5D0E0",
};

const borders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

function headerCell(text: string, width: number) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: "F3F1F7" },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT_SANS,
            bold: true,
            size: 16,
            color: "6B6680",
            allCaps: true,
          }),
        ],
      }),
    ],
  });
}

function bodyCell(text: string, width: number, bold = false) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT_SANS,
            bold,
            size: 18,
          }),
        ],
      }),
    ],
  });
}

function cellValue(row: VocabularyExportRow, key: ColumnKey): string {
  switch (key) {
    case "word":
      return row.word;
    case "partOfSpeech":
      return row.partOfSpeech;
    case "meanings":
      return joinMeanings(row.meanings);
    case "tags":
      return joinTags(row.tags, ", ");
    case "notes":
      return row.notes || "—";
    case "updated":
      return row.updatedAt;
  }
}

function columnWidth(key: ColumnKey, columns: ReturnType<typeof visibleColumns>) {
  const widths: Record<ColumnKey, number> = {
    word: 16,
    partOfSpeech: 14,
    meanings: 28,
    tags: 16,
    notes: 14,
    updated: 12,
  };
  const active = (Object.keys(widths) as ColumnKey[]).filter((k) => columns[k]);
  const total = active.reduce((sum, k) => sum + widths[k], 0);
  return Math.round((widths[key] / total) * 100);
}

export async function generateVocabularyDocxBlob(
  documentModel: VocabularyExportDocument,
  labels: VocabularyExportLabels,
  options: VocabularyExportOptions,
): Promise<Blob> {
  const columns = visibleColumns(options);
  const order: ColumnKey[] = (
    ["word", "partOfSpeech", "meanings", "tags", "notes", "updated"] as const
  ).filter((key) => columns[key]);

  const headerLabels: Record<ColumnKey, string> = {
    word: labels.columns.word,
    partOfSpeech: labels.columns.partOfSpeech,
    meanings: labels.columns.meanings,
    tags: labels.columns.tags,
    notes: labels.columns.notes,
    updated: labels.columns.updated,
  };

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: order.map((key) =>
          headerCell(headerLabels[key], columnWidth(key, columns)),
        ),
      }),
      ...documentModel.rows.map(
        (row) =>
          new TableRow({
            children: order.map((key) =>
              bodyCell(
                cellValue(row, key),
                columnWidth(key, columns),
                key === "word",
              ),
            ),
          }),
      ),
    ],
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
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: labels.documentHeading,
                font: FONT_SANS,
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${labels.workspaceLabel}: ${documentModel.workspaceName || "—"}`,
                font: FONT_SANS,
                size: 20,
                color: "6B6680",
              }),
            ],
          }),
          table,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
