import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";
import { CONTEXTUAL_BLANK } from "@/lib/exercises/contextual-ai-types";

/**
 * Language-agnostic structural limits for contextual prompts.
 * Difficulty is about sentence construction (length, clauses) — never about
 * which target vocabulary is selected or how long that word is.
 */
const LIMITS: Record<
  ExerciseDifficulty,
  {
    maxWords: number;
    maxChars: number;
    maxClauseBreaks: number;
  }
> = {
  easy: {
    maxWords: 8,
    maxChars: 48,
    maxClauseBreaks: 0,
  },
  medium: {
    maxWords: 14,
    maxChars: 80,
    maxClauseBreaks: 1,
  },
  hard: {
    maxWords: 22,
    maxChars: 120,
    maxClauseBreaks: 2,
  },
  intensive: {
    maxWords: 28,
    maxChars: 150,
    maxClauseBreaks: 3,
  },
};

function normalizePrompt(prompt: string): string {
  return prompt
    .replaceAll(CONTEXTUAL_BLANK, " ")
    .replaceAll("________", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Commas, semicolons, colons, and dashes as a language-neutral clause-complexity proxy. */
function clauseBreakCount(text: string): number {
  return (text.match(/[,;:—–]/g) ?? []).length;
}

/**
 * Heuristic check that a contextual prompt matches the selected difficulty.
 * Does not inspect or filter the target vocabulary word itself.
 */
export function promptMatchesDifficulty(
  prompt: string,
  difficulty: ExerciseDifficulty,
): boolean {
  const text = normalizePrompt(prompt);
  if (!text) return false;

  const limits = LIMITS[difficulty];
  const words = tokens(text);

  if (words.length > limits.maxWords) return false;
  if (text.length > limits.maxChars) return false;
  if (clauseBreakCount(text) > limits.maxClauseBreaks) return false;

  return true;
}
