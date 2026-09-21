"use server";

import type { JSONContent } from "@tiptap/react";
import { aiSuggestionsAllowed } from "@/lib/ai/preferences";
import {
  AiAssistanceDisabledError,
  getResolvedAiPreferences,
  requireAiAssistanceEnabled,
} from "@/lib/ai/preferences-server";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  analyzeVocabularyMeaning,
  analyzeVocabularySpelling,
} from "@/lib/vocabulary/ai";
import {
  vocabularyMeaningInputSchema,
  vocabularyNotesFormatInputSchema,
  vocabularySpellingInputSchema,
  vocabularyMeaningResultSchema,
  type VocabularyMeaningResult,
  type VocabularySpellingResult,
} from "@/lib/vocabulary/ai-types";
import {
  formatVocabularyNotesWithAi,
  notesFormatBlocksToDoc,
} from "@/lib/vocabulary/format-notes-ai";

export type VocabularyAiFailure = {
  ok: false;
  code: "AI_UNAVAILABLE" | "AI_DISABLED";
};

export type VocabularySpellingActionResult =
  | { ok: true; result: VocabularySpellingResult }
  | VocabularyAiFailure;

export type VocabularyMeaningActionResult =
  | { ok: true; result: VocabularyMeaningResult }
  | VocabularyAiFailure;

export type VocabularyNotesFormatActionResult =
  | { ok: true; doc: JSONContent }
  | VocabularyAiFailure;

function toFailure(code: VocabularyAiFailure["code"] = "AI_UNAVAILABLE"): VocabularyAiFailure {
  return { ok: false, code };
}

const EMPTY_SPELLING: VocabularySpellingResult = {
  type: "spelling",
  original: "",
  suggestion: null,
  isLikelyValid: true,
  confidence: 1,
  explanation: "",
};

function emptyMeaning(meaning: string): VocabularyMeaningResult {
  return vocabularyMeaningResultSchema.parse({
    type: "meaning",
    word: "",
    meaning,
    originalMeaning: meaning,
    suggestions: [],
    explanation: "",
  });
}

export async function suggestVocabularySpelling(
  input: unknown,
): Promise<VocabularySpellingActionResult> {
  const parsed = vocabularySpellingInputSchema.safeParse(input);
  if (!parsed.success) {
    return toFailure();
  }

  try {
    await getCurrentUserId();
    const prefs = await getResolvedAiPreferences();
    if (!prefs.enabled) return toFailure("AI_DISABLED");
    if (!aiSuggestionsAllowed(prefs)) {
      return {
        ok: true,
        result: { ...EMPTY_SPELLING, original: parsed.data.word },
      };
    }
    const result = await analyzeVocabularySpelling(parsed.data);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return toFailure("AI_DISABLED");
    }
    return toFailure();
  }
}

export async function validateVocabularyMeaning(
  input: unknown,
): Promise<VocabularyMeaningActionResult> {
  const parsed = vocabularyMeaningInputSchema.safeParse(input);
  if (!parsed.success) {
    return toFailure();
  }

  try {
    await getCurrentUserId();
    const prefs = await getResolvedAiPreferences();
    if (!prefs.enabled) return toFailure("AI_DISABLED");
    if (!aiSuggestionsAllowed(prefs)) {
      return {
        ok: true,
        result: emptyMeaning(parsed.data.meaning),
      };
    }
    const result = await analyzeVocabularyMeaning(parsed.data);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return toFailure("AI_DISABLED");
    }
    return toFailure();
  }
}

export async function formatVocabularyNotesAi(
  input: unknown,
): Promise<VocabularyNotesFormatActionResult> {
  const parsed = vocabularyNotesFormatInputSchema.safeParse(input);
  if (!parsed.success) {
    return toFailure();
  }

  try {
    await getCurrentUserId();
    await requireAiAssistanceEnabled();
    const result = await formatVocabularyNotesWithAi(parsed.data);
    if (result.blocks.length === 0) {
      return toFailure();
    }
    return { ok: true, doc: notesFormatBlocksToDoc(result.blocks) };
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return toFailure("AI_DISABLED");
    }
    return toFailure();
  }
}
