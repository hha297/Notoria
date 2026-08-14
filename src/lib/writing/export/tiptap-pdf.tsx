import type { JSONContent } from "@tiptap/react";
import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { sanitizeExportText } from "@/lib/export/sanitize-export-text";
import type { ExportLayout } from "@/lib/writing/export/types";

/** Matches Question Set export body typography (Chakra Petch / ink). */
const FONT_SANS = "ChakraPetch";

const styles = StyleSheet.create({
  body: {
    width: "100%",
  },
  block: {
    marginBottom: 12,
  },
  docBlock: {
    marginBottom: 10,
  },
  docSpacer: {
    marginBottom: 8,
  },
  /** Ruled line — same look as Question Set answer lines. */
  ruledLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#c8c2d6",
    marginBottom: 8,
    minHeight: 22,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  ruledText: {
    fontFamily: FONT_SANS,
    fontSize: 12,
    fontWeight: 400,
    color: "#2f4a08",
  },
  ruledHeading: {
    fontFamily: FONT_SANS,
    fontSize: 12,
    fontWeight: 700,
    color: "#1a1528",
  },
  docText: {
    fontFamily: FONT_SANS,
    fontSize: 11,
    fontWeight: 400,
    color: "#1a1528",
    lineHeight: 1.5,
  },
  docH1: {
    fontFamily: FONT_SANS,
    fontSize: 16,
    fontWeight: 700,
    color: "#1a1528",
    lineHeight: 1.3,
    marginTop: 6,
  },
  docH2: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 700,
    color: "#1a1528",
    lineHeight: 1.3,
    marginTop: 4,
  },
  docH3: {
    fontFamily: FONT_SANS,
    fontSize: 12,
    fontWeight: 700,
    color: "#1a1528",
    lineHeight: 1.3,
    marginTop: 2,
  },
  listBlock: {
    marginBottom: 12,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#c8c2d6",
    paddingLeft: 10,
    marginBottom: 12,
    marginTop: 2,
  },
  codeBlock: {
    backgroundColor: "#f4f2f8",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: FONT_SANS,
    fontSize: 10,
    color: "#1a1528",
    lineHeight: 1.4,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#d5d0e0",
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
    borderColor: "#d5d0e0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d5d0e0",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#d5d0e0",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#d5d0e0",
    backgroundColor: "#f4f2f8",
  },
  tableCellText: {
    fontFamily: FONT_SANS,
    fontSize: 11,
    color: "#1a1528",
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
): ReactNode {
  const marks = run.marks;
  const isDocument = layout === "document";
  return (
    <Text
      style={[
        isDocument
          ? {}
          : variant === "heading"
            ? styles.ruledHeading
            : styles.ruledText,
        {
          fontWeight: marks.bold || variant === "heading" ? 700 : 400,
          fontStyle: marks.italic ? "italic" : "normal",
          textDecoration:
            marks.underline || marks.linkHref ? "underline" : "none",
          color: marks.linkHref
            ? "#3d6b0a"
            : isDocument
              ? "#1a1528"
              : variant === "heading"
                ? "#1a1528"
                : "#2f4a08",
          backgroundColor: marks.highlight ? "#f2f6c8" : undefined,
        },
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
}: {
  runs: TextRun[];
  variant?: "body" | "heading";
  prefix?: string;
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
              lineRuns.map((run, runIndex) => (
                <Text key={runIndex}>{renderRun(run, variant, "worksheet")}</Text>
              ))
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
}: {
  nodes: JSONContent[] | undefined;
  variant?: "body" | "heading";
  prefix?: string;
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
  return <RuledLines runs={runs} variant={variant} prefix={prefix} />;
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
}: {
  nodes: JSONContent[] | undefined;
  variant?: "body" | "heading";
  prefix?: string;
  headingLevel?: number;
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
      {allRuns.map((run, index) => (
        <Text key={index}>{renderRun(run, variant, "document")}</Text>
      ))}
    </Text>
  );
}

function BodyFromNodes({
  nodes,
  variant = "body",
  prefix,
  layout,
  headingLevel,
}: {
  nodes: JSONContent[] | undefined;
  variant?: "body" | "heading";
  prefix?: string;
  layout: ExportLayout;
  headingLevel?: number;
}): ReactNode {
  if (layout === "document") {
    return (
      <DocumentFromNodes
        nodes={nodes}
        variant={variant}
        prefix={prefix}
        headingLevel={headingLevel}
      />
    );
  }
  return <RuledFromNodes nodes={nodes} variant={variant} prefix={prefix} />;
}

function renderListItems(
  items: JSONContent[] | undefined,
  ordered: boolean,
  layout: ExportLayout,
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
): ReactNode {
  const blockStyle = layout === "document" ? styles.docBlock : styles.block;

  switch (node.type) {
    case "paragraph":
      return (
        <View key={index} style={blockStyle}>
          <BodyFromNodes nodes={node.content} layout={layout} />
        </View>
      );
    case "heading": {
      const headingLevel =
        typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      return (
        <View key={index} style={blockStyle}>
          <BodyFromNodes
            nodes={node.content}
            variant="heading"
            layout={layout}
            headingLevel={headingLevel}
          />
        </View>
      );
    }
    case "bulletList":
      return (
        <View key={index} style={styles.listBlock}>
          {renderListItems(node.content, false, layout)}
        </View>
      );
    case "orderedList":
      return (
        <View key={index} style={styles.listBlock}>
          {renderListItems(node.content, true, layout)}
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
                />
              </View>
            );
          })}
        </View>
      );
    case "blockquote":
      return (
        <View key={index} style={styles.blockquote}>
          {(node.content ?? []).map((child, childIndex) => (
            <View key={childIndex} style={blockStyle}>
              <BodyFromNodes nodes={child.content} layout={layout} />
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
              renderBlock(child, childIndex, layout),
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
  layout: ExportLayout = "worksheet",
): ReactNode {
  if (!doc?.content?.length) {
    return (
      <View style={layout === "document" ? styles.docBlock : styles.block}>
        <BodyFromNodes nodes={undefined} layout={layout} />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {doc.content.map((node, index) => renderBlock(node, index, layout))}
    </View>
  );
}
