import OpenAI from "openai";
import type { AppLocale } from "@/i18n/config";

const UI_LANGUAGE_NAMES: Record<AppLocale, string> = {
  en: "English",
  fi: "Finnish",
  vi: "Vietnamese",
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 60_000 });
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
}): Promise<string> {
  const sentence = input.sentence.trim();
  if (!sentence) throw new Error("AI_INVALID_REQUEST");

  const uiLanguage = UI_LANGUAGE_NAMES[input.uiLocale];
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Return JSON only: {"sentenceMeaning": string}. sentenceMeaning is a short natural translation/gloss of the full sentence in the requested UI language. No quotes wrapping the whole string. No explanations.',
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
  },
): Promise<T[]> {
  if (items.length === 0) return items;

  const slots: MeaningSlot[] = items.map((item, index) => {
    const existing = options.getMeaning(item)?.trim() || null;
    return {
      index,
      sentence: options.getSentence(item).trim(),
      sentenceMeaning: existing,
    };
  });

  const missing = slots.filter((slot) => !slot.sentenceMeaning && slot.sentence);
  if (missing.length > 0) {
    try {
      const filled = await glossSentenceMeaningsBatch({
        uiLocale: options.uiLocale,
        sentences: missing.map((slot) => ({
          index: slot.index,
          sentence: slot.sentence,
        })),
      });
      for (const [index, meaning] of filled) {
        const slot = slots[index];
        if (slot && meaning) slot.sentenceMeaning = meaning;
      }
    } catch (error) {
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
}): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (input.sentences.length === 0) return result;

  const uiLanguage = UI_LANGUAGE_NAMES[input.uiLocale];
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: Math.min(400 + input.sentences.length * 80, 4_000),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Return JSON only: {"meanings":[{"index":number,"sentenceMeaning":string}]}. For each input index, provide a short natural translation/gloss of that full sentence in the requested UI language. Preserve every index. No markdown.',
      },
      {
        role: "user",
        content: JSON.stringify({
          uiLanguage,
          sentences: input.sentences,
          reminder: `Write every sentenceMeaning in ${uiLanguage} only.`,
        }),
      },
    ],
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
    const sentenceMeaning = (entry as { sentenceMeaning?: unknown }).sentenceMeaning;
    if (typeof index !== "number" || typeof sentenceMeaning !== "string") continue;
    const trimmed = sentenceMeaning.trim();
    if (!trimmed) continue;
    result.set(index, trimmed.slice(0, 400));
  }

  return result;
}
