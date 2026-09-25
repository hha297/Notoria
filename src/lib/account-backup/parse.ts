import {
  ACCOUNT_BACKUP_APP,
  ACCOUNT_BACKUP_FORMAT,
  SUPPORTED_BACKUP_VERSIONS,
  type AccountBackupDocument,
  type BackupExercise,
  type BackupFolder,
  type BackupListeningLesson,
  type BackupSpeakingSession,
  type BackupTheoryPage,
  type BackupVocabularyItem,
  type BackupWorkspace,
  type BackupWordExample,
  type BackupWordMeaning,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export class AccountBackupParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountBackupParseError";
  }
}

const FOLDER_SECTIONS = new Set(["writing", "listening", "theory"]);

function parseFolder(raw: unknown): BackupFolder | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name).trim();
  const section = asString(raw.section);
  if (!id || !name || !FOLDER_SECTIONS.has(section)) return null;
  return {
    id,
    section: section as BackupFolder["section"],
    name,
    parentId: asNullableString(raw.parentId),
  };
}

function parseWorkspace(raw: unknown): BackupWorkspace | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name).trim();
  const language = asString(raw.language).trim();
  if (!id || !name || !language) return null;
  return {
    id,
    name,
    language,
    createdAt: asNullableString(raw.createdAt) ?? undefined,
    updatedAt: asNullableString(raw.updatedAt) ?? undefined,
    tags: asStringArray(raw.tags),
    folders: Array.isArray(raw.folders)
      ? raw.folders
          .map(parseFolder)
          .filter((folder): folder is BackupFolder => folder !== null)
      : [],
  };
}

function parseMeaning(raw: unknown, index: number): BackupWordMeaning | null {
  if (!isRecord(raw)) return null;
  const meaning = asString(raw.meaning).trim();
  if (!meaning) return null;
  return {
    meaning,
    isPrimary: asBoolean(raw.isPrimary, index === 0),
    sortOrder: asNumber(raw.sortOrder, index),
  };
}

function parseExample(raw: unknown, index: number): BackupWordExample | null {
  if (!isRecord(raw)) return null;
  const sentence = asString(raw.sentence).trim();
  if (!sentence) return null;
  return {
    sentence,
    meaning: asNullableString(raw.meaning),
    notes: asNullableString(raw.notes),
    sortOrder: asNumber(raw.sortOrder, index),
  };
}

function parseVocabulary(raw: unknown): BackupVocabularyItem | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const workspaceId = asString(raw.workspaceId);
  const word = asString(raw.word).trim();
  if (!id || !workspaceId || !word) return null;

  const meanings = Array.isArray(raw.meanings)
    ? raw.meanings
        .map((item, index) => parseMeaning(item, index))
        .filter((item): item is BackupWordMeaning => item !== null)
    : [];

  const examples = Array.isArray(raw.examples)
    ? raw.examples
        .map((item, index) => parseExample(item, index))
        .filter((item): item is BackupWordExample => item !== null)
    : [];

  return {
    id,
    workspaceId,
    word,
    partOfSpeech: asNullableString(raw.partOfSpeech),
    synonyms: asNullableString(raw.synonyms),
    notes: asNullableString(raw.notes),
    status: asString(raw.status, "NEW"),
    meanings,
    examples,
    tags: asStringArray(raw.tags),
    createdAt: asNullableString(raw.createdAt) ?? undefined,
    updatedAt: asNullableString(raw.updatedAt) ?? undefined,
  };
}

function parseTheory(raw: unknown): BackupTheoryPage | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const workspaceId = asString(raw.workspaceId);
  const title = asString(raw.title).trim();
  if (!id || !workspaceId || !title) return null;
  return {
    id,
    workspaceId,
    folderId: asNullableString(raw.folderId),
    title,
    content: raw.content ?? { type: "doc", content: [] },
    createdAt: asNullableString(raw.createdAt) ?? undefined,
    updatedAt: asNullableString(raw.updatedAt) ?? undefined,
  };
}

function parseExercise(raw: unknown): BackupExercise | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const workspaceId = asString(raw.workspaceId);
  const title = asString(raw.title).trim();
  const type = asString(raw.type).trim();
  if (!id || !workspaceId || !title || !type) return null;
  return {
    id,
    workspaceId,
    folderId: asNullableString(raw.folderId),
    title,
    description: asNullableString(raw.description),
    type,
    content: raw.content ?? {},
    createdAt: asNullableString(raw.createdAt) ?? undefined,
    updatedAt: asNullableString(raw.updatedAt) ?? undefined,
  };
}

