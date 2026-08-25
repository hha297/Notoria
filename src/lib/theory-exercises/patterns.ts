/**
 * Language-agnostic helpers for theory exercise generation.
 * No target-language vocabulary or morphology tables.
 */

import type { ExtractedPair } from "@/lib/theory-exercises/extract";

export function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function commonPrefixLength(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  const max = Math.min(left.length, right.length);
  let i = 0;
  while (i < max && left[i] === right[i]) i += 1;
  return i;
}

export function commonSuffixLength(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  const max = Math.min(left.length, right.length);
  let i = 0;
  while (
    i < max &&
    left[left.length - 1 - i] === right[right.length - 1 - i]
  ) {
    i += 1;
  }
  return i;
}

/** Heuristic: sides look like a translation/gloss pair, not a form transform. */
export function looksLikeGlossPair(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (commonPrefixLength(a, b) >= 2) return false;

  const aAscii = /^[\x00-\x7F]+$/.test(a);
  const bAscii = /^[\x00-\x7F]+$/.test(b);
  // Different script-ish profiles + no shared stem → likely gloss
  if (aAscii !== bAscii) return true;
  // Multi-word vs single token with no stem overlap
  if (a.split(" ").length !== b.split(" ").length && a.split(" ").length + b.split(" ").length >= 3) {
    return true;
  }
  return false;
}

export function looksLikeGloss(text: string) {
  // Used when checking a single side in isolation — prefer pair check when possible.
  const t = normalize(text);
  if (!t) return false;
  return t.split(" ").length >= 4 && /^[\x00-\x7F]+$/.test(t);
}

/** Short structured pair candidate (not a heading / rule formula). */
export function isStructuredPair(pair: ExtractedPair): boolean {
  const left = normalize(pair.left);
  const right = normalize(pair.right);
  if (!left || !right || left.toLowerCase() === right.toLowerCase()) return false;
  if (left.length > 48 || right.length > 64) return false;
  if (left.split(" ").length > 4 || right.split(" ").length > 4) return false;
  if (/^\d+(\.\d+)*\.?\s/.test(left) || /^\d+(\.\d+)*\.?\s/.test(right)) return false;
  if (/\+/.test(left) || /\+/.test(right)) return false;
  return true;
}

/**
 * Input → output that share a stem (form / conjugation / declension style).
 * Discovered from data; not tied to any language's morphology.
 */
export function isTransformationPair(pair: ExtractedPair): boolean {
  if (!isStructuredPair(pair)) return false;
  const left = normalize(pair.left);
  const right = normalize(pair.right);
  if (left.split(" ").length !== 1 || right.split(" ").length !== 1) return false;
  if (looksLikeGlossPair(left, right)) return false;
  const prefix = commonPrefixLength(left, right);
  return prefix >= Math.min(2, Math.floor(Math.min(left.length, right.length) * 0.4));
}

export type DiscoveredChange = {
  kind: "suffix" | "prefix" | "replace" | "other";
  from: string;
  to: string;
};

/** Derive how input became output (suffix/prefix/replace) — no language tables. */
export function discoverChange(input: string, output: string): DiscoveredChange | null {
  const a = normalize(input);
  const b = normalize(output);
  if (!a || !b || a.toLowerCase() === b.toLowerCase()) return null;

  const prefix = commonPrefixLength(a, b);
  if (prefix >= Math.min(2, Math.floor(a.length * 0.4))) {
    return {
      kind: "suffix",
      from: a.slice(prefix),
      to: b.slice(prefix),
    };
  }

  const suffix = commonSuffixLength(a, b);
  if (suffix >= Math.min(2, Math.floor(a.length * 0.4))) {
    return {
      kind: "prefix",
      from: a.slice(0, a.length - suffix),
      to: b.slice(0, b.length - suffix),
    };
  }

  return { kind: "replace", from: a, to: b };
}

/**
 * Build distractors by applying other discovered changes from the same theory.
 * Never invent language-specific endings not present in `changePool`.
 */
export function buildDistractorsFromChanges(
  input: string,
  correctOutput: string,
  changePool: DiscoveredChange[],
  count: number,
): string[] {
  const base = normalize(input);
  const correct = normalize(correctOutput);
  if (!base || !correct) return [];

  const distractors: string[] = [];
  const seen = new Set<string>([correct.toLowerCase(), base.toLowerCase()]);

  for (const change of shuffle([...changePool])) {
    let candidate: string | null = null;
    if (change.kind === "suffix") {
      const stem =
        change.from.length > 0 && base.toLowerCase().endsWith(change.from.toLowerCase())
          ? base.slice(0, base.length - change.from.length)
          : base;
      if (stem.length >= 1) candidate = `${stem}${change.to}`;
    } else if (change.kind === "prefix") {
      const stem =
        change.from.length > 0 && base.toLowerCase().startsWith(change.from.toLowerCase())
          ? base.slice(change.from.length)
          : base;
      candidate = `${change.to}${stem}`;
    } else if (change.kind === "replace" && change.to) {
      candidate = change.to;
    }

    if (!candidate) continue;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    if (looksLikeGloss(candidate)) continue;
    seen.add(key);
    distractors.push(candidate);
    if (distractors.length >= count) break;
  }

  return distractors;
}

