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

const FONT_SANS = PDF_FONT_SANS;

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: FONT_SANS,
    fontSize: 11,
    // Avoid unitless lineHeight on Page — breaks long docs with fixed footers
    // (react-pdf: unsupported number …e+21).
    color: "#1a1528",
  },
  heading: {
    fontSize: 20,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    marginBottom: 8,
    lineHeight: 1.3,
  },
  titleRow: {
    marginBottom: 16,
  },
  titleLabel: {
    fontSize: 10,
    fontFamily: FONT_SANS,
    fontWeight: 500,
    color: "#6b6680",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  titleValue: {
    fontSize: 16,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  descriptionRow: {
    marginBottom: 16,
  },
  descriptionBody: {
    fontSize: 11,
    fontFamily: FONT_SANS,
    fontWeight: 400,
    color: "#3d3850",
    lineHeight: 1.45,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d5d0e0",
    marginBottom: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    marginBottom: 10,
  },
  questionBlock: {
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 10,
    fontFamily: FONT_SANS,
    fontWeight: 500,
    color: "#6b6680",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  prompt: {
    fontSize: 12,
    fontFamily: FONT_SANS,
    fontWeight: 500,
    marginBottom: 8,
  },
  answerLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#c8c2d6",
    marginBottom: 8,
    minHeight: 22,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  answerText: {
    fontFamily: FONT_SANS,
    fontSize: 12,
    fontWeight: 400,
    color: "#2f4a08",
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    color: "#4a6b0a",
    marginTop: 4,
    marginBottom: 2,
  },
  metaBody: {
    fontSize: 10,
    fontFamily: FONT_SANS,
    color: "#3d3850",
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 9,
    fontFamily: FONT_SANS,
    color: "#8a849c",
    textAlign: "center",
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
}: {
  question: ExportQuestion;
  index: number;
  labels: ExportLabels;
  leaveBlankSpace: boolean;
}) {
  const exampleOnLines = Boolean(leaveBlankSpace && question.exampleAnswer);
  const showSeparateExample = Boolean(
    question.exampleAnswer && !leaveBlankSpace,
  );

  return (
    <View style={styles.questionBlock} wrap={false}>
      <Text style={styles.questionLabel}>
        {labels.questionLabel} {index + 1}
      </Text>
      <Text style={styles.prompt}>{question.prompt}</Text>
      {leaveBlankSpace ? (
        <AnswerLines
          text={exampleOnLines ? question.exampleAnswer : undefined}
          count={BLANK_LINE_COUNT}
        />
      ) : null}
      {showSeparateExample ? (
        <View>
          <Text style={styles.metaLabel}>{labels.exampleAnswerLabel}</Text>
          <Text style={styles.answerText}>{question.exampleAnswer}</Text>
        </View>
      ) : null}
      {question.notes ? (
        <View>
          <Text style={styles.metaLabel}>{labels.notesLabel}</Text>
          <Text style={styles.metaBody}>{question.notes}</Text>
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
}: {
  section: ExportSection;
  index: number;
  labels: ExportLabels;
  leaveBlankSpace: boolean;
}) {
  const heading = section.title
    ? `${labels.sectionLabel} ${index + 1}: ${section.title}`
    : `${labels.sectionLabel} ${index + 1}`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{heading}</Text>
      {section.questions.map((question, questionIndex) => (
        <QuestionBlock
          key={questionIndex}
          question={question}
          index={questionIndex}
          labels={labels}
          leaveBlankSpace={leaveBlankSpace}
        />
      ))}
    </View>
  );
}

function QuestionSetPdfDocument({
  model,
  labels,
  options,
}: {
  model: ExportDocumentModel;
  labels: ExportLabels;
  options: ExportOptions;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.heading}>{labels.documentHeading}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.titleLabel}>{labels.titleLabel}</Text>
          <Text style={styles.titleValue}>{model.title || "—"}</Text>
        </View>
        {model.description ? (
          <View style={styles.descriptionRow}>
            <Text style={styles.titleLabel}>{labels.descriptionLabel}</Text>
            <Text style={styles.descriptionBody}>{model.description}</Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        {model.sections.map((section, index) => (
          <SectionBlock
            key={index}
            section={section}
            index={index}
            labels={labels}
            leaveBlankSpace={options.leaveBlankSpace}
          />
        ))}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
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
  layout: ExportLayout = "worksheet",
): Promise<Blob> {
  await ensurePdfFonts();

  if (model.mode === "rich_document") {
    return generateRichDocumentPdfBlob(model, labels, layout);
  }

  return pdf(
    <QuestionSetPdfDocument model={model} labels={labels} options={options} />,
  ).toBlob();
}
