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
import { ensurePdfFonts, PDF_FONT_SANS } from "@/lib/export/pdf-fonts";
import {
  resolveExportTheme,
  type ExportThemeTokens,
  type PrintSurface,
} from "@/lib/export/print-theme";

function createPageStyles(theme: ExportThemeTokens) {
  return StyleSheet.create({
    page: {
      paddingTop: 44,
      paddingBottom: 52,
      paddingHorizontal: 48,
      fontFamily: PDF_FONT_SANS,
      fontSize: 11,
      color: theme.ink,
      backgroundColor: theme.paper,
    },
    footer: {
      position: "absolute",
      bottom: 26,
      left: 48,
      right: 48,
      fontSize: 8,
      fontFamily: PDF_FONT_SANS,
      color: theme.footer,
      letterSpacing: 0.4,
    },
  });
}

function RichDocumentPdf({
  model,
  labels,
  layout,
  theme,
}: {
  model: ExportDocumentModel;
  labels: ExportLabels;
  layout: ExportLayout;
  theme: ExportThemeTokens;
}) {
  const title = sanitizeExportText(model.title) || "—";
  const description = sanitizeExportText(model.description);
  const styles = createPageStyles(theme);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PdfMasthead
          kicker={labels.documentHeading}
          title={title}
          lede={description || undefined}
          theme={theme}
        />
        {renderTipTapDocToPdf(model.doc, layout, theme)}
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
  theme: ExportThemeTokens = resolveExportTheme("print", surface),
): Promise<Blob> {
  await ensurePdfFonts();
  return pdf(
    <RichDocumentPdf
      model={model}
      labels={labels}
      layout={layout}
      theme={theme}
    />,
  ).toBlob();
}
