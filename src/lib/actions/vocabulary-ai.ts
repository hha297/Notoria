"use server";

import { AiAccessError, requireAiAccess } from "@/lib/auth/ai-access";
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
  code: "AI_FORBIDDEN" | "AI_UNAVAILABLE";
};

export type VocabularySpellingActionResult =
  | { ok: true; result: VocabularySpellingResult }
  | VocabularyAiFailure;

export type VocabularyMeaningActionResult =
  | { ok: true; result: VocabularyMeaningResult }
  | VocabularyAiFailure;

function toFailure(error: unknown): VocabularyAiFailure {
  if (error instanceof AiAccessError) {
    return { ok: false, code: "AI_FORBIDDEN" };
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return { ok: false, code: "AI_FORBIDDEN" };
  }
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
    await requireAiAccess();
    const result = await analyzeVocabularySpelling(parsed.data);
    return { ok: true, result };
  } catch (error) {
    return toFailure(error);
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
    await requireAiAccess();
    const result = await analyzeVocabularyMeaning(parsed.data);
    return { ok: true, result };
  } catch (error) {
    return toFailure(error);
  }
}
