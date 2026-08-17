import type { JSONContent } from "@tiptap/react";
import type { WritingEditorState } from "@/lib/writing/content";

export function jsonContentToPlainText(doc: JSONContent | null | undefined) {
  if (!doc) return "";

  const parts: string[] = [];

  function walk(node: JSONContent) {
    if (node.type === "text") {
      if (node.text) parts.push(node.text);
      return;
    }

    const isBlock =
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "listItem" ||
      node.type === "blockquote";

    node.content?.forEach((child, index) => {
      if (index > 0 && isBlock) parts.push("\n");
      walk(child);
    });

    if (isBlock) parts.push("\n");
  }

  walk(doc);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function writingEditorPlainText(state: WritingEditorState) {
  if (state.mode === "rich_document") {
    return jsonContentToPlainText(state.doc);
  }

  return state.sections
    .flatMap((section) =>
      section.questions.flatMap((question) =>
        [question.prompt, question.exampleAnswer].filter((value) =>
          value.trim(),
        ),
      ),
    )
    .join("\n\n")
    .trim();
}

export function replaceFirstOccurrence(
  haystack: string,
  original: string,
  replacement: string,
) {
  const index = haystack.indexOf(original);
  if (index === -1) return haystack;
  return (
    haystack.slice(0, index) + replacement + haystack.slice(index + original.length)
  );
}

export function lastSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const parts = trimmed
    .split(/(?<=[.!?…])(?:\s+|\n+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) ?? trimmed;
}

export function contentContainsPhrase(content: string, phrase: string) {
  const original = phrase.trim();
  if (!original) return false;
  if (content.includes(original)) return true;
  return content.replace(/\s+/g, " ").includes(original.replace(/\s+/g, " "));
}

export function writingFocusText(
  action: "check" | "correct" | "improve" | "vocabulary" | "continue",
  content: string,
  selectedText?: string | null,
) {
  const selected = selectedText?.trim() ?? "";
  if (action === "improve") return selected || lastSentence(content);
  if (action === "correct" || action === "vocabulary") {
    return selected || content;
  }
  return content;
}
