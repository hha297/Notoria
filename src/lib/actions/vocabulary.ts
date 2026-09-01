"use server";

import { cache } from "react";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  vocabularySynonyms,
  vocabularyWordTags,
  vocabularyWords,
  wordExamples,
  wordMeanings,
  workspaceTags,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireActiveWorkspace, getActiveWorkspace } from "@/lib/workspace";
import {
  createSynonymWordSchema,
  vocabularyFormSchema,
  type VocabularyFormValues,
} from "@/schemas/vocabulary";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import {
  getCustomTagName,
  isCustomTagKey,
  normalizeWordTags,
  uniqueCustomTagNames,
} from "@/lib/vocabulary-tags";
import {
  formatSynonymNames,
  matchLegacySynonyms,
  orderedSynonymPair,
  parseLegacySynonymNames,
  primaryMeaningText,
  synonymPeerId,
  uniqueSynonymIds,
  type VocabularySynonymRef,
} from "@/lib/vocabulary/synonyms";
import { normalizePartOfSpeech, normalizeVocabularyWord } from "@/lib/vocabulary/word-identity";

function normalizeWord(word: string) {
  return normalizeVocabularyWord(word);
}

async function findDuplicateWordId(
  word: string,
  workspaceId: string,
  excludeId?: string,
  partOfSpeech?: string | null,
): Promise<string | null> {
  const normalized = normalizeWord(word);
  if (!normalized) return null;

  const normalizedPartOfSpeech = normalizePartOfSpeech(partOfSpeech);

  const existing = await db.query.vocabularyWords.findFirst({
    where: and(
      eq(vocabularyWords.workspaceId, workspaceId),
      sql`lower(trim(${vocabularyWords.word})) = ${normalized}`,
      sql`coalesce(${vocabularyWords.partOfSpeech}, '') = ${normalizedPartOfSpeech}`,
      excludeId ? ne(vocabularyWords.id, excludeId) : undefined,
    ),
    columns: { id: true },
  });

  return existing?.id ?? null;
}

async function assertWordIsUnique(
  word: string,
  workspaceId: string,
  excludeId?: string,
  partOfSpeech?: string | null,
) {
  const existingId = await findDuplicateWordId(
    word,
    workspaceId,
    excludeId,
    partOfSpeech,
  );
  if (existingId) {
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
        isPrimary: meaning.isPrimary,
        sortOrder: meaning.sortOrder ?? index,
      })),
    );
  }

  if (data.examples.length > 0) {
    await db.insert(wordExamples).values(
      data.examples.map((example, index) => ({
        wordId,
        sentence: example.sentence,
        meaning: example.meaning?.trim() || null,
        notes: example.notes?.trim() || null,
        sortOrder: example.sortOrder ?? index,
      })),
    );
  }

  if (data.tags.length > 0) {
    await db.insert(vocabularyWordTags).values(
      normalizeWordTags(data.tags).map((tag) => ({
        wordId,
        tag,
      })),
    );
  }
}

function toSynonymRef(word: {
  id: string;
  word: string;
  meanings: Array<{ meaning: string; isPrimary?: boolean; sortOrder?: number }>;
}): VocabularySynonymRef {
  return {
    id: word.id,
    word: word.word,
    meaning: primaryMeaningText(word.meanings),
  };
}

async function listWorkspaceSynonymOptions(workspaceId: string) {
  return listWorkspaceSynonymOptionsCached(workspaceId);
}

const listWorkspaceSynonymOptionsCached = cache(async (workspaceId: string) => {
  const words = await db.query.vocabularyWords.findMany({
    where: eq(vocabularyWords.workspaceId, workspaceId),
    columns: { id: true, word: true },
    with: {
      meanings: {
        columns: { meaning: true, isPrimary: true, sortOrder: true },
        orderBy: [asc(wordMeanings.sortOrder)],
      },
    },
    orderBy: [asc(vocabularyWords.word)],
  });

  return words.map(toSynonymRef);
});

