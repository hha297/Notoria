import { z } from "zod";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import { MAX_PRIMARY_MEANINGS } from "@/lib/vocabulary/primary-meanings";

export const meaningSchema = z.object({
  id: z.string().optional(),
  meaning: z.string().min(1, "Meaning is required"),
  isPrimary: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
});

export const exampleSchema = z.object({
  id: z.string().optional(),
  sentence: z.string().min(1, "Example is required"),
  meaning: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  sortOrder: z.number().int().nonnegative(),
});

export const vocabularyFormSchema = z
  .object({
    word: z.string().min(1, "Word is required"),
    partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
    synonyms: z.string().optional(),
    notes: z.string().optional(),
    meanings: z.array(meaningSchema).min(1, "Add at least one meaning"),
    examples: z.array(exampleSchema).default([]),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const primaryCount = data.meanings.filter((item) => item.isPrimary).length;
    if (primaryCount < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["meanings"],
        message: "PRIMARY_MEANING_REQUIRED",
      });
    }
    if (primaryCount > MAX_PRIMARY_MEANINGS) {
      ctx.addIssue({
        code: "custom",
        path: ["meanings"],
        message: "PRIMARY_MEANING_LIMIT",
      });
    }
  });

export const vocabularyFormClientSchema = z.object({
  word: z.string().min(1, "Word is required"),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  synonyms: z.string().optional(),
  notes: z.string().optional(),
});

export type VocabularyFormValues = z.infer<typeof vocabularyFormSchema>;
export type MeaningFormValues = z.infer<typeof meaningSchema>;
export type ExampleFormValues = z.infer<typeof exampleSchema>;
