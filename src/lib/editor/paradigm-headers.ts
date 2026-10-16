import type { JSONContent } from "@tiptap/react";

/**
 * Stable internal keys for case×number paradigm table columns and case-row labels.
 * AI output and persisted TipTap JSON use English canonical tokens;
 * the UI maps those to the website locale via i18n.
 */
export const PARADIGM_HEADER_KEYS = ["case", "singular", "plural"] as const;

export type ParadigmHeaderKey = (typeof PARADIGM_HEADER_KEYS)[number];

export type ParadigmHeaderLabels = Record<ParadigmHeaderKey, string>;

/** Canonical English tokens stored in TipTap / returned from AI schema. */
export const PARADIGM_HEADER_CANONICAL: ParadigmHeaderLabels = {
  case: "Case",
  singular: "Singular",
  plural: "Plural",
};

export const PARADIGM_CASE_KEYS = [
  "nominative",
  "genitive",
  "partitive",
  "accusative",
  "inessive",
  "elative",
  "illative",
  "adessive",
  "ablative",
  "allative",
  "essive",
  "translative",
  "instructive",
  "abessive",
  "comitative",
] as const;

export type ParadigmCaseKey = (typeof PARADIGM_CASE_KEYS)[number];

export type ParadigmCaseLabels = Record<ParadigmCaseKey, string>;

/** Canonical English case tokens stored in TipTap / AI row labels. */
export const PARADIGM_CASE_CANONICAL: ParadigmCaseLabels = {
  nominative: "Nominative",
  genitive: "Genitive",
  partitive: "Partitive",
  accusative: "Accusative",
  inessive: "Inessive",
  elative: "Elative",
  illative: "Illative",
  adessive: "Adessive",
  ablative: "Ablative",
  allative: "Allative",
  essive: "Essive",
  translative: "Translative",
  instructive: "Instructive",
  abessive: "Abessive",
  comitative: "Comitative",
};

export type ParadigmUiLabels = {
  headers: ParadigmHeaderLabels;
  cases: ParadigmCaseLabels;
};

/**
 * Known display strings (all supported UI locales + common AI variants)
 * mapped back to stable keys. Matching is case-insensitive.
 */
const HEADER_ALIASES: Record<string, ParadigmHeaderKey> = {
  case: "case",
  singular: "singular",
  plural: "plural",
  sijamuoto: "case",
  yksikkö: "singular",
  monikko: "plural",
  kasus: "case",
  cách: "case",
  "số ít": "singular",
  "số nhiều": "plural",
};

const CASE_ALIASES: Record<string, ParadigmCaseKey> = {
  // en
  nominative: "nominative",
  genitive: "genitive",
  partitive: "partitive",
  accusative: "accusative",
  inessive: "inessive",
  elative: "elative",
  illative: "illative",
  adessive: "adessive",
  ablative: "ablative",
  allative: "allative",
  essive: "essive",
  translative: "translative",
  instructive: "instructive",
  abessive: "abessive",
  comitative: "comitative",
  // fi
  nominatiivi: "nominative",
  genetiivi: "genitive",
  partitiivi: "partitive",
  akkusatiivi: "accusative",
  inessiivi: "inessive",
  elatiivi: "elative",
  illatiivi: "illative",
  adessiivi: "adessive",
  ablatiivi: "ablative",
  allatiivi: "allative",
  essiivi: "essive",
  translatiivi: "translative",
  instruktiivi: "instructive",
  abessiivi: "abessive",
  komitatiivi: "comitative",
  // sv
  nominativ: "nominative",
  genitiv: "genitive",
  partitiv: "partitive",
  ackusativ: "accusative",
  inessiv: "inessive",
  elativ: "elative",
  illativ: "illative",
  adessiv: "adessive",
  ablativ: "ablative",
  allativ: "allative",
  essiv: "essive",
  translativ: "translative",
  instruktiv: "instructive",
  abessiv: "abessive",
  komitativ: "comitative",
  // vi (descriptive + Latin)
  "chủ cách": "nominative",
  "sở hữu cách": "genitive",
  "phân cách": "partitive",
  "đối cách": "accusative",
  "nội cách": "inessive",
  "xuất cách": "elative",
  "nhập cách": "illative",
  "tiếp cận cách": "adessive",
  "ly cách": "ablative",
  "hướng cách": "allative",
  "bản chất cách": "essive",
  "chuyển hóa cách": "translative",
  "công cụ cách": "instructive",
  "thiếu cách": "abessive",
  "đồng hành cách": "comitative",
};

