import {
  buildTipTapTableFromMatrix,
  parseTextToTable,
} from "@/lib/editor/selection-to-table";
import { MARKDOWN_TABLE_RULE_RE } from "@/lib/editor/format/patterns";
import type { Detection, FormatLine } from "@/lib/editor/format/types";

function isSeparatorRow(text: string): boolean {
  return MARKDOWN_TABLE_RULE_RE.test(text.trim());
}

export function detectGenericTable(
  lines: FormatLine[],
  index: number,
): Detection | null {
  if (index >= lines.length) return null;

  const block: string[] = [];
  let consumed = 0;
  for (let i = index; i < lines.length; i += 1) {
    const text = lines[i]!.text.trim();
    if (!text) break;
    if (isSeparatorRow(text)) {
      consumed += 1;
      continue;
    }
    const looksTabular = text.includes("|") || text.includes("\t");
    if (!looksTabular && block.length === 0) return null;
    if (!looksTabular) break;
    block.push(text);
    consumed += 1;
  }

  if (block.length < 2) return null;

  const parsed = parseTextToTable(block.join("\n"));
  if (!parsed || parsed.columnCount < 2 || parsed.rows.length < 2) {
    return null;
  }

  return {
    type: "table",
    confidence: 0.93,
    consumed,
    nodes: [buildTipTapTableFromMatrix(parsed.rows, { withHeaderRow: true })],
  };
}
