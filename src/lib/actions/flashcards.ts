"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  flashcardProgress,
  flashcardReviews,
  vocabularySynonyms,
  vocabularyWords,
  wordExamples,
  wordMeanings,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import type {
  FlashcardCardDirection,
  FlashcardRating,
  FlashcardWord,
} from "@/types/flashcards";
import {
  formatSynonymNames,
  matchLegacySynonyms,
  parseLegacySynonymNames,
  uniqueSynonymIds,
  type VocabularySynonymRef,
} from "@/lib/vocabulary/synonyms";

const STATUS_FROM_RATING = {
  AGAIN: "LEARNING",
  HARD: "LEARNING",
  GOOD: "REVIEW",
  EASY: "MASTERED",
} as const;

function computeNextProgress(
  current: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
  } | null,
  rating: FlashcardRating,
) {
  const easeFactor = current?.easeFactor ?? 250;
  const intervalDays = current?.intervalDays ?? 0;
  const repetitions = current?.repetitions ?? 0;

  switch (rating) {
    case "AGAIN":
      return {
        easeFactor: Math.max(130, easeFactor - 20),
        intervalDays: 0,
        repetitions: 0,
      };
    case "HARD":
      return {
        easeFactor: Math.max(130, easeFactor - 15),
        intervalDays: Math.max(1, Math.round(intervalDays * 1.2) || 1),
        repetitions: repetitions + 1,
      };
    case "GOOD": {
      const nextRepetitions = repetitions + 1;
      const nextInterval =
        nextRepetitions === 1
          ? 1
          : nextRepetitions === 2
            ? 3
            : Math.max(1, Math.round(intervalDays * (easeFactor / 100)));

      return {
        easeFactor,
        intervalDays: nextInterval,
        repetitions: nextRepetitions,
      };
    }
    case "EASY": {
      const nextRepetitions = repetitions + 1;
      const nextInterval =
        nextRepetitions === 1
          ? 3
          : Math.max(1, Math.round(intervalDays * (easeFactor / 100) * 1.3));

      return {
        easeFactor: Math.min(300, easeFactor + 15),
        intervalDays: nextInterval,
        repetitions: nextRepetitions,
      };
    }
  }
}

export async function getFlashcardWords(): Promise<FlashcardWord[]> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  const words = await db.query.vocabularyWords.findMany({
    where: and(
      eq(vocabularyWords.userId, userId),
      eq(vocabularyWords.workspaceId, workspace.id),
    ),
    with: {
      meanings: { orderBy: [asc(wordMeanings.sortOrder)] },
      examples: { orderBy: [asc(wordExamples.sortOrder)] },
      tags: true,
    },
    orderBy: [asc(vocabularyWords.word)],
  });

  const pairs = await db
    .select({
      wordId: vocabularySynonyms.wordId,
      synonymId: vocabularySynonyms.synonymId,
    })
    .from(vocabularySynonyms)
    .where(eq(vocabularySynonyms.workspaceId, workspace.id));

  const options: VocabularySynonymRef[] = words.map((word) => ({
    id: word.id,
    word: word.word,
    meaning: word.meanings.find((meaning) => meaning.isPrimary)?.meaning ??
      word.meanings[0]?.meaning ??
      null,
  }));
  const optionById = new Map(options.map((option) => [option.id, option]));
  const linkedByWordId = new Map<string, VocabularySynonymRef[]>();

  for (const pair of pairs) {
    const left = optionById.get(pair.wordId);
    const right = optionById.get(pair.synonymId);
    if (!left || !right) continue;

    const leftPeers = linkedByWordId.get(pair.wordId) ?? [];
    const rightPeers = linkedByWordId.get(pair.synonymId) ?? [];
    if (!leftPeers.some((item) => item.id === right.id)) leftPeers.push(right);
    if (!rightPeers.some((item) => item.id === left.id)) rightPeers.push(left);
    linkedByWordId.set(pair.wordId, leftPeers);
    linkedByWordId.set(pair.synonymId, rightPeers);
  }

  return words.map((word) => {
    const linked = uniqueSynonymIds(
      (linkedByWordId.get(word.id) ?? []).map((item) => item.id),
      word.id,
    )
      .map((id) => optionById.get(id))
      .filter((item): item is VocabularySynonymRef => Boolean(item));

    const legacy = linked.length
      ? linked
      : matchLegacySynonyms(
          parseLegacySynonymNames(word.synonyms),
          options,
          word.id,
        ).matched;

    return {
      id: word.id,
      word: word.word,
      partOfSpeech: word.partOfSpeech,
      synonyms: formatSynonymNames(legacy) || word.synonyms,
      notes: word.notes,
      status: word.status,
      meanings: word.meanings
        .filter((meaning) => meaning.isPrimary)
        .map((meaning) => meaning.meaning),
      examples: word.examples.map((example) => example.sentence),
      tags: word.tags.map((tag) => tag.tag),
    };
  });
}

export async function recordFlashcardReview({
  wordId,
  rating,
  direction,
}: {
  wordId: string;
  rating: FlashcardRating;
  direction: FlashcardCardDirection;
}) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const word = await db.query.vocabularyWords.findFirst({
    where: eq(vocabularyWords.id, wordId),
  });

  if (!word || word.userId !== userId || word.workspaceId !== workspace.id) {
    throw new Error("Word not found");
  }

  await db.insert(flashcardReviews).values({
    userId,
    wordId,
    workspaceId: workspace.id,
    rating,
    direction,
  });

  const existingProgress = await db.query.flashcardProgress.findFirst({
    where: and(
      eq(flashcardProgress.userId, userId),
      eq(flashcardProgress.wordId, wordId),
    ),
  });

  const nextProgress = computeNextProgress(existingProgress ?? null, rating);
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + nextProgress.intervalDays);

  if (existingProgress) {
    await db
      .update(flashcardProgress)
      .set({
        lastRating: rating,
        easeFactor: nextProgress.easeFactor,
        intervalDays: nextProgress.intervalDays,
        repetitions: nextProgress.repetitions,
        nextReviewAt,
        updatedAt: new Date(),
      })
      .where(eq(flashcardProgress.id, existingProgress.id));
  } else {
    await db.insert(flashcardProgress).values({
      userId,
      wordId,
      workspaceId: workspace.id,
      lastRating: rating,
      easeFactor: nextProgress.easeFactor,
      intervalDays: nextProgress.intervalDays,
      repetitions: nextProgress.repetitions,
      nextReviewAt,
    });
  }

  await db
    .update(vocabularyWords)
    .set({
      status: STATUS_FROM_RATING[rating],
      updatedAt: new Date(),
    })
    .where(eq(vocabularyWords.id, wordId));

  revalidatePath("/exercises/flashcard");
  revalidatePath("/vocabulary");
}
