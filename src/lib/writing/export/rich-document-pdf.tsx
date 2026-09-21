/**
 * Rich Document PDF — printed page, not a worksheet form.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type {
  ExportDocumentModel,
  ExportLabels,
  ExportLayout,
} from "@/lib/writing/export/types";
import { renderTipTapDocToPdf } from "@/lib/writing/export/tiptap-pdf";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import { PdfMasthead } from "@/lib/export/pdf-masthead";
import { PDF_FONT_SANS } from "@/lib/export/pdf-fonts";
import {
  PRINT_FOOTER,
  PRINT_INK,
  PRINT_PAPER,
  printAccent,
  type PrintSurface,
} from "@/lib/export/print-theme";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 48,
    fontFamily: PDF_FONT_SANS,
    fontSize: 11,
    color: PRINT_INK,
    backgroundColor: PRINT_PAPER,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    fontSize: 8,
    fontFamily: PDF_FONT_SANS,
    color: PRINT_FOOTER,
    letterSpacing: 0.4,
  },
});

function RichDocumentPdf({
  model,
  labels,
  layout,
  surface,
}: {
  model: ExportDocumentModel;
  labels: ExportLabels;
  layout: ExportLayout;
  surface: PrintSurface;
}) {
  const title = sanitizeExportText(model.title) || "—";
  const description = sanitizeExportText(model.description);
  const accent = printAccent(surface);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PdfMasthead
          kicker={labels.documentHeading}
          title={title}
          lede={description || undefined}
          accent={accent}
        />
        {renderTipTapDocToPdf(model.doc, layout, accent)}
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

export async function generateRichDocumentPdfBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
  layout: ExportLayout = "document",
  surface: PrintSurface = "writing",
): Promise<Blob> {
  return pdf(
    <RichDocumentPdf
      model={model}
      labels={labels}
      layout={layout}
      surface={surface}
    />,
  ).toBlob();
}
