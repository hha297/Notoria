"use client";

import { RichTextContent } from "@/components/editor/rich-text-content";
import {
  isNotesDocEmpty,
  parseVocabularyNotes,
} from "@/lib/vocabulary/notes-content";
import { cn } from "@/lib/utils";

type VocabularyNotesContentProps = {
  notes?: string | null;
  className?: string;
};

/** Read-only TipTap notes (supports legacy plain text). */
export function VocabularyNotesContent({
  notes,
  className,
}: VocabularyNotesContentProps) {
  const doc = parseVocabularyNotes(notes);

  if (isNotesDocEmpty(doc)) {
    return null;
  }

  return (
    <RichTextContent
      content={doc}
      variant="notes"
      className={cn("border-0 bg-transparent shadow-none", className)}
    />
  );
}
