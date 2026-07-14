import { z } from "zod";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";

export const meaningSchema = z.object({
  id: z.string().optional(),
  meaning: z.string().min(1, "Meaning is required"),
  sortOrder: z.number().int().nonnegative(),
});

export const exampleSchema = z.object({
  id: z.string().optional(),
  sentence: z.string().min(1, "Example is required"),
  sortOrder: z.number().int().nonnegative(),
});

export const vocabularyFormSchema = z.object({
  word: z.string().min(1, "Word is required"),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  notes: z.string().optional(),
  meanings: z.array(meaningSchema).min(1, "Add at least one meaning"),
  examples: z.array(exampleSchema).default([]),
  tags: z.array(z.string()).default([]),
});

export const vocabularyFormClientSchema = vocabularyFormSchema.omit({
  meanings: true,
  examples: true,
  tags: true,
});

export type VocabularyFormValues = z.infer<typeof vocabularyFormSchema>;
export type MeaningFormValues = z.infer<typeof meaningSchema>;
export type ExampleFormValues = z.infer<typeof exampleSchema>;
