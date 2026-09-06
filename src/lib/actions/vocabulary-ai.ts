"use server";

import type { JSONContent } from "@tiptap/react";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  analyzeVocabularyMeaning,
  analyzeVocabularySpelling,
} from "@/lib/vocabulary/ai";
import {
  vocabularyMeaningInputSchema,
  vocabularyNotesFormatInputSchema,
  vocabularySpellingInputSchema,
  type VocabularyMeaningResult,
  type VocabularySpellingResult,
} from "@/lib/vocabulary/ai-types";
import {
  formatVocabularyNotesWithAi,
  notesFormatBlocksToDoc,
} from "@/lib/vocabulary/format-notes-ai";

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

export type VocabularyNotesFormatActionResult =
  | { ok: true; doc: JSONContent }
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

export async function formatVocabularyNotesAi(
  input: unknown,
): Promise<VocabularyNotesFormatActionResult> {
  const parsed = vocabularyNotesFormatInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }

  try {
    await getCurrentUserId();
    const result = await formatVocabularyNotesWithAi(parsed.data);
    if (result.blocks.length === 0) {
      return toFailure();
    }
    return { ok: true, doc: notesFormatBlocksToDoc(result.blocks) };
  } catch {
    return toFailure();
  }
}
