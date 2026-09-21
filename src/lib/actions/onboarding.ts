"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { isValidLanguageCode } from "@/lib/languages";
import { getWorkspaceActivitySnapshot } from "@/lib/onboarding/snapshot";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";
import { resolveWorkspaceName } from "@/lib/workspace-names";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function getWorkspaceActivitySnapshotAction(
  workspaceId: string,
): Promise<WorkspaceActivitySnapshot> {
  return getWorkspaceActivitySnapshot(workspaceId);
}

const completeSchema = z.object({
  language: z.string().trim().min(2).max(16),
});

export type CompleteFirstLanguageResult = {
  workspaceId: string;
  language: string;
  alreadyHadWorkspace: boolean;
};

/**
 * Completes post-auth learning-language onboarding by creating the user's
 * first workspace. Safe to call again if the user already has a workspace
 * (returns the existing one instead of creating a duplicate).
 *
 * Reusable for email/password signup and future Google OAuth.
 */
export async function completeFirstLanguageOnboarding(
  data: z.infer<typeof completeSchema>,
): Promise<CompleteFirstLanguageResult> {
  const parsed = completeSchema.parse(data);

  if (!isValidLanguageCode(parsed.language)) {
    throw new Error("INVALID_LANGUAGE");
  }

  const userId = await getCurrentUserId();

  const existing = await db.query.workspaces.findMany({
    where: eq(workspaces.userId, userId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  if (existing.length > 0) {
    const preferred =
      existing.find((workspace) => workspace.language === parsed.language) ??
      existing[0];

    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, preferred.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    revalidatePath("/", "layout");

    return {
      workspaceId: preferred.id,
      language: preferred.language,
      alreadyHadWorkspace: true,
    };
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({
      userId,
      language: parsed.language,
      name: resolveWorkspaceName(undefined, parsed.language),
    })
    .returning();

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");

  return {
    workspaceId: workspace.id,
    language: workspace.language,
    alreadyHadWorkspace: false,
  };
}

export async function userNeedsLanguageOnboarding() {
  const userId = await getCurrentUserId();
  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, userId),
    columns: { id: true },
  });
  return !existing;
}
