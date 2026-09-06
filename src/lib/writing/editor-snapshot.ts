import {
  serializeWritingContent,
  writingContentHasPrompt,
  type WritingEditorState,
} from "@/lib/writing/content";
import { normalizeDescription } from "@/lib/description-content";

export type WritingEditorSnapshot = {
  title: string;
  description: string;
  content: string;
};

export function buildWritingEditorSnapshot(input: {
  title: string;
  description: string;
  editorState: WritingEditorState;
}): WritingEditorSnapshot {
  return {
    title: input.title.trim(),
    description: normalizeDescription(input.description),
    content: JSON.stringify(serializeWritingContent(input.editorState)),
  };
}

export function writingEditorSnapshotsEqual(
  a: WritingEditorSnapshot,
  b: WritingEditorSnapshot,
) {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.content === b.content
  );
}

export function writingEditorHasRequiredContent(
  title: string,
  editorState: WritingEditorState,
) {
  if (!title.trim()) return false;
  if (editorState.mode === "question_set") {
    return writingContentHasPrompt(editorState);
  }
  return true;
}
