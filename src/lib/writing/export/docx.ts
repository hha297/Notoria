import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type {
  ExportDocumentModel,
  ExportLabels,
  ExportOptions,
  ExportQuestion,
} from "@/lib/writing/export/types";
import { BLANK_LINE_COUNT } from "@/lib/writing/export/types";
import { wrapTextOntoLines } from "@/lib/writing/export/wrap-text";

/** Match Notoria body font across the exported worksheet. */
const FONT_SANS = "Chakra Petch";

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
            color: "C8C2D6",
            space: 1,
          },
        },
        children: [
          new TextRun({
            text: line || " ",
            font: FONT_SANS,
            size: 22,
            color: "2F4A08",
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
): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: `${labels.questionLabel} ${index + 1}`,
          font: FONT_SANS,
          size: 18,
          color: "6B6680",
          bold: true,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: question.prompt,
          font: FONT_SANS,
          size: 24,
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
        spacing: { before: 120, after: 40 },
        children: [
          new TextRun({
            text: labels.exampleAnswerLabel,
            font: FONT_SANS,
            bold: true,
            size: 20,
            color: "4A6B0A",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: question.exampleAnswer,
            font: FONT_SANS,
            size: 22,
            color: "2F4A08",
            italics: true,
          }),
        ],
      }),
    );
  }

  if (question.notes) {
    blocks.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: labels.notesLabel,
            font: FONT_SANS,
            bold: true,
            size: 20,
            color: "4A6B0A",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: question.notes,
            font: FONT_SANS,
            size: 20,
            color: "3D3850",
            italics: true,
          }),
        ],
      }),
    );
  }

  return blocks;
}

export async function generateWritingDocxBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
  options: ExportOptions,
): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
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
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: labels.titleLabel,
          font: FONT_SANS,
          size: 18,
          color: "6B6680",
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: "D5D0E0",
          space: 8,
        },
      },
      children: [
        new TextRun({
          text: model.title || "—",
          font: FONT_SANS,
          bold: true,
          size: 28,
        }),
      ],
    }),
  ];

  if (model.mode === "question_set") {
    model.sections.forEach((section, sectionIndex) => {
      const heading = section.title
        ? `${labels.sectionLabel} ${sectionIndex + 1}: ${section.title}`
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
              size: 26,
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
          ),
        );
      });
    });
  } else {
    model.paragraphs.forEach((paragraph) => {
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: paragraph || " ",
              font: FONT_SANS,
              size: 22,
            }),
          ],
        }),
      );
    });
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

