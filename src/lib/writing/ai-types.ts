import { z } from "zod";

export const WRITING_AI_ACTIONS = [
  "check",
  "correct",
  "improve",
  "vocabulary",
  "continue",
] as const;

export type WritingAiAction = (typeof WRITING_AI_ACTIONS)[number];

export const WRITING_AI_TYPES = [
  "grammar",
  "spelling",
  "vocabulary",
  "style",
  "clarity",
] as const;

export const WRITING_AI_SEVERITIES = ["error", "suggestion"] as const;

const confidenceSchema = z.coerce.number().transform((value) => {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.min(1, value / 100);
  if (value < 0) return 0;
  return value;
});

const optionalTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? "");

export const writingAiSuggestionSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(WRITING_AI_TYPES).catch("grammar"),
  severity: z.enum(WRITING_AI_SEVERITIES).catch("suggestion"),
  original: z.string().min(1),
  replacement: z.string().min(1),
  explanation: optionalTextSchema.catch(""),
  confidence: confidenceSchema.catch(0),
});

export const writingAiResultSchema = z.object({
  language: optionalTextSchema.catch(""),
  continuation: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((value) => value?.trim() || null),
  suggestions: z.array(writingAiSuggestionSchema).max(12).catch([]),
});

export type WritingAiSuggestion = z.infer<typeof writingAiSuggestionSchema>;
export type WritingAiResult = z.infer<typeof writingAiResultSchema>;

export const writingAiRequestSchema = z.object({
  action: z.enum(WRITING_AI_ACTIONS),
  content: z.string().trim().min(1).max(12_000),
  selectedText: z.string().trim().max(4_000).optional().nullable(),
  language: z.string().trim().min(2).max(16).optional().nullable(),
  level: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      const normalized = value.replace(/^cefr-/, "");
      if (["a1", "a2", "b1", "b2", "c1", "c2"].includes(normalized)) {
        return normalized;
      }
      return null;
    }),
  topic: z.string().trim().max(80).optional().nullable(),
  formality: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      if (["formal", "informal", "neutral"].includes(value)) return value;
      return null;
    }),
  title: z.string().trim().max(200).optional().nullable(),
});

export type WritingAiRequest = z.infer<typeof writingAiRequestSchema>;
