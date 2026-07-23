/**
 * Rich Document PDF export — independent of Question Set export logic.
 * Visual chrome (margins, typography, title hierarchy, dividers) matches
 * the Question Set worksheet look; body is continuous TipTap content.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type {
  ExportDocumentModel,
  ExportLabels,
} from "@/lib/writing/export/types";
import { renderTipTapDocToPdf } from "@/lib/writing/export/tiptap-pdf";

const FONT_SANS = "ChakraPetch";

/** Same page chrome values as the Question Set PDF (copied, not shared). */
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    // Slightly tighter than QS so lined body fills the page more evenly
    paddingHorizontal: 36,
    fontFamily: FONT_SANS,
    fontSize: 11,
    lineHeight: 1.45,
    color: "#1a1528",
  },
  heading: {
    fontSize: 20,
    fontFamily: FONT_SANS,
    fontWeight: 700,
    marginBottom: 8,
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
  closingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d5d0e0",
    marginTop: 18,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    fontSize: 9,
    fontFamily: FONT_SANS,
    color: "#8a849c",
    textAlign: "center",
  },
});

function RichDocumentPdf({
  model,
  labels,
}: {
  model: ExportDocumentModel;
  labels: ExportLabels;
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
        {renderTipTapDocToPdf(model.doc)}
        <View style={styles.closingDivider} />
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

/** Generate Rich Document PDF. Caller must register export fonts first. */
export async function generateRichDocumentPdfBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
): Promise<Blob> {
  return pdf(<RichDocumentPdf model={model} labels={labels} />).toBlob();
}
