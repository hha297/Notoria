import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type {
  ExportDocumentModel,
  ExportLabels,
  ExportOptions,
  ExportQuestion,
  ExportSection,
  ExportLayout,
} from "@/lib/writing/export/types";
import { BLANK_LINE_COUNT } from "@/lib/writing/export/types";
import { generateRichDocumentPdfBlob } from "@/lib/writing/export/rich-document-pdf";
import { wrapTextOntoLines } from "@/lib/writing/export/wrap-text";
import { ensurePdfFonts, PDF_FONT_SANS } from "@/lib/export/pdf-fonts";
import { PdfMasthead } from "@/lib/export/pdf-masthead";
import {
  PRINT_FOOTER,
  PRINT_INK,
  PRINT_MUTED,
  PRINT_NOTE_WASH,
  PRINT_PAPER,
  PRINT_RULE,
  printAccent,
  type PrintSurface,
} from "@/lib/export/print-theme";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";

const FONT_SANS = PDF_FONT_SANS;

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 48,
    fontFamily: FONT_SANS,
    fontSize: 11,
    color: PRINT_INK,
    backgroundColor: PRINT_PAPER,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  questionBlock: {
    marginBottom: 18,
  },
  questionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  questionIndex: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  questionIndexText: {
    fontFamily: FONT_SANS,
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
  },
  prompt: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_SANS,
    fontWeight: 500,
    color: PRINT_INK,
    lineHeight: 1.4,
  },
  answerLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: PRINT_RULE,
    marginBottom: 7,
    minHeight: 20,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  answerText: {
    fontFamily: FONT_SANS,
    fontSize: 11,
    fontWeight: 400,
    fontStyle: "italic",
    color: PRINT_MUTED,
  },
  callout: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: PRINT_NOTE_WASH,
    borderLeftWidth: 2,
  },
  calloutLabel: {
    fontSize: 8,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  calloutBody: {
    fontSize: 10,
    fontFamily: FONT_SANS,
    color: PRINT_INK,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    fontSize: 8,
    fontFamily: FONT_SANS,
    color: PRINT_FOOTER,
    letterSpacing: 0.4,
  },
});

function AnswerLines({ text, count }: { text?: string; count: number }) {
  const lines = wrapTextOntoLines(text ?? "", count);

  return (
    <View>
      {lines.map((line, index) => (
        <View key={index} style={styles.answerLine}>
          <Text style={styles.answerText}>{line || " "}</Text>
        </View>
      ))}
    </View>
  );
}

function QuestionBlock({
  question,
  index,
  labels,
  leaveBlankSpace,
  accent,
}: {
  question: ExportQuestion;
  index: number;
  labels: ExportLabels;
  leaveBlankSpace: boolean;
  accent: string;
}) {
  const exampleOnLines = Boolean(leaveBlankSpace && question.exampleAnswer);
  const showSeparateExample = Boolean(
    question.exampleAnswer && !leaveBlankSpace,
  );

  return (
    <View style={styles.questionBlock} wrap={false}>
      <View style={styles.questionRow}>
        <View style={[styles.questionIndex, { backgroundColor: accent }]}>
          <Text style={styles.questionIndexText}>{index + 1}</Text>
        </View>
        <Text style={styles.prompt}>{sanitizeExportText(question.prompt)}</Text>
      </View>
      {leaveBlankSpace ? (
        <AnswerLines
          text={exampleOnLines ? question.exampleAnswer : undefined}
          count={BLANK_LINE_COUNT}
        />
      ) : null}
      {showSeparateExample ? (
        <View style={[styles.callout, { borderLeftColor: accent }]}>
          <Text style={[styles.calloutLabel, { color: accent }]}>
            {labels.exampleAnswerLabel}
          </Text>
          <Text style={styles.calloutBody}>
            {sanitizeExportText(question.exampleAnswer ?? "")}
          </Text>
        </View>
      ) : null}
      {question.notes ? (
        <View style={[styles.callout, { borderLeftColor: accent }]}>
          <Text style={[styles.calloutLabel, { color: accent }]}>
            {labels.notesLabel}
          </Text>
          <Text style={styles.calloutBody}>
            {sanitizeExportText(question.notes)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SectionBlock({
  section,
  index,
  labels,
  leaveBlankSpace,
  accent,
}: {
  section: ExportSection;
  index: number;
  labels: ExportLabels;
  leaveBlankSpace: boolean;
  accent: string;
}) {
  const heading = section.title
    ? `${labels.sectionLabel} ${index + 1}  ·  ${section.title}`
    : `${labels.sectionLabel} ${index + 1}`;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: accent }]}>{heading}</Text>
      {section.questions.map((question, questionIndex) => (
        <QuestionBlock
          key={questionIndex}
          question={question}
          index={questionIndex}
          labels={labels}
          leaveBlankSpace={leaveBlankSpace}
          accent={accent}
        />
      ))}
    </View>
  );
}

function QuestionSetPdfDocument({
  model,
  labels,
  options,
  surface,
}: {
  model: ExportDocumentModel;
  labels: ExportLabels;
  options: ExportOptions;
  surface: PrintSurface;
}) {
  const accent = printAccent(surface);
  const title = sanitizeExportText(model.title) || "—";
  const description = sanitizeExportText(model.description);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PdfMasthead
          kicker={labels.documentHeading}
          title={title}
          lede={description || undefined}
          accent={accent}
        />
        {model.sections.map((section, index) => (
          <SectionBlock
            key={index}
            section={section}
            index={index}
            labels={labels}
            leaveBlankSpace={options.leaveBlankSpace}
            accent={accent}
          />
        ))}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Notoria  ·  ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function generateWritingPdfBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
  options: ExportOptions,
  _layout: ExportLayout = "worksheet",
  surface: PrintSurface = "writing",
): Promise<Blob> {
  await ensurePdfFonts();

  if (model.mode === "rich_document") {
    return generateRichDocumentPdfBlob(model, labels, "document", surface);
  }

  return pdf(
    <QuestionSetPdfDocument
      model={model}
      labels={labels}
      options={options}
      surface={surface}
    />,
  ).toBlob();
}
