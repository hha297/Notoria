import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_FONT_SANS } from "@/lib/export/pdf-fonts";
import {
  PRINT_HAIRLINE,
  PRINT_INK,
  PRINT_LEDE_WASH,
  PRINT_MUTED,
} from "@/lib/export/print-theme";

const styles = StyleSheet.create({
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
  },
  title: {
    fontFamily: PDF_FONT_SANS,
    fontSize: 24,
    fontWeight: 700,
    color: PRINT_INK,
    lineHeight: 1.2,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  ledeBox: {
    borderLeftWidth: 2.5,
    paddingLeft: 10,
    paddingVertical: 6,
    paddingRight: 8,
    backgroundColor: PRINT_LEDE_WASH,
    marginBottom: 14,
  },
  lede: {
    fontFamily: PDF_FONT_SANS,
    fontSize: 10.5,
    fontWeight: 400,
    color: PRINT_MUTED,
    lineHeight: 1.45,
  },
  rule: {
    height: 2,
    width: "100%",
    marginTop: 2,
  },
  hairline: {
    height: 1,
    width: "100%",
    backgroundColor: PRINT_HAIRLINE,
  },
});

export function PdfMasthead({
  kicker,
  title,
  lede,
  accent,
}: {
  kicker: string;
  title: string;
  lede?: string;
  accent: string;
}) {
  const lines = lede?.split("\n") ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.kicker, { color: accent }]}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      {lines.length > 0 ? (
        <View style={[styles.ledeBox, { borderLeftColor: accent }]}>
          {lines.map((line, index) => (
            <Text key={index} style={styles.lede}>
              {line.length > 0 ? line : " "}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={[styles.rule, { backgroundColor: accent }]} />
    </View>
  );
}
