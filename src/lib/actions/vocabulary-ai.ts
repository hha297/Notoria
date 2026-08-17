"use server";

import { getCurrentUserId } from "@/lib/auth/session";
import {
  analyzeVocabularyMeaning,
  analyzeVocabularySpelling,
} from "@/lib/vocabulary/ai";
import {
  vocabularyMeaningInputSchema,
  vocabularySpellingInputSchema,
  type VocabularyMeaningResult,
  type VocabularySpellingResult,
} from "@/lib/vocabulary/ai-types";

export type VocabularyAiFailure = {
  ok: false;
  code: "AI_UNAVAILABLE";
};

export type VocabularySpellingActionResult =
  | { ok: true; result: VocabularySpellingResult }
  | VocabularyAiFailure;

export type VocabularyMeaningActionResult =
  | { ok: true; result: VocabularyMeaningResult }
  | VocabularyAiFailure;

function toFailure(): VocabularyAiFailure {
  return { ok: false, code: "AI_UNAVAILABLE" };
}

export async function suggestVocabularySpelling(
  input: unknown,
): Promise<VocabularySpellingActionResult> {
  const parsed = vocabularySpellingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }

  try {
    await getCurrentUserId();
    const result = await analyzeVocabularySpelling(parsed.data);
    return { ok: true, result };
  } catch {
    return toFailure();
  }
}

export async function validateVocabularyMeaning(
  input: unknown,
): Promise<VocabularyMeaningActionResult> {
  const parsed = vocabularyMeaningInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }

  try {
    await getCurrentUserId();
    const result = await analyzeVocabularyMeaning(parsed.data);
    return { ok: true, result };
  } catch {
    return toFailure();
  }
}
