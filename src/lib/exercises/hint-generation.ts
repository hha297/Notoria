/**
 * Batch AI hint enrichment for vocabulary meaning multiple-choice items.
 * Correct answers are used only server-side for generation; responses return
 * learner-facing hint strings keyed by question id — never answer metadata.
 */

import {
  AI_DEADLINES_MS,
  AI_INPUT_LIMITS,
  AI_OUTPUT_TOKENS,
  clipForAi,
  createAiDeadline,
} from "@/lib/ai/bounds";
import { mergeAbortSignals } from "@/lib/ai/cancellation";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import {
  progressiveHintPayload,
  progressiveHintPromptFor,
  resolveProgressiveHints,
  type ProgressiveHintStrategy,
} from "@/lib/exercises/progressive-hints";
import { z } from "zod";

export const VOCAB_MEANING_HINT_BATCH = 20;

const hintQuestionSchema = z.object({
  id: z.string().trim().min(1).max(200),
  direction: z.enum(["WORD_TO_MEANING", "MEANING_TO_WORD"]),
  prompt: z.string().trim().min(1).max(AI_INPUT_LIMITS.word + 400),
  options: z.array(z.string().trim().min(1).max(240)).min(2).max(6),
  /** Internal only — never echoed in the API response. */
  correctOption: z.string().trim().min(1).max(240),
  partOfSpeech: z.string().trim().max(AI_INPUT_LIMITS.partOfSpeech).nullish(),
  targetWord: z.string().trim().max(AI_INPUT_LIMITS.word).nullish(),
});

export const vocabularyMeaningHintRequestSchema = z.object({
  explanationLanguage: z.string().trim().min(1).max(64),
  difficulty: z.string().trim().max(32).nullish(),
  questions: z
    .array(hintQuestionSchema)
    .min(1)
    .max(VOCAB_MEANING_HINT_BATCH),
});

export type VocabularyMeaningHintRequest = z.infer<
  typeof vocabularyMeaningHintRequestSchema
>;

const hintResultItemSchema = z.object({
  id: z.string().trim().min(1),
  hints: z.array(z.string().trim().max(240)).max(3).catch([]),
});

const hintResultSchema = z.object({
  items: z.array(hintResultItemSchema).max(VOCAB_MEANING_HINT_BATCH).catch([]),
});

export type VocabularyMeaningHintResultItem = {
  id: string;
  hints: string[];
};

const GENERATOR_PROMPT = `You write short learning hints for vocabulary multiple-choice exercises.

${progressiveHintPromptFor("vocabulary-meaning")}

Critical style lock:
- Each hint must describe what the word is used for in real life (purpose, situation, action, role).
- Bad: "Picture the action or change this word usually describes."
- Good: "What people do with games, sports, toys, or an instrument."

Return JSON only:
{
  "items": [
    { "id": string, "hints": string[] }
  ]
}

Rules:
1. Copy each input id exactly. Return one item per input question (hints may be []).
2. Write hints in explanationLanguage only.
3. Never put correctOption, option labels, or internal reasoning in the output.
4. Never expose chain-of-thought — only the learner-facing hint string(s).`;

function getOpenAIClient() {
  return requireOpenAiClient({ timeoutMs: 45_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function sanitizeItem(
  question: VocabularyMeaningHintRequest["questions"][number],
  rawHints: readonly string[] | undefined,
  difficulty: string | null | undefined,
): VocabularyMeaningHintResultItem {
  const answers = [question.correctOption, ...question.options];
  const hints = resolveProgressiveHints({
    raw: rawHints,
    answers,
    strategy: "vocabulary-meaning" satisfies ProgressiveHintStrategy,
    difficulty,
    partOfSpeech: question.partOfSpeech,
    direction: question.direction,
  });
  return { id: question.id, hints };
}

export async function generateVocabularyMeaningHints(
  input: VocabularyMeaningHintRequest,
  options?: { signal?: AbortSignal },
): Promise<VocabularyMeaningHintResultItem[]> {
  const deadline = createAiDeadline(AI_DEADLINES_MS.default);
  const signal =
    mergeAbortSignals(options?.signal, deadline.signal) ?? deadline.signal;

  const payload = {
    ...progressiveHintPayload({
      explanationLanguage: input.explanationLanguage,
      difficulty: input.difficulty,
      strategy: "vocabulary-meaning",
    }),
    questions: input.questions.map((question) => ({
      id: question.id,
      direction: question.direction,
      prompt: clipForAi(question.prompt, AI_INPUT_LIMITS.word + 400),
      options: question.options.map((option) => clipForAi(option, 240)),
      correctOption: clipForAi(question.correctOption, 240),
      partOfSpeech: question.partOfSpeech
        ? clipForAi(question.partOfSpeech, AI_INPUT_LIMITS.partOfSpeech)
        : null,
      targetWord: question.targetWord
        ? clipForAi(question.targetWord, AI_INPUT_LIMITS.word)
        : null,
    })),
  };

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create(
      {
        model: "gpt-5.6-luna",
        reasoning_effort: "none",
        temperature: 0.6,
        max_completion_tokens: Math.min(
          AI_OUTPUT_TOKENS.exerciseHints,
          400 + input.questions.length * 80,
        ),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: await aiSystemPrompt(GENERATOR_PROMPT, {
              responseStyle: true,
            }),
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      },
      { signal },
    );

    const parsed = hintResultSchema.safeParse(
      parseJsonContent(completion.choices[0]?.message?.content),
    );
    const byId = new Map(
      (parsed.success ? parsed.data.items : []).map((item) => [
        item.id,
        item.hints,
      ]),
    );

    return input.questions.map((question) =>
      sanitizeItem(question, byId.get(question.id), input.difficulty),
    );
  } finally {
    deadline.clear();
  }
}
