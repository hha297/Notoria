import { z } from "zod";

export const FORM_SENTENCE_MAX_LENGTH = 500;

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value?.trim() || null);

export const formSentenceAiRequestSchema = z.object({
  wordId: z.string().trim().min(1).max(80),
  word: z.string().trim().min(1).max(120),
  meaning: z.string().trim().min(1).max(400),
  sentence: z.string().trim().min(1).max(FORM_SENTENCE_MAX_LENGTH),
  language: z.string().trim().min(2).max(16).optional().nullable(),
  partOfSpeech: optionalTextSchema,
});

export type FormSentenceAiRequest = z.infer<typeof formSentenceAiRequestSchema>;

export const formSentenceAiResultSchema = z.object({
  isCorrect: z.boolean(),
  grammarExplanation: optionalTextSchema.catch(null),
  correctedSentence: optionalTextSchema.catch(null),
  betterSuggestion: optionalTextSchema.catch(null),
  /** Translation / gloss of the sentence (prefer corrected when provided). */
  sentenceMeaning: optionalTextSchema.catch(null),
});

export type FormSentenceAiResult = z.infer<typeof formSentenceAiResultSchema>;
