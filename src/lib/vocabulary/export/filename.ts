import { slugifyFilenamePart } from "@/lib/writing/export/filename";
import type { VocabularyExportFormat } from "@/lib/vocabulary/export/types";

export function buildVocabularyExportFilename(
  workspaceName: string,
  format: VocabularyExportFormat,
  now = new Date(),
): string {
  const slug = slugifyFilenamePart(workspaceName.trim());
  const date = now.toISOString().slice(0, 10);

  if (slug) {
    return `vocabulary-${slug}.${format}`;
  }

  return `vocabulary-${date}.${format}`;
}
