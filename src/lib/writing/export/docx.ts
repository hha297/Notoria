import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TextRun,
} from "docx";
import type {
  ExportDocumentModel,
  ExportLabels,
  ExportLayout,
  ExportOptions,
  ExportQuestion,
} from "@/lib/writing/export/types";
import { BLANK_LINE_COUNT } from "@/lib/writing/export/types";
import { wrapTextOntoLines } from "@/lib/writing/export/wrap-text";
import { renderTipTapDocToDocx } from "@/lib/writing/export/tiptap-docx";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import {
  DOCX_FONT_SANS,
  PRINT_ACCENT,
  PRINT_INK,
  PRINT_LEDE_WASH,
  PRINT_MUTED,
  PRINT_RULE,
  hexForDocx,
  type PrintSurface,
} from "@/lib/export/print-theme";

const FONT_SANS = DOCX_FONT_SANS;
const INK = hexForDocx(PRINT_INK);
const MUTED = hexForDocx(PRINT_MUTED);
const RULE = hexForDocx(PRINT_RULE);
const WASH = hexForDocx(PRINT_LEDE_WASH);

function answerLineParagraphs(text?: string): Paragraph[] {
  const lines = wrapTextOntoLines(text ?? "", BLANK_LINE_COUNT, 72);

  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 80 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: RULE,
            space: 1,
          },
        },
        children: [
          new TextRun({
            text: line || " ",
            font: FONT_SANS,
            size: 22,
            color: MUTED,
            italics: true,
          }),
        ],
      }),
  );
}

function questionParagraphs(
  question: ExportQuestion,
  index: number,
  labels: ExportLabels,
  leaveBlankSpace: boolean,
  accent: string,
): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({
          text: `${index + 1}.  `,
          font: FONT_SANS,
          size: 24,
          bold: true,
          color: accent,
        }),
        new TextRun({
          text: question.prompt,
          font: FONT_SANS,
          size: 24,
          color: INK,
        }),
      ],
    }),
  ];

  const exampleOnLines = Boolean(leaveBlankSpace && question.exampleAnswer);

  if (leaveBlankSpace) {
    blocks.push(
      ...answerLineParagraphs(
        exampleOnLines ? question.exampleAnswer : undefined,
      ),
    );
  } else if (question.exampleAnswer) {
    blocks.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        shading: { type: ShadingType.CLEAR, fill: WASH },
        border: {
          left: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: accent,
            space: 8,
          },
        },
        children: [
          new TextRun({
            text: `${labels.exampleAnswerLabel}  `,
            font: FONT_SANS,
            bold: true,
            size: 18,
            color: accent,
            allCaps: true,
          }),
          new TextRun({
            text: question.exampleAnswer,
            font: FONT_SANS,
            size: 20,
            color: INK,
            italics: true,
          }),
        ],
      }),
    );
  }

  if (question.notes) {
    blocks.push(
      new Paragraph({
        spacing: { before: 60, after: 160 },
        shading: { type: ShadingType.CLEAR, fill: WASH },
        border: {
          left: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: accent,
            space: 8,
          },
        },
        children: [
          new TextRun({
            text: `${labels.notesLabel}  `,
            font: FONT_SANS,
            bold: true,
            size: 18,
            color: accent,
            allCaps: true,
          }),
          new TextRun({
            text: question.notes,
            font: FONT_SANS,
            size: 20,
            color: MUTED,
            italics: true,
          }),
        ],
      }),
    );
  }

  return blocks;
}

function mastheadParagraphs(
  kicker: string,
  title: string,
  lede: string,
  accent: string,
): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: kicker,
          font: FONT_SANS,
          size: 18,
          bold: true,
          color: accent,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: lede ? 120 : 240 },
      children: [
        new TextRun({
          text: title,
          font: FONT_SANS,
          bold: true,
          size: 40,
          color: INK,
        }),
      ],
    }),
  ];

  if (lede) {
    const lines = lede.split("\n");
    lines.forEach((line, index) => {
      blocks.push(
        new Paragraph({
          spacing: { after: index === lines.length - 1 ? 200 : 40 },
          shading: { type: ShadingType.CLEAR, fill: WASH },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 16,
              color: accent,
              space: 10,
            },
          },
          children: [
            new TextRun({
              text: line.length > 0 ? line : " ",
              font: FONT_SANS,
              size: 20,
              color: MUTED,
              italics: true,
            }),
          ],
        }),
      );
    });
  }

  return blocks;
}

export async function generateWritingDocxBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
  options: ExportOptions,
  _layout: ExportLayout = "worksheet",
  surface: PrintSurface = "writing",
): Promise<Blob> {
  const title = sanitizeExportText(model.title) || "—";
  const description = sanitizeExportText(model.description);
  const accent = hexForDocx(PRINT_ACCENT[surface]);
  const children: Array<Paragraph | Table> = [
    ...mastheadParagraphs(labels.documentHeading, title, description, accent),
  ];

  if (model.mode === "question_set") {
    model.sections.forEach((section, sectionIndex) => {
      const heading = section.title
        ? `${labels.sectionLabel} ${sectionIndex + 1}  ·  ${section.title}`
        : `${labels.sectionLabel} ${sectionIndex + 1}`;

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          children: [
            new TextRun({
              text: heading,
              font: FONT_SANS,
              bold: true,
              size: 22,
              color: accent,
              allCaps: true,
            }),
          ],
        }),
      );

      section.questions.forEach((question, questionIndex) => {
        children.push(
          ...questionParagraphs(
            question,
            questionIndex,
            labels,
            options.leaveBlankSpace,
            accent,
          ),
        );
      });
    });
  } else {
    children.push(...renderTipTapDocToDocx(model.doc));
  }

  const document = new Document({
    creator: "Notoria",
    title: model.title || labels.documentHeading,
    description: labels.documentHeading,
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

  return Packer.toBlob(document);
}
