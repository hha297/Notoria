import OpenAI from "openai";
import { getLanguageByCode } from "@/lib/languages";
import { FILL_BLANK_GENERATOR_PROMPT, fillBlankUserPayload } from "@/lib/exercises/ai-prompt";
import {
  FILL_BLANK_AI_BATCH,
  exerciseAiResultSchema,
  type ExerciseAiFillBlank,
  type ExerciseAiRequest,
  type ExerciseAiWordInput,
} from "@/lib/exercises/ai-types";
import { selectValidFillBlankExercises } from "@/lib/exercises/ai-validate";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 40_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function languageHint(code: string | null | undefined) {
  if (!code) return null;
  return getLanguageByCode(code)?.name ?? code;
}

function unusedWordSlots(
  requested: ExerciseAiWordInput[],
  valid: ExerciseAiFillBlank[],
) {
  const leftover = [...requested];
  for (const exercise of valid) {
    const index = leftover.findIndex((word) => word.id === exercise.wordId);
    if (index >= 0) leftover.splice(index, 1);
  }
  return leftover;
}

function mergeValidExercises(
  current: ExerciseAiFillBlank[],
  extra: ExerciseAiFillBlank[],
) {
  const seen = new Set(
    current.map((exercise) => exercise.sentence.replace(/\s+/g, " ").trim().toLowerCase()),
  );
  const merged = [...current];

  for (const exercise of extra) {
    const key = exercise.sentence.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(exercise);
    if (merged.length >= FILL_BLANK_AI_BATCH) break;
  }

  return merged;
}

export async function generateFillBlankExercises(
  input: ExerciseAiRequest,
): Promise<ExerciseAiFillBlank[]> {
  const client = getOpenAIClient();

  async function requestBatch(words: ExerciseAiWordInput[]) {
    if (words.length === 0) return [];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: FILL_BLANK_GENERATOR_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(
            fillBlankUserPayload({
              languageHint: languageHint(input.language),
              languageCode: input.language ?? null,
              level: input.level,
              words,
            }),
          ),
        },
      ],
    });

    const parsed = exerciseAiResultSchema.safeParse(
      parseJsonContent(completion.choices[0]?.message?.content),
    );

    if (!parsed.success) {
      console.error(
        "exercise AI parse failed",
        parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
      );
      throw new Error("AI_INVALID_RESPONSE");
    }

    return selectValidFillBlankExercises(parsed.data.exercises, words);
  }

  let valid = await requestBatch(input.words);
  const missing = unusedWordSlots(input.words, valid);

  if (missing.length > 0) {
    try {
      const extra = await requestBatch(missing);
      valid = mergeValidExercises(valid, extra);
    } catch (error) {
      console.error(
        "exercise AI retry failed",
        error instanceof Error ? error.message : "",
      );
    }
  }

  if (valid.length === 0) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  return valid.slice(0, FILL_BLANK_AI_BATCH);
}
