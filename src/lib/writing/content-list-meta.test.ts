import { describe, expect, it } from "vitest";
import { writingListMetaFromParts } from "@/lib/writing/content";

describe("writingListMetaFromParts", () => {
  it("maps rich_document jsonb extracts without reading the TipTap doc", () => {
    expect(
      writingListMetaFromParts({
        mode: "rich_document",
        sectionCount: 4,
        questionCount: 9,
        meta: { cefrLevel: "b1", topic: "travel" },
        hasExportableContent: true,
      }),
    ).toEqual({
      mode: "rich_document",
      sectionCount: 0,
      questionCount: 0,
      hasExportableContent: true,
      meta: expect.objectContaining({
        cefrLevel: "b1",
        topic: "travel",
      }),
    });
  });

  it("maps question_set counts from sql numeric strings", () => {
    expect(
      writingListMetaFromParts({
        mode: "question_set",
        sectionCount: "2",
        questionCount: "5",
        meta: { formality: "formal" },
        hasExportableContent: "t",
      }),
    ).toEqual({
      mode: "question_set",
      sectionCount: 2,
      questionCount: 5,
      hasExportableContent: true,
      meta: expect.objectContaining({
        formality: "formal",
      }),
    });
  });

  it("treats missing exportable flags as empty", () => {
    expect(
      writingListMetaFromParts({
        mode: "rich_document",
        sectionCount: 0,
        questionCount: 0,
        meta: {},
      }).hasExportableContent,
    ).toBe(false);
  });
});
