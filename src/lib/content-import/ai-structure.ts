import OpenAI from "openai";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import type { VocabImportDraft } from "@/lib/content-import/types";
import { MAX_VOCAB_IMPORT_ROWS } from "@/lib/content-import/types";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey, timeout: 90_000 });
}

type AiVocabItem = {
  word?: string;
  meaning?: string;
  meanings?: string[];
  partOfSpeech?: string;
  example?: string;
  examples?: string[];
  tags?: string[];
  notes?: string;
};

/**
 * Structure free-form study material into vocabulary rows.
 * Returns null when AI is unavailable so callers can fall back to heuristics.
 */
export async function structureVocabularyWithAi(
  text: string,
): Promise<VocabImportDraft[] | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const clipped = text.slice(0, 24_000);
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
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
Return JSON: { "items": [ { "word": string, "meanings": string[], "partOfSpeech"?: string, "examples"?: string[], "tags"?: string[], "notes"?: string } ] }
Rules:
- Only include clear word↔meaning pairs that appear in the material
- Do not invent words that are not present
- meanings must be non-empty
- Keep original language of the word as written
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
      const meanings =
        Array.isArray(item.meanings) && item.meanings.length > 0
          ? item.meanings.map(String).filter(Boolean)
          : item.meaning
            ? [String(item.meaning)]
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
        partOfSpeech: item.partOfSpeech
          ? String(item.partOfSpeech)
          : undefined,
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
