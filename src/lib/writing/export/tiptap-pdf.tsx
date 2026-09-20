import type { JSONContent } from "@tiptap/react";
import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import { PDF_FONT_SANS } from "@/lib/export/pdf-fonts";
import {
  PRINT_ACCENT,
  PRINT_HAIRLINE,
  PRINT_INK,
  PRINT_MUTED,
  PRINT_NOTE_WASH,
  PRINT_RULE,
} from "@/lib/export/print-theme";
import type { ExportLayout } from "@/lib/writing/export/types";

const FONT_SANS = PDF_FONT_SANS;
const DEFAULT_ACCENT = PRINT_ACCENT.writing;

const styles = StyleSheet.create({
  body: {
    width: "100%",
  },
  block: {
    marginBottom: 12,
  },
  docBlock: {
    marginBottom: 9,
  },
  docSpacer: {
    marginBottom: 8,
  },
  ruledLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: PRINT_RULE,
    marginBottom: 7,
    minHeight: 20,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  ruledText: {
    fontFamily: FONT_SANS,
    fontSize: 11.5,
    fontWeight: 400,
    color: PRINT_INK,
  },
  ruledHeading: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 700,
    color: PRINT_INK,
  },
  docText: {
    fontFamily: FONT_SANS,
    fontSize: 11,
    fontWeight: 400,
    color: PRINT_INK,
    lineHeight: 1.55,
  },
  docH1: {
    fontFamily: FONT_SANS,
    fontSize: 16,
    fontWeight: 700,
    color: PRINT_INK,
    lineHeight: 1.28,
    marginTop: 10,
    marginBottom: 2,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PRINT_HAIRLINE,
  },
  docH2: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 700,
    color: PRINT_INK,
    lineHeight: 1.3,
    marginTop: 10,
    marginBottom: 1,
  },
  docH3: {
    fontFamily: FONT_SANS,
    fontSize: 11.5,
    fontWeight: 700,
    color: PRINT_MUTED,
    lineHeight: 1.3,
    marginTop: 8,
  },
  listBlock: {
    marginBottom: 10,
  },
  blockquote: {
    borderLeftWidth: 2.5,
    borderLeftColor: PRINT_HAIRLINE,
    backgroundColor: PRINT_NOTE_WASH,
    paddingLeft: 10,
    paddingVertical: 6,
    paddingRight: 8,
    marginBottom: 12,
    marginTop: 2,
  },
  codeBlock: {
    backgroundColor: PRINT_NOTE_WASH,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: FONT_SANS,
    fontSize: 10,
    color: PRINT_INK,
    lineHeight: 1.4,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: PRINT_HAIRLINE,
    marginVertical: 12,
  },
  image: {
    maxWidth: "100%",
    marginBottom: 12,
    objectFit: "contain",
  },
  table: {
    width: "100%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PRINT_HAIRLINE,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PRINT_HAIRLINE,
  },
  tableCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: PRINT_HAIRLINE,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: PRINT_HAIRLINE,
    backgroundColor: PRINT_NOTE_WASH,
  },
  tableCellText: {
    fontFamily: FONT_SANS,
    fontSize: 10.5,
    color: PRINT_INK,
  },
});

type MarkAttrs = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  linkHref?: string;
};

type TextRun = {
  text: string;
  marks: MarkAttrs;
};

function getMarks(node: JSONContent): MarkAttrs {
  const result: MarkAttrs = {};
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        result.bold = true;
        break;
      case "italic":
        result.italic = true;
        break;
      case "underline":
        result.underline = true;
        break;
      case "highlight":
        result.highlight = true;
        break;
      case "link":
        result.linkHref =
          typeof mark.attrs?.href === "string" ? mark.attrs.href : undefined;
        break;
      default:
        break;
    }
  }
  return result;
}

function collectPlainText(node: JSONContent): string {
  if (node.type === "text" && typeof node.text === "string") {
    return sanitizeExportText(node.text);
  }
  if (!node.content?.length) return "";
  return node.content.map(collectPlainText).join("");
}

function collectRuns(nodes: JSONContent[] | undefined): TextRun[] {
  if (!nodes?.length) return [];
  const runs: TextRun[] = [];

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push({ text: "\n", marks: {} });
      continue;
    }
    if (node.type === "text" && typeof node.text === "string") {
      const text = sanitizeExportText(node.text);
      if (!text) continue;
      runs.push({ text, marks: getMarks(node) });
      continue;
    }
    if (node.content?.length) {
      runs.push(...collectRuns(node.content));
    }
  }

  return runs;
}

function renderRun(
  run: TextRun,
  variant: "body" | "heading",
  layout: ExportLayout,
  accent: string,
  key?: string | number,
): ReactNode {
  const marks = run.marks;
  const isDocument = layout === "document";
  const markStyle = {
    fontWeight: (marks.bold || variant === "heading" ? 700 : 400) as 400 | 700,
    fontStyle: (marks.italic ? "italic" : "normal") as "italic" | "normal",
    textDecoration: (marks.underline || marks.linkHref
      ? "underline"
      : "none") as "underline" | "none",
    color: marks.linkHref ? accent : PRINT_INK,
    ...(marks.highlight ? { backgroundColor: "#f2f6c8" } : {}),
  };

  if (isDocument) {
    return (
      <Text key={key} style={markStyle}>
        {run.text}
      </Text>
    );
  }

  return (
    <Text
      key={key}
      style={[
        variant === "heading" ? styles.ruledHeading : styles.ruledText,
        markStyle,
      ]}
    >
      {run.text}
    </Text>
  );
}

