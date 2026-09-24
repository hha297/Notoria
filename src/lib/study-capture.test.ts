import { describe, expect, it } from "vitest";
import { isReviewLaterEntityType } from "@/lib/review-later/entity-type";
import {
  studyInboxCaptureSchema,
  studyInboxProcessTargetSchema,
} from "@/schemas/study-inbox";
import {
  parseWritingMeta,
  serializeWritingMeta,
} from "@/lib/writing/meta";

describe("isReviewLaterEntityType", () => {
  it("accepts supported learning entity types", () => {
    expect(isReviewLaterEntityType("vocabulary")).toBe(true);
    expect(isReviewLaterEntityType("theory")).toBe(true);
    expect(isReviewLaterEntityType("writing")).toBe(true);
    expect(isReviewLaterEntityType("listening")).toBe(true);
  });

  it("rejects inbox and unknown types", () => {
    expect(isReviewLaterEntityType("inbox")).toBe(false);
    expect(isReviewLaterEntityType("folder")).toBe(false);
    expect(isReviewLaterEntityType("")).toBe(false);
  });
});

describe("studyInboxCaptureSchema", () => {
  it("requires trimmed content", () => {
    expect(studyInboxCaptureSchema.safeParse({ content: "" }).success).toBe(
      false,
    );
    expect(studyInboxCaptureSchema.safeParse({ content: "  " }).success).toBe(
      false,
    );
    expect(
      studyInboxCaptureSchema.safeParse({
        content: "sana",
        note: "",
        source: "",
      }).success,
    ).toBe(true);
  });

  it("accepts optional note and source", () => {
    const parsed = studyInboxCaptureSchema.parse({
      content: "plural partitive",
      note: "from class",
      source: "textbook",
    });
    expect(parsed.content).toBe("plural partitive");
    expect(parsed.note).toBe("from class");
    expect(parsed.source).toBe("textbook");
  });
});

describe("studyInboxProcessTargetSchema", () => {
  it("accepts conversion and housekeeping targets", () => {
    for (const target of [
      "vocabulary",
      "theory",
      "writing",
      "exercise",
      "keep",
      "delete",
    ]) {
      expect(studyInboxProcessTargetSchema.parse(target)).toBe(target);
    }
  });
});

describe("writing meta kind", () => {
  it("parses and serializes learning_note kind", () => {
    const parsed = parseWritingMeta({
      cefrLevel: "b1",
      kind: "learning_note",
    });
    expect(parsed.kind).toBe("learning_note");
    expect(serializeWritingMeta(parsed).kind).toBe("learning_note");
  });

  it("drops unknown kind values", () => {
    expect(parseWritingMeta({ kind: "journal" }).kind).toBeNull();
  });
});
