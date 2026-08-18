import type { FolderSection } from "@/db/schema";

export type { FolderSection };

export const FOLDER_SECTIONS = ["writing", "listening", "theory"] as const;

export const MAX_FOLDER_NAME_LENGTH = 80;
export const MAX_FOLDER_DEPTH = 20;

export type FolderListItem = {
  id: string;
  name: string;
  parentId: string | null;
  section: FolderSection;
  createdAt: string;
  updatedAt: string;
};

export type FolderBreadcrumb = {
  id: string | null;
  name: string;
};

export type FolderMoveItemType = "folder" | FolderSection;

export function isFolderSection(value: string): value is FolderSection {
  return (FOLDER_SECTIONS as readonly string[]).includes(value);
}

export function sameFolderId(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return (left ?? null) === (right ?? null);
}
