"use server";

import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  flashcardProgress,
  flashcardReviews,
  vocabularySynonyms,
  vocabularyWordTags,
  vocabularyWords,
  wordExamples,
  wordMeanings,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  isMultiFilterActive,
  matchesMultiFilter,
  matchesMultiFilterAny,
} from "@/lib/filters/multi-select";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import type {
  FlashcardCardDirection,
  FlashcardFilters,
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
import { PRACTICE_DECK_LIMIT } from "@/lib/flashcards/limits";
import { canonicalizeTagId } from "@/lib/vocabulary-tags";

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

export async function getFlashcardWords(params?: {
  focus?: "weak" | "due";
  /** When set, select from the full bank (not only the uncapped-by-filter deck). */
  filters?: FlashcardFilters;
}): Promise<FlashcardWord[]> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  const filters = params?.filters;
  const filterActive = Boolean(
    filters &&
      (isMultiFilterActive(filters.tag) ||
        isMultiFilterActive(filters.partOfSpeech) ||
        isMultiFilterActive(filters.status)),
  );

  // Lean ID pass first — avoid loading full word graphs for the entire bank.
  // Prefer newest vocabulary so the capped deck stays relevant for practice.
  // When filters are active, pull POS/status (and tags below) so the cap applies
  // *after* filtering the full workspace — otherwise tags outside the top 500 vanish.
  const [wordRows, progressRows] = await Promise.all([
    db.query.vocabularyWords.findMany({
      where: and(
        eq(vocabularyWords.userId, userId),
        eq(vocabularyWords.workspaceId, workspace.id),
      ),
      columns: filterActive
        ? { id: true, createdAt: true, partOfSpeech: true, status: true }
        : { id: true, createdAt: true },
      orderBy: [desc(vocabularyWords.createdAt)],
    }),
    db.query.flashcardProgress.findMany({
      where: and(
        eq(flashcardProgress.userId, userId),
        eq(flashcardProgress.workspaceId, workspace.id),
      ),
      columns: { wordId: true, nextReviewAt: true, lastRating: true },
    }),
  ]);

  let candidateRows = wordRows;

  if (filterActive && filters) {
    const tagsByWordId = new Map<string, string[]>();
    if (isMultiFilterActive(filters.tag)) {
      const tagRows = await db
        .select({
          wordId: vocabularyWordTags.wordId,
          tag: vocabularyWordTags.tag,
        })
        .from(vocabularyWordTags)
        .innerJoin(
          vocabularyWords,
          eq(vocabularyWordTags.wordId, vocabularyWords.id),
        )
        .where(
          and(
            eq(vocabularyWords.userId, userId),
            eq(vocabularyWords.workspaceId, workspace.id),
          ),
        );

      for (const row of tagRows) {
        const normalized = canonicalizeTagId(row.tag) ?? row.tag.trim();
        if (!normalized) continue;
        const list = tagsByWordId.get(row.wordId);
        if (list) list.push(normalized);
        else tagsByWordId.set(row.wordId, [normalized]);
      }
    }

    candidateRows = wordRows.filter((row) => {
      const partOfSpeech =
        "partOfSpeech" in row ? (row.partOfSpeech as string | null) : null;
      const status = "status" in row ? (row.status as string) : null;
      if (!matchesMultiFilter(filters.partOfSpeech, partOfSpeech)) return false;
      if (!matchesMultiFilter(filters.status, status)) return false;
      if (
        !matchesMultiFilterAny(
          filters.tag,
          tagsByWordId.get(row.id) ?? [],
        )
      ) {
        return false;
      }
      return true;
    });
  }

  const now = Date.now();
  const nextReviewByWordId = new Map(
    progressRows.map((row) => [row.wordId, row.nextReviewAt] as const),
  );
  const weakWordIds = new Set(
    progressRows
      .filter((row) => row.lastRating === "AGAIN" || row.lastRating === "HARD")
      .map((row) => row.wordId),
  );

  // Recent again/hard reviews also count as weak for focus mode
  if (params?.focus === "weak") {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 6);
    const recentWeak = await db
      .select({ wordId: flashcardReviews.wordId })
      .from(flashcardReviews)
      .where(
        and(
          eq(flashcardReviews.userId, userId),
          eq(flashcardReviews.workspaceId, workspace.id),
          gte(flashcardReviews.createdAt, since),
          inArray(flashcardReviews.rating, ["AGAIN", "HARD"]),
        ),
      )
      .limit(80);
    for (const row of recentWeak) weakWordIds.add(row.wordId);
  }

  const isDue = (wordId: string) => {
    const nextReviewAt = nextReviewByWordId.get(wordId);
    return nextReviewAt == null || nextReviewAt.getTime() <= now;
  };

  let orderedIds: string[];
  if (params?.focus === "weak") {
    const weakOrdered = candidateRows
      .filter((row) => weakWordIds.has(row.id))
      .map((row) => row.id);
    orderedIds =
      weakOrdered.length > 0
        ? weakOrdered
        : candidateRows.filter((row) => isDue(row.id)).map((row) => row.id);
  } else {
    const dueIds = candidateRows
      .filter((row) => isDue(row.id))
      .map((row) => row.id);
    const laterIds = candidateRows
      .filter((row) => !isDue(row.id))
      .map((row) => row.id);
    orderedIds = [...dueIds, ...laterIds];
  }

  const selectedIds = orderedIds.slice(0, PRACTICE_DECK_LIMIT);

  if (selectedIds.length === 0) {
    return [];
  }

  const selectedWords = await db.query.vocabularyWords.findMany({
    where: and(
      eq(vocabularyWords.userId, userId),
      eq(vocabularyWords.workspaceId, workspace.id),
      inArray(vocabularyWords.id, selectedIds),
    ),
    with: {
      meanings: { orderBy: [asc(wordMeanings.sortOrder)] },
      examples: { orderBy: [asc(wordExamples.sortOrder)] },
      tags: true,
    },
  });

  const orderIndex = new Map(selectedIds.map((id, index) => [id, index]));
  selectedWords.sort(
    (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
  );

  const pairs = await db
    .select({
      wordId: vocabularySynonyms.wordId,
      synonymId: vocabularySynonyms.synonymId,
    })
    .from(vocabularySynonyms)
    .where(eq(vocabularySynonyms.workspaceId, workspace.id));

  const options: VocabularySynonymRef[] = selectedWords.map((word) => ({
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

  return selectedWords.map((word) => {
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
      createdAt: word.createdAt.toISOString(),
      meanings: word.meanings
        .filter((meaning) => meaning.isPrimary)
        .map((meaning) => meaning.meaning),
      secondaryMeanings: word.meanings
        .filter((meaning) => !meaning.isPrimary)
        .map((meaning) => meaning.meaning)
        .filter((text) => Boolean(text.trim())),
      meaningUsageLabels: word.meanings
        .filter((meaning) => meaning.isPrimary)
        .map((meaning) => meaning.usageLabels ?? []),
      examples: word.examples.map((example) => example.sentence),
      exampleEntries: word.examples.map((example) => ({
        sentence: example.sentence,
        meaning: example.meaning?.trim() ? example.meaning.trim() : null,
      })),
      tags: [
        ...new Set(
          word.tags
            .map((tag) => canonicalizeTagId(tag.tag) ?? tag.tag.trim())
            .filter(Boolean),
        ),
      ],
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
