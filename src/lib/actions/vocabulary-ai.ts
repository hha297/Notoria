"use server";

import type { JSONContent } from "@tiptap/react";
import { aiSuggestionsAllowed } from "@/lib/ai/preferences";
import {
  AiAssistanceDisabledError,
  getResolvedAiPreferences,
  requireAiAssistanceEnabled,
} from "@/lib/ai/preferences-server";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { runWithUsage } from "@/lib/billing/entitlements";
import { QuotaExceededError } from "@/lib/billing/errors";
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
  code: "AI_UNAVAILABLE" | "AI_DISABLED" | "AI_QUOTA_EXCEEDED";
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

async function meteredVocabularyAi<T>(fn: () => Promise<T>): Promise<T> {
  const user = await getCurrentUserRecord();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return runWithUsage(user, "ai_vocabulary", fn);
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
    const prefs = await getResolvedAiPreferences();
    if (!prefs.enabled) return toFailure("AI_DISABLED");
    if (!aiSuggestionsAllowed(prefs)) {
      return {
        ok: true,
        result: { ...EMPTY_SPELLING, original: parsed.data.word },
      };
    }
    return await meteredVocabularyAi(async () => {
      const result = await analyzeVocabularySpelling(parsed.data);
      return { ok: true as const, result };
    });
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return toFailure("AI_DISABLED");
    }
    if (error instanceof QuotaExceededError) {
      return toFailure("AI_QUOTA_EXCEEDED");
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
    const prefs = await getResolvedAiPreferences();
    if (!prefs.enabled) return toFailure("AI_DISABLED");
    if (!aiSuggestionsAllowed(prefs)) {
      return {
        ok: true,
        result: emptyMeaning(parsed.data.meaning),
      };
    }
    return await meteredVocabularyAi(async () => {
      const result = await analyzeVocabularyMeaning(parsed.data);
      return { ok: true as const, result };
    });
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return toFailure("AI_DISABLED");
    }
    if (error instanceof QuotaExceededError) {
      return toFailure("AI_QUOTA_EXCEEDED");
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
    await requireAiAssistanceEnabled();
    return await meteredVocabularyAi(async () => {
      const result = await formatVocabularyNotesWithAi(parsed.data);
      if (result.blocks.length === 0) {
        throw new Error("AI_EMPTY");
      }
      return { ok: true as const, doc: notesFormatBlocksToDoc(result.blocks) };
    });
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      return toFailure("AI_DISABLED");
    }
    if (error instanceof QuotaExceededError) {
      return toFailure("AI_QUOTA_EXCEEDED");
    }
    return toFailure();
  }
}