/**
 * Apply a discovered change to a new word (suffix / prefix / replace).
 * Returns null when the input does not match the change's `from` constraint.
 */
export function applyChange(word: string, change: DiscoveredChange): string | null {
  const base = normalize(word);
  if (!base) return null;

  if (change.kind === "suffix") {
    if (change.from.length === 0) return `${base}${change.to}`;
    if (!base.toLowerCase().endsWith(change.from.toLowerCase())) return null;
    const stem = base.slice(0, base.length - change.from.length);
    if (stem.length < 1) return null;
    return `${stem}${change.to}`;
  }

  if (change.kind === "prefix") {
    if (change.from.length === 0) return `${change.to}${base}`;
    if (!base.toLowerCase().startsWith(change.from.toLowerCase())) return null;
    const stem = base.slice(change.from.length);
    if (stem.length < 1) return null;
    return `${change.to}${stem}`;
  }

  if (change.kind === "replace" && change.to) {
    return change.to;
  }

  return null;
}

/** Try changes longest-constraint-first; return the first successful application. */
export function applyBestChange(
  word: string,
  changes: DiscoveredChange[],
): { form: string; change: DiscoveredChange } | null {
  const ranked = [...changes].sort(
    (a, b) => (b.from?.length ?? 0) - (a.from?.length ?? 0),
  );
  for (const change of ranked) {
    const form = applyChange(word, change);
    if (form && form.toLowerCase() !== normalize(word).toLowerCase()) {
      return { form, change };
    }
  }
  return null;
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export type FillBlankSplit = {
  prefix: string;
  answer: string;
  suffix?: string;
  /** When true, prefix and answer are separate tokens (space between). */
  spaced?: boolean;
};

/**
 * Split a fill-blank item so the base/stem stays visible and only the
 * tested feature (ending / complement tail) is blanked.
 * Feature pool comes from Theory analysis — never language tables.
 */
export function splitFillBlankParts(
  base: string,
  expected: string,
  featurePool: string[] = [],
): FillBlankSplit {
  const b = normalize(base);
  const f = normalize(expected);
  if (!b || !f) return { prefix: base, answer: expected };

  const features = [...new Set(featurePool.map(normalize).filter((x) => x.length >= 2))].sort(
    (a, c) => c.length - a.length,
  );

  for (const feature of features) {
    if (!f.toLowerCase().endsWith(feature.toLowerCase())) continue;
    if (f.length <= feature.length) {
      // Expected itself is the feature (e.g. context + ending as separate tokens)
      return { prefix: b, answer: f, spaced: true };
    }
    const stem = f.slice(0, f.length - feature.length);
    const answer = f.slice(f.length - feature.length);
    if (stem.length < 1) continue;

    const shared = commonPrefixLength(b, f);
    // Different tokens: keep context + complement stem visible
    if (shared < 2 && b.toLowerCase() !== f.toLowerCase()) {
      return { prefix: `${b} ${stem}`, answer };
    }
    // Same-lemma / shared stem: show stem only
    return { prefix: stem, answer };
  }

  const prefixLen = commonPrefixLength(b, f);
  const minStem = Math.min(2, Math.floor(Math.min(b.length, f.length) * 0.4));

  if (
    prefixLen >= minStem &&
    prefixLen >= 1 &&
    f.length > prefixLen &&
    b.slice(0, prefixLen).toLowerCase() === f.slice(0, prefixLen).toLowerCase()
  ) {
    return {
      prefix: f.slice(0, prefixLen),
      answer: f.slice(prefixLen),
    };
  }

  return { prefix: b, answer: f, spaced: true };
}

/** Accept tail-only, complement form, or full construction. */
export function fillBlankAcceptableAnswers(
  answer: string,
  split?: Pick<FillBlankSplit, "prefix" | "suffix" | "spaced">,
): string[] {
  const trimmed = answer.trim();
  const results = new Set<string>([trimmed]);
  if (!split?.prefix) return [...results];

  const { prefix, suffix = "", spaced } = split;
  results.add(`${prefix}${trimmed}${suffix}`);
  if (spaced) results.add(`${prefix} ${trimmed}${suffix}`);

  // Also accept the last token of the full construction (complement form)
  const full = spaced
    ? `${prefix} ${trimmed}${suffix}`
    : `${prefix}${trimmed}${suffix}`;
  const lastToken = full.trim().split(/\s+/).pop();
  if (lastToken) results.add(lastToken);

  return [...results];
}
