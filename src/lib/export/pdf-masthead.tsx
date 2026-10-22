import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_FONT_SANS } from "@/lib/export/pdf-fonts";
import {
  resolveExportTheme,
  type ExportThemeTokens,
} from "@/lib/export/print-theme";

function createMastheadStyles(theme: ExportThemeTokens) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 22,
    },
    kicker: {
      fontFamily: PDF_FONT_SANS,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 1.8,
      textTransform: "uppercase",
      marginBottom: 8,
      color: theme.accent,
    },
    title: {
      fontFamily: PDF_FONT_SANS,
      fontSize: 24,
      fontWeight: 700,
      color: theme.ink,
      lineHeight: 1.2,
      letterSpacing: -0.4,
      marginBottom: 10,
    },
    ledeBox: {
      borderLeftWidth: 2.5,
      borderLeftColor: theme.accent,
      paddingLeft: 10,
      paddingVertical: 6,
      paddingRight: 8,
      backgroundColor: theme.wash,
      marginBottom: 14,
    },
    lede: {
      fontFamily: PDF_FONT_SANS,
      fontSize: 10.5,
      fontWeight: 400,
      color: theme.muted,
      lineHeight: 1.45,
    },
    rule: {
      height: 2,
      width: "100%",
      marginTop: 2,
      backgroundColor: theme.accent,
    },
  });
}

export function PdfMasthead({
  kicker,
  title,
  lede,
  theme = resolveExportTheme("print", "writing"),
  /** @deprecated Prefer `theme.accent`. */
  accent,
}: {
  kicker: string;
  title: string;
  lede?: string;
  theme?: ExportThemeTokens;
  accent?: string;
}) {
  const resolved = accent
    ? { ...theme, accent }
    : theme;
  const styles = createMastheadStyles(resolved);
  const lines = lede?.split("\n") ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      {lines.length > 0 ? (
        <View style={styles.ledeBox}>
          {lines.map((line, index) => (
            <Text key={index} style={styles.lede}>
              {line.length > 0 ? line : " "}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.rule} />
    </View>
  );
}
