import { z } from "zod";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
} from "@/lib/writing/meta";
import { countBlanks } from "@/lib/listening/utils";
import { LISTENING_PRACTICE_TYPES } from "@/lib/listening/types";

export const listeningCefrSchema = z.enum(WRITING_CEFR_LEVELS);
export const listeningFormalitySchema = z.enum(WRITING_FORMALITY);
export const listeningPracticeTypeSchema = z.enum(LISTENING_PRACTICE_TYPES);

export const listeningUploadMetaSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  cefrLevel: listeningCefrSchema.nullable().optional().default(null),
  topic: z.string().trim().max(80).nullable().optional().default(null),
  formality: listeningFormalitySchema.nullable().optional().default(null),
});

export type ListeningUploadMeta = z.infer<typeof listeningUploadMetaSchema>;

const generatedMetaSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  cefrLevel: z.string().trim().nullable().optional(),
  topic: z.string().trim().max(80).nullable().optional(),
  formality: z.string().trim().nullable().optional(),
});

export const generatedFillBlankQuestionSchema = z
  .object({
    speaker: z.string().trim().min(1).max(80).nullish(),
    sentenceWithBlanks: z.string().trim().min(1).max(400),
    blanks: z.array(z.string().trim().min(1).max(80)).min(1).max(4),
  })
  .refine(
    (value) => countBlanks(value.sentenceWithBlanks) === value.blanks.length,
    { message: "BLANK_COUNT_MISMATCH" },
  );

export const generatedFillBlankSetSchema = generatedMetaSchema.extend({
  type: z.string().optional(),
  questions: z.array(generatedFillBlankQuestionSchema).min(1).max(60),
});

export const generatedMultipleChoiceQuestionSchema = z
  .object({
    question: z.string().trim().min(1).max(400),
    options: z.array(z.string().trim().min(1).max(160)).length(4),
    correctAnswer: z.string().trim().min(1).max(160),
  })
  .refine((value) => {
    const unique = new Set(value.options.map((option) => option.toLocaleLowerCase()));
    return unique.size === value.options.length;
  }, { message: "DUPLICATE_OPTIONS" })
  .refine(
    (value) =>
      value.options.some(
        (option) =>
          option.toLocaleLowerCase() === value.correctAnswer.toLocaleLowerCase(),
      ),
    { message: "CORRECT_ANSWER_MISSING" },
  );

export const generatedMultipleChoiceSetSchema = generatedMetaSchema.extend({
  type: z.string().optional(),
  questions: z.array(generatedMultipleChoiceQuestionSchema).min(1).max(60),
});

export const fillBlankDataSchema = z.object({
  originalText: z.string().min(1).optional(),
  displayText: z.string().min(1).optional(),
  sentenceWithBlanks: z.string().min(1).optional(),
  speaker: z.string().min(1).max(80).nullish(),
});

export const multipleChoiceDataSchema = z.object({
  options: z.array(z.string().min(1)).min(2).max(6),
  uiLocale: z.string().min(2).max(8).optional(),
});

export const storedListeningExerciseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("FILL_BLANK"),
    question: z.string().min(1),
    data: fillBlankDataSchema,
    correctAnswer: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("MULTIPLE_CHOICE"),
    question: z.string().min(1),
    data: multipleChoiceDataSchema,
    correctAnswer: z.string().min(1),
  }),
]);

export type StoredListeningExercise = z.infer<
  typeof storedListeningExerciseSchema
>;