/**
 * Pack runs onto ruled lines by character budget (same width as QS lines).
 * Preserves inline marks within each line.
 */
function packRunsOntoLines(
  runs: TextRun[],
  // Keep under actual line width so react-pdf never mid-word wraps
  maxCharsPerLine = 88,
): TextRun[][] {
  const normalizedRuns = runs
    .map((run) => ({
      ...run,
      text: run.text.replace(/\s+/g, " "),
    }))
    .filter((run) => run.text.length > 0);

  if (normalizedRuns.length === 0) {
    return [[]];
  }

  const lines: TextRun[][] = [[]];
  let lineLen = 0;

  const pushWord = (word: string, marks: MarkAttrs) => {
    if (!word) return;

    // Whole word fits on a fresh line → never split short words.
    // Only hard-break words that alone exceed the line budget.
    if (word.length > maxCharsPerLine) {
      let remaining = word;
      while (remaining.length > 0) {
        if (lineLen >= maxCharsPerLine) {
          lines.push([]);
          lineLen = 0;
        }
        const spaceLeft = maxCharsPerLine - lineLen;
        const chunk = remaining.slice(0, spaceLeft);
        lines[lines.length - 1].push({ text: chunk, marks });
        lineLen += chunk.length;
        remaining = remaining.slice(chunk.length);
      }
      return;
    }

    if (lineLen > 0 && lineLen + word.length > maxCharsPerLine) {
      lines.push([]);
      lineLen = 0;
    }

    lines[lines.length - 1].push({ text: word, marks });
    lineLen += word.length;
  };

  for (const run of normalizedRuns) {
    const parts = run.text.split(" ");
    for (let i = 0; i < parts.length; i++) {
      const word = parts[i];
      const needsSpace = i > 0;

      if (needsSpace) {
        if (lineLen > 0 && lineLen + 1 + (word?.length ?? 0) > maxCharsPerLine) {
          // Space + next word won't fit → new line (no orphan space)
          lines.push([]);
          lineLen = 0;
        } else if (lineLen > 0) {
          lines[lines.length - 1].push({ text: " ", marks: run.marks });
          lineLen += 1;
        }
      }

      if (!word) continue;
      pushWord(word, run.marks);
    }
  }

  return lines;
}

