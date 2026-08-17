"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  vocabularyWordTags,
  vocabularyWords,
  workspaceTags,
  workspaces,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { isValidLanguageCode } from "@/lib/languages";
import {
  customTagKey,
  getCustomTagName,
  uniqueCustomTagNames,
} from "@/lib/vocabulary-tags";
import { resolveWorkspaceName } from "@/lib/workspace-names";
import { getActiveWorkspace, WORKSPACE_COOKIE } from "@/lib/workspace";

const createWorkspaceSchema = z.object({
  name: z.string().optional(),
  language: z.string().min(2),
});

const workspaceTagSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  language: z.string().min(2),
});

export async function createWorkspace(data: z.infer<typeof createWorkspaceSchema>) {
  const parsed = createWorkspaceSchema.parse(data);

  if (!isValidLanguageCode(parsed.language)) {
    throw new Error("Invalid language");
  }

  const userId = await getCurrentUserId();

  const existing = await db.query.workspaces.findFirst({
    where: and(
      eq(workspaces.userId, userId),
      eq(workspaces.language, parsed.language),
    ),
  });

  if (existing) {
    throw new Error("WORKSPACE_LANGUAGE_EXISTS");
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({
      userId,
      language: parsed.language,
      name: resolveWorkspaceName(parsed.name, parsed.language),
    })
    .returning();

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return workspace;
}

export async function setActiveWorkspace(workspaceId: string) {
  const userId = await getCurrentUserId();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace || workspace.userId !== userId) {
    throw new Error("Workspace not found");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}

export async function updateWorkspace(
  workspaceId: string,
  data: z.infer<typeof updateWorkspaceSchema>,
) {
  const parsed = updateWorkspaceSchema.parse(data);

  if (!isValidLanguageCode(parsed.language)) {
    throw new Error("Invalid language");
  }

  const userId = await getCurrentUserId();
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace || workspace.userId !== userId) {
    throw new Error("Workspace not found");
  }

  if (parsed.language !== workspace.language) {
    const existing = await db.query.workspaces.findFirst({
      where: and(
        eq(workspaces.userId, userId),
        eq(workspaces.language, parsed.language),
      ),
    });

    if (existing) {
      throw new Error("WORKSPACE_LANGUAGE_EXISTS");
    }
  }

  const [updated] = await db
    .update(workspaces)
    .set({
      name: parsed.name,
      language: parsed.language,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  revalidatePath("/", "layout");
  return updated;
}

export async function deleteWorkspace(workspaceId: string) {
  const userId = await getCurrentUserId();
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace || workspace.userId !== userId) {
    throw new Error("Workspace not found");
  }

  const remaining = await db.query.workspaces.findMany({
    where: eq(workspaces.userId, userId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  const nextWorkspace = remaining.find((item) => item.id !== workspaceId);

  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

  const cookieStore = await cookies();
  const activeId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  if (!activeId || activeId === workspaceId) {
    if (nextWorkspace) {
      cookieStore.set(WORKSPACE_COOKIE, nextWorkspace.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else {
      cookieStore.set(WORKSPACE_COOKIE, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
    }
  }

  revalidatePath("/", "layout");
  return { nextWorkspaceId: nextWorkspace?.id ?? null };
}

async function workspaceVocabularyWordIds(workspaceId: string) {
  const rows = await db
    .select({ id: vocabularyWords.id })
    .from(vocabularyWords)
    .where(eq(vocabularyWords.workspaceId, workspaceId));

  return rows.map((row) => row.id);
}

async function retargetCustomTagOnWords(
  workspaceId: string,
  oldName: string,
  newName: string,
) {
  const oldKey = customTagKey(oldName);
  const newKey = customTagKey(newName);
  if (oldKey === newKey) return;

  const wordIds = await workspaceVocabularyWordIds(workspaceId);
  if (wordIds.length === 0) return;

  const alreadyHasNew = await db
    .select({ wordId: vocabularyWordTags.wordId })
    .from(vocabularyWordTags)
    .where(
      and(
        eq(vocabularyWordTags.tag, newKey),
        inArray(vocabularyWordTags.wordId, wordIds),
      ),
    );

  const alreadyIds = alreadyHasNew.map((row) => row.wordId);
  if (alreadyIds.length > 0) {
    await db
      .delete(vocabularyWordTags)
      .where(
        and(
          eq(vocabularyWordTags.tag, oldKey),
          inArray(vocabularyWordTags.wordId, alreadyIds),
        ),
      );
  }

  await db
    .update(vocabularyWordTags)
    .set({ tag: newKey })
    .where(
      and(
        eq(vocabularyWordTags.tag, oldKey),
        inArray(vocabularyWordTags.wordId, wordIds),
      ),
    );
}

async function removeCustomTagFromWords(workspaceId: string, name: string) {
  const wordIds = await workspaceVocabularyWordIds(workspaceId);
  if (wordIds.length === 0) return;

  await db
    .delete(vocabularyWordTags)
    .where(
      and(
        eq(vocabularyWordTags.tag, customTagKey(name)),
        inArray(vocabularyWordTags.wordId, wordIds),
      ),
    );
}

async function findWorkspaceTagByName(workspaceId: string, name: string) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;

  return db.query.workspaceTags.findFirst({
    where: and(
      eq(workspaceTags.workspaceId, workspaceId),
      sql`lower(${workspaceTags.name}) = ${normalized}`,
    ),
  });
}

export async function getWorkspaceTags(workspaceId: string) {
  const userId = await getCurrentUserId();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace || workspace.userId !== userId) {
    throw new Error("Workspace not found");
  }

  return db.query.workspaceTags.findMany({
    where: eq(workspaceTags.workspaceId, workspaceId),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}

export async function createWorkspaceTag(
  workspaceId: string,
  data: z.infer<typeof workspaceTagSchema>,
) {
  const parsed = workspaceTagSchema.parse(data);
  const userId = await getCurrentUserId();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace || workspace.userId !== userId) {
    throw new Error("Workspace not found");
  }

  const duplicate = await findWorkspaceTagByName(
    workspaceId,
    parsed.name.trim(),
  );

  if (duplicate) {
    throw new Error("TAG_EXISTS");
  }

  const [tag] = await db
    .insert(workspaceTags)
    .values({
      workspaceId,
      name: parsed.name.trim(),
    })
    .returning();

  revalidatePath("/vocabulary", "layout");
  return tag;
}

export async function updateWorkspaceTag(
  tagId: string,
  data: z.infer<typeof workspaceTagSchema>,
) {
  const parsed = workspaceTagSchema.parse(data);
  const userId = await getCurrentUserId();

  const tag = await db.query.workspaceTags.findFirst({
    where: eq(workspaceTags.id, tagId),
    with: { workspace: true },
  });

  if (!tag || tag.workspace.userId !== userId) {
    throw new Error("Tag not found");
  }

  const duplicate = await findWorkspaceTagByName(
    tag.workspaceId,
    parsed.name.trim(),
  );

  if (duplicate && duplicate.id !== tagId) {
    throw new Error("TAG_EXISTS");
  }

  const newName = parsed.name.trim();
  await retargetCustomTagOnWords(tag.workspaceId, tag.name, newName);

  const [updated] = await db
    .update(workspaceTags)
    .set({ name: newName })
    .where(eq(workspaceTags.id, tagId))
    .returning();

  revalidatePath("/", "layout");
  return updated;
}

export async function deleteWorkspaceTag(tagId: string) {
  const userId = await getCurrentUserId();

  const tag = await db.query.workspaceTags.findFirst({
    where: eq(workspaceTags.id, tagId),
    with: { workspace: true },
  });

  if (!tag || tag.workspace.userId !== userId) {
    throw new Error("Tag not found");
  }

  await removeCustomTagFromWords(tag.workspaceId, tag.name);
  await db.delete(workspaceTags).where(eq(workspaceTags.id, tagId));
  revalidatePath("/", "layout");
}

export async function getActiveWorkspaceCustomTags(): Promise<string[]> {
  const workspace = await getActiveWorkspace();
  if (!workspace) return [];

  const stored = await db.query.workspaceTags.findMany({
    where: eq(workspaceTags.workspaceId, workspace.id),
    columns: { name: true },
  });

  const fromWords = await db
    .selectDistinct({ tag: vocabularyWordTags.tag })
    .from(vocabularyWordTags)
    .innerJoin(
      vocabularyWords,
      eq(vocabularyWordTags.wordId, vocabularyWords.id),
    )
    .where(
      and(
        eq(vocabularyWords.workspaceId, workspace.id),
        sql`${vocabularyWordTags.tag} like 'custom:%'`,
      ),
    );

  return uniqueCustomTagNames([
    ...stored.map((tag) => tag.name),
    ...fromWords.map((row) => getCustomTagName(row.tag)),
  ]);
}

export async function updateActiveWorkspaceTag(
  currentName: string,
  nextName: string,
) {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    throw new Error("NO_WORKSPACE");
  }

  const parsed = workspaceTagSchema.parse({ name: nextName });
  const current = currentName.trim();
  if (!current) {
    throw new Error("Tag not found");
  }

  const stored = await findWorkspaceTagByName(workspace.id, current);
  const duplicate = await findWorkspaceTagByName(workspace.id, parsed.name);

  if (duplicate && duplicate.id !== stored?.id) {
    throw new Error("TAG_EXISTS");
  }

  if (stored) {
    return updateWorkspaceTag(stored.id, parsed);
  }

  await retargetCustomTagOnWords(workspace.id, current, parsed.name);

  const [tag] = await db
    .insert(workspaceTags)
    .values({
      workspaceId: workspace.id,
      name: parsed.name,
    })
    .returning();

  revalidatePath("/", "layout");
  return tag;
}

export async function deleteActiveWorkspaceTag(name: string) {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    throw new Error("NO_WORKSPACE");
  }

  const current = name.trim();
  if (!current) {
    throw new Error("Tag not found");
  }

  const stored = await findWorkspaceTagByName(workspace.id, current);
  await removeCustomTagFromWords(workspace.id, stored?.name ?? current);

  if (stored) {
    await db.delete(workspaceTags).where(eq(workspaceTags.id, stored.id));
  }

  revalidatePath("/", "layout");
}

export async function createActiveWorkspaceTag(name: string) {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    throw new Error("NO_WORKSPACE");
  }

  const parsed = workspaceTagSchema.parse({ name });
  const existing = await findWorkspaceTagByName(workspace.id, parsed.name);

  if (existing) {
    return { tag: existing, created: false as const };
  }

  const tag = await createWorkspaceTag(workspace.id, parsed);
  return { tag, created: true as const };
}
