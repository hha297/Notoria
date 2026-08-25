/**
 * Theory analysis → generic knowledge representation.
 * All features are discovered from the user's free-form Theory content.
 * No target-language morphology or vocabulary tables.
 */

import type { ExtractedTheoryContent } from "@/lib/theory-exercises/extract";
import {
  discoverChange,
  isStructuredPair,
  isTransformationPair,
  looksLikeGloss,
  looksLikeGlossPair,
  normalize,
  type DiscoveredChange,
} from "@/lib/theory-exercises/patterns";

export type KnowledgeKind = "transformation" | "relation" | "definition" | "mixed" | "unknown";

export type TransformationPattern = {
  input: string;
  output: string;
  change?: DiscoveredChange;
  context?: string;
  source: "pair" | "table" | "list";
};

/** Relationship between two spans (context↔form, concept↔concept, etc.). */
export type RelationPattern = {
  left: string;
  right: string;
  kind: "pair" | "phrase";
};

export type DefinitionPattern = {
  premise?: string;
  conclusion?: string;
  statement?: string;
};

/** Important spans called out in the Theory (slash lists, hyphen markers, etc.). */
export type HighlightedFeature = {
  value: string;
  source: "title" | "content";
};

export type KnowledgePoint = {
  id: string;
  kind: "transformation" | "relation" | "definition";
  transformation?: TransformationPattern;
  relation?: RelationPattern;
  definition?: DefinitionPattern;
};

export type AnalyzedTheory = {
  title: string;
  kind: KnowledgeKind;
  topic?: string;
  transformations: TransformationPattern[];
  relations: RelationPattern[];
  definitions: DefinitionPattern[];
  highlightedFeatures: HighlightedFeature[];
  knowledgePoints: KnowledgePoint[];
  /** Aggregated change ops discovered from transformations — for distractors. */
  changePool: DiscoveredChange[];
};

function commonPrefixLength(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  const max = Math.min(left.length, right.length);
  let i = 0;
  while (i < max && left[i] === right[i]) i += 1;
  return i;
}

export function collectTransformations(
  extracted: ExtractedTheoryContent,
): TransformationPattern[] {
  const items: TransformationPattern[] = [];
  const seen = new Set<string>();

  for (const pair of extracted.pairs) {
    if (!isTransformationPair(pair)) continue;
    const input = normalize(pair.left);
    const output = normalize(pair.right);
    const key = `${input.toLowerCase()}|${output.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      input,
      output,
      change: discoverChange(input, output) ?? undefined,
      source: "pair",
    });
  }

  return items;
}

export function collectRelations(
  extracted: ExtractedTheoryContent,
): RelationPattern[] {
  const items: RelationPattern[] = [];
  const seen = new Set<string>();

  function push(left: string, right: string, kind: RelationPattern["kind"]) {
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b) return;
    if (looksLikeGloss(a) || looksLikeGloss(b)) return;
    if (looksLikeGlossPair(a, b)) return;
    if (a.split(" ").length > 3 || b.split(" ").length > 3) return;
    const key = `${a.toLowerCase()}|${b.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ left: a, right: b, kind });
  }

  // Two-token phrases in examples/lists → context + complement
  for (const example of extracted.examples) {
    const text = normalize(example);
    if (looksLikeGloss(text) || text.includes("→")) continue;
    const parts = text.split(" ");
    if (parts.length === 2 && parts[0] && parts[1]) {
      push(parts[0], parts[1], "phrase");
    }
  }

  for (const list of extracted.lists) {
    for (const item of list.items) {
      const text = normalize(item);
      if (looksLikeGloss(text) || text.includes("→")) continue;
      const parts = text.split(" ");
      if (parts.length === 2 && parts[0] && parts[1]) {
        push(parts[0], parts[1], "phrase");
      }
    }
  }

  // Non-transformation pairs that are still structured (related spans)
  for (const pair of extracted.pairs) {
    if (isTransformationPair(pair)) continue;
    if (!isStructuredPair(pair)) continue;
    const left = normalize(pair.left);
    const right = normalize(pair.right);
    if (looksLikeGlossPair(left, right)) {
      // If one side is a two-token phrase, keep that phrase as a relation
      const phrase = !looksLikeGloss(left) && left.split(" ").length === 2 ? left : right;
      if (!looksLikeGloss(phrase) && phrase.split(" ").length === 2) {
        const [a, b] = phrase.split(" ");
        if (a && b) push(a, b, "phrase");
      }
      continue;
    }
    if (
      left.split(" ").length === 1 &&
      right.split(" ").length === 1 &&
      commonPrefixLength(left, right) < 2
    ) {
      push(left, right, "pair");
    }
  }

  return items.slice(0, 24);
}

/**
 * Features highlighted by the author: "a/b/c", "a | b | c", "-foo".
 * Values come only from the Theory text — never from a language table.
 */
