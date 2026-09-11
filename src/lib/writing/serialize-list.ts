import type { WritingListItem } from "@/components/writing/writing-card";
import type { WritingListMeta } from "@/lib/writing/content";

type WritingListDocument = {
  id: string;
  title: string;
  description: string | null;
  listMeta: WritingListMeta;
  folderId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toIso(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

export function serializeWritingListDocuments(
  documents: WritingListDocument[],
): WritingListItem[] {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    description: document.description,
    listMeta: document.listMeta,
    folderId: document.folderId ?? null,
    createdAt: toIso(document.createdAt),
    updatedAt: toIso(document.updatedAt),
  }));
}
