import OpenAI from "openai";
import { getLanguageByCode } from "@/lib/languages";
import {
  FORM_SENTENCE_EVALUATOR_PROMPT,
  formSentenceUserPayload,
} from "@/lib/exercises/form-sentence-ai-prompt";
import {
  formSentenceAiResultSchema,
  type FormSentenceAiRequest,
  type FormSentenceAiResult,
} from "@/lib/exercises/form-sentence-ai-types";

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

export async function evaluateFormSentence(
  input: FormSentenceAiRequest,
): Promise<FormSentenceAiResult> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 650,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: FORM_SENTENCE_EVALUATOR_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(
          formSentenceUserPayload({
            languageHint: languageHint(input.language),
            languageCode: input.language ?? null,
            word: input.word,
            meaning: input.meaning,
            partOfSpeech: input.partOfSpeech ?? null,
            sentence: input.sentence,
          }),
        ),
      },
    ],
  });

  const parsed = formSentenceAiResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );

  if (!parsed.success) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  return parsed.data;
}
