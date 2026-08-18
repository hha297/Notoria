"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  workspaceFolders,
  type FolderSection,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  canCreateChildFolder,
  descendantIds,
  wouldCreateCycle,
} from "@/lib/folders/tree";
import {
  type FolderListItem,
  type FolderMoveItemType,
} from "@/lib/folders/types";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import {
  createFolderSchema,
  moveIntoFolderSchema,
  renameFolderSchema,
} from "@/schemas/folder";

function toFolderListItem(
  folder: typeof workspaceFolders.$inferSelect,
): FolderListItem {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId ?? null,
    section: folder.section,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

function revalidateSection(section: FolderSection) {
  revalidatePath(`/${section}`, "layout");
}

async function requireOwnedFolder(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const folder = await db.query.workspaceFolders.findFirst({
    where: eq(workspaceFolders.id, id),
  });

  if (
    !folder ||
    folder.userId !== userId ||
    folder.workspaceId !== workspace.id
  ) {
    throw new Error("FOLDER_NOT_FOUND");
  }

  return { folder, userId, workspace };
}

async function requireOwnedDestination(
  folderId: string | null,
  section: FolderSection,
) {
  if (!folderId) return null;
  const { folder } = await requireOwnedFolder(folderId);
  if (folder.section !== section) {
    throw new Error("FOLDER_NOT_FOUND");
  }
  return folder;
}

export async function getFolders(
  section: FolderSection,
): Promise<FolderListItem[]> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  const folders = await db.query.workspaceFolders.findMany({
    where: and(
      eq(workspaceFolders.userId, userId),
      eq(workspaceFolders.workspaceId, workspace.id),
      eq(workspaceFolders.section, section),
    ),
  });

  return folders.map(toFolderListItem);
}

export async function getFolder(
  id: string,
  section: FolderSection,
): Promise<FolderListItem | null> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return null;
  }

  const folder = await db.query.workspaceFolders.findFirst({
    where: eq(workspaceFolders.id, id),
  });

  if (
    !folder ||
    folder.userId !== userId ||
    folder.workspaceId !== workspace.id ||
    folder.section !== section
  ) {
    return null;
  }

  return toFolderListItem(folder);
}

export async function createFolder(input: {
  section: FolderSection;
  parentId?: string | null;
  name: string;
}) {
  const parsed = createFolderSchema.parse(input);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();
  const parentId = parsed.parentId ?? null;

  const existing = await db.query.workspaceFolders.findMany({
    where: and(
      eq(workspaceFolders.userId, userId),
      eq(workspaceFolders.workspaceId, workspace.id),
      eq(workspaceFolders.section, parsed.section),
    ),
  });
  const folders = existing.map(toFolderListItem);

  if (parentId) {
    const parent = folders.find((folder) => folder.id === parentId);
    if (!parent) {
      throw new Error("FOLDER_NOT_FOUND");
    }
  }

  if (!canCreateChildFolder(folders, parentId)) {
    throw new Error("FOLDER_TOO_DEEP");
  }

  const [folder] = await db
    .insert(workspaceFolders)
    .values({
      userId,
      workspaceId: workspace.id,
      section: parsed.section,
      parentId,
      name: parsed.name,
    })
    .returning();

  revalidateSection(parsed.section);
  return toFolderListItem(folder);
}

export async function renameFolder(input: { id: string; name: string }) {
  const parsed = renameFolderSchema.parse(input);
  const { folder } = await requireOwnedFolder(parsed.id);

  const [updated] = await db
    .update(workspaceFolders)
    .set({
      name: parsed.name,
      updatedAt: new Date(),
    })
    .where(eq(workspaceFolders.id, parsed.id))
    .returning();

  revalidateSection(folder.section);
  return toFolderListItem(updated);
}

