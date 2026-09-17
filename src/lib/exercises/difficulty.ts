/**
 * Session difficulty for Fill in the Blank, Multiple Choice, and Type the Answer.
 * Controls how existing user vocabulary is tested — never which words are selected.
 * No CEFR / vocabulary-level mapping.
 */
export const EXERCISE_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
  "intensive",
] as const;

export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];

export const DEFAULT_EXERCISE_DIFFICULTY: ExerciseDifficulty = "medium";

export type ExerciseDifficultyProfile = {
  id: ExerciseDifficulty;
  /**
   * Share of session items that should prefer AI contextual formats when Pro AI
   * is available. Remaining items stay deterministic (word ↔ meaning).
   */
  aiContextualRatio: number;
  /** Shared rules for all AI exercise generation at this difficulty. */
  aiGuidance: string;
  /** Extra rules for multiple-choice AI (format mix + distractors). */
  multipleChoiceGuidance: string;
  /** Extra rules for type-the-answer AI (definition vs contextual recall). */
  typeAnswerGuidance: string;
  /** Extra rules for fill-in-the-blank AI sentence generation. */
  fillBlankGuidance: string;
};

export const EXERCISE_DIFFICULTY_PROFILES: Record<
  ExerciseDifficulty,
  ExerciseDifficultyProfile
> = {
  easy: {
    id: "easy",
    aiContextualRatio: 0.25,
    aiGuidance: `Difficulty: Easy — the WHOLE question must feel easy (structure + clues + distractors), NOT because the target word is short or common.
- Use EVERY provided target word as-is. Never skip, swap, or replace a long/uncommon target with an easier word.
- Target vocabulary MUST come only from the provided learner word list. Never invent a new target word.
- Use VERY SHORT, natural, everyday sentences with simple grammar and obvious clues.
- A long or uncommon target word can still be Easy if the sentence and context are obvious.
- Avoid subordinate clauses, purpose constructions, indirect wording, and multi-step inference.
- Do NOT raise or lower difficulty by choosing different vocabulary — only by how the sentence is built.`,
    multipleChoiceGuidance: `Multiple Choice — Easy
- One distinct exercise per provided wordId — never reuse the same target across the batch.
- ALWAYS use a short fill-in-the-blank sentence with a unique everyday context per word.
- options MUST contain exactly 4 items: correctOption (base form) + 3 distractors from the learner pool.
- Distractors must be obviously different in meaning.
- One answer must clearly fit; no close near-misses.`,
    typeAnswerGuidance: `Type the Answer — Easy
- Prefer short contextual fill-in-the-blank sentences with strong, unambiguous clues.
- Expected answer is the exact grammatical form required by the blank.
- No subordinate clauses or advanced grammar in contextual prompts.`,
    fillBlankGuidance: `Fill in the Blank — Easy
- Very short everyday sentences, simple grammar, clear clues.
- Avoid relative clauses, purpose constructions, and indirect wording.`,
  },
  medium: {
    id: "medium",
    aiContextualRatio: 0.45,
    aiGuidance: `Difficulty: Medium — natural everyday context with slightly more varied structure, still clear.
- Use EVERY provided target word as-is. Difficulty is sentence construction, not vocabulary selection.
- Target vocabulary MUST come only from the provided learner word list. Never invent a new target word.
- Everyday situations; sentence may be a bit longer than Easy but still natural.
- Some contextual understanding is required, but the answer should remain reasonably clear.
- Avoid unnecessarily complex grammar and stacked subordination.`,
    multipleChoiceGuidance: `Multiple Choice — Medium
- One distinct exercise per provided wordId with a genuinely different context each time.
- options MUST contain exactly 4 items: correctOption + 3 distractors from the learner pool.
- Natural fill-in-the-blank sentences with moderately varied structure.
- Distractors moderately plausible.
- Still only one clearly correct option.`,
    typeAnswerGuidance: `Type the Answer — Medium
- Mix direct definitions and contextual recall.
- Clues less spoon-fed than Easy, but unambiguous.
- Expected answer is the provided target word (or required form).`,
    fillBlankGuidance: `Fill in the Blank — Medium
- Natural everyday context with slightly more varied structures.
- Avoid heavy or rare grammar; keep one clear intended answer.`,
  },
  hard: {
    id: "hard",
    aiContextualRatio: 0.7,
    aiGuidance: `Difficulty: Hard — richer context, less direct clues, stronger contextual understanding.
- Use EVERY provided target word as-is. Do not swap in "harder" vocabulary.
- Target vocabulary MUST come only from the provided learner word list. Never invent a new target word.
- More complex but still natural sentence structures and plausible near-miss distractors are OK.
- Require understanding of meaning/usage, not surface recognition alone.
- Do NOT invent unrelated vocabulary or unnatural grammar just to feel hard.`,
    multipleChoiceGuidance: `Multiple Choice — Hard
- One distinct exercise per provided wordId with varied contexts.
- options MUST contain exactly 4 items: correctOption + 3 distractors from the learner pool.
- Prefer richer contextual fill-in-the-blank questions.
- Distractors may be closer in meaning or form; correct option must remain unambiguous.`,
    typeAnswerGuidance: `Type the Answer — Hard
- Prefer contextual recall over bare definitions.
- Clues should require understanding the situation.
- Expected answer is the provided target word (or required form).`,
    fillBlankGuidance: `Fill in the Blank — Hard
- Richer structure and less spoon-fed cues.
- Require meaning/usage understanding, not recognition alone.`,
  },
  intensive: {
    id: "intensive",
    aiContextualRatio: 0.85,
    aiGuidance: `Difficulty: Intensive — nuanced context and subtle clues; still natural, never artificially long or confusing.
- Use EVERY provided target word as-is. Do not swap in rarer vocabulary to fake intensity.
- Target vocabulary MUST come only from the provided learner word list. Never invent a new target word.
- Complex but natural sentences; highly plausible distractors; difficulty from reasoning/context.
- Still preserve a single clear correct answer and the taught meaning.
- Do NOT lengthen or obscure sentences just to feel harder.`,
    multipleChoiceGuidance: `Multiple Choice — Intensive
- One distinct exercise per provided wordId with varied, non-paraphrased contexts.
- options MUST contain exactly 4 items: correctOption + 3 distractors from the learner pool.
- Nuanced contextual questions and subtle semantic distinctions.
- Near-miss distractors without becoming unfair or ambiguous.`,
    typeAnswerGuidance: `Type the Answer — Intensive
- Nuanced contextual recall with indirect but unambiguous clues.
- Expected answer is the provided target word (or required form).`,
    fillBlankGuidance: `Fill in the Blank — Intensive
- Nuanced contexts and subtle distinctions around the known target word.
- Require deeper recall and precise usage without confusing wording.`,
  },
};

