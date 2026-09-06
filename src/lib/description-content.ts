import type { JSONContent } from "@tiptap/react";
import {
  EMPTY_NOTES_DOC,
  isNotesDocEmpty,
  isTipTapDoc,
  parseVocabularyNotes,
  vocabularyNotesToPlainText,
} from "@/lib/vocabulary/notes-content";

export const EMPTY_DESCRIPTION_DOC: JSONContent = structuredClone(EMPTY_NOTES_DOC);

/** Parse stored description (TipTap JSON or legacy plain text with newlines/bullets). */
export function parseDescription(raw: string | null | undefined): JSONContent {
  return parseVocabularyNotes(raw);
}

export function isDescriptionEmpty(doc: JSONContent) {
  return isNotesDocEmpty(doc);
}

/**
 * Persist description as plain text so search/export/limits stay simple.
 * TipTap lists become `- ` / `1. ` lines; paragraphs keep newlines.
 */
export function descriptionDocToStored(doc: JSONContent): string {
  if (isNotesDocEmpty(doc)) return "";
  return vocabularyNotesToPlainText(JSON.stringify(doc));
}

/** Flatten any stored description (JSON or plain) to display/export plain text. */
export function descriptionToPlainText(raw: string | null | undefined): string {
  return vocabularyNotesToPlainText(raw);
}

/** Normalize for dirty checks (stable across TipTap round-trips). */
export function normalizeDescription(raw: string | null | undefined): string {
  return descriptionToPlainText(raw).trim();
}

export function descriptionPlainLength(raw: string | null | undefined): number {
  return descriptionToPlainText(raw).length;
}

export { isTipTapDoc };
