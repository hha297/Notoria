import { cellForField } from "@/lib/content-import/map-columns";
import type {
  ColumnMapping,
  DocumentImportDraft,
  ImportIssue,
} from "@/lib/content-import/types";
import { MAX_DOCUMENT_IMPORT_ROWS } from "@/lib/content-import/types";
import { plainTextToTheoryDoc } from "@/lib/theory/content";
import {
  createDefaultEditorState,
  serializeWritingContent,
} from "@/lib/writing/content";
import type { JSONContent } from "@tiptap/react";

function issue(
  code: ImportIssue["code"],
  rowIndex: number,
  message: string,
  snippet?: string,
): ImportIssue {
  return { code, rowIndex, message, snippet };
}

export function mapDocumentRows(
  rows: string[][],
  mappings: ColumnMapping[],
): DocumentImportDraft[] {
  const drafts: DocumentImportDraft[] = [];

  for (
    let i = 0;
    i < rows.length && drafts.length < MAX_DOCUMENT_IMPORT_ROWS;
    i++
  ) {
    const row = rows[i] ?? [];
    const title = cellForField(row, mappings, "title");
    const content = cellForField(row, mappings, "content");
    const category = cellForField(row, mappings, "category") || undefined;
    const snippet = row.filter(Boolean).slice(0, 3).join(" · ");
    const issues: ImportIssue[] = [];

    if (!title && !content) {
      issues.push(
        issue(
          "EMPTY_ROW",
          i,
          "This row is empty. Skip it or add a title and content.",
          snippet,
        ),
      );
    } else {
      if (!title) {
        issues.push(
          issue(
            "MISSING_TITLE",
            i,
            "We couldn't find a title. Add one or skip this row.",
            snippet,
          ),
        );
      }
      if (!content) {
        issues.push(
          issue(
            "MISSING_CONTENT",
            i,
            "We couldn't find the document content. Add text or skip this row.",
            snippet,
          ),
        );
      }
    }

    drafts.push({
      title,
      content,
      category,
      rowIndex: i,
      status: issues.length > 0 ? "issue" : "ready",
      issues,
    });
  }

  return drafts;
}

export function documentFromPlainText(input: {
  title: string;
  text: string;
}): DocumentImportDraft {
  const issues: ImportIssue[] = [];
  if (!input.title.trim()) {
    issues.push(
      issue("MISSING_TITLE", 0, "Add a title for this document.", input.title),
    );
  }
  if (!input.text.trim()) {
    issues.push(
      issue(
        "MISSING_CONTENT",
        0,
        "We couldn't find readable text in this file.",
      ),
    );
  }
  return {
    title: input.title.trim() || "Imported document",
    content: input.text.trim(),
    rowIndex: 0,
    status: issues.length > 0 ? "issue" : "ready",
    issues,
  };
}

export function plainTextToWritingDoc(text: string): JSONContent {
  return plainTextToTheoryDoc(text);
}

export function writingContentFromPlainText(text: string) {
  const state = createDefaultEditorState("rich_document");
  state.doc = plainTextToWritingDoc(text);
  return serializeWritingContent(state);
}
