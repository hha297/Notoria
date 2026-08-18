import { z } from "zod";
import { MAX_FOLDER_NAME_LENGTH } from "@/lib/folders/types";

export const folderSectionSchema = z.enum(["writing", "listening", "theory"]);

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(MAX_FOLDER_NAME_LENGTH);

export const createFolderSchema = z.object({
  section: folderSectionSchema,
  parentId: z.string().uuid().nullable().optional(),
  name: folderNameSchema,
});

export const renameFolderSchema = z.object({
  id: z.string().uuid(),
  name: folderNameSchema,
});

export const moveIntoFolderSchema = z.object({
  itemType: z.enum(["folder", "writing", "listening", "theory"]),
  id: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
});

export type CreateFolderValues = z.infer<typeof createFolderSchema>;
export type RenameFolderValues = z.infer<typeof renameFolderSchema>;
export type MoveIntoFolderValues = z.infer<typeof moveIntoFolderSchema>;
