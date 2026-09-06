import { describe, expect, it } from "vitest";
import { EMPTY_NOTES_DOC } from "@/lib/vocabulary/notes-content";
import {
  buildVocabularyFormSnapshot,
  vocabularyFormHasRequiredContent,
  vocabularyFormSnapshotsEqual,
} from "@/lib/vocabulary/form-snapshot";

describe("vocabulary form snapshot", () => {
  it("treats empty default create form as incomplete", () => {
    const snapshot = buildVocabularyFormSnapshot({
      word: "",
      partOfSpeech: undefined,
      notesDoc: structuredClone(EMPTY_NOTES_DOC),
      meanings: [{ meaning: "", isPrimary: true }],
      examples: [{ sentence: "", meaning: "", notes: "" }],
      tags: [],
      synonymIds: [],
    });

    expect(vocabularyFormHasRequiredContent(snapshot)).toBe(false);
  });

  it("detects required content once word and meaning exist", () => {
    const snapshot = buildVocabularyFormSnapshot({
      word: "  kestävä ",
      partOfSpeech: "adjective",
      notesDoc: structuredClone(EMPTY_NOTES_DOC),
      meanings: [{ meaning: " durable ", isPrimary: true }],
      examples: [{ sentence: "", meaning: "", notes: "" }],
      tags: [],
      synonymIds: [],
    });

    expect(snapshot.word).toBe("kestävä");
    expect(vocabularyFormHasRequiredContent(snapshot)).toBe(true);
  });

  it("ignores empty example rows when comparing equality", () => {
    const base = buildVocabularyFormSnapshot({
      word: "talo",
      partOfSpeech: "noun",
      notesDoc: structuredClone(EMPTY_NOTES_DOC),
      meanings: [{ meaning: "house", isPrimary: true }],
      examples: [],
      tags: [],
      synonymIds: [],
    });
    const withEmptyExample = buildVocabularyFormSnapshot({
      word: "talo",
      partOfSpeech: "noun",
      notesDoc: structuredClone(EMPTY_NOTES_DOC),
      meanings: [{ meaning: "house", isPrimary: true }],
      examples: [{ sentence: "  ", meaning: "", notes: "" }],
      tags: [],
      synonymIds: [],
    });

    expect(vocabularyFormSnapshotsEqual(base, withEmptyExample)).toBe(true);
  });

  it("marks meaning edits as dirty", () => {
    const original = buildVocabularyFormSnapshot({
      word: "kestävä",
      partOfSpeech: "adjective",
      notesDoc: structuredClone(EMPTY_NOTES_DOC),
      meanings: [{ meaning: "durable", isPrimary: true }],
      examples: [],
      tags: [],
      synonymIds: [],
    });
    const edited = buildVocabularyFormSnapshot({
      word: "kestävä",
      partOfSpeech: "adjective",
      notesDoc: structuredClone(EMPTY_NOTES_DOC),
      meanings: [{ meaning: "durable / sustainable", isPrimary: true }],
      examples: [],
      tags: [],
      synonymIds: [],
    });

    expect(vocabularyFormSnapshotsEqual(original, edited)).toBe(false);
  });
});
