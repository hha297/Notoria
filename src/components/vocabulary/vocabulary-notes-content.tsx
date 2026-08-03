"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
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
    <RichTextEditor
      content={doc}
      editable={false}
      variant="notes"
      className={cn("border-0 bg-transparent shadow-none", className)}
    />
  );
}
