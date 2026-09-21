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

const optionalSentenceSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable();

/** AI draft: complete sentence first; `prompt` is derived by blanking the used form. */
export const contextualMcDraftSchema = z.object({
  wordId: z.string().trim().min(1),
  type: z.literal("multiple-choice"),
  completeSentence: optionalSentenceSchema,
  prompt: optionalSentenceSchema,
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  correctOption: z.string().trim().max(200).optional().nullable(),
  baseWord: z.string().trim().max(200).optional().nullable(),
  answerForm: z.string().trim().max(200).optional().nullable(),
  sentenceMeaning: optionalTextSchema.catch(null),
});

export const contextualTypeAnswerDraftSchema = z.object({
  wordId: z.string().trim().min(1),
  type: z.literal("type-answer"),
  completeSentence: optionalSentenceSchema,
  prompt: optionalSentenceSchema,
  answer: z.string().trim().max(120).optional().nullable(),
  sentenceMeaning: optionalTextSchema.catch(null),
});

export const contextualMcExerciseSchema = z.object({
  wordId: z.string().trim().min(1),
  type: z.literal("multiple-choice"),
  prompt: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  /** Learner-facing option label — the exact form extracted from the complete sentence. */
  correctOption: z.string().trim().min(1).max(200),
  /** Dictionary / saved vocabulary form for the target word. Unchanged lemma. */
  baseWord: z.string().trim().min(1).max(200),
  /** Exact grammatical form removed from the complete sentence and shown as the answer. */
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
    .array(
      z.union([contextualMcDraftSchema, contextualTypeAnswerDraftSchema]),
    )
    .max(CONTEXTUAL_AI_BATCH)
    .catch([]),
});

export type ContextualMcDraft = z.infer<typeof contextualMcDraftSchema>;
export type ContextualTypeAnswerDraft = z.infer<
  typeof contextualTypeAnswerDraftSchema
>;
export type ContextualAiDraft = ContextualMcDraft | ContextualTypeAnswerDraft;
export type ContextualMcExercise = z.infer<typeof contextualMcExerciseSchema>;
export type ContextualTypeAnswerExercise = z.infer<
  typeof contextualTypeAnswerExerciseSchema
>;
export type ContextualAiExercise =
  | ContextualMcExercise
  | ContextualTypeAnswerExercise;
