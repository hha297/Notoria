"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { vocabularyWordTags, vocabularyWords } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { isTagManagerTagId, storedTagMatchesManagerTag } from "@/lib/vocabulary/tag-manager";
import { getActiveWorkspace } from "@/lib/workspace";

const bulkTagSchema = z.object({
  tagId: z.string().trim().min(1),
  wordIds: z.array(z.string().uuid()).min(1).max(500),
});

export type VocabularyTagMembershipResult =
  | { ok: true; affected: number }
  | { ok: false; code: "INVALID" | "UNAUTHORIZED" | "NOT_FOUND" };

async function requireOwnedWordIds(wordIds: string[]) {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return { ok: false as const, code: "NOT_FOUND" as const };
  }

  const uniqueIds = [...new Set(wordIds)];
  const owned = await db.query.vocabularyWords.findMany({
    where: and(
      eq(vocabularyWords.userId, userId),
      eq(vocabularyWords.workspaceId, workspace.id),
      inArray(vocabularyWords.id, uniqueIds),
    ),
    columns: { id: true },
  });

  if (owned.length !== uniqueIds.length) {
    return { ok: false as const, code: "NOT_FOUND" as const };
  }

  return { ok: true as const, wordIds: uniqueIds, workspaceId: workspace.id };
}

function revalidateVocabulary() {
  revalidatePath("/vocabulary");
  revalidatePath("/settings");
}

/** Rows whose stored tag canonicalizes to the Tag Manager tag id. */
async function findMembershipRows(wordIds: string[], tagId: string) {
  const rows = await db.query.vocabularyWordTags.findMany({
    where: inArray(vocabularyWordTags.wordId, wordIds),
    columns: { id: true, wordId: true, tag: true },
  });

  return rows.filter((row) =>
    storedTagMatchesManagerTag(row.tag, tagId),
  );
}

/**
 * Add a fixed Aihe/Käyttö tag to selected words.
 * Only touches vocabulary_word_tags membership.
 * Treats legacy aliases (e.g. `daily` → `everyday_life`) as already present.
 */
export async function addTagToVocabularyWords(
  input: unknown,
): Promise<VocabularyTagMembershipResult> {
  const parsed = bulkTagSchema.safeParse(input);
  if (!parsed.success || !isTagManagerTagId(parsed.data.tagId)) {
    return { ok: false, code: "INVALID" };
  }

  try {
    const owned = await requireOwnedWordIds(parsed.data.wordIds);
    if (!owned.ok) return owned;

    const existing = await findMembershipRows(
      owned.wordIds,
      parsed.data.tagId,
    );
    const already = new Set(existing.map((row) => row.wordId));
    const toInsert = owned.wordIds.filter((id) => !already.has(id));

    if (toInsert.length > 0) {
      await db.insert(vocabularyWordTags).values(
        toInsert.map((wordId) => ({
          wordId,
          tag: parsed.data.tagId,
        })),
      );
    }

    revalidateVocabulary();
    return { ok: true, affected: toInsert.length };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    throw error;
  }
}

/**
 * Remove a fixed Aihe/Käyttö tag from selected words.
 * Deletes any stored form that canonicalizes to the selected tag
 * (canonical id or legacy aliases), not only an exact string match.
 */
export async function removeTagFromVocabularyWords(
  input: unknown,
): Promise<VocabularyTagMembershipResult> {
  const parsed = bulkTagSchema.safeParse(input);
  if (!parsed.success || !isTagManagerTagId(parsed.data.tagId)) {
    return { ok: false, code: "INVALID" };
  }

  try {
    const owned = await requireOwnedWordIds(parsed.data.wordIds);
    if (!owned.ok) return owned;

    const membership = await findMembershipRows(
      owned.wordIds,
      parsed.data.tagId,
    );

    if (membership.length === 0) {
      revalidateVocabulary();
      return { ok: true, affected: 0 };
    }

    const deleted = await db
      .delete(vocabularyWordTags)
      .where(
        inArray(
          vocabularyWordTags.id,
          membership.map((row) => row.id),
        ),
      )
      .returning({ id: vocabularyWordTags.id });

    revalidateVocabulary();
    return { ok: true, affected: deleted.length };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    throw error;
  }
}
