import type { FolderSection } from "@/lib/folders/types";

export function sectionRootHref(section: FolderSection) {
  return `/${section}`;
}

export function folderHref(section: FolderSection, folderId: string | null) {
  if (!folderId) {
    return sectionRootHref(section);
  }
  return `/${section}/folders/${folderId}`;
}

export function sectionCreateHref(
  section: Exclude<FolderSection, "listening">,
  folderId: string | null,
) {
  const base = `/${section}/new`;
  return folderId ? `${base}?folder=${folderId}` : base;
}
