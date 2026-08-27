/**
 * Shared helpers for learner-facing exercise instructions.
 * Prefer source text; never invent specific grammar topics without evidence.
 */

export const NEUTRAL_INSTRUCTION_EN = "Complete the exercise.";

const NEUTRAL_PATTERNS = [
  /^complete the exercise\.?$/i,
  /^complete the form\.?$/i,
  /^fill in the blank\.?$/i,
  /^choose the correct form\.?$/i,
  /^täydennä harjoitus\.?$/i,
  /^täydennä tehtävä\.?$/i,
  /^hoàn thành bài tập\.?$/i,
];

export function isNeutralInstruction(value: string | null | undefined): boolean {
  const text = value?.trim() ?? "";
  if (!text) return true;
  return NEUTRAL_PATTERNS.some((re) => re.test(text));
}

/** Collapse for fuzzy containment checks. */
export function normalizeInstructionMatch(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function instructionGroundedInSource(
  instruction: string,
  sourceText: string,
): boolean {
  const sourceNorm = normalizeInstructionMatch(sourceText);
  const needle = normalizeInstructionMatch(instruction);
  if (!sourceNorm || !needle) return false;
  if (sourceNorm.includes(needle)) return true;

  const tokens = needle.split(" ").filter((t) => t.length >= 4);
  if (tokens.length === 0) {
    // Short instruction (e.g. column header) — require full phrase or all tokens ≥3
    const short = needle.split(" ").filter((t) => t.length >= 3);
    if (short.length === 0) return false;
    return short.every((t) => sourceNorm.includes(t));
  }
  const hit = tokens.filter((t) => sourceNorm.includes(t)).length;
  return hit / tokens.length >= 0.65;
}

/**
 * Import: keep source instruction when grounded; otherwise null (UI uses i18n neutral).
 * Never keep long ungrounded “grammar topic” instructions.
 */
export function resolveImportInstruction(input: {
  instruction?: string | null;
  skillLabel?: string | null;
  sourceText: string;
}): string | null {
  const raw = input.instruction?.trim();
  if (raw && instructionGroundedInSource(raw, input.sourceText)) {
    return raw;
  }
  if (raw && isNeutralInstruction(raw)) {
    return raw;
  }
  return null;
}

export function resolveImportSkillLabel(input: {
  skillLabel?: string | null;
  importTitle?: string | null;
  sourceText: string;
}): string | undefined {
  const label = input.skillLabel?.trim();
  if (label && instructionGroundedInSource(label, input.sourceText)) {
    return label;
  }
  // Titles are often short headings — allow if most tokens appear in source
  if (label) {
    const sourceNorm = normalizeInstructionMatch(input.sourceText);
    const tokens = normalizeInstructionMatch(label)
      .split(" ")
      .filter((t) => t.length >= 3);
    if (
      tokens.length > 0 &&
      tokens.filter((t) => sourceNorm.includes(t)).length / tokens.length >= 0.5
    ) {
      return label;
    }
  }
  const title = input.importTitle?.trim();
  return title || undefined;
}

/** Detect write-a-sentence style tasks (hide form arrow). */
export function isWriteSentenceTask(instruction?: string | null): boolean {
  const text = instruction?.toLowerCase() ?? "";
  if (!text) return false;
  return (
    /\blause\b/.test(text) ||
    /\bkirjoita\b/.test(text) ||
    /\bwrite a sentence\b/.test(text) ||
    /\bviết câu\b/.test(text) ||
    /\bskriv en mening\b/.test(text)
  );
}
