export const ACCOUNT_BACKUP_FORMAT = "notoria-account-backup" as const;
export const ACCOUNT_BACKUP_APP = "notoria" as const;
export const SUPPORTED_BACKUP_VERSIONS = [1] as const;

/** Soft cap — account backups are JSON (media linked by URL). */
export const MAX_ACCOUNT_BACKUP_BYTES = 25 * 1024 * 1024;

export type BackupFolder = {
  id: string;
  section: "writing" | "listening" | "theory";
  name: string;
  parentId: string | null;
};

export type BackupWorkspace = {
  id: string;
  name: string;
  language: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  folders: BackupFolder[];
};

export type BackupWordMeaning = {
  meaning: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type BackupWordExample = {
  sentence: string;
  meaning: string | null;
  notes: string | null;
  sortOrder: number;
};

export type BackupVocabularyItem = {
  id: string;
  workspaceId: string;
  word: string;
  partOfSpeech: string | null;
  synonyms: string | null;
  notes: string | null;
  status: string;
  meanings: BackupWordMeaning[];
  examples: BackupWordExample[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type BackupTheoryPage = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  content: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type BackupExercise = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  description: string | null;
  type: string;
  content: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type BackupListeningExerciseItem = {
  type: string;
  question: string;
  data: unknown;
  correctAnswer: unknown;
  sortOrder: number;
};

export type BackupListeningLesson = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  originalFilename: string | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  mediaType: string;
  format: string | null;
  duration: number | null;
  transcript: string | null;
  transcriptionData: unknown;
  language: string | null;
  cefrLevel: string | null;
  topic: string | null;
  formality: string | null;
  exerciseType: string | null;
  status: string;
  exercises: BackupListeningExerciseItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type BackupSpeakingSession = {
  id: string;
  workspaceId: string;
  title: string;
  language: string;
  topic: string | null;
  cefrLevel: string | null;
  notes: string | null;
  status: string;
  transcript: string | null;
  transcriptUrl: string | null;
  recordingUrl: string | null;
  summary: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountBackupDocument = {
  version: number;
  format: typeof ACCOUNT_BACKUP_FORMAT;
  app: typeof ACCOUNT_BACKUP_APP;
  exportedAt: string;
  account: Record<string, unknown> | null;
  workspaces: BackupWorkspace[];
  vocabulary: BackupVocabularyItem[];
  theory: BackupTheoryPage[];
  exercises: BackupExercise[];
  listening: BackupListeningLesson[];
  speaking: BackupSpeakingSession[];
  notes: string[];
};

export type BackupSkipReason =
  | "unsupported_account_field"
  | "workspace_language_exists"
  | "vocabulary_duplicate"
  | "listening_missing_media"
  | "invalid_workspace_ref"
  | "invalid_record"
  | "listening_duplicate_filename";

export type BackupImportCounts = {
  workspaces: number;
  folders: number;
  tags: number;
  vocabulary: number;
  theory: number;
  writing: number;
  exercises: number;
  listening: number;
  speaking: number;
};

export type BackupSkipSummary = {
  reason: BackupSkipReason;
  count: number;
  examples: string[];
};

export type BackupPreviewWarning =
  | "workspace_language_reuse"
  | "empty_backup";

export type BackupPreview = {
  format: typeof ACCOUNT_BACKUP_FORMAT;
  version: number;
  exportedAt: string | null;
  strategy: "add_as_new";
  found: BackupImportCounts;
  willImport: BackupImportCounts;
  /** Workspaces that already exist (matched by language) — content still imports into them. */
  reusedWorkspaces: number;
  notImported: string[];
  skipped: BackupSkipSummary[];
  warnings: BackupPreviewWarning[];
};

export type BackupImportResult = {
  imported: BackupImportCounts;
  skipped: BackupSkipSummary[];
  workspaceIdMap: Record<string, string>;
};

export const EMPTY_BACKUP_COUNTS = (): BackupImportCounts => ({
  workspaces: 0,
  folders: 0,
  tags: 0,
  vocabulary: 0,
  theory: 0,
  writing: 0,
  exercises: 0,
  listening: 0,
  speaking: 0,
});

export const ACCOUNT_FIELDS_NOT_IMPORTED = [
  "Account name",
  "Email",
  "Subscription",
  "Authentication information",
] as const;
