import type { Editor } from "@tiptap/react";
import type { WritingEditorState } from "@/lib/writing/content";
import { replaceFirstOccurrence } from "@/lib/writing/plain-text";

export type TextSegment = { pos: number; text: string };

export function findRangeInSegments(
  segments: TextSegment[],
  search: string,
): { from: number; to: number } | null {
  const needle = search.trim();
  if (!needle) return null;

  let haystack = "";
  const indexToPos: number[] = [];
  for (const segment of segments) {
    for (let i = 0; i < segment.text.length; i++) {
      haystack += segment.text[i];
      indexToPos.push(segment.pos + i);
    }
  }

  const index = haystack.indexOf(needle);
  if (index === -1) return null;
  const from = indexToPos[index];
  const last = indexToPos[index + needle.length - 1];
  if (from == null || last == null) return null;
  return { from, to: last + 1 };
}

function editorTextSegments(editor: Editor): TextSegment[] {
  const segments: TextSegment[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ pos, text: node.text });
    }
    return true;
  });
  return segments;
}

export function replaceInEditor(
  editor: Editor,
  original: string,
  replacement: string,
) {
  const found = findRangeInSegments(editorTextSegments(editor), original);
  if (!found) return false;
  editor.chain().focus().insertContentAt(found, replacement).run();
  return true;
}

export function replaceInQuestionSet(
  state: WritingEditorState,
  original: string,
  replacement: string,
): { state: WritingEditorState; replaced: boolean } {
  let replaced = false;

  const sections = state.sections.map((section) => ({
    ...section,
    questions: section.questions.map((question) => {
      if (replaced) return question;
      if (question.prompt.includes(original)) {
        replaced = true;
        return {
          ...question,
          prompt: replaceFirstOccurrence(
            question.prompt,
            original,
            replacement,
          ),
        };
      }
      if (question.exampleAnswer.includes(original)) {
        replaced = true;
        return {
          ...question,
          exampleAnswer: replaceFirstOccurrence(
            question.exampleAnswer,
            original,
            replacement,
          ),
        };
      }
      return question;
    }),
  }));

  return { state: { ...state, sections }, replaced };
}