export function isExerciseDifficulty(value: unknown): value is ExerciseDifficulty {
  return (
    typeof value === "string" &&
    (EXERCISE_DIFFICULTIES as readonly string[]).includes(value)
  );
}

export function parseExerciseDifficulty(
  value: unknown,
  fallback: ExerciseDifficulty = DEFAULT_EXERCISE_DIFFICULTY,
): ExerciseDifficulty {
  return isExerciseDifficulty(value) ? value : fallback;
}

export function getExerciseDifficultyProfile(
  difficulty: ExerciseDifficulty,
): ExerciseDifficultyProfile {
  return EXERCISE_DIFFICULTY_PROFILES[difficulty];
}

/** How many of `total` items should use AI contextual formats. */
export function countAiContextualItems(
  total: number,
  difficulty: ExerciseDifficulty,
): number {
  if (total <= 0) return 0;
  const ratio = getExerciseDifficultyProfile(difficulty).aiContextualRatio;
  return Math.min(total, Math.max(0, Math.round(total * ratio)));
}

/** Compact payload fragment for AI generation user messages. */
export function difficultyAiPayload(difficulty: ExerciseDifficulty) {
  const profile = getExerciseDifficultyProfile(difficulty);
  return {
    exerciseDifficulty: profile.id,
    guidance: profile.aiGuidance,
    fillBlankGuidance: profile.fillBlankGuidance,
    multipleChoiceGuidance: profile.multipleChoiceGuidance,
    typeAnswerGuidance: profile.typeAnswerGuidance,
  };
}
