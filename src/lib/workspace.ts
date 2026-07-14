import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

export const WORKSPACE_COOKIE = "notoria-workspace";

export async function getUserWorkspaces() {
  const userId = await getCurrentUserId();

  return db.query.workspaces.findMany({
    where: eq(workspaces.userId, userId),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}

export async function getActiveWorkspace() {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  if (workspaceId) {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (workspace && workspace.userId === userId) {
      return workspace;
    }
  }

  const firstWorkspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, userId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return firstWorkspace ?? null;
}

export async function requireActiveWorkspace() {
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    throw new Error("No active workspace");
  }

  return workspace;
}