async function loadSynonymPairsForWord(wordId: string, workspaceId: string) {
  return db
    .select({
      wordId: vocabularySynonyms.wordId,
      synonymId: vocabularySynonyms.synonymId,
    })
    .from(vocabularySynonyms)
    .where(
      and(
        eq(vocabularySynonyms.workspaceId, workspaceId),
        or(
          eq(vocabularySynonyms.wordId, wordId),
          eq(vocabularySynonyms.synonymId, wordId),
        ),
      ),
    );
}

async function resolveSynonymsForWord(
  wordId: string,
  workspaceId: string,
  legacyText: string | null | undefined,
) {
  const [pairs, options] = await Promise.all([
    loadSynonymPairsForWord(wordId, workspaceId),
    listWorkspaceSynonymOptions(workspaceId),
  ]);
  const optionById = new Map(options.map((option) => [option.id, option]));
  const linked = uniqueSynonymIds(
    pairs.map((pair) => synonymPeerId(wordId, pair)),
    wordId,
  )
    .map((id) => optionById.get(id))
    .filter((item): item is VocabularySynonymRef => Boolean(item));

  if (linked.length > 0) {
    return { linked, unmatched: [] as string[] };
  }

  const legacy = matchLegacySynonyms(
    parseLegacySynonymNames(legacyText),
    options,
    wordId,
  );
  return { linked: legacy.matched, unmatched: legacy.unmatched };
}

async function replaceSynonyms(
  wordId: string,
  workspaceId: string,
  synonymIds: string[],
) {
  const ids = uniqueSynonymIds(synonymIds, wordId);

  let linked: VocabularySynonymRef[] = [];
  if (ids.length > 0) {
    const found = await db.query.vocabularyWords.findMany({
      where: and(
        eq(vocabularyWords.workspaceId, workspaceId),
        inArray(vocabularyWords.id, ids),
      ),
      columns: { id: true, word: true },
      with: {
        meanings: {
          columns: { meaning: true, isPrimary: true, sortOrder: true },
          orderBy: [asc(wordMeanings.sortOrder)],
        },
      },
    });

    if (found.length !== ids.length) {
      throw new Error("Synonym not found");
    }

    const foundById = new Map(found.map((word) => [word.id, word]));
    linked = ids.map((id) => toSynonymRef(foundById.get(id)!));
  }

  await db
    .delete(vocabularySynonyms)
    .where(
      and(
        eq(vocabularySynonyms.workspaceId, workspaceId),
        or(
          eq(vocabularySynonyms.wordId, wordId),
          eq(vocabularySynonyms.synonymId, wordId),
        ),
      ),
    );

  if (ids.length > 0) {
    await db.insert(vocabularySynonyms).values(
      ids.map((synonymId) => ({
        workspaceId,
        ...orderedSynonymPair(wordId, synonymId),
      })),
    );
  }

  await db
    .update(vocabularyWords)
    .set({
      synonyms: formatSynonymNames(linked) || null,
      updatedAt: new Date(),
    })
    .where(eq(vocabularyWords.id, wordId));
}

async function canonicalizeWordTags(workspaceId: string, tags: string[]) {
  const stored = await db.query.workspaceTags.findMany({
    where: eq(workspaceTags.workspaceId, workspaceId),
    columns: { name: true },
  });

  return normalizeWordTags(
    tags,
    stored.map((tag) => tag.name),
  );
}

async function ensureWorkspaceCustomTags(
  workspaceId: string,
  tags: string[],
) {
  const names = uniqueCustomTagNames(
    tags.filter(isCustomTagKey).map(getCustomTagName),
  );
  if (names.length === 0) return;

  const existing = await db.query.workspaceTags.findMany({
    where: eq(workspaceTags.workspaceId, workspaceId),
    columns: { name: true },
  });
  const existingKeys = new Set(
    existing.map((tag) => tag.name.trim().toLowerCase()),
  );
  const toInsert = names.filter(
    (name) => !existingKeys.has(name.toLowerCase()),
  );

  if (toInsert.length === 0) return;

  await db.insert(workspaceTags).values(
    toInsert.map((name) => ({
      workspaceId,
      name,
    })),
  );
}