function RuledLines({
  runs,
  variant = "body",
  prefix,
  accent,
}: {
  runs: TextRun[];
  variant?: "body" | "heading";
  prefix?: string;
  accent: string;
}): ReactNode {
  const lines = packRunsOntoLines(
    prefix
      ? [{ text: `${prefix} `, marks: {} }, ...runs]
      : runs,
  );

  return (
    <View>
      {lines.map((lineRuns, index) => (
        <View key={index} style={styles.ruledLine} wrap={false}>
          <Text>
            {lineRuns.length > 0 ? (
              lineRuns.map((run, runIndex) =>
                renderRun(run, variant, "worksheet", accent, runIndex),
              )
            ) : (
              <Text
                style={
                  variant === "heading" ? styles.ruledHeading : styles.ruledText
                }
              >
                {" "}
              </Text>
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RuledFromNodes({
  nodes,
  variant = "body",
  prefix,
  accent,
}: {
  nodes: JSONContent[] | undefined;
  variant?: "body" | "heading";
  prefix?: string;
  accent: string;
}): ReactNode {
  const runs = collectRuns(nodes);
  if (runs.length === 0 && !prefix) {
    return (
      <View>
        <View style={styles.ruledLine} wrap={false}>
          <Text style={styles.ruledText}>{" "}</Text>
        </View>
      </View>
    );
  }
  return <RuledLines runs={runs} variant={variant} prefix={prefix} accent={accent} />;
}

function documentHeadingStyle(level: number) {
  if (level <= 1) return styles.docH1;
  if (level === 2) return styles.docH2;
  return styles.docH3;
}

function DocumentFromNodes({
  nodes,
  variant = "body",
  prefix,
  headingLevel = 1,
  accent,
}: {
  nodes: JSONContent[] | undefined;
  variant?: "body" | "heading";
  prefix?: string;
  headingLevel?: number;
  accent: string;
}): ReactNode {
  const runs = collectRuns(nodes);
  const allRuns = prefix
    ? [{ text: `${prefix} `, marks: {} }, ...runs].filter((run) => run.text)
    : runs;

  if (allRuns.length === 0) {
    return <View style={styles.docSpacer} />;
  }

  return (
    <Text style={variant === "heading" ? documentHeadingStyle(headingLevel) : styles.docText}>
      {allRuns.map((run, index) => renderRun(run, variant, "document", accent, index))}
    </Text>
  );
}

function BodyFromNodes({
  nodes,
  variant = "body",
  prefix,
  layout,
  headingLevel,
  accent,
}: {
  nodes: JSONContent[] | undefined;
  variant?: "body" | "heading";
  prefix?: string;
  layout: ExportLayout;
  headingLevel?: number;
  accent: string;
}): ReactNode {
  if (layout === "document") {
    return (
      <DocumentFromNodes
        nodes={nodes}
        variant={variant}
        prefix={prefix}
        headingLevel={headingLevel}
        accent={accent}
      />
    );
  }
  return <RuledFromNodes nodes={nodes} variant={variant} prefix={prefix} accent={accent} />;
}

function renderListItems(
  items: JSONContent[] | undefined,
  ordered: boolean,
  layout: ExportLayout,
  accent: string,
): ReactNode[] {
  if (!items?.length) return [];

  return items.map((item, index) => {
    const marker = ordered ? `${index + 1}.` : "•";
    const inlineNodes =
      item.content?.flatMap((child) =>
        child.type === "paragraph" ? (child.content ?? []) : [child],
      ) ?? [];

    return (
      <View key={index} style={layout === "document" ? styles.docBlock : styles.block}>
        <BodyFromNodes
          nodes={inlineNodes}
          prefix={marker}
          layout={layout}
          accent={accent}
        />
      </View>
    );
  });
}

function renderTable(node: JSONContent, key: number): ReactNode {
  const rows = node.content ?? [];

  return (
    <View key={key} style={styles.table}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.tableRow}>
          {(row.content ?? []).map((cell, cellIndex) => {
            const isHeader = cell.type === "tableHeader";
            return (
              <View
                key={cellIndex}
                style={isHeader ? styles.tableHeaderCell : styles.tableCell}
              >
                <Text style={styles.tableCellText}>
                  {collectPlainText(cell) || " "}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function renderBlock(
  node: JSONContent,
  index: number,
  layout: ExportLayout,
  accent: string,
): ReactNode {
  const blockStyle = layout === "document" ? styles.docBlock : styles.block;

  switch (node.type) {
    case "paragraph":
      return (
        <View key={index} style={blockStyle}>
          <BodyFromNodes nodes={node.content} layout={layout} accent={accent} />
        </View>
      );
    case "heading": {
        const headingLevel = coerceHeadingLevel(node.attrs?.level);
      return (
        <View key={index} style={blockStyle}>
          <BodyFromNodes
            nodes={node.content}
            variant="heading"
            layout={layout}
            headingLevel={headingLevel}
            accent={accent}
          />
        </View>
      );
    }
    case "bulletList":
      return (
        <View key={index} style={styles.listBlock}>
          {renderListItems(node.content, false, layout, accent)}
        </View>
      );
    case "orderedList":
      return (
        <View key={index} style={styles.listBlock}>
          {renderListItems(node.content, true, layout, accent)}
        </View>
      );
    case "taskList":
      return (
        <View key={index} style={styles.listBlock}>
          {(node.content ?? []).map((item, itemIndex) => {
            const checked = Boolean(item.attrs?.checked);
            const inlineNodes =
              item.content?.flatMap((child) =>
                child.type === "paragraph" ? (child.content ?? []) : [child],
              ) ?? [];
            return (
              <View key={itemIndex} style={blockStyle}>
                <BodyFromNodes
                  nodes={inlineNodes}
                  prefix={checked ? "[x]" : "[ ]"}
                  layout={layout}
                  accent={accent}
                />
              </View>
            );
          })}
        </View>
      );
    case "blockquote":
      return (
        <View key={index} style={[styles.blockquote, { borderLeftColor: accent }]}>
          {(node.content ?? []).map((child, childIndex) => (
            <View key={childIndex} style={blockStyle}>
              <BodyFromNodes nodes={child.content} layout={layout} accent={accent} />
            </View>
          ))}
        </View>
      );
    case "codeBlock":
      return (
        <View key={index} style={blockStyle}>
          <BodyFromNodes
            nodes={[{ type: "text", text: collectPlainText(node) || " " }]}
            layout={layout}
            accent={accent}
          />
        </View>
      );
    case "horizontalRule":
      return <View key={index} style={styles.hr} />;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : null;
      if (!src) return null;
      return (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
        <Image key={index} src={src} style={styles.image} />
      );
    }
    case "table":
      return renderTable(node, index);
    default:
      if (node.content?.length) {
        return (
          <View key={index}>
            {node.content.map((child, childIndex) =>
              renderBlock(child, childIndex, layout, accent),
            )}
          </View>
        );
      }
      return null;
  }
}

/** Continuous TipTap → PDF body. Worksheet keeps ruled lines; document does not. */
export function renderTipTapDocToPdf(
  doc: JSONContent | null,
  layout: ExportLayout = "document",
  accent: string = DEFAULT_ACCENT,
): ReactNode {
  if (!doc?.content?.length) {
    return (
      <View style={layout === "document" ? styles.docBlock : styles.block}>
        <BodyFromNodes nodes={undefined} layout={layout} accent={accent} />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {doc.content.map((node, index) => renderBlock(node, index, layout, accent))}
    </View>
  );
}
