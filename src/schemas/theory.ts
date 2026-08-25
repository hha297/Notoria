import { z } from "zod";

/** Library-card summary; list UI still truncates for display. */
export const THEORY_DESCRIPTION_MAX = 2000;

export const theoryFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1).max(80),
  description: z
    .string()
    .max(THEORY_DESCRIPTION_MAX)
    .optional()
    .default(""),
  content: z.record(z.string(), z.unknown()),
});

export type TheoryFormValues = z.infer<typeof theoryFormSchema>;

export type TheoryFormErrorCode =
  | "TITLE_REQUIRED"
  | "DESCRIPTION_TOO_LONG"
  | "CATEGORY_INVALID"
  | "VALIDATION_FAILED";

export function theoryFormErrorCode(
  error: z.ZodError,
): TheoryFormErrorCode {
  const issue = error.issues[0];
  if (!issue) return "VALIDATION_FAILED";

  if (issue.path[0] === "title") return "TITLE_REQUIRED";
  if (issue.path[0] === "description") return "DESCRIPTION_TOO_LONG";
  if (issue.path[0] === "category") return "CATEGORY_INVALID";
  return "VALIDATION_FAILED";
}