function parseListening(raw: unknown): BackupListeningLesson | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const workspaceId = asString(raw.workspaceId);
  const title = asString(raw.title).trim();
  if (!id || !workspaceId || !title) return null;

  const exercisesRaw = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = exercisesRaw
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const type = asString(item.type).trim();
      const question = asString(item.question).trim();
      if (!type || !question) return null;
      return {
        type,
        question,
        data: item.data ?? {},
        correctAnswer: item.correctAnswer ?? null,
        sortOrder: asNumber(item.sortOrder, index),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    id,
    workspaceId,
    folderId: asNullableString(raw.folderId),
    title,
    originalFilename: asNullableString(raw.originalFilename),
    mediaUrl: asNullableString(raw.mediaUrl),
    mediaPublicId: asNullableString(raw.mediaPublicId),
    mediaType: asString(raw.mediaType, "audio"),
    format: asNullableString(raw.format),
    duration: asNullableNumber(raw.duration),
    transcript: asNullableString(raw.transcript),
    transcriptionData: raw.transcriptionData ?? null,
    language: asNullableString(raw.language),
    cefrLevel: asNullableString(raw.cefrLevel),
    topic: asNullableString(raw.topic),
    formality: asNullableString(raw.formality),
    exerciseType: asNullableString(raw.exerciseType),
    status: asString(raw.status, "COMPLETED"),
    exercises,
    createdAt: asNullableString(raw.createdAt) ?? undefined,
    updatedAt: asNullableString(raw.updatedAt) ?? undefined,
  };
}

function parseSpeaking(raw: unknown): BackupSpeakingSession | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const workspaceId = asString(raw.workspaceId);
  const title = asString(raw.title).trim();
  if (!id || !workspaceId || !title) return null;
  return {
    id,
    workspaceId,
    title,
    language: asString(raw.language, "en"),
    topic: asNullableString(raw.topic),
    cefrLevel: asNullableString(raw.cefrLevel),
    notes: asNullableString(raw.notes),
    status: asString(raw.status, "completed"),
    transcript: asNullableString(raw.transcript),
    transcriptUrl: asNullableString(raw.transcriptUrl),
    recordingUrl: asNullableString(raw.recordingUrl),
    summary: asNullableString(raw.summary),
    startedAt: asNullableString(raw.startedAt),
    endedAt: asNullableString(raw.endedAt),
    createdAt: asNullableString(raw.createdAt) ?? undefined,
    updatedAt: asNullableString(raw.updatedAt) ?? undefined,
  };
}

function parseArray<T>(
  value: unknown,
  parser: (raw: unknown) => T | null,
): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => parser(item))
    .filter((item): item is T => item !== null);
}

function looksLikeNotoriaBackup(raw: Record<string, unknown>): boolean {
  const format = asString(raw.format);
  const app = asString(raw.app);
  if (format === ACCOUNT_BACKUP_FORMAT) return true;
  if (app === ACCOUNT_BACKUP_APP && typeof raw.version === "number") return true;
  // Heuristic for older exports that only had version + account + workspaces
  if (
    typeof raw.version === "number" &&
    isRecord(raw.account) &&
    Array.isArray(raw.workspaces)
  ) {
    return true;
  }
  return false;
}

/**
 * Parse and lightly validate a Notoria account backup JSON document.
 * Does not write to the database.
 */
export function parseAccountBackup(raw: unknown): AccountBackupDocument {
  if (!isRecord(raw)) {
    throw new AccountBackupParseError("Backup root must be a JSON object.");
  }

  if (!looksLikeNotoriaBackup(raw)) {
    throw new AccountBackupParseError(
      "This doesn't look like a valid Notoria backup. Please use a JSON file exported from Notoria's Export account backup feature.",
    );
  }

  const version = asNumber(raw.version, NaN);
  if (!SUPPORTED_BACKUP_VERSIONS.includes(version as 1)) {
    throw new AccountBackupParseError(
      `Unsupported backup version (${Number.isFinite(version) ? version : "unknown"}). This Notoria version supports: ${SUPPORTED_BACKUP_VERSIONS.join(", ")}.`,
    );
  }

  return {
    version,
    format: ACCOUNT_BACKUP_FORMAT,
    app: ACCOUNT_BACKUP_APP,
    exportedAt: asString(raw.exportedAt),
    account: isRecord(raw.account) ? raw.account : null,
    workspaces: parseArray(raw.workspaces, parseWorkspace),
    vocabulary: parseArray(raw.vocabulary, parseVocabulary),
    theory: parseArray(raw.theory, parseTheory),
    exercises: parseArray(raw.exercises, parseExercise),
    listening: parseArray(raw.listening, parseListening),
    speaking: parseArray(raw.speaking, parseSpeaking),
    notes: Array.isArray(raw.notes)
      ? raw.notes.filter((n): n is string => typeof n === "string")
      : [],
  };
}

export function parseAccountBackupJson(text: string): AccountBackupDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AccountBackupParseError(
      "Invalid JSON. Please use a JSON file exported from Notoria's Export account backup feature.",
    );
  }
  return parseAccountBackup(parsed);
}
