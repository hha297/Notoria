import { z } from "zod";

export const meaningSchema = z.object({
  id: z.string().optional(),
  meaning: z.string().min(1, "Meaning is required"),
  sortOrder: z.number().int().nonnegative(),
});

export const vocabularyFormSchema = z.object({
  word: z.string().min(1, "Word is required"),
  partOfSpeech: z.string().optional(),
  notes: z.string().optional(),
  meanings: z.array(meaningSchema).min(1, "Add at least one meaning"),
});

export const vocabularyFormClientSchema = vocabularyFormSchema.omit({
  meanings: true,
});

export type VocabularyFormValues = z.infer<typeof vocabularyFormSchema>;
export type MeaningFormValues = z.infer<typeof meaningSchema>;