export async function deleteFolder(id: string) {
  const { folder, userId, workspace } = await requireOwnedFolder(id);
  const existing = await db.query.workspaceFolders.findMany({
    where: and(
      eq(workspaceFolders.userId, userId),
      eq(workspaceFolders.workspaceId, workspace.id),
      eq(workspaceFolders.section, folder.section),
    ),
  });
  const folders = existing.map(toFolderListItem);
  const ids = [id, ...descendantIds(folders, id)];

  await db
    .delete(workspaceFolders)
    .where(inArray(workspaceFolders.id, ids));

  revalidateSection(folder.section);
}

export async function moveIntoFolder(input: {
  itemType: FolderMoveItemType;
  id: string;
  folderId: string | null;
}) {
  const parsed = moveIntoFolderSchema.parse(input);
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  if (parsed.itemType === "folder") {
    const { folder } = await requireOwnedFolder(parsed.id);
    const destination = await requireOwnedDestination(
      parsed.folderId,
      folder.section,
    );

    const existing = await db.query.workspaceFolders.findMany({
      where: and(
        eq(workspaceFolders.userId, userId),
        eq(workspaceFolders.workspaceId, workspace.id),
        eq(workspaceFolders.section, folder.section),
      ),
    });
    const folders = existing.map(toFolderListItem);

    if (wouldCreateCycle(folders, parsed.id, parsed.folderId)) {
      throw new Error("INVALID_FOLDER_MOVE");
    }

    if (!canCreateChildFolder(folders, parsed.folderId)) {
      throw new Error("FOLDER_TOO_DEEP");
    }

    if ((folder.parentId ?? null) === (destination?.id ?? null)) {
      return toFolderListItem(folder);
    }

    const [updated] = await db
      .update(workspaceFolders)
      .set({
        parentId: destination?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(workspaceFolders.id, parsed.id))
      .returning();

    revalidateSection(folder.section);
    return toFolderListItem(updated);
  }

  const destination = await requireOwnedDestination(
    parsed.folderId,
    parsed.itemType,
  );
  const nextFolderId = destination?.id ?? null;

  if (parsed.itemType === "writing") {
    const document = await db.query.exercises.findFirst({
      where: eq(exercises.id, parsed.id),
    });
    if (
      !document ||
      document.userId !== userId ||
      document.workspaceId !== workspace.id ||
      document.type !== "WRITING"
    ) {
      throw new Error("ITEM_NOT_FOUND");
    }
    if ((document.folderId ?? null) === nextFolderId) {
      return { id: document.id };
    }
    await db
      .update(exercises)
      .set({ folderId: nextFolderId, updatedAt: new Date() })
      .where(eq(exercises.id, parsed.id));
    revalidateSection("writing");
    return { id: document.id };
  }

  if (parsed.itemType === "listening") {
    const lesson = await db.query.listeningLessons.findFirst({
      where: eq(listeningLessons.id, parsed.id),
    });
    if (
      !lesson ||
      lesson.userId !== userId ||
      lesson.workspaceId !== workspace.id
    ) {
      throw new Error("ITEM_NOT_FOUND");
    }
    if ((lesson.folderId ?? null) === nextFolderId) {
      return { id: lesson.id };
    }
    await db
      .update(listeningLessons)
      .set({ folderId: nextFolderId, updatedAt: new Date() })
      .where(eq(listeningLessons.id, parsed.id));
    revalidateSection("listening");
    return { id: lesson.id };
  }

  const note = await db.query.grammarNotes.findFirst({
    where: eq(grammarNotes.id, parsed.id),
  });
  if (
    !note ||
    note.userId !== userId ||
    note.workspaceId !== workspace.id
  ) {
    throw new Error("ITEM_NOT_FOUND");
  }
  if ((note.folderId ?? null) === nextFolderId) {
    return { id: note.id };
  }
  await db
    .update(grammarNotes)
    .set({ folderId: nextFolderId, updatedAt: new Date() })
    .where(eq(grammarNotes.id, parsed.id));
  revalidateSection("theory");
  return { id: note.id };
}

export async function resolveFolderId(
  folderId: string | null | undefined,
  section: FolderSection,
) {
  if (!folderId) return null;
  const folder = await getFolder(folderId, section);
  return folder?.id ?? null;
}
