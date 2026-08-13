import { z } from "zod";

export const theoryFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1).max(80),
  description: z.string().max(280).optional().default(""),
  content: z.record(z.string(), z.unknown()),
});

export type TheoryFormValues = z.infer<typeof theoryFormSchema>;
