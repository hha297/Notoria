import { AI_INPUT_LIMITS, AI_OUTPUT_TOKENS, clipForAi } from "@/lib/ai/bounds";
import { throwIfAborted } from "@/lib/ai/cancellation";
import { runChatCompletion } from "@/lib/ai/provider-call";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import type { AppLocale } from "@/i18n/config";
import { uiLocaleEnglishName } from "@/lib/i18n/ui-locales";

function uiLanguageName(locale: AppLocale) {
  return uiLocaleEnglishName(locale);
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

/**
 * Short natural gloss of a completed practice sentence in the website UI language.
 */
export async function glossSentenceMeaning(input: {
  sentence: string;
  uiLocale: AppLocale;
  signal?: AbortSignal;
}): Promise<string> {
  throwIfAborted(input.signal);
  const sentence = clipForAi(input.sentence, AI_INPUT_LIMITS.sentenceText);
  if (!sentence) throw new Error("AI_INVALID_REQUEST");

  const uiLanguage = uiLanguageName(input.uiLocale);
  const { completion } = await runChatCompletion({
    operation: "exercise.sentence_gloss",
    feature: "ai_exercise",
    signal: input.signal,
    timeoutMs: 60_000,
    body: {
      model: "gpt-5.6-luna",
      reasoning_effort: "none",
      temperature: 0.2,
      max_completion_tokens: AI_OUTPUT_TOKENS.sentenceGloss,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: await aiSystemPrompt(
            'Return JSON only: {"sentenceMeaning": string}. sentenceMeaning is a short natural translation/gloss of the full sentence in the requested UI language. No quotes wrapping the whole string. No explanations.',
            { responseStyle: true },
          ),
        },
        {
          role: "user",
          content: JSON.stringify({
            uiLanguage,
            sentence,
            reminder: `Write sentenceMeaning in ${uiLanguage} only.`,
          }),
        },
      ],
    },
  });

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  const meaning =
    raw &&
    typeof raw === "object" &&
    "sentenceMeaning" in raw &&
    typeof (raw as { sentenceMeaning: unknown }).sentenceMeaning === "string"
      ? (raw as { sentenceMeaning: string }).sentenceMeaning.trim()
      : "";
  if (!meaning) throw new Error("AI_INVALID_RESPONSE");
  return meaning.slice(0, 400);
}

type MeaningSlot = {
  index: number;
  sentence: string;
  sentenceMeaning: string | null;
};

/**
 * Keep existing meanings; AI-fill only blanks. Never re-fetch a meaning that already exists.
 * Optional fallbackMeaning (e.g. vocabulary gloss) is used only when AI cannot produce one.
 */
export async function ensureSentenceMeanings<T>(
  items: T[],
  options: {
    uiLocale: AppLocale;
    getSentence: (item: T) => string;
    getMeaning: (item: T) => string | null | undefined;
    setMeaning: (item: T, meaning: string) => T;
    /** Reused when AI gloss is unavailable — typically vocabulary.meaning */
    getFallbackMeaning?: (item: T) => string | null | undefined;
    signal?: AbortSignal;
    workKind?: "interactive" | "background";
  },
): Promise<T[]> {
  if (items.length === 0) return items;
  throwIfAborted(options.signal);

  const slots: MeaningSlot[] = items.map((item, index) => {
    const existing = options.getMeaning(item)?.trim() || null;
    return {
      index,
      sentence: options.getSentence(item).trim(),
      sentenceMeaning: existing,
    };
  });

  const missing = slots.filter(
    (slot) => !slot.sentenceMeaning && slot.sentence,
  );
  if (missing.length > 0) {
    throwIfAborted(options.signal);
    try {
      const filled = await glossSentenceMeaningsBatch({
        uiLocale: options.uiLocale,
        sentences: missing.map((slot) => ({
          index: slot.index,
          sentence: slot.sentence,
        })),
        signal: options.signal,
        workKind: options.workKind ?? "background",
      });
      for (const [index, meaning] of filled) {
        const slot = slots[index];
        if (slot && meaning) slot.sentenceMeaning = meaning;
      }
    } catch (error) {
      throwIfAborted(options.signal);
      console.error(
        "batch sentence meaning failed",
        error instanceof Error ? error.message : "",
      );
    }
  }

  return items.map((item, index) => {
    const slot = slots[index]!;
    const fromAiOrExisting = slot.sentenceMeaning?.trim();
    if (fromAiOrExisting) {
      if (options.getMeaning(item)?.trim() === fromAiOrExisting) return item;
      return options.setMeaning(item, fromAiOrExisting);
    }
    const fallback = options.getFallbackMeaning?.(item)?.trim();
    if (fallback) return options.setMeaning(item, fallback);
    return item;
  });
}

async function glossSentenceMeaningsBatch(input: {
  uiLocale: AppLocale;
  sentences: Array<{ index: number; sentence: string }>;
  signal?: AbortSignal;
  workKind?: "interactive" | "background";
}): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (input.sentences.length === 0) return result;
  throwIfAborted(input.signal);

  const uiLanguage = uiLanguageName(input.uiLocale);
  const sentences = input.sentences.map((item) => ({
    index: item.index,
    sentence: clipForAi(item.sentence, AI_INPUT_LIMITS.sentenceText),
  }));
  const { completion } = await runChatCompletion({
    operation: "exercise.sentence_gloss_batch",
    feature: "ai_exercise",
    signal: input.signal,
    workKind: input.workKind ?? "background",
    timeoutMs: 60_000,
    body: {
      model: "gpt-5.6-luna",
      reasoning_effort: "none",
      temperature: 0.2,
      max_completion_tokens: Math.min(
        400 + sentences.length * 80,
        AI_OUTPUT_TOKENS.sentenceGlossBatch,
      ),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: await aiSystemPrompt(
            'Return JSON only: {"meanings":[{"index":number,"sentenceMeaning":string}]}. For each input index, provide a short natural translation/gloss of that full sentence in the requested UI language. Preserve every index. No markdown.',
            { responseStyle: true },
          ),
        },
        {
          role: "user",
          content: JSON.stringify({
            uiLanguage,
            sentences,
            reminder: `Write every sentenceMeaning in ${uiLanguage} only.`,
          }),
        },
      ],
    },
  });

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  const meanings =
    raw &&
    typeof raw === "object" &&
    "meanings" in raw &&
    Array.isArray((raw as { meanings: unknown }).meanings)
      ? (raw as { meanings: unknown[] }).meanings
      : [];

  for (const entry of meanings) {
    if (!entry || typeof entry !== "object") continue;
    const index = (entry as { index?: unknown }).index;
    const sentenceMeaning = (entry as { sentenceMeaning?: unknown })
      .sentenceMeaning;
    if (typeof index !== "number" || typeof sentenceMeaning !== "string")
      continue;
    const trimmed = sentenceMeaning.trim();
    if (!trimmed) continue;
    result.set(index, trimmed.slice(0, 400));
  }

  return result;
}
