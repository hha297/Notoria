"use server";

import { getWorkspaceActivitySnapshot } from "@/lib/onboarding/snapshot";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";

export async function getWorkspaceActivitySnapshotAction(
  workspaceId: string,
): Promise<WorkspaceActivitySnapshot> {
  return getWorkspaceActivitySnapshot(workspaceId);
}
