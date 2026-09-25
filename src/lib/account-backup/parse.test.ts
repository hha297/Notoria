import { describe, expect, it } from "vitest";
import { parseAccountBackup, AccountBackupParseError } from "./parse";
import { buildBackupPreview } from "./preview";

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
  ],
  theory: [
    {
      id: "t-1",
      workspaceId: "ws-1",
      folderId: "f-1",
      title: "Partitive",
      content: { type: "doc", content: [] },
    },
  ],
  exercises: [
    {
      id: "e-1",
      workspaceId: "ws-1",
      folderId: null,
      title: "Journal",
      description: null,
      type: "WRITING",
      content: {},
    },
    {
      id: "e-2",
      workspaceId: "ws-1",
      folderId: null,
      title: "Quiz",
      description: null,
      type: "QUESTIONS",
      content: {},
    },
  ],
  listening: [
    {
      id: "l-1",
      workspaceId: "ws-1",
      folderId: null,
      title: "Cafe chat",
      originalFilename: "cafe.mp3",
      mediaUrl: "https://example.com/cafe.mp3",
      mediaPublicId: "listening/cafe",
      mediaType: "audio",
      format: "mp3",
      duration: 60,
      transcript: "Hei",
      transcriptionData: null,
      language: "fi",
      cefrLevel: "A1",
      topic: null,
      formality: null,
      exerciseType: null,
      status: "COMPLETED",
      exercises: [],
    },
    {
      id: "l-2",
      workspaceId: "ws-1",
      folderId: null,
      title: "Broken media",
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
      status: "COMPLETED",
      exercises: [],
    },
  ],
  speaking: [],
  notes: [],
};

describe("account backup parse", () => {
  it("parses a current export-shaped backup", () => {
    const parsed = parseAccountBackup(sampleBackup);
    expect(parsed.version).toBe(1);
    expect(parsed.workspaces).toHaveLength(1);
    expect(parsed.vocabulary[0]?.word).toBe("kissa");
    expect(parsed.exercises).toHaveLength(2);
  });

  it("accepts older backups that only have app + version", () => {
    const { format: _format, ...legacy } = sampleBackup;
    const parsed = parseAccountBackup(legacy);
    expect(parsed.format).toBe("notoria-account-backup");
  });

  it("rejects unrelated JSON", () => {
    expect(() => parseAccountBackup({ foo: 1 })).toThrow(AccountBackupParseError);
  });
});

describe("account backup preview", () => {
  it("separates writing from other exercises and skips incomplete listening", () => {
    const backup = parseAccountBackup(sampleBackup);
    const preview = buildBackupPreview(backup, []);

    expect(preview.strategy).toBe("add_as_new");
    expect(preview.found.writing).toBe(1);
    expect(preview.found.exercises).toBe(1);
    expect(preview.willImport.listening).toBe(1);
    expect(preview.skipped.some((s) => s.reason === "listening_missing_media")).toBe(
      true,
    );
    expect(preview.notImported).toContain("Email");
  });

  it("reuses existing workspaces by language and skips duplicate vocab", () => {
    const backup = parseAccountBackup(sampleBackup);
    const preview = buildBackupPreview(
      backup,
      [{ id: "existing-ws", language: "fi" }],
      [{ workspaceId: "existing-ws", word: "kissa", partOfSpeech: "noun" }],
    );

    expect(preview.willImport.workspaces).toBe(0);
    expect(preview.reusedWorkspaces).toBe(1);
    expect(preview.willImport.vocabulary).toBe(0);
    expect(preview.willImport.theory).toBe(1);
  });
});
