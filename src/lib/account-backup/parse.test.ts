import { describe, expect, it } from "vitest";
import { parseAccountBackup, AccountBackupParseError } from "./parse";
import { buildBackupPreview } from "./preview";
import {
  contentTitleKey,
  normalizeBackupName,
  vocabWordKey,
} from "./match";
import { emptyInventory } from "./match";

const sampleBackup = {
  version: 1,
  format: "notoria-account-backup",
  app: "notoria",
  exportedAt: "2026-03-25T12:00:00.000Z",
  account: {
    name: "Other User",
    email: "other@example.com",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  workspaces: [
    {
      id: "ws-1",
      name: "Finnish",
      language: "fi",
      tags: ["A1", "travel"],
      folders: [
        { id: "f-1", section: "theory", name: "Cases", parentId: null },
        { id: "f-2", section: "theory", name: "Cases", parentId: null },
        {
          id: "f-3",
          section: "writing",
          name: "Kirjoittaminen",
          parentId: null,
        },
      ],
    },
  ],
  vocabulary: [
    {
      id: "v-1",
      workspaceId: "ws-1",
      word: "kissa",
      partOfSpeech: "noun",
      synonyms: null,
      notes: null,
      status: "NEW",
      meanings: [{ meaning: "cat", isPrimary: true, sortOrder: 0 }],
      examples: [],
      tags: ["animals"],
    },
    {
      id: "v-2",
      workspaceId: "ws-1",
      word: "kissa",
      partOfSpeech: "verb",
      synonyms: null,
      notes: null,
      status: "NEW",
      meanings: [],
      examples: [],
      tags: [],
    },
  ],
  theory: [
    {
      id: "t-1",
      workspaceId: "ws-1",
      folderId: "f-1",
      title: "Partitive",
      content: { type: "doc", content: [] },
    },
    {
      id: "t-2",
      workspaceId: "ws-1",
      folderId: "f-2",
      title: "Partitive",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    },
  ],
  exercises: [
    {
      id: "e-1",
      workspaceId: "ws-1",
      folderId: null,
      title: "Quiz 1",
      description: null,
      type: "QUESTIONS",
      content: {},
    },
    {
      id: "w-1",
      workspaceId: "ws-1",
      folderId: "f-3",
      title: "Essay",
      description: null,
      type: "WRITING",
      content: {},
    },
    {
      id: "w-2",
      workspaceId: "ws-1",
      folderId: null,
      title: "Essay",
      description: "other folder",
      type: "WRITING",
      content: {},
    },
  ],
  listening: [
    {
      id: "l-1",
      workspaceId: "ws-1",
      title: "Cafe chat",
      originalFilename: "cafe.mp3",
      mediaUrl: "https://example.com/a.mp3",
      mediaPublicId: "a",
      mediaType: "audio",
      format: "mp3",
      duration: 10,
      transcript: null,
      transcriptionData: null,
      language: "fi",
      cefrLevel: null,
      topic: null,
      formality: null,
      exerciseType: null,
      status: "COMPLETED",
      folderId: null,
      exercises: [],
    },
    {
      id: "l-2",
      workspaceId: "ws-1",
      title: "Cafe chat",
      originalFilename: "other.mp3",
      mediaUrl: "https://example.com/b.mp3",
      mediaPublicId: "b",
      mediaType: "audio",
      format: "mp3",
      duration: 10,
      transcript: null,
      transcriptionData: null,
      language: "fi",
      cefrLevel: null,
      topic: null,
      formality: null,
      exerciseType: null,
      status: "COMPLETED",
      folderId: null,
      exercises: [],
    },
    {
      id: "l-3",
      workspaceId: "ws-1",
      title: "Broken",
      originalFilename: "broken.mp3",
      mediaUrl: null,
      mediaPublicId: null,
      mediaType: "audio",
      format: "mp3",
      duration: null,
      transcript: null,
      transcriptionData: null,
      language: "fi",
      cefrLevel: null,
      topic: null,
      formality: null,
      exerciseType: null,
      status: "FAILED",
      folderId: null,
      exercises: [],
    },
  ],
  speaking: [
    {
      id: "s-1",
      workspaceId: "ws-1",
      title: "daily life · B1",
      language: "fi",
      status: "completed",
      startedAt: "2026-08-19T14:38:53.593Z",
      transcript: "a",
      transcriptUrl: null,
      recordingUrl: null,
      summary: null,
      topic: "daily",
      cefrLevel: "b1",
      notes: null,
      endedAt: null,
    },
    {
      id: "s-2",
      workspaceId: "ws-1",
      title: "daily life · B1",
      language: "fi",
      status: "completed",
      startedAt: "2026-09-01T10:00:00.000Z",
      transcript: "b",
      transcriptUrl: null,
      recordingUrl: null,
      summary: null,
      topic: "daily",
      cefrLevel: "b1",
      notes: null,
      endedAt: null,
    },
  ],
  notes: [],
};

describe("normalizeBackupName", () => {
  it("trims and applies NFC without changing case or accents", () => {
    expect(normalizeBackupName("  Café  ")).toBe("Café");
    expect(normalizeBackupName("Kissa")).not.toBe(normalizeBackupName("kissa"));
  });
});

describe("parseAccountBackup", () => {
  it("parses a valid backup document", () => {
    const backup = parseAccountBackup(sampleBackup);
    expect(backup.workspaces).toHaveLength(1);
    expect(backup.vocabulary).toHaveLength(2);
  });

  it("rejects documents that do not look like a Notoria backup", () => {
    expect(() =>
      parseAccountBackup({ hello: "world" }),
    ).toThrow(AccountBackupParseError);
  });
});


describe("buildBackupPreview", () => {
  it("reports writing vs exercise counts and listening media gaps", () => {
    const backup = parseAccountBackup(sampleBackup);
    const preview = buildBackupPreview(backup, []);

    expect(preview.strategy).toBe("add_as_new");
    expect(preview.found.writing).toBe(2);
    expect(preview.found.exercises).toBe(1);
    expect(preview.willImport.listening).toBe(1);
    expect(
      preview.skipped.some((s) => s.reason === "listening_missing_media"),
    ).toBe(true);
    expect(preview.notImported).toContain("Email");
  });

  it("skips same-name folders, theory, writing, vocab POS variants, speaking, listening", () => {
    const backup = parseAccountBackup(sampleBackup);
    const preview = buildBackupPreview(backup, []);

    // Two "Cases" folders in backup → one import, one skip (in-file, not account)
    expect(preview.willImport.folders).toBe(2); // Cases + Kirjoittaminen
    expect(
      preview.skipped.some(
        (s) => s.reason === "folder_duplicate" && s.source === "backup",
      ),
    ).toBe(true);

    // Two Partitive theory pages → one
    expect(preview.willImport.theory).toBe(1);
    expect(
      preview.skipped.some(
        (s) => s.reason === "theory_duplicate" && s.source === "backup",
      ),
    ).toBe(true);

    // Two Essay writing docs → one
    expect(preview.willImport.writing).toBe(1);
    expect(
      preview.skipped.some(
        (s) => s.reason === "writing_duplicate" && s.source === "backup",
      ),
    ).toBe(true);

    // kissa noun + verb → one vocab
    expect(preview.willImport.vocabulary).toBe(1);
    expect(
      preview.skipped.some(
        (s) => s.reason === "vocabulary_duplicate" && s.source === "backup",
      ),
    ).toBe(true);

    // Two speaking same title → one
    expect(preview.willImport.speaking).toBe(1);
    expect(
      preview.skipped.some(
        (s) => s.reason === "speaking_duplicate" && s.source === "backup",
      ),
    ).toBe(true);

    // Two Cafe chat titles → one listening (+ one missing media)
    expect(preview.willImport.listening).toBe(1);
    expect(
      preview.skipped.some(
        (s) => s.reason === "listening_duplicate" && s.source === "backup",
      ),
    ).toBe(true);
  });

  it("reuses existing workspaces and skips existing content by name", () => {
    const backup = parseAccountBackup(sampleBackup);
    const inventory = emptyInventory([
      { id: "existing-ws", language: "fi", name: "Suomi" },
    ]);
    inventory.vocabulary.add(vocabWordKey("existing-ws", "kissa"));
    inventory.theory.add(contentTitleKey("existing-ws", "theory", "Partitive"));
    inventory.folders.set(
      `existing-ws::theory::::${normalizeBackupName("Cases")}`,
      "folder-existing",
    );
    inventory.speaking.add(
      contentTitleKey("existing-ws", "speaking", "daily life · B1"),
    );

    const preview = buildBackupPreview(backup, inventory);

    expect(preview.willImport.workspaces).toBe(0);
    expect(preview.reusedWorkspaces).toBe(1);
    expect(preview.willImport.vocabulary).toBe(0);
    expect(preview.willImport.theory).toBe(0);
    expect(preview.willImport.speaking).toBe(0);
    expect(
      preview.skipped.some(
        (s) => s.reason === "folder_duplicate" && s.source === "account",
      ),
    ).toBe(true);
    expect(
      preview.skipped.some(
        (s) => s.reason === "vocabulary_duplicate" && s.source === "account",
      ),
    ).toBe(true);
  });

  it("keeps same titles independent across unrelated sections", () => {
    const backup = parseAccountBackup({
      ...sampleBackup,
      theory: [
        {
          id: "t-1",
          workspaceId: "ws-1",
          folderId: null,
          title: "Shared Title",
          content: { type: "doc", content: [] },
        },
      ],
      exercises: [
        {
          id: "e-1",
          workspaceId: "ws-1",
          folderId: null,
          title: "Shared Title",
          description: null,
          type: "QUESTIONS",
          content: {},
        },
        {
          id: "w-1",
          workspaceId: "ws-1",
          folderId: null,
          title: "Shared Title",
          description: null,
          type: "WRITING",
          content: {},
        },
      ],
      vocabulary: [],
      listening: [],
      speaking: [],
      workspaces: [
        {
          id: "ws-1",
          name: "Finnish",
          language: "fi",
          tags: [],
          folders: [],
        },
      ],
    });

    const preview = buildBackupPreview(backup, []);
    expect(preview.willImport.theory).toBe(1);
    expect(preview.willImport.exercises).toBe(1);
    expect(preview.willImport.writing).toBe(1);
  });
});
