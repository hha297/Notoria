"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { vocabularyWords, wordMeanings } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/demo-user";
import { getWorkplaceLanguage } from "@/lib/workplace";
import {
  vocabularyFormSchema,
  type VocabularyFormValues,
} from "@/schemas/vocabulary";

export async function getVocabularyWords() {
  const userId = await getCurrentUserId();
  const language = await getWorkplaceLanguage();

  return db.query.vocabularyWords.findMany({
    where: and(
      eq(vocabularyWords.userId, userId),
      eq(vocabularyWords.language, language),
    ),
    with: {
      meanings: {
        orderBy: [asc(wordMeanings.sortOrder)],
      },
    },
    orderBy: [desc(vocabularyWords.updatedAt)],
  });
}

export async function getVocabularyWord(id: string) {
  const userId = await getCurrentUserId();
  const language = await getWorkplaceLanguage();

  const word = await db.query.vocabularyWords.findFirst({
    where: eq(vocabularyWords.id, id),
    with: {
      meanings: {
        orderBy: [asc(wordMeanings.sortOrder)],
      },
    },
  });

  if (!word || word.userId !== userId || word.language !== language) {
    return null;
  }

  return word;
}

export async function createVocabularyWord(data: VocabularyFormValues) {
  const parsed = vocabularyFormSchema.parse(data);
  const userId = await getCurrentUserId();
  const language = await getWorkplaceLanguage();

  const [word] = await db
    .insert(vocabularyWords)
    .values({
      userId,
      language,
      word: parsed.word,
      pronunciation: null,
      ipa: null,
      partOfSpeech: parsed.partOfSpeech || null,
      notes: parsed.notes || null,
    })
    .returning();

  if (parsed.meanings.length > 0) {
    await db.insert(wordMeanings).values(
      parsed.meanings.map((meaning, index) => ({
        wordId: word.id,
        meaning: meaning.meaning,
        sortOrder: meaning.sortOrder ?? index,
      })),
    );
  }

  revalidatePath("/vocabulary");
  return word;
}

export async function updateVocabularyWord(
  id: string,
  data: VocabularyFormValues,
) {
  const parsed = vocabularyFormSchema.parse(data);
  const userId = await getCurrentUserId();
  const language = await getWorkplaceLanguage();

  const existing = await db.query.vocabularyWords.findFirst({
    where: eq(vocabularyWords.id, id),
  });

  if (!existing || existing.userId !== userId || existing.language !== language) {
    throw new Error("Word not found");
  }

  await db
    .update(vocabularyWords)
    .set({
      word: parsed.word,
      partOfSpeech: parsed.partOfSpeech || null,
      notes: parsed.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(vocabularyWords.id, id));

  await db.delete(wordMeanings).where(eq(wordMeanings.wordId, id));

  if (parsed.meanings.length > 0) {
    await db.insert(wordMeanings).values(
      parsed.meanings.map((meaning, index) => ({
        wordId: id,
        meaning: meaning.meaning,
        sortOrder: meaning.sortOrder ?? index,
      })),
    );
  }

  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${id}`);
}

export async function deleteVocabularyWord(id: string) {
  const userId = await getCurrentUserId();
  const language = await getWorkplaceLanguage();

  const existing = await db.query.vocabularyWords.findFirst({
    where: eq(vocabularyWords.id, id),
  });

  if (!existing || existing.userId !== userId || existing.language !== language) {
    throw new Error("Word not found");
  }

  await db.delete(vocabularyWords).where(eq(vocabularyWords.id, id));
  revalidatePath("/vocabulary");
}
