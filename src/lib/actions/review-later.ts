"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  countReviewLater,
  isMarkedReviewLater,
  isReviewLaterEntityType,
  listReviewLater,
  setReviewLater,
  type ReviewLaterEntityType,
} from "@/lib/review-later/service";
import { requireActiveWorkspace, getActiveWorkspace } from "@/lib/workspace";

export async function getReviewLaterItems(limit = 12) {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return [];
  return listReviewLater({ userId, workspaceId: workspace.id, limit });
}

export async function getReviewLaterCount() {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return 0;
  return countReviewLater({ userId, workspaceId: workspace.id });
}

export async function getReviewLaterMarked(input: {
  entityType: string;
  entityId: string;
}) {
  if (!isReviewLaterEntityType(input.entityType)) return false;
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return false;
  return isMarkedReviewLater({
    userId,
    workspaceId: workspace.id,
    entityType: input.entityType,
    entityId: input.entityId,
  });
}

export async function toggleReviewLater(input: {
  entityType: string;
  entityId: string;
  titleSnapshot?: string | null;
  marked: boolean;
}) {
  if (!isReviewLaterEntityType(input.entityType)) {
    throw new Error("INVALID_ENTITY");
  }
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const result = await setReviewLater({
    userId,
    workspaceId: workspace.id,
    entityType: input.entityType as ReviewLaterEntityType,
    entityId: input.entityId,
    titleSnapshot: input.titleSnapshot,
    marked: input.marked,
  });
  revalidatePath("/");
  return result;
}
