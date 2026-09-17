import { z } from "zod";
import { locales } from "@/i18n/config";

export const CONTEXTUAL_AI_BATCH = 10;
export const CONTEXTUAL_BLANK = "________";
/** Max learner words sent per item as MC distractor candidates. */
export const CONTEXTUAL_DISTRACTOR_POOL_MAX = 80;

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value?.trim() || null);

export const contextualAiWordSchema = z.object({
  id: z.string().trim().min(1).max(80),
  word: z.string().trim().min(1).max(120),
  meaning: optionalTextSchema,
  partOfSpeech: optionalTextSchema,
  /** Other learner words usable as MC distractors. */
  distractorPool: z
    .array(z.string().trim().min(1).max(120))
    .max(CONTEXTUAL_DISTRACTOR_POOL_MAX)
    .optional(),
});

export const contextualAiRequestSchema = z.object({
  exerciseType: z.enum(["multiple-choice", "type-answer"]),
  language: z
    .string()
    .trim()
    .max(16)
    .optional()
    .nullable()
    .transform((value) => {
      if (!value || value.length < 2) return null;
      return value;
    }),
  difficulty: z.enum(["easy", "medium", "hard", "intensive"]),
  words: z.array(contextualAiWordSchema).min(1).max(CONTEXTUAL_AI_BATCH),
  uiLocale: z.enum(locales).optional(),
});

export type ContextualAiWordInput = z.infer<typeof contextualAiWordSchema>;
export type ContextualAiRequest = z.infer<typeof contextualAiRequestSchema>;

export const contextualMcExerciseSchema = z.object({
  wordId: z.string().trim().min(1),
  type: z.literal("multiple-choice"),
  prompt: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  /** Learner-facing option label — usually the vocabulary base form. */
  correctOption: z.string().trim().min(1).max(200),
  /** Dictionary / saved vocabulary form for the target word. */
  baseWord: z.string().trim().min(1).max(200),
  /** Exact grammatical form that fills the blank in `prompt`. */
  answerForm: z.string().trim().min(1).max(200),
  sentenceMeaning: optionalTextSchema.catch(null),
});

export const contextualTypeAnswerExerciseSchema = z.object({
  wordId: z.string().trim().min(1),
  type: z.literal("type-answer"),
  prompt: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(120),
  sentenceMeaning: optionalTextSchema.catch(null),
});

export const contextualAiResultSchema = z.object({
  exercises: z
    .array(z.union([contextualMcExerciseSchema, contextualTypeAnswerExerciseSchema]))
    .max(CONTEXTUAL_AI_BATCH)
    .catch([]),
});

export type ContextualMcExercise = z.infer<typeof contextualMcExerciseSchema>;
export type ContextualTypeAnswerExercise = z.infer<
  typeof contextualTypeAnswerExerciseSchema
>;
export type ContextualAiExercise =
  | ContextualMcExercise
  | ContextualTypeAnswerExercise;