export async function checkVocabularyWordExists(
  word: string,
  excludeId?: string,
  partOfSpeech?: string | null,
): Promise<{ exists: boolean; id: string | null }> {
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return { exists: false, id: null };
  }

  const id = await findDuplicateWordId(
    word,
    workspace.id,
    excludeId,
    partOfSpeech,
  );
  return { exists: Boolean(id), id };
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

  const synonyms = await resolveSynonymsForWord(
    word.id,
    workspace.id,
    word.synonyms,
  );

  return {
    ...word,
    synonymRefs: synonyms.linked,
    unmatchedSynonyms: synonyms.unmatched,
  };
}

export async function listVocabularySynonymOptions() {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return [] as VocabularySynonymRef[];
  }

  return listWorkspaceSynonymOptions(workspace.id);
}

export async function createSynonymWord(data: {
  word: string;
  meaning: string;
  partOfSpeech?: string;
}) {
  const parsed = createSynonymWordSchema.parse(data);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const existingId = await findDuplicateWordId(
    parsed.word,
    workspace.id,
    undefined,
    parsed.partOfSpeech,
  );
  if (existingId) {
    const existing = await db.query.vocabularyWords.findFirst({
      where: eq(vocabularyWords.id, existingId),
      columns: { id: true, word: true },
      with: {
        meanings: {
          columns: { meaning: true, isPrimary: true, sortOrder: true },
          orderBy: [asc(wordMeanings.sortOrder)],
        },
      },
    });

    if (!existing) {
      throw new Error("Word not found");
    }

    return { created: false, word: toSynonymRef(existing) };
  }

  const [word] = await db
    .insert(vocabularyWords)
    .values({
      userId,
      workspaceId: workspace.id,
      word: parsed.word.trim(),
      partOfSpeech: parsed.partOfSpeech || null,
      synonyms: null,
      notes: null,
    })
    .returning();

  await db.insert(wordMeanings).values({
    wordId: word.id,
    meaning: parsed.meaning.trim(),
    isPrimary: true,
    sortOrder: 0,
  });

  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${word.id}`);

  return {
    created: true,
    word: {
      id: word.id,
      word: word.word,
      meaning: parsed.meaning.trim(),
    } satisfies VocabularySynonymRef,
  };
}

export async function createVocabularyWord(data: VocabularyFormValues) {
  const parsed = vocabularyFormSchema.parse(data);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  await assertWordIsUnique(parsed.word, workspace.id, undefined, parsed.partOfSpeech);

  const tags = await canonicalizeWordTags(workspace.id, parsed.tags);
  const payload = { ...parsed, tags };

  const [word] = await db
    .insert(vocabularyWords)
    .values({
      userId,
      workspaceId: workspace.id,
      word: parsed.word,
      partOfSpeech: parsed.partOfSpeech || null,
      synonyms: null,
      notes: parsed.notes || null,
    })
    .returning();

  await replaceWordRelations(word.id, payload);
  await replaceSynonyms(word.id, workspace.id, parsed.synonymIds);
  await ensureWorkspaceCustomTags(workspace.id, tags);

  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${word.id}`);
  return word;
}

export async function updateVocabularyWord(
  id: string,
  data: VocabularyFormValues,
) {
  const parsed = vocabularyFormSchema.parse(data);
  const workspace = await requireActiveWorkspace();

  await assertWordInWorkspace(id, workspace.id);
  await assertWordIsUnique(parsed.word, workspace.id, id, parsed.partOfSpeech);

  const tags = await canonicalizeWordTags(workspace.id, parsed.tags);
  const payload = { ...parsed, tags };

  await db
    .update(vocabularyWords)
    .set({
      word: parsed.word,
      partOfSpeech: parsed.partOfSpeech || null,
      notes: parsed.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(vocabularyWords.id, id));

  await replaceWordRelations(id, payload);
  await replaceSynonyms(id, workspace.id, parsed.synonymIds);
  await ensureWorkspaceCustomTags(workspace.id, tags);

  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${id}`);
  revalidatePath(`/vocabulary/${id}/edit`);
}

export async function deleteVocabularyWord(id: string) {
  const workspace = await requireActiveWorkspace();
  await assertWordInWorkspace(id, workspace.id);

  await db.delete(vocabularyWords).where(eq(vocabularyWords.id, id));
  revalidatePath("/vocabulary");
  revalidatePath(`/vocabulary/${id}`);
  revalidatePath(`/vocabulary/${id}/edit`);
}
