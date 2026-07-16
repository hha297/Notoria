"use server";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  vocabularyWordTags,
  vocabularyWords,
  wordExamples,
  wordMeanings,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireActiveWorkspace, getActiveWorkspace } from "@/lib/workspace";
import {
  vocabularyFormSchema,
  type VocabularyFormValues,
} from "@/schemas/vocabulary";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

async function assertWordIsUnique(
  word: string,
  workspaceId: string,
  excludeId?: string,
) {
  const normalized = normalizeWord(word);

  const existing = await db.query.vocabularyWords.findFirst({
    where: and(
      eq(vocabularyWords.workspaceId, workspaceId),
      sql`lower(trim(${vocabularyWords.word})) = ${normalized}`,
      excludeId ? ne(vocabularyWords.id, excludeId) : undefined,
    ),
    columns: { id: true },
  });

  if (existing) {
    throw new Error(VOCABULARY_WORD_EXISTS);
  }
}

async function assertWordInWorkspace(wordId: string, workspaceId: string) {
  const userId = await getCurrentUserId();

  const word = await db.query.vocabularyWords.findFirst({
    where: eq(vocabularyWords.id, wordId),
  });

  if (!word || word.userId !== userId || word.workspaceId !== workspaceId) {
    throw new Error("Word not found");
  }

  return word;
}

async function replaceWordRelations(
  wordId: string,
  data: VocabularyFormValues,
) {
  await db.delete(wordMeanings).where(eq(wordMeanings.wordId, wordId));
  await db.delete(wordExamples).where(eq(wordExamples.wordId, wordId));
  await db
    .delete(vocabularyWordTags)
    .where(eq(vocabularyWordTags.wordId, wordId));

  if (data.meanings.length > 0) {
    await db.insert(wordMeanings).values(
      data.meanings.map((meaning, index) => ({
        wordId,
        meaning: meaning.meaning,
        sortOrder: meaning.sortOrder ?? index,
      })),
    );
  }

  if (data.examples.length > 0) {
    await db.insert(wordExamples).values(
      data.examples.map((example, index) => ({
        wordId,
        sentence: example.sentence,
        sortOrder: example.sortOrder ?? index,
      })),
    );
  }

  if (data.tags.length > 0) {
    await db.insert(vocabularyWordTags).values(
      data.tags.map((tag) => ({
        wordId,
        tag,
      })),
    );
  }
}

export async function getVocabularyWords() {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  return db.query.vocabularyWords.findMany({
    where: and(
      eq(vocabularyWords.userId, userId),
      eq(vocabularyWords.workspaceId, workspace.id),
    ),
    with: {
      meanings: {
        orderBy: [asc(wordMeanings.sortOrder)],
      },
      examples: {
        orderBy: [asc(wordExamples.sortOrder)],
      },
      tags: true,
    },
    orderBy: [desc(vocabularyWords.updatedAt)],
  });
}

export async function getVocabularyWord(id: string) {
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return null;
  }

  const word = await db.query.vocabularyWords.findFirst({
    where: eq(vocabularyWords.id, id),
    with: {
      meanings: {
        orderBy: [asc(wordMeanings.sortOrder)],
      },
      examples: {
        orderBy: [asc(wordExamples.sortOrder)],
      },
      tags: true,
    },
  });

  if (!word || word.workspaceId !== workspace.id) {
    return null;
  }

  return word;
}

export async function createVocabularyWord(data: VocabularyFormValues) {
  const parsed = vocabularyFormSchema.parse(data);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  await assertWordIsUnique(parsed.word, workspace.id);

  const [word] = await db
    .insert(vocabularyWords)
    .values({
      userId,
      workspaceId: workspace.id,
      word: parsed.word,
      partOfSpeech: parsed.partOfSpeech || null,
      notes: parsed.notes || null,
    })
    .returning();

  await replaceWordRelations(word.id, parsed);

  revalidatePath("/vocabulary");
  return word;
}

export async function updateVocabularyWord(
  id: string,
  data: VocabularyFormValues,
) {
  const parsed = vocabularyFormSchema.parse(data);
  const workspace = await requireActiveWorkspace();

  await assertWordInWorkspace(id, workspace.id);
  await assertWordIsUnique(parsed.word, workspace.id, id);

  await db
    .update(vocabularyWords)
    .set({
      word: parsed.word,
      partOfSpeech: parsed.partOfSpeech || null,
      notes: parsed.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(vocabularyWords.id, id));

  await replaceWordRelations(id, parsed);

  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${id}`);
}

export async function deleteVocabularyWord(id: string) {
  const workspace = await requireActiveWorkspace();
  await assertWordInWorkspace(id, workspace.id);

  await db.delete(vocabularyWords).where(eq(vocabularyWords.id, id));
  revalidatePath("/vocabulary");
}
