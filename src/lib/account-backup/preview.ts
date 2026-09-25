import {
  ACCOUNT_BACKUP_FORMAT,
  ACCOUNT_FIELDS_NOT_IMPORTED,
  EMPTY_BACKUP_COUNTS,
  type AccountBackupDocument,
  type BackupPreview,
  type BackupPreviewWarning,
  type BackupSkipReason,
  type BackupSkipSummary,
} from "./types";

export type ExistingWorkspaceRef = {
  id: string;
  language: string;
};

export type ExistingVocabKey = {
  workspaceId: string;
  word: string;
  partOfSpeech: string;
};

type SkipBucket = Map<BackupSkipReason, { count: number; examples: string[] }>;

function addSkip(
  bucket: SkipBucket,
  reason: BackupSkipReason,
  example?: string,
) {
  const current = bucket.get(reason) ?? { count: 0, examples: [] };
  current.count += 1;
  if (example && current.examples.length < 5) {
    current.examples.push(example);
  }
  bucket.set(reason, current);
}

function toSkipSummaries(bucket: SkipBucket): BackupSkipSummary[] {
  return Array.from(bucket.entries()).map(([reason, value]) => ({
    reason,
    count: value.count,
    examples: value.examples,
  }));
}

function vocabKey(workspaceId: string, word: string, partOfSpeech: string | null) {
  return `${workspaceId}::${word.trim().toLowerCase()}::${(partOfSpeech ?? "").trim().toLowerCase()}`;
}

function isWritingExercise(type: string) {
  return type.toUpperCase() === "WRITING";
}

function hasListeningMedia(mediaUrl: string | null, mediaPublicId: string | null) {
  return Boolean(mediaUrl?.trim() && mediaPublicId?.trim());
}

/**
 * Build a user-facing preview of what an "add as new" import will do,
 * given the current account's workspaces and existing vocabulary keys.
 */
export function buildBackupPreview(
  backup: AccountBackupDocument,
  existingWorkspaces: ExistingWorkspaceRef[],
  existingVocabKeys: ExistingVocabKey[] = [],
): BackupPreview {
  const skips: SkipBucket = new Map();
  const found = EMPTY_BACKUP_COUNTS();
  const willImport = EMPTY_BACKUP_COUNTS();
  const warnings: BackupPreviewWarning[] = [];

  found.workspaces = backup.workspaces.length;
  found.vocabulary = backup.vocabulary.length;
  found.theory = backup.theory.length;
  found.listening = backup.listening.length;
  found.speaking = backup.speaking.length;

  for (const workspace of backup.workspaces) {
    found.folders += workspace.folders.length;
    found.tags += workspace.tags.length;
  }

  for (const exercise of backup.exercises) {
    if (isWritingExercise(exercise.type)) {
      found.writing += 1;
    } else {
      found.exercises += 1;
    }
  }

  const languageToExisting = new Map(
    existingWorkspaces.map((ws) => [ws.language.trim().toLowerCase(), ws.id]),
  );

  /** backup workspace id → whether we create a new workspace (vs reuse) */
  const workspaceWillCreate = new Map<string, boolean>();
  /** backup workspace id → resolved target language key for vocab checks */
  const workspaceLanguage = new Map<string, string>();
  let reusedWorkspaces = 0;

  for (const workspace of backup.workspaces) {
    const langKey = workspace.language.trim().toLowerCase();
    workspaceLanguage.set(workspace.id, langKey);
    const existingId = languageToExisting.get(langKey);
    if (existingId) {
      workspaceWillCreate.set(workspace.id, false);
      reusedWorkspaces += 1;
      addSkip(skips, "workspace_language_exists", workspace.name);
    } else {
      workspaceWillCreate.set(workspace.id, true);
      willImport.workspaces += 1;
      // Reserve language so later backup workspaces with same lang reuse this one
      languageToExisting.set(langKey, workspace.id);
    }

    willImport.folders += workspace.folders.length;
    willImport.tags += workspace.tags.length;
  }

  if (backup.account) {
    addSkip(skips, "unsupported_account_field", "account");
  }

  const existingVocab = new Set(
    existingVocabKeys.map((item) =>
      vocabKey(item.workspaceId, item.word, item.partOfSpeech || null),
    ),
  );

  // Map backup workspace → "preview target id" for duplicate checks:
  // existing workspace id when reusing, else backup id as stand-in.
  const previewTargetId = new Map<string, string>();
  for (const workspace of backup.workspaces) {
    const langKey = workspace.language.trim().toLowerCase();
    const existing = existingWorkspaces.find(
      (ws) => ws.language.trim().toLowerCase() === langKey,
    );
    previewTargetId.set(workspace.id, existing?.id ?? workspace.id);
  }

  for (const item of backup.vocabulary) {
    if (!workspaceWillCreate.has(item.workspaceId) && !workspaceLanguage.has(item.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", item.word);
      continue;
    }
    const targetWs = previewTargetId.get(item.workspaceId);
    if (!targetWs) {
      addSkip(skips, "invalid_workspace_ref", item.word);
      continue;
    }
    const key = vocabKey(targetWs, item.word, item.partOfSpeech);
    if (existingVocab.has(key)) {
      addSkip(skips, "vocabulary_duplicate", item.word);
      continue;
    }
    // Also skip duplicates within the backup itself for the same target
    existingVocab.add(key);
    willImport.vocabulary += 1;
  }

  for (const note of backup.theory) {
    if (!workspaceLanguage.has(note.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", note.title);
      continue;
    }
    willImport.theory += 1;
  }

  for (const exercise of backup.exercises) {
    if (!workspaceLanguage.has(exercise.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", exercise.title);
      continue;
    }
    if (isWritingExercise(exercise.type)) {
      willImport.writing += 1;
    } else {
      willImport.exercises += 1;
    }
  }

  for (const lesson of backup.listening) {
    if (!workspaceLanguage.has(lesson.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", lesson.title);
      continue;
    }
    if (!hasListeningMedia(lesson.mediaUrl, lesson.mediaPublicId)) {
      addSkip(skips, "listening_missing_media", lesson.title);
      continue;
    }
    willImport.listening += 1;
  }

  for (const session of backup.speaking) {
    if (!workspaceLanguage.has(session.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", session.title);
      continue;
    }
    willImport.speaking += 1;
  }

  if (reusedWorkspaces > 0) {
    warnings.push("workspace_language_reuse");
  }

  const totalFound =
    found.workspaces +
    found.vocabulary +
    found.theory +
    found.writing +
    found.exercises +
    found.listening +
    found.speaking;
  if (totalFound === 0) {
    warnings.push("empty_backup");
  }

  return {
    format: ACCOUNT_BACKUP_FORMAT,
    version: backup.version,
    exportedAt: backup.exportedAt || null,
    strategy: "add_as_new",
    found,
    willImport,
    reusedWorkspaces,
    notImported: [...ACCOUNT_FIELDS_NOT_IMPORTED],
    skipped: toSkipSummaries(skips).filter(
      // account skip is explained via notImported, not as a content skip row
      (item) => item.reason !== "unsupported_account_field",
    ),
    warnings,
  };
}