function normalizeToken(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function resolveKeyFromLabels<T extends string>(
  normalized: string,
  keys: readonly T[],
  labels: Record<T, string>,
): T | null {
  for (const key of keys) {
    if (normalizeToken(labels[key]) === normalized) {
      return key;
    }
  }
  return null;
}

/**
 * Resolve a header cell to a stable paradigm key, or null if unrelated.
 */
export function resolveParadigmHeaderKey(
  text: string,
  labels?: ParadigmHeaderLabels | null,
): ParadigmHeaderKey | null {
  const normalized = normalizeToken(text);
  if (!normalized) return null;

  const fromAlias = HEADER_ALIASES[normalized];
  if (fromAlias) return fromAlias;

  if (labels) {
    return resolveKeyFromLabels(normalized, PARADIGM_HEADER_KEYS, labels);
  }

  return null;
}

/**
 * Resolve a case-row label to a stable key, or null if unrelated.
 */
export function resolveParadigmCaseKey(
  text: string,
  labels?: ParadigmCaseLabels | null,
): ParadigmCaseKey | null {
  const normalized = normalizeToken(text);
  if (!normalized) return null;

  const fromAlias = CASE_ALIASES[normalized];
  if (fromAlias) return fromAlias;

  if (labels) {
    return resolveKeyFromLabels(normalized, PARADIGM_CASE_KEYS, labels);
  }

  return null;
}

/** Map a header cell to the English canonical token when recognized. */
export function canonicalizeParadigmHeader(
  text: string,
  labels?: ParadigmHeaderLabels | null,
): string {
  const key = resolveParadigmHeaderKey(text, labels);
  return key ? PARADIGM_HEADER_CANONICAL[key] : text;
}

/** Map a header cell to the current UI locale label when recognized. */
export function localizeParadigmHeader(
  text: string,
  labels: ParadigmHeaderLabels,
): string {
  const key = resolveParadigmHeaderKey(text, labels);
  return key ? labels[key] : text;
}

/** Map a case-row label to the English canonical token when recognized. */
export function canonicalizeParadigmCase(
  text: string,
  labels?: ParadigmCaseLabels | null,
): string {
  const key = resolveParadigmCaseKey(text, labels);
  return key ? PARADIGM_CASE_CANONICAL[key] : text;
}

/** Map a case-row label to the current UI locale label when recognized. */
export function localizeParadigmCase(
  text: string,
  labels: ParadigmCaseLabels,
): string {
  const key = resolveParadigmCaseKey(text, labels);
  return key ? labels[key] : text;
}

function rewriteCellPlainText(
  cell: JSONContent,
  mapText: (text: string) => string,
): JSONContent {
  const content = (cell.content ?? []).map((paragraph) => {
    if (paragraph.type !== "paragraph") return paragraph;
    const parts = paragraph.content ?? [];
    if (
      parts.length === 1 &&
      parts[0]?.type === "text" &&
      typeof parts[0].text === "string"
    ) {
      const nextText = mapText(parts[0].text);
      if (nextText === parts[0].text) return paragraph;
      return {
        ...paragraph,
        content: [{ ...parts[0], text: nextText }],
      };
    }
    const plain = parts
      .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
      .join("");
    const nextText = mapText(plain);
    if (nextText === plain) return paragraph;
    const marks = parts.find((part) => part.type === "text")?.marks;
    return {
      ...paragraph,
      content: [
        marks?.length
          ? { type: "text", text: nextText, marks }
          : { type: "text", text: nextText },
      ],
    };
  });

  return { ...cell, content };
}

function mapParadigmTableLabels(
  doc: JSONContent,
  mapHeader: (text: string) => string,
  mapCase: (text: string) => string,
): JSONContent {
  const walk = (node: JSONContent): JSONContent => {
    if (node.type === "table") {
      const rows = (node.content ?? []).map((row, rowIndex) => {
        if (row.type !== "tableRow") return walk(row);
        const cells = (row.content ?? []).map((cell, cellIndex) => {
          if (cell.type === "tableHeader") {
            return rewriteCellPlainText(cell, mapHeader);
          }
          if (cell.type === "tableCell" && rowIndex > 0 && cellIndex === 0) {
            return rewriteCellPlainText(cell, mapCase);
          }
          if (!cell.content?.length) return cell;
          return { ...cell, content: cell.content.map(walk) };
        });
        return { ...row, content: cells };
      });
      return { ...node, content: rows };
    }
    if (!node.content?.length) return node;
    return {
      ...node,
      content: node.content.map(walk),
    };
  };
  return walk(doc);
}

/** Rewrite known paradigm header + case cells to English canonical tokens. */
export function canonicalizeParadigmHeadersInDoc(
  doc: JSONContent,
  labels?: ParadigmUiLabels | ParadigmHeaderLabels | null,
): JSONContent {
  const headers =
    labels && "headers" in labels
      ? labels.headers
      : (labels as ParadigmHeaderLabels | null | undefined);
  const cases =
    labels && "cases" in labels ? labels.cases : undefined;

  return mapParadigmTableLabels(
    doc,
    (text) => canonicalizeParadigmHeader(text, headers),
    (text) => canonicalizeParadigmCase(text, cases),
  );
}

/** Rewrite known paradigm header + case cells to the current UI locale labels. */
export function localizeParadigmHeadersInDoc(
  doc: JSONContent,
  labels: ParadigmUiLabels | ParadigmHeaderLabels,
): JSONContent {
  const headers = "headers" in labels ? labels.headers : labels;
  const cases = "cases" in labels ? labels.cases : undefined;

  return mapParadigmTableLabels(
    doc,
    (text) => localizeParadigmHeader(text, headers),
    (text) => (cases ? localizeParadigmCase(text, cases) : text),
  );
}

/** Canonicalize an AI table header row in place (stable schema keys). */
export function canonicalizeParadigmHeaderRow(
  headers: string[],
  labels?: ParadigmHeaderLabels | null,
): string[] {
  return headers.map((header) => canonicalizeParadigmHeader(header, labels));
}

/** Canonicalize the first-column case labels of AI table rows. */
export function canonicalizeParadigmCaseRows(
  rows: string[][],
  labels?: ParadigmCaseLabels | null,
): string[][] {
  return rows.map((row) => {
    if (row.length === 0) return row;
    const [first, ...rest] = row;
    return [canonicalizeParadigmCase(first ?? "", labels), ...rest];
  });
}
