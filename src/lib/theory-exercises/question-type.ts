import { z } from "zod";

export const theoryQuestionTypeSchema = z.enum([
  "fill_blank",
  "multiple_choice",
]);

export type TheoryQuestionType = z.infer<typeof theoryQuestionTypeSchema>;

export const DEFAULT_THEORY_QUESTION_TYPE: TheoryQuestionType = "fill_blank";

export function resolveTheoryQuestionType(value: unknown): TheoryQuestionType {
  const parsed = theoryQuestionTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEORY_QUESTION_TYPE;
}
