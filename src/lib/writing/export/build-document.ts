import type { JSONContent } from "@tiptap/react";
import type { WritingEditorState } from "@/lib/writing/content";
import type {
  ExportDocumentModel,
  ExportOptions,
  ExportSection,
} from "@/lib/writing/export/types";

function collectText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }
  if (!node.content?.length) return "";
  return node.content.map(collectText).join("");
}

function tipTapToParagraphs(doc: JSONContent): string[] {
  if (!doc.content?.length) return [];

  const paragraphs: string[] = [];

  for (const block of doc.content) {
    const text = collectText(block).trim();
    if (text) {
      paragraphs.push(text);
      continue;
    }

    // Preserve empty paragraph blocks as spacing cues for export
    if (block.type === "paragraph") {
      paragraphs.push("");
    }
  }

  // Drop leading/trailing empties, keep internal blanks collapsed to one
  while (paragraphs.length > 0 && paragraphs[0] === "") paragraphs.shift();
  while (paragraphs.length > 0 && paragraphs[paragraphs.length - 1] === "") {
    paragraphs.pop();
  }

  return paragraphs;
}

export function buildExportDocument(
  title: string,
  state: WritingEditorState,
  options: Pick<ExportOptions, "includeExampleAnswers" | "includeNotes">,
  description = "",
): ExportDocumentModel {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (state.mode === "rich_document") {
    return {
      title: trimmedTitle,
      description: trimmedDescription,
      mode: "rich_document",
      sections: [],
      paragraphs: tipTapToParagraphs(state.doc),
      doc: state.doc,
    };
  }

  const sections: ExportSection[] = [...state.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      title: section.title.trim(),
      questions: [...section.questions]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter((question) => question.prompt.trim().length > 0)
        .map((question) => {
          const item: ExportSection["questions"][number] = {
            prompt: question.prompt.trim(),
          };

          if (options.includeExampleAnswers && question.exampleAnswer.trim()) {
            item.exampleAnswer = question.exampleAnswer.trim();
          }

          if (options.includeNotes && question.notes.trim()) {
            item.notes = question.notes.trim();
          }

          return item;
        }),
    }))
    .filter((section) => section.questions.length > 0 || section.title);

  return {
    title: trimmedTitle,
    description: trimmedDescription,
    mode: "question_set",
    sections,
    paragraphs: [],
    doc: null,
  };
}

export function exportDocumentIsEmpty(model: ExportDocumentModel): boolean {
  if (model.mode === "rich_document") {
    return model.paragraphs.every((paragraph) => !paragraph.trim());
  }
  return (
    model.sections.length === 0 ||
    model.sections.every((section) => section.questions.length === 0)
  );
}
