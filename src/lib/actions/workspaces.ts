"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  vocabularyWordTags,
  workspaceTags,
  workspaces,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { isValidLanguageCode } from "@/lib/languages";
import { customTagKey } from "@/lib/vocabulary-tags";
import { resolveWorkspaceName } from "@/lib/workspace-names";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

const createWorkspaceSchema = z.object({
  name: z.string().optional(),
  language: z.string().min(2),
});

const workspaceTagSchema = z.object({
  name: z.string().min(1).max(40),
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

  const duplicate = await db.query.workspaceTags.findFirst({
    where: and(
      eq(workspaceTags.workspaceId, workspaceId),
      eq(workspaceTags.name, parsed.name.trim()),
    ),
  });

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

  const duplicate = await db.query.workspaceTags.findFirst({
    where: and(
      eq(workspaceTags.workspaceId, tag.workspaceId),
      eq(workspaceTags.name, parsed.name.trim()),
    ),
  });

  if (duplicate && duplicate.id !== tagId) {
    throw new Error("TAG_EXISTS");
  }

  const [updated] = await db
    .update(workspaceTags)
    .set({ name: parsed.name.trim() })
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

  await db
    .delete(vocabularyWordTags)
    .where(eq(vocabularyWordTags.tag, customTagKey(tagId)));

  await db.delete(workspaceTags).where(eq(workspaceTags.id, tagId));
  revalidatePath("/", "layout");
}
