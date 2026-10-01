import OpenAI from "openai";
import { z } from "zod";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { ReadingError, toReadingError } from "@/lib/reading/errors";
import type {
  ReadingExerciseMode,
  ReadingQuestionType,
} from "@/lib/reading/types";
import {
  findExcerptOffsets,
  questionTypesForMode,
} from "@/lib/reading/utils";
import { WRITING_CEFR_LEVELS } from "@/lib/writing/meta";

const generatedQuestionSchema = z.object({
  type: z.enum([
    "multiple_choice",
    "written",
    "true_false_not_stated",
  ]),
  prompt: z.string().trim().min(1).max(800),
  options: z.array(z.string().trim().min(1).max(240)).min(2).max(6).optional(),
  correctAnswer: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ value: z.string() }),
  ]),
  keyPoints: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
  explanation: z.string().trim().max(800).optional().nullable(),
  excerpt: z.string().trim().max(600).optional().nullable(),
});

const generatedSetSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(20),
});

export type GeneratedReadingQuestion = {
  type: ReadingQuestionType;
  prompt: string;
  options: string[] | null;
  correctAnswer: unknown;
  keyPoints: string[] | null;
  explanation: string | null;
  excerpt: string | null;
  excerptStart: number | null;
  excerptEnd: number | null;
  sortOrder: number;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ReadingError("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 90_000 });
}

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new ReadingError("VALIDATION_FAILED");
  }
}

function unwrapQuestions(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  if (Array.isArray(record.questions)) return raw;
  for (const value of Object.values(record)) {
    if (
      value &&
      typeof value === "object" &&
      Array.isArray((value as { questions?: unknown }).questions)
    ) {
      return value;
    }
  }
  return raw;
}

function normalizeCorrectAnswer(
  type: ReadingQuestionType,
  value: unknown,
  options: string[] | null,
): unknown {
  if (type === "true_false_not_stated") {
    const raw =
      typeof value === "object" && value && "value" in value
        ? String((value as { value: unknown }).value)
        : String(value ?? "");
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (
      normalized === "true" ||
      normalized === "false" ||
      normalized === "not_stated" ||
      normalized === "not-stated" ||
      normalized === "not stated"
    ) {
      return normalized === "not-stated" || normalized === "not stated"
        ? "not_stated"
        : normalized === "true" || normalized === "false"
          ? normalized
          : "not_stated";
    }
    return "not_stated";
  }

  if (type === "multiple_choice") {
    if (typeof value === "number" && options?.[value]) {
      return options[value];
    }
    const asString =
      typeof value === "object" && value && "value" in value
        ? String((value as { value: unknown }).value)
        : String(value ?? "");
    const match = options?.find(
      (option) =>
        option.trim().toLocaleLowerCase() === asString.trim().toLocaleLowerCase(),
    );
    return match ?? asString.trim();
  }

  if (typeof value === "object" && value && "value" in value) {
    return String((value as { value: unknown }).value).trim();
  }
  return String(value ?? "").trim();
}

function coerceQuestion(
  draft: z.infer<typeof generatedQuestionSchema>,
  allowedTypes: ReadingQuestionType[],
  passageBody: string,
  index: number,
): GeneratedReadingQuestion | null {
  if (!allowedTypes.includes(draft.type)) return null;

  const options =
    draft.type === "multiple_choice"
      ? (draft.options ?? [])
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 4)
      : draft.type === "true_false_not_stated"
        ? ["true", "false", "not_stated"]
        : null;

  if (draft.type === "multiple_choice" && (!options || options.length < 2)) {
    return null;
  }

  const correctAnswer = normalizeCorrectAnswer(
    draft.type,
    draft.correctAnswer,
    options,
  );
  if (!correctAnswer) return null;

  if (
    draft.type === "multiple_choice" &&
    options &&
    !options.some(
      (option) =>
        option.trim().toLocaleLowerCase() ===
        String(correctAnswer).trim().toLocaleLowerCase(),
    )
  ) {
    return null;
  }

  const excerpt = draft.excerpt?.trim() || null;
  const offsets = findExcerptOffsets(passageBody, excerpt);

  return {
    type: draft.type,
    prompt: draft.prompt.trim(),
    options,
    correctAnswer,
    keyPoints:
      draft.type === "written"
        ? (draft.keyPoints ?? [])
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 6)
        : null,
    explanation: draft.explanation?.trim() || null,
    excerpt,
    excerptStart: offsets.start,
    excerptEnd: offsets.end,
    sortOrder: index,
  };
}

const SYSTEM_PROMPT = `You create reading comprehension exercises from a passage.

Return JSON only:
{
  "questions": [
    {
      "type": "multiple_choice" | "written" | "true_false_not_stated",
      "prompt": string,
      "options": string[] (required for multiple_choice; omit otherwise),
      "correctAnswer": string (for TFNS use exactly "true" | "false" | "not_stated"),
      "keyPoints": string[] (required for written; 2-5 grading points),
      "explanation": string,
      "excerpt": string | null (short supporting span copied from the passage when possible)
    }
  ]
}

Rules:
- Ground every question in the passage. Do not invent facts not supported by the text.
- For true_false_not_stated: "not_stated" means the passage neither confirms nor denies the claim.
- For multiple_choice: exactly 4 options, one correct, plausible distractors.
- For written: open response; include keyPoints a grader can check.
- Match requested question types and count as closely as possible.
- Write prompts in questionLanguage.
- Keep CEFR difficulty appropriate when provided.
- Prefer diverse coverage across the passage.`;

export async function generateReadingQuestions(input: {
  title: string;
  body: string;
  passageLanguage: string;
  questionLanguage: string;
  exerciseMode: ReadingExerciseMode;
  questionCount: number;
  difficulty?: string | null;
}): Promise<GeneratedReadingQuestion[]> {
  const allowedTypes = questionTypesForMode(input.exerciseMode);
  const count = Math.min(20, Math.max(1, input.questionCount));
  const difficulty =
    input.difficulty &&
    (WRITING_CEFR_LEVELS as readonly string[]).includes(input.difficulty)
      ? input.difficulty
      : null;

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 6_000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: await aiSystemPrompt(SYSTEM_PROMPT, {
            responseStyle: true,
          }),
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            passageLanguage: input.passageLanguage,
            questionLanguage: input.questionLanguage,
            exerciseMode: input.exerciseMode,
            allowedTypes,
            questionCount: count,
            difficulty,
            passage: input.body.slice(0, 18_000),
          }),
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
      throw new ReadingError("GENERATION_FAILED");
    }

    const parsed = generatedSetSchema.safeParse(
      unwrapQuestions(parseJsonObject(rawText)),
    );
    if (!parsed.success) {
      throw new ReadingError("VALIDATION_FAILED");
    }

    const questions = parsed.data.questions
      .map((draft, index) =>
        coerceQuestion(draft, allowedTypes, input.body, index),
      )
      .filter((item): item is GeneratedReadingQuestion => Boolean(item))
      .slice(0, count);

    if (questions.length === 0) {
      throw new ReadingError("VALIDATION_FAILED");
    }

    return questions.map((question, index) => ({
      ...question,
      sortOrder: index,
    }));
  } catch (error) {
    throw toReadingError(error);
  }
}
