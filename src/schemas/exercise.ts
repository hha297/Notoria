import { z } from "zod";

export const exerciseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    "QUESTIONS",
    "FILL_BLANK",
    "TRANSLATION",
    "WRITING",
    "READING",
    "GRAMMAR_DRILL",
  ]),
  content: z.record(z.string(), z.unknown()),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
