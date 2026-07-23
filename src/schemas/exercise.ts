import { z } from "zod";

export const exerciseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(2000).optional().default(""),
  type: z.enum([
    "QUESTIONS",
    "FILL_BLANK",
    "TRANSLATION",
    "WRITING",
    "READING",
    "GRAMMAR_DRILL",
  ]),
  /** TipTap doc (legacy) or `{ mode, version, doc | sections }` writing content. */
  content: z.record(z.string(), z.unknown()),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

export const writingQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string(),
  exampleAnswer: z.string().default(""),
  notes: z.string().default(""),
  sortOrder: z.number().int().nonnegative(),
});

export const writingSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  sortOrder: z.number().int().nonnegative(),
  questions: z.array(writingQuestionSchema).min(1),
});

export const richDocumentContentSchema = z.object({
  mode: z.literal("rich_document"),
  version: z.literal(1),
  doc: z.record(z.string(), z.unknown()),
});

export const questionSetContentSchema = z.object({
  mode: z.literal("question_set"),
  version: z.literal(1),
  sections: z.array(writingSectionSchema).min(1),
});

export const writingContentSchema = z.discriminatedUnion("mode", [
  richDocumentContentSchema,
  questionSetContentSchema,
]);
