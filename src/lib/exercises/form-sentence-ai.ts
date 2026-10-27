import { AI_OUTPUT_TOKENS } from "@/lib/ai/bounds";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
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
  return requireOpenAiClient({ timeoutMs: 40_000 });
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
    model: "gpt-5.6-terra",
    reasoning_effort: "none",
    temperature: 0.2,
    max_completion_tokens: AI_OUTPUT_TOKENS.formSentence,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: await aiSystemPrompt(FORM_SENTENCE_EVALUATOR_PROMPT, {
          responseStyle: true,
          correctionStyle: true,
        }),
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
