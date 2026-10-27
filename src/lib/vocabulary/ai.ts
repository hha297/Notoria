import { AI_OUTPUT_TOKENS, vocabularyAiFields } from "@/lib/ai/bounds";
import { throwIfAborted } from "@/lib/ai/cancellation";
import { runChatCompletion } from "@/lib/ai/provider-call";
import {
  AI_PROMPT_VERSIONS,
  buildAiResultCacheKey,
  fingerprintAiContent,
  getCachedAiResult,
  setCachedAiResult,
} from "@/lib/ai/result-cache";
import { trackAiProviderEvent } from "@/lib/ai/telemetry";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
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

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

export type VocabularyAiCallContext = {
  userId?: string | null;
  reservationId?: string | null;
  signal?: AbortSignal;
};

export async function analyzeVocabularySpelling(
  input: {
    word: string;
    language: string;
    partOfSpeech?: string | null;
  },
  ctx: VocabularyAiCallContext = {},
): Promise<VocabularySpellingResult> {
  throwIfAborted(ctx.signal);
  const languageHint = learningLanguageHint(input.language);
  const fields = vocabularyAiFields({
    word: input.word,
    partOfSpeech: input.partOfSpeech,
  });

  const cacheKey = buildAiResultCacheKey({
    userId: ctx.userId ?? "anon",
    operation: "vocabSpelling",
    contentFingerprint: fingerprintAiContent({
      word: fields.word,
      language: input.language,
      partOfSpeech: fields.partOfSpeech,
    }),
    language: input.language,
    model: "gpt-5.6-luna",
    promptVersion: AI_PROMPT_VERSIONS.vocabSpelling,
  });
  const cached = getCachedAiResult<VocabularySpellingResult>(cacheKey);
  if (cached) {
    trackAiProviderEvent({
      userId: ctx.userId,
      operation: "vocab.spelling",
      feature: "ai_vocabulary",
      model: "gpt-5.6-luna",
      outcome: "cache_hit",
      reservationId: ctx.reservationId,
      workKind: "interactive",
    });
    return cached;
  }

  const { completion } = await runChatCompletion({
    operation: "vocab.spelling",
    feature: "ai_vocabulary",
    userId: ctx.userId,
    reservationId: ctx.reservationId,
    signal: ctx.signal,
    timeoutMs: 8_000,
    body: {
      model: "gpt-5.6-luna",
      reasoning_effort: "none",
      temperature: 0.1,
      max_completion_tokens: AI_OUTPUT_TOKENS.vocabSpelling,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: await aiSystemPrompt(
            `You are a multilingual vocabulary-learning assistant for Notoria.

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
            { responseStyle: true, correctionStyle: true },
          ),
        },
        {
          role: "user",
          content: JSON.stringify({
            word: fields.word,
            learningLanguageCode: input.language,
            learningLanguageHint: languageHint,
            partOfSpeech: fields.partOfSpeech,
          }),
        },
      ],
    },
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

  setCachedAiResult(cacheKey, parsed.data);
  return parsed.data;
}

async function completeMeaningJson(
  system: string,
  payload: unknown,
  ctx: VocabularyAiCallContext,
  operation: string,
) {
  throwIfAborted(ctx.signal);
  const { completion } = await runChatCompletion({
    operation,
    feature: "ai_vocabulary",
    userId: ctx.userId,
    reservationId: ctx.reservationId,
    signal: ctx.signal,
    timeoutMs: 8_000,
    body: {
      model: "gpt-5.6-luna",
      reasoning_effort: "none",
      temperature: 0.1,
      max_completion_tokens: AI_OUTPUT_TOKENS.vocabMeaning,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: await aiSystemPrompt(system, {
            responseStyle: true,
            correctionStyle: true,
          }),
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    },
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

async function suggestMeaningGlosses(
  input: {
    word: string;
    meaning: string;
    language: string;
    partOfSpeech?: string | null;
    wordLanguage?: string | null;
    meaningLanguage?: string | null;
  },
  ctx: VocabularyAiCallContext,
): Promise<VocabularyMeaningResult["suggestions"]> {
  throwIfAborted(ctx.signal);
  const fields = vocabularyAiFields({
    word: input.word,
    meaning: input.meaning,
    partOfSpeech: input.partOfSpeech,
  });
  const result = await completeMeaningJson(
    MEANING_GLOSS_PROMPT,
    {
      word: fields.word,
      currentMeaning: fields.meaning,
      detectedWordLanguage: input.wordLanguage,
      detectedMeaningLanguage: input.meaningLanguage,
      learningLanguageCode: input.language,
      learningLanguageHint: learningLanguageHint(input.language),
      partOfSpeech: fields.partOfSpeech,
    },
    ctx,
    "vocab.meaning_gloss",
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

export async function analyzeVocabularyMeaning(
  input: {
    word: string;
    meaning: string;
    language: string;
    partOfSpeech?: string | null;
    examples?: string[];
  },
  ctx: VocabularyAiCallContext = {},
): Promise<VocabularyMeaningResult> {
  throwIfAborted(ctx.signal);
  const fields = vocabularyAiFields({
    word: input.word,
    meaning: input.meaning,
    partOfSpeech: input.partOfSpeech,
  });

  const cacheKey = buildAiResultCacheKey({
    userId: ctx.userId ?? "anon",
    operation: "vocabMeaning",
    contentFingerprint: fingerprintAiContent({
      word: fields.word,
      meaning: fields.meaning,
      language: input.language,
      partOfSpeech: fields.partOfSpeech,
    }),
    language: input.language,
    model: "gpt-5.6-luna",
    promptVersion: AI_PROMPT_VERSIONS.vocabMeaning,
  });
  const cached = getCachedAiResult<VocabularyMeaningResult>(cacheKey);
  if (cached) {
    trackAiProviderEvent({
      userId: ctx.userId,
      operation: "vocab.meaning",
      feature: "ai_vocabulary",
      model: "gpt-5.6-luna",
      outcome: "cache_hit",
      reservationId: ctx.reservationId,
      workKind: "interactive",
    });
    return cached;
  }

  const parsed = await completeMeaningJson(
    MEANING_VALIDATOR_PROMPT,
    buildMeaningValidationPayload({
      ...input,
      word: fields.word ?? input.word,
      meaning: fields.meaning ?? input.meaning,
      partOfSpeech: fields.partOfSpeech,
    }),
    ctx,
    "vocab.meaning",
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
    throwIfAborted(ctx.signal);
    try {
      suggestions = await suggestMeaningGlosses(
        {
          ...input,
          word: fields.word ?? input.word,
          meaning: fields.meaning ?? input.meaning,
          partOfSpeech: fields.partOfSpeech,
          ...languages,
        },
        ctx,
      );
    } catch (error) {
      throwIfAborted(ctx.signal);
      if (error instanceof Error && error.message === "AI_CANCELLED") {
        throw error;
      }
      suggestions = [];
    }
  }

  const result: VocabularyMeaningResult = {
    ...parsed,
    word: parsed.word || input.word,
    meaning: parsed.meaning || input.meaning,
    originalMeaning: parsed.originalMeaning || input.meaning,
    suggestions,
    isLikelyCorrect,
  };
  setCachedAiResult(cacheKey, result);
  return result;
}
