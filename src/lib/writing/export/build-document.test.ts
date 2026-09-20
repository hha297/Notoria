import { describe, expect, it } from "vitest";
import {
  createDefaultEditorState,
  createEmptyDoc,
  createQuestion,
  createSection,
} from "@/lib/writing/content";
import {
  theoryDocHasExportableContent,
  writingEditorHasExportableContent,
} from "@/lib/writing/export/build-document";

describe("writingEditorHasExportableContent", () => {
  it("treats an empty rich document as not exportable", () => {
    expect(writingEditorHasExportableContent(createDefaultEditorState())).toBe(
      false,
    );
  });

  it("treats a rich document with text as exportable", () => {
    const state = createDefaultEditorState();
    state.mode = "rich_document";
    state.doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };
    expect(writingEditorHasExportableContent(state)).toBe(true);
  });

  it("ignores empty question prompts", () => {
    const state = createDefaultEditorState();
    state.mode = "question_set";
    state.sections = [createSection(0)];
    expect(writingEditorHasExportableContent(state)).toBe(false);
  });

  it("exports a question set once a prompt exists", () => {
    const state = createDefaultEditorState();
    state.mode = "question_set";
    const question = createQuestion(0);
    question.prompt = "What happened?";
    const section = createSection(0);
    section.questions = [question];
    state.sections = [section];
    expect(writingEditorHasExportableContent(state)).toBe(true);
  });
});

describe("theoryDocHasExportableContent", () => {
  it("treats an empty theory doc as not exportable", () => {
    expect(theoryDocHasExportableContent(createEmptyDoc())).toBe(false);
  });
});
