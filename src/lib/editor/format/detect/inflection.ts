import { buildTipTapTableFromMatrix } from "@/lib/editor/selection-to-table";
import { headingFromText } from "@/lib/editor/format/nodes";
import { stripBulletPrefix } from "@/lib/editor/format/detect/lists";
import {
  FINNISH_CASES,
  INFLECTION_TABLE_HEADERS,
  displayCaseName,
  matchSectionPattern,
  SECTION_PATTERNS,
  type FinnishCase,
} from "@/lib/editor/format/patterns";
import {
  MISSING_FORM,
  type Detection,
  type FormatLine,
} from "@/lib/editor/format/types";

type NumberValue = "singular" | "plural";

type CaseHit = {
  caseId: FinnishCase;
  number: NumberValue;
  index: number;
  length: number;
};

export type CaseForm = {
  caseId: FinnishCase;
  singular?: string;
  plural?: string;
};

const CASE_LABELS: Array<{
  source: string;
  caseId: FinnishCase;
  number: NumberValue;
}> = [
  ...FINNISH_CASES.map((caseId) => ({
    source: `monikon\\s+${caseId}`,
    caseId,
    number: "plural" as const,
  })),
  ...FINNISH_CASES.map((caseId) => ({
    source: `\\b${caseId}\\b`,
    caseId,
    number: "singular" as const,
  })),
  {
    source: "\\bmonikko\\b",
    caseId: "nominatiivi",
    number: "plural",
  },
];

function findLabels(text: string): CaseHit[] {
  const hits: CaseHit[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let best: CaseHit | null = null;
    for (const label of CASE_LABELS) {
      const match = text.slice(cursor).match(new RegExp(label.source, "iu"));
      if (!match || match.index == null) continue;
      const index = cursor + match.index;
      const length = match[0].length;
      if (
        !best ||
        index < best.index ||
        (index === best.index && length > best.length)
      ) {
        best = {
          caseId: label.caseId,
          number: label.number,
          index,
          length,
        };
      }
    }
    if (!best) break;
    hits.push(best);
    cursor = best.index + best.length;
  }

  return hits;
}

export function parseInflectionPairs(text: string): CaseForm[] {
  const hits = findLabels(text);
  if (hits.length === 0) return [];

  const merged = new Map<FinnishCase, CaseForm>();

  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i]!;
    const start = hit.index + hit.length;
    const end = i + 1 < hits.length ? hits[i + 1]!.index : text.length;
    const form = text.slice(start, end).trim();
    if (!form) continue;
    const existing = merged.get(hit.caseId) ?? { caseId: hit.caseId };
    if (hit.number === "plural") existing.plural = form;
    else existing.singular = form;
    merged.set(hit.caseId, existing);
  }

  return FINNISH_CASES.map((caseId) => merged.get(caseId)).filter(
    (row): row is CaseForm => Boolean(row),
  );
}

export function inflectionLineScore(text: string): number {
  return findLabels(text).length;
}

function isInflectionHeading(text: string): boolean {
  const body = stripBulletPrefix(text).body;
  const pattern = matchSectionPattern(body, SECTION_PATTERNS);
  return pattern?.id === "inflection";
}

function collectInflectionLines(lines: FormatLine[], start: number): string[] {
  const block: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const body = stripBulletPrefix(lines[i]!.text).body;
    if (!body) break;
    if (isInflectionHeading(body) && i > start) break;
    if (inflectionLineScore(body) === 0) break;
    block.push(body);
  }
  return block;
}

export function detectInflection(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const line = lines[index];
  if (!line) return null;

  const heading = isInflectionHeading(line.text);
  const dataStart = heading ? index + 1 : index;
  const block = collectInflectionLines(lines, dataStart);
  if (block.length === 0) return null;

  const parsed = parseInflectionPairs(block.join(" "));
  const filled = parsed.filter((row) => row.singular || row.plural);
  if (filled.length < 3) return null;

  const rows = [
    [...INFLECTION_TABLE_HEADERS],
    ...filled.map((row) => [
      displayCaseName(row.caseId),
      row.singular?.trim() || MISSING_FORM,
      row.plural?.trim() || MISSING_FORM,
    ]),
  ];

  const nodes = [buildTipTapTableFromMatrix(rows, { withHeaderRow: true })];
  if (heading) {
    nodes.unshift(headingFromText(2, stripBulletPrefix(line.text).body));
  }

  return {
    type: "inflection-table",
    confidence: Math.min(0.99, 0.8 + filled.length * 0.015),
    consumed: (heading ? 1 : 0) + block.length,
    nodes,
  };
}
