import OpenAI from "openai";
import {
  MEANING_GLOSS_PROMPT,
  MEANING_VALIDATOR_PROMPT,
  buildMeaningValidationPayload,
  learningLanguageHint,
} from "@/lib/vocabulary/ai-meaning-contract";
import { sanitizeMeaningSuggestions } from "@/lib/vocabulary/ai-sanitize";
import {
  vocabularyMeaningResultSchema,
  vocabularySpellingResultSchema,
  type VocabularyMeaningResult,
  type VocabularySpellingResult,
} from "@/lib/vocabulary/ai-types";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 8_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

export async function analyzeVocabularySpelling(input: {
  word: string;
  language: string;
  partOfSpeech?: string | null;
}): Promise<VocabularySpellingResult> {
  const client = getOpenAIClient();
  const languageHint = learningLanguageHint(input.language);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 160,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a multilingual vocabulary-learning assistant for Notoria.

Judge only the WORD string. This is a spelling check of the word the learner is studying.

CRITICAL DIRECTION RULE:
Correct the WORD itself. Do not reconstruct the word by translating a meaning.
Do not search for a word that could produce a meaning.

A learningLanguageHint may be provided as context only. Detect the word's language yourself. Do not assume any particular language.

If it appears to contain a typo or an incorrect form, suggest the single most likely intended word in the same language as the input.
If the input is already valid in any language, do not invent a correction.
If uncertain, return low confidence and suggestion null rather than a confident correction.

Never claim certainty you do not have.
Never automatically replace the learner's word.
Return JSON only with this shape:
{
  "type": "spelling",
  "original": string,
  "suggestion": string | null,
  "isLikelyValid": boolean,
  "confidence": number,
  "explanation": string
}

Rules:
- suggestion must be null when isLikelyValid is true.
- suggestion must be a corrected spelling of the same word, not a translation or related word.
- explanation should be short, gentle, and suitable to show as "Did you mean ...?"
- Do not include markdown.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          word: input.word,
          learningLanguageCode: input.language,
          learningLanguageHint: languageHint,
          partOfSpeech: input.partOfSpeech || null,
        }),
      },
    ],
  });

  const parsed = vocabularySpellingResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );

  if (!parsed.success) {
    console.error(
      "vocabulary spelling AI parse failed",
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
    throw new Error("AI_INVALID_RESPONSE");
  }

  return parsed.data;
}

async function completeMeaningJson(system: string, payload: unknown) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 280,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  const parsed = vocabularyMeaningResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );

  if (!parsed.success) {
    console.error(
      "vocabulary meaning AI parse failed",
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
    throw new Error("AI_INVALID_RESPONSE");
  }

  return parsed.data;
}

async function suggestMeaningGlosses(input: {
  word: string;
  meaning: string;
  language: string;
  partOfSpeech?: string | null;
  wordLanguage?: string | null;
  meaningLanguage?: string | null;
}): Promise<VocabularyMeaningResult["suggestions"]> {
  const result = await completeMeaningJson(
    MEANING_GLOSS_PROMPT,
    {
      word: input.word,
      currentMeaning: input.meaning,
      detectedWordLanguage: input.wordLanguage,
      detectedMeaningLanguage: input.meaningLanguage,
      learningLanguageCode: input.language,
      learningLanguageHint: learningLanguageHint(input.language),
      partOfSpeech: input.partOfSpeech || null,
    },
  );

  return sanitizeMeaningSuggestions(
    input.word,
    input.meaning,
    result.suggestions,
    {
      wordLanguage: input.wordLanguage ?? result.wordLanguage,
      meaningLanguage: input.meaningLanguage ?? result.meaningLanguage,
    },
  );
}

export async function analyzeVocabularyMeaning(input: {
  word: string;
  meaning: string;
  language: string;
  partOfSpeech?: string | null;
  examples?: string[];
}): Promise<VocabularyMeaningResult> {
  const parsed = await completeMeaningJson(
    MEANING_VALIDATOR_PROMPT,
    buildMeaningValidationPayload(input),
  );

  const languages = {
    wordLanguage: parsed.wordLanguage,
    meaningLanguage: parsed.meaningLanguage,
  };

  let suggestions = sanitizeMeaningSuggestions(
    input.word,
    input.meaning,
    parsed.suggestions,
    languages,
  );

  const isLikelyCorrect =
    parsed.isLikelyCorrect === undefined
      ? suggestions.length > 0
        ? false
        : null
      : parsed.isLikelyCorrect;

  if (isLikelyCorrect === false && suggestions.length === 0) {
    try {
      suggestions = await suggestMeaningGlosses({
        ...input,
        ...languages,
      });
    } catch {
      suggestions = [];
    }
  }

  return {
    ...parsed,
    word: parsed.word || input.word,
    meaning: parsed.meaning || input.meaning,
    originalMeaning: parsed.originalMeaning || input.meaning,
    suggestions,
    isLikelyCorrect,
  };
}
