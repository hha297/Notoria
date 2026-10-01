import { z } from "zod";
import {
  READING_EXERCISE_MODES,
  READING_SOURCE_TYPES,
} from "@/lib/reading/types";
import { WRITING_CEFR_LEVELS } from "@/lib/writing/meta";

export const readingSourceTypeSchema = z.enum(READING_SOURCE_TYPES);
export const readingExerciseModeSchema = z.enum(READING_EXERCISE_MODES);
export const readingCefrSchema = z.enum(WRITING_CEFR_LEVELS);
export const readingQuestionCountSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
]);

export const createReadingPassageSchema = z.object({
  title: z.string().trim().max(160).optional().default(""),
  body: z.string().trim().min(40).max(50_000),
  language: z.string().trim().min(2).max(16),
  sourceType: readingSourceTypeSchema.default("paste"),
  sourceFilename: z.string().trim().max(200).nullable().optional().default(null),
});

export const updateReadingPassageSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(40).max(50_000),
  language: z.string().trim().min(2).max(16),
});

export const generateReadingExercisesSchema = z.object({
  passageId: z.string().uuid(),
  exerciseMode: readingExerciseModeSchema,
  questionCount: readingQuestionCountSchema.default(5),
  questionLanguage: z.string().trim().min(2).max(16),
  difficulty: readingCefrSchema.nullable().optional().default(null),
});

/** @deprecated Prefer generateReadingExercisesSchema */
export const generateReadingSetSchema = generateReadingExercisesSchema;

export const saveReadingAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  response: z.unknown(),
});

export const saveReadingAnswersSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        response: z.unknown(),
      }),
    )
    .min(1)
    .max(40),
});

export const submitReadingAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        response: z.unknown(),
      }),
    )
    .max(40)
    .optional()
    .default([]),
});

export type CreateReadingPassageInput = z.infer<
  typeof createReadingPassageSchema
>;
export type UpdateReadingPassageInput = z.infer<
  typeof updateReadingPassageSchema
>;
export type GenerateReadingExercisesInput = z.infer<
  typeof generateReadingExercisesSchema
>;
