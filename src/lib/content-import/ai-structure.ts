import { AI_INPUT_LIMITS, AI_OUTPUT_TOKENS, clipForAi } from "@/lib/ai/bounds";
import { createOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import type {
  VocabImportDraft,
  VocabImportMeaning,
} from "@/lib/content-import/types";
import { MAX_VOCAB_IMPORT_ROWS } from "@/lib/content-import/types";
import {
  MEANING_USAGE_IDS,
  normalizeMeaningUsageLabels,
} from "@/lib/vocabulary/meaning-usage";

function getOpenAIClient() {
  return createOpenAiClient({ timeoutMs: 90_000, requireKey: false });
}

type AiMeaningItem =
  | string
  | {
      meaning?: string;
      text?: string;
      usageLabels?: string[];
      labels?: string[];
    };

type AiVocabItem = {
  word?: string;
  meaning?: string;
  meanings?: AiMeaningItem[];
  partOfSpeech?: string;
  example?: string;
  examples?: string[];
  tags?: string[];
  notes?: string;
};

function parseAiMeaning(raw: AiMeaningItem): VocabImportMeaning | null {
  if (typeof raw === "string") {
    const meaning = raw.trim();
    return meaning ? { meaning, usageLabels: [] } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const meaning = String(raw.meaning ?? raw.text ?? "").trim();
  if (!meaning) return null;
  const usageLabels = normalizeMeaningUsageLabels(
    raw.usageLabels ?? raw.labels ?? [],
  );
  return { meaning, usageLabels };
}

/**
 * Structure free-form study material into vocabulary rows.
 * Returns null when AI is unavailable so callers can fall back to heuristics.
 */
export async function structureVocabularyWithAi(
  text: string,
): Promise<VocabImportDraft[] | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const clipped = clipForAi(text, AI_INPUT_LIMITS.contentImport);
  const usageIdList = MEANING_USAGE_IDS.join(", ");
  const response = await client.chat.completions.create({
    model: "gpt-5.6-luna",
    reasoning_effort: "none",
    temperature: 0.1,
    max_completion_tokens: AI_OUTPUT_TOKENS.contentImport,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: await aiSystemPrompt(
          "Extract vocabulary study items from messy notes, worksheets, or lists. Return JSON only.",
        ),
      },
      {
        role: "user",
        content: `Extract vocabulary items from the material below.
Return JSON: {
  "items": [
    {
      "word": string,
      "meanings": [
        { "meaning": string, "usageLabels"?: string[] }
      ],
      "partOfSpeech"?: string,
      "examples"?: string[],
      "tags"?: string[],
      "notes"?: string
    }
  ]
}
Rules:
- Only include clear word↔meaning pairs that appear in the material
- Do not invent words that are not present
- meanings must be non-empty
- Keep original language of the word as written
- usageLabels are OPTIONAL per meaning. Use only these stable ids when clearly supported by the source: ${usageIdList}
- Label only the relevant meaning; omit uncertain labels; do not copy word-level tags onto every meaning
- Empty / omitted usageLabels means unspecified usage (not “standard”)
- Max ${MAX_VOCAB_IMPORT_ROWS} items

MATERIAL:
${clipped}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { items?: AiVocabItem[] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.slice(0, MAX_VOCAB_IMPORT_ROWS).map((item, index) => {
      const meaningsFromArray =
        Array.isArray(item.meanings) && item.meanings.length > 0
          ? item.meanings
              .map(parseAiMeaning)
              .filter((m): m is VocabImportMeaning => m !== null)
          : [];
      const meanings =
        meaningsFromArray.length > 0
          ? meaningsFromArray
          : item.meaning
            ? [
                { meaning: String(item.meaning).trim(), usageLabels: [] },
              ].filter((m) => m.meaning)
            : [];
      const examples =
        Array.isArray(item.examples) && item.examples.length > 0
          ? item.examples.map(String).filter(Boolean)
          : item.example
            ? [String(item.example)]
            : [];
      const word = String(item.word ?? "").trim();
      const issues = [];
      if (!word) {
        issues.push({
          code: "MISSING_WORD" as const,
          rowIndex: index,
          message:
            "We couldn't find a word in this item. Skip it or fix it before importing.",
        });
      }
      if (meanings.length === 0) {
        issues.push({
          code: "MISSING_MEANING" as const,
          rowIndex: index,
          message:
            "We couldn't find a meaning in this item. Skip it or fix it before importing.",
        });
      }
      return {
        word,
        meanings,
        partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech) : undefined,
        examples,
        tags: Array.isArray(item.tags)
          ? item.tags.map(String).filter(Boolean)
          : [],
        notes: item.notes ? String(item.notes) : undefined,
        rowIndex: index,
        status: (issues.length > 0 ? "issue" : "ready") as "ready" | "issue",
        issues,
      };
    });
  } catch {
    return null;
  }
}
