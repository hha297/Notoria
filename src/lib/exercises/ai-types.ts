import { z } from "zod";

export const FILL_BLANK_AI_BATCH = 10;
export const FILL_BLANK_PLACEHOLDER = "________";

export const EXERCISE_AI_CEFR_LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
] as const;

export type ExerciseAiCefr = (typeof EXERCISE_AI_CEFR_LEVELS)[number];

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value?.trim() || null);

export const exerciseAiCefrSchema = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const normalized = value.replace(/^cefr-/, "");
    if (EXERCISE_AI_CEFR_LEVELS.includes(normalized as ExerciseAiCefr)) {
      return normalized as ExerciseAiCefr;
    }
    return null;
  });

export const exerciseAiWordSchema = z.object({
  id: z.string().trim().min(1).max(80),
  word: z.string().trim().min(1).max(120),
  meaning: optionalTextSchema,
  partOfSpeech: optionalTextSchema,
  topic: optionalTextSchema,
  avoidSentences: z.array(z.string().trim().min(1).max(400)).max(12).optional(),
});

export const exerciseAiRequestSchema = z.object({
  exerciseType: z.literal("fill-in-blank"),
  language: z.string().trim().min(2).max(16).optional().nullable(),
  level: exerciseAiCefrSchema,
  words: z.array(exerciseAiWordSchema).min(1).max(FILL_BLANK_AI_BATCH),
});

export type ExerciseAiWordInput = z.infer<typeof exerciseAiWordSchema>;
export type ExerciseAiRequest = z.infer<typeof exerciseAiRequestSchema>;

export const exerciseAiFillBlankSchema = z.object({
  wordId: z.string().trim().min(1).optional(),
  type: z.literal("fill-in-blank").optional(),
  sentence: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(120),
  baseWord: z.string().trim().min(1).max(120).optional(),
  language: optionalTextSchema.catch(null),
  explanation: optionalTextSchema.catch(null),
  difficulty: optionalTextSchema.catch(null),
});

export const exerciseAiResultSchema = z.object({
  exercises: z.array(exerciseAiFillBlankSchema).max(FILL_BLANK_AI_BATCH).catch([]),
});

export type ExerciseAiFillBlank = z.infer<typeof exerciseAiFillBlankSchema>;
export type ExerciseAiFillBlankDraft = Pick<
  ExerciseAiFillBlank,
  "sentence" | "answer"
> &
  Partial<Omit<ExerciseAiFillBlank, "sentence" | "answer">>;
export type ExerciseAiResult = z.infer<typeof exerciseAiResultSchema>;