export function collectHighlightedFeatures(
  theoryTitle: string,
  extracted: ExtractedTheoryContent,
): HighlightedFeature[] {
  const blob = `${theoryTitle}\n${extracted.plainText.slice(0, 2000)}`;
  const found = new Map<string, HighlightedFeature["source"]>();

  for (const match of blob.matchAll(
    /-?([\p{L}\p{M}]{1,12})(?:\s*[/,|]\s*-?([\p{L}\p{M}]{1,12})){1,}/gu,
  )) {
    const inTitle = theoryTitle.toLowerCase().includes(match[0].toLowerCase().slice(0, 12));
    for (const part of match[0].split(/[/,|]/)) {
      const value = part.replace(/^-/, "").trim();
      if (value.length >= 1 && value.length <= 12) {
        found.set(value.toLowerCase(), inTitle ? "title" : "content");
      }
    }
  }

  for (const match of blob.matchAll(/(?:^|[\s("])-([\p{L}\p{M}]{2,10})\b/gu)) {
    const value = match[1]!;
    if (!found.has(value.toLowerCase())) {
      found.set(value.toLowerCase(), "content");
    }
  }

  return [...found.entries()].map(([value, source]) => ({ value, source }));
}

const RULE_ARROW_RE = /^(.{4,100}?)\s*(?:→|->|⇒|:)\s*(.{2,80})$/;

export function collectDefinitions(
  extracted: ExtractedTheoryContent,
): DefinitionPattern[] {
  const items: DefinitionPattern[] = [];
  const seen = new Set<string>();

  function pushPremise(premise: string, conclusion: string) {
    const p = normalize(premise);
    const c = normalize(conclusion);
    if (!p || !c) return;
    if (isTransformationPair({ left: p, right: c })) return;
    // Prefer rule-like formulas (contain + or multiple words)
    if (!/\+/.test(p) && p.split(" ").length < 2 && c.split(" ").length < 2) return;
    const key = `${p.toLowerCase()}|${c.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ premise: p, conclusion: c });
  }

  function pushStatement(statement: string) {
    const s = normalize(statement);
    if (s.length < 24 || s.length > 200) return;
    if (!/[.!?]$/.test(s)) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ statement: s });
  }

  for (const section of extracted.sections) {
    for (const paragraph of section.paragraphs) {
      const match = paragraph.match(RULE_ARROW_RE);
      if (match) pushPremise(match[1]!, match[2]!);
      else pushStatement(paragraph);
    }
  }

  for (const list of extracted.lists) {
    for (const item of list.items) {
      const match = item.match(RULE_ARROW_RE);
      if (match) pushPremise(match[1]!, match[2]!);
    }
  }

  for (const statement of extracted.statements) {
    pushStatement(statement);
  }

  return items.slice(0, 16);
}

function classifyKind(
  transformations: TransformationPattern[],
  relations: RelationPattern[],
  definitions: DefinitionPattern[],
): KnowledgeKind {
  const hasT = transformations.length > 0;
  const hasR = relations.length > 0;
  const hasD = definitions.some((d) => d.premise || d.statement);
  const count = Number(hasT) + Number(hasR) + Number(hasD);
  if (count >= 2) return "mixed";
  if (hasT) return "transformation";
  if (hasR) return "relation";
  if (hasD) return "definition";
  return "unknown";
}

function toKnowledgePoints(
  transformations: TransformationPattern[],
  relations: RelationPattern[],
  definitions: DefinitionPattern[],
): KnowledgePoint[] {
  const points: KnowledgePoint[] = [];
  let i = 0;
  for (const t of transformations) {
    points.push({
      id: `kp_t_${i++}`,
      kind: "transformation",
      transformation: t,
    });
  }
  for (const r of relations) {
    points.push({
      id: `kp_r_${i++}`,
      kind: "relation",
      relation: r,
    });
  }
  for (const d of definitions) {
    if (!d.premise && !d.statement) continue;
    points.push({
      id: `kp_d_${i++}`,
      kind: "definition",
      definition: d,
    });
  }
  return points;
}

export function analyzeTheory(
  extracted: ExtractedTheoryContent,
  theoryTitle: string,
): AnalyzedTheory {
  const transformations = collectTransformations(extracted);
  const relations = collectRelations(extracted);
  const definitions = collectDefinitions(extracted);
  const highlightedFeatures = collectHighlightedFeatures(theoryTitle, extracted);
  const kind = classifyKind(transformations, relations, definitions);
  const topic =
    extracted.sections.find((s) => s.heading && s.heading !== "Notes")?.heading ??
    undefined;

  const changePool: DiscoveredChange[] = [];
  const seenChanges = new Set<string>();
  for (const t of transformations) {
    if (!t.change) continue;
    const key = `${t.change.kind}|${t.change.from}|${t.change.to}`;
    if (seenChanges.has(key)) continue;
    seenChanges.add(key);
    changePool.push(t.change);
  }
  // Highlighted features can act as alternate suffix/prefix material when present
  for (const feature of highlightedFeatures) {
    const key = `suffix||${feature.value}`;
    if (seenChanges.has(key)) continue;
    seenChanges.add(key);
    changePool.push({ kind: "suffix", from: "", to: feature.value });
  }

  return {
    title: theoryTitle.trim(),
    kind,
    topic,
    transformations,
    relations,
    definitions,
    highlightedFeatures,
    knowledgePoints: toKnowledgePoints(transformations, relations, definitions),
    changePool,
  };
}
