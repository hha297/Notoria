import { z } from "zod";

const confidenceSchema = z.coerce.number().transform((value) => {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.min(1, value / 100);
  if (value < 0) return 0;
  return value;
});

const optionalTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? "");

const nullableTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const text = value?.trim() ?? "";
    return text.length > 0 ? text : null;
  });

const booleanishSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return value;
}, z.boolean());

export const vocabularySpellingResultSchema = z.object({
  type: z.literal("spelling").catch("spelling"),
  original: z.string().catch(""),
  suggestion: z.union([z.string(), z.null()]).catch(null),
  isLikelyValid: booleanishSchema.catch(true),
  confidence: confidenceSchema.catch(0),
  explanation: optionalTextSchema.catch(""),
});

export const vocabularyMeaningSuggestionSchema = z.object({
  meaning: z.string().min(1),
  language: optionalTextSchema.catch(""),
  explanation: optionalTextSchema.catch(""),
});

export const vocabularyMeaningResultSchema = z.object({
  type: z.literal("meaning").catch("meaning"),
  word: z.string().catch(""),
  wordLanguage: nullableTextSchema.catch(null),
  meaning: z.string().catch(""),
  meaningLanguage: nullableTextSchema.catch(null),
  isLikelyCorrect: z
    .any()
    .optional()
    .transform((value): boolean | null | undefined => {
      if (value === null || value === "null") return null;
      if (typeof value === "boolean") return value;
      if (value === "true" || value === 1 || value === "1") return true;
      if (value === "false" || value === 0 || value === "0") return false;
      return undefined;
    }),
  originalMeaning: z.string().catch(""),
  suggestions: z
    .array(
      z.union([
        vocabularyMeaningSuggestionSchema,
        z
          .string()
          .min(1)
          .transform((meaning) => ({
            meaning,
            language: "",
            explanation: "",
          })),
      ]),
    )
    .max(3)
    .catch([]),
  confidence: confidenceSchema.catch(0),
  explanation: optionalTextSchema.catch(""),
});

export type VocabularySpellingResult = z.infer<
  typeof vocabularySpellingResultSchema
>;
export type VocabularyMeaningResult = z.infer<
  typeof vocabularyMeaningResultSchema
>;

export const vocabularySpellingInputSchema = z.object({
  word: z.string().trim().min(2).max(80),
  language: z.string().trim().min(2).max(16),
  partOfSpeech: z.string().trim().max(40).optional().nullable(),
});

export const vocabularyMeaningInputSchema = z.object({
  word: z.string().trim().min(1).max(80),
  meaning: z.string().trim().min(1).max(200),
  language: z.string().trim().min(2).max(16),
  partOfSpeech: z.string().trim().max(40).optional().nullable(),
  examples: z.array(z.string().trim().max(240)).max(6).optional(),
});

export const vocabularyNotesFormatInputSchema = z.object({
  notes: z.string().trim().min(1).max(20_000),
  word: z.string().trim().max(120).optional().nullable(),
  language: z.string().trim().min(2).max(16).optional().nullable(),
});

const notesFormatParagraphSchema = z.object({
  type: z.literal("paragraph"),
  text: z.string().catch(""),
});

const notesFormatHeadingSchema = z.object({
  type: z.literal("heading"),
  level: z.coerce.number().int().min(1).max(3).catch(2),
  text: z.string().catch(""),
});

const notesFormatListSchema = z.object({
  type: z.enum(["bulletList", "orderedList"]),
  items: z.array(z.string()).max(40).catch([]),
});

const notesFormatTableSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()).min(1).max(8),
  rows: z.array(z.array(z.string()).min(1).max(8)).min(1).max(40),
  /** Bold the first column (typical for case/label tables). */
  boldFirstColumn: z.boolean().optional().catch(true),
});

export const vocabularyNotesFormatBlockSchema = z.discriminatedUnion("type", [
  notesFormatParagraphSchema,
  notesFormatHeadingSchema,
  notesFormatListSchema,
  notesFormatTableSchema,
]);

export const vocabularyNotesFormatResultSchema = z.object({
  blocks: z.array(vocabularyNotesFormatBlockSchema).min(1).max(60),
});

export type VocabularyNotesFormatInput = z.infer<
  typeof vocabularyNotesFormatInputSchema
>;
export type VocabularyNotesFormatBlock = z.infer<
  typeof vocabularyNotesFormatBlockSchema
>;
export type VocabularyNotesFormatResult = z.infer<
  typeof vocabularyNotesFormatResultSchema
>;
