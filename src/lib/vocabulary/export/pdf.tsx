import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
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

const FONT_SANS = "ChakraPetch";
let fontReady: Promise<void> | null = null;

async function ensureExportFonts() {
  if (typeof window === "undefined") return;
  if (!fontReady) {
    fontReady = (async () => {
      const origin = window.location.origin;
      const [regular, medium, bold] = await Promise.all([
        fetch(`${origin}/fonts/ChakraPetch-Regular.ttf`).then((r) => {
          if (!r.ok) throw new Error(`Font load failed: Regular (${r.status})`);
          return r.blob();
        }),
        fetch(`${origin}/fonts/ChakraPetch-Medium.ttf`).then((r) => {
          if (!r.ok) throw new Error(`Font load failed: Medium (${r.status})`);
          return r.blob();
        }),
        fetch(`${origin}/fonts/ChakraPetch-Bold.ttf`).then((r) => {
          if (!r.ok) throw new Error(`Font load failed: Bold (${r.status})`);
          return r.blob();
        }),
      ]);

      Font.register({
        family: FONT_SANS,
        fonts: [
          { src: URL.createObjectURL(regular), fontWeight: 400 },
          { src: URL.createObjectURL(medium), fontWeight: 500 },
          { src: URL.createObjectURL(bold), fontWeight: 700 },
        ],
      });
    })().catch((error) => {
      fontReady = null;
      throw error;
    });
  }

  await fontReady;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: FONT_SANS,
    fontSize: 9,
    color: "#1a1528",
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  workspace: {
    fontSize: 10,
    color: "#6b6680",
    marginBottom: 14,
  },
  table: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f1f7",
    borderBottomWidth: 1,
    borderBottomColor: "#d5d0e0",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ebe7f2",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerCell: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6b6680",
    textTransform: "uppercase",
  },
  cell: {
    fontSize: 9,
    paddingRight: 4,
  },
  wordCell: {
    fontSize: 9,
    fontWeight: 700,
    paddingRight: 4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#8a849c",
    textAlign: "center",
  },
});

type ColumnKey = "word" | "partOfSpeech" | "meanings" | "tags" | "notes" | "updated";

function getColumnFlex(
  key: ColumnKey,
  columns: ReturnType<typeof visibleColumns>,
): number {
  const widths: Record<ColumnKey, number> = {
    word: 1.2,
    partOfSpeech: 1,
    meanings: 2.2,
    tags: 1.4,
    notes: 1.6,
    updated: 1,
  };

  const active = (Object.keys(widths) as ColumnKey[]).filter(
    (column) => columns[column],
  );
  const total = active.reduce((sum, column) => sum + widths[column], 0);
  return (widths[key] / total) * 100;
}

function cellValue(
  row: VocabularyExportRow,
  key: ColumnKey,
): string {
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

function VocabularyPdfDocument({
  document,
  labels,
  options,
}: {
  document: VocabularyExportDocument;
  labels: VocabularyExportLabels;
  options: VocabularyExportOptions;
}) {
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

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Text style={styles.heading}>{labels.documentHeading}</Text>
        <Text style={styles.workspace}>
          {labels.workspaceLabel}: {document.workspaceName || "—"}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow} fixed>
            {order.map((key) => (
              <Text
                key={key}
                style={[
                  styles.headerCell,
                  { width: `${getColumnFlex(key, columns)}%` },
                ]}
              >
                {headerLabels[key]}
              </Text>
            ))}
          </View>

          {document.rows.map((row, index) => (
            <View key={index} style={styles.row} wrap={false}>
              {order.map((key) => (
                <Text
                  key={key}
                  style={[
                    key === "word" ? styles.wordCell : styles.cell,
                    { width: `${getColumnFlex(key, columns)}%` },
                  ]}
                >
                  {cellValue(row, key)}
                </Text>
              ))}
            </View>
          ))}
        </View>

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

export async function generateVocabularyPdfBlob(
  document: VocabularyExportDocument,
  labels: VocabularyExportLabels,
  options: VocabularyExportOptions,
): Promise<Blob> {
  await ensureExportFonts();

  return pdf(
    <VocabularyPdfDocument
      document={document}
      labels={labels}
      options={options}
    />,
  ).toBlob();
}
