import {
  contentTitleKey,
  emptyInventory,
  exerciseSectionKey,
  folderMatchKey,
  listeningFilenameKey,
  normalizeBackupName,
  setCanonicalId,
  tagMatchKey,
  vocabWordKey,
  type ExistingInventory,
} from "./match";
import {
  addSkip,
  createSkipBucket,
  duplicateSkipSource,
  toSkipSummaries,
} from "./skip-bucket";
import {
  ACCOUNT_BACKUP_FORMAT,
  ACCOUNT_FIELDS_NOT_IMPORTED,
  EMPTY_BACKUP_COUNTS,
  type AccountBackupDocument,
  type BackupPreview,
  type BackupPreviewWarning,
} from "./types";

/** @deprecated Prefer ExistingInventory — kept for older call sites/tests. */
export type ExistingWorkspaceRef = {
  id: string;
  language: string;
  name?: string;
};

/** @deprecated Prefer ExistingInventory.vocabulary */
export type ExistingVocabKey = {
  workspaceId: string;
  word: string;
  partOfSpeech?: string;
};

export type ExistingSpeakingKey = {
  workspaceId: string;
  title: string;
  startedAt?: string | null;
};

export type ExistingListeningKey = {
  workspaceId: string;
  originalFilename: string | null;
  title?: string;
};

function isWritingExercise(type: string) {
  return type.toUpperCase() === "WRITING";
}

function hasListeningMedia(mediaUrl: string | null, mediaPublicId: string | null) {
  return Boolean(mediaUrl?.trim() && mediaPublicId?.trim());
}

function cloneInventory(source: ExistingInventory): ExistingInventory {
  return {
    workspaces: [...source.workspaces],
    folders: new Map(source.folders),
    folderAmbiguous: source.folderAmbiguous,
    tags: new Set(source.tags),
    vocabulary: new Set(source.vocabulary),
    theory: new Set(source.theory),
    writing: new Set(source.writing),
    exercises: new Set(source.exercises),
    listeningTitles: new Set(source.listeningTitles),
    listeningFilenames: new Set(source.listeningFilenames),
    speaking: new Set(source.speaking),
  };
}

/**
 * Legacy adapter used by older tests — prefer passing ExistingInventory.
 */
function inventoryFromLegacyArgs(
  existingWorkspaces: ExistingWorkspaceRef[],
  existingVocabKeys: ExistingVocabKey[],
  existingSpeakingKeys: ExistingSpeakingKey[],
  existingListeningKeys: ExistingListeningKey[],
): ExistingInventory {
  const inventory = emptyInventory(
    existingWorkspaces.map((ws) => ({
      id: ws.id,
      language: ws.language,
      name: ws.name ?? ws.language,
    })),
  );
  for (const item of existingVocabKeys) {
    inventory.vocabulary.add(vocabWordKey(item.workspaceId, item.word));
  }
  for (const item of existingSpeakingKeys) {
    inventory.speaking.add(
      contentTitleKey(item.workspaceId, "speaking", item.title),
    );
  }
  for (const item of existingListeningKeys) {
    if (item.title) {
      inventory.listeningTitles.add(
        contentTitleKey(item.workspaceId, "listening", item.title),
      );
    }
    const filenameKey = listeningFilenameKey(
      item.workspaceId,
      item.originalFilename,
    );
    if (filenameKey) inventory.listeningFilenames.add(filenameKey);
  }
  return inventory;
}

/**
 * Build a user-facing preview of what an "add as new" import will do.
 * Matching rules match import.ts (shared via match.ts).
 */
export function buildBackupPreview(
  backup: AccountBackupDocument,
  inventoryOrWorkspaces: ExistingInventory | ExistingWorkspaceRef[],
  existingVocabKeys: ExistingVocabKey[] = [],
  existingSpeakingKeys: ExistingSpeakingKey[] = [],
  existingListeningKeys: ExistingListeningKey[] = [],
): BackupPreview {
  const accountInventory = Array.isArray(inventoryOrWorkspaces)
    ? inventoryFromLegacyArgs(
        inventoryOrWorkspaces,
        existingVocabKeys,
        existingSpeakingKeys,
        existingListeningKeys,
      )
    : cloneInventory(inventoryOrWorkspaces);
  // Working set: starts as account state, then grows with names claimed from the backup.
  const inventory = cloneInventory(accountInventory);

  const skips = createSkipBucket();
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
    if (isWritingExercise(exercise.type)) found.writing += 1;
    else found.exercises += 1;
  }

  if (inventory.folderAmbiguous > 0) {
    warnings.push("ambiguous_name_match");
  }

  const languageToExisting = new Map(
    inventory.workspaces.map((ws) => [
      normalizeBackupName(ws.language).toLowerCase(),
      ws.id,
    ]),
  );

  const workspaceLanguage = new Map<string, string>();
  const previewTargetId = new Map<string, string>();
  let reusedWorkspaces = 0;

  for (const workspace of backup.workspaces) {
    const langKey = normalizeBackupName(workspace.language).toLowerCase();
    workspaceLanguage.set(workspace.id, langKey);
    const existingId = languageToExisting.get(langKey);
    if (existingId) {
      previewTargetId.set(workspace.id, existingId);
      reusedWorkspaces += 1;
      addSkip(skips, "workspace_language_exists", "account", workspace.name);
    } else {
      // Stand-in id for preview keys until a real workspace is created.
      previewTargetId.set(workspace.id, workspace.id);
      languageToExisting.set(langKey, workspace.id);
      willImport.workspaces += 1;
    }
  }

  if (backup.account) {
    addSkip(skips, "unsupported_account_field", "other", "account");
  }

  // Tags + folders per workspace (parent-first for folder keys).
  for (const workspace of backup.workspaces) {
    const targetWs = previewTargetId.get(workspace.id);
    if (!targetWs) continue;

    for (const tagName of workspace.tags) {
      const name = normalizeBackupName(tagName);
      if (!name) continue;
      const key = tagMatchKey(targetWs, name);
      if (inventory.tags.has(key)) {
        addSkip(
          skips,
          "tag_duplicate",
          duplicateSkipSource(accountInventory.tags.has(key)),
          name,
        );
        continue;
      }
      inventory.tags.add(key);
      willImport.tags += 1;
    }

    const folderIdMap = new Map<string, string>();
    const pending = [...workspace.folders];
    let safety = pending.length + 2;
    while (pending.length > 0 && safety-- > 0) {
      const nextRound: typeof pending = [];
      let progressed = false;
      for (const folder of pending) {
        if (folder.parentId && !folderIdMap.has(folder.parentId)) {
          const parentInBackup = workspace.folders.some(
            (item) => item.id === folder.parentId,
          );
          if (parentInBackup) {
            nextRound.push(folder);
            continue;
          }
        }

        const parentId =
          folder.parentId && folderIdMap.has(folder.parentId)
            ? folderIdMap.get(folder.parentId)!
            : null;
        const name = normalizeBackupName(folder.name) || folder.name;
        const key = folderMatchKey(targetWs, folder.section, parentId, name);
        const existingId = inventory.folders.get(key);
        if (existingId) {
          folderIdMap.set(folder.id, existingId);
          addSkip(
            skips,
            "folder_duplicate",
            duplicateSkipSource(accountInventory.folders.has(key)),
            name,
          );
          progressed = true;
          continue;
        }

        // Preview stand-in: use backup folder id as destination placeholder.
        folderIdMap.set(folder.id, folder.id);
        setCanonicalId(inventory.folders, key, folder.id);
        willImport.folders += 1;
        progressed = true;
      }

      if (!progressed || nextRound.length === pending.length) {
        for (const folder of nextRound) {
          const name = normalizeBackupName(folder.name) || folder.name;
          const key = folderMatchKey(targetWs, folder.section, null, name);
          const existingId = inventory.folders.get(key);
          if (existingId) {
            folderIdMap.set(folder.id, existingId);
            addSkip(
              skips,
              "folder_duplicate",
              duplicateSkipSource(accountInventory.folders.has(key)),
              name,
            );
            continue;
          }
          folderIdMap.set(folder.id, folder.id);
          setCanonicalId(inventory.folders, key, folder.id);
          willImport.folders += 1;
        }
        break;
      }
      pending.length = 0;
      pending.push(...nextRound);
    }
  }

  for (const item of backup.vocabulary) {
    const targetWs = previewTargetId.get(item.workspaceId);
    if (!targetWs || !workspaceLanguage.has(item.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", "other", item.word);
      continue;
    }
    const word = normalizeBackupName(item.word);
    if (!word) {
      addSkip(skips, "invalid_record", "other", item.word);
      continue;
    }
    const key = vocabWordKey(targetWs, word);
    if (inventory.vocabulary.has(key)) {
      addSkip(
        skips,
        "vocabulary_duplicate",
        duplicateSkipSource(accountInventory.vocabulary.has(key)),
        word,
      );
      continue;
    }
    inventory.vocabulary.add(key);
    willImport.vocabulary += 1;
  }

  for (const note of backup.theory) {
    const targetWs = previewTargetId.get(note.workspaceId);
    if (!targetWs || !workspaceLanguage.has(note.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", "other", note.title);
      continue;
    }
    const title = normalizeBackupName(note.title);
    if (!title) {
      addSkip(skips, "invalid_record", "other", note.title);
      continue;
    }
    const key = contentTitleKey(targetWs, "theory", title);
    if (inventory.theory.has(key)) {
      addSkip(
        skips,
        "theory_duplicate",
        duplicateSkipSource(accountInventory.theory.has(key)),
        title,
      );
      continue;
    }
    inventory.theory.add(key);
    willImport.theory += 1;
  }

  for (const exercise of backup.exercises) {
    const targetWs = previewTargetId.get(exercise.workspaceId);
    if (!targetWs || !workspaceLanguage.has(exercise.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", "other", exercise.title);
      continue;
    }
    const title = normalizeBackupName(exercise.title);
    if (!title) {
      addSkip(skips, "invalid_record", "other", exercise.title);
      continue;
    }
    const section = exerciseSectionKey(exercise.type);
    const key = contentTitleKey(targetWs, section, title);
    const isWriting = section === "writing";
    const set = isWriting ? inventory.writing : inventory.exercises;
    const accountSet = isWriting
      ? accountInventory.writing
      : accountInventory.exercises;
    if (set.has(key)) {
      addSkip(
        skips,
        isWriting ? "writing_duplicate" : "exercise_duplicate",
        duplicateSkipSource(accountSet.has(key)),
        title,
      );
      continue;
    }
    set.add(key);
    if (isWriting) willImport.writing += 1;
    else willImport.exercises += 1;
  }

  for (const lesson of backup.listening) {
    const targetWs = previewTargetId.get(lesson.workspaceId);
    if (!targetWs || !workspaceLanguage.has(lesson.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", "other", lesson.title);
      continue;
    }
    if (!hasListeningMedia(lesson.mediaUrl, lesson.mediaPublicId)) {
      addSkip(skips, "listening_missing_media", "other", lesson.title);
      continue;
    }
    const title = normalizeBackupName(lesson.title);
    if (!title) {
      addSkip(skips, "invalid_record", "other", lesson.title);
      continue;
    }
    const titleKey = contentTitleKey(targetWs, "listening", title);
    if (inventory.listeningTitles.has(titleKey)) {
      addSkip(
        skips,
        "listening_duplicate",
        duplicateSkipSource(accountInventory.listeningTitles.has(titleKey)),
        title,
      );
      continue;
    }
    const filenameKey = listeningFilenameKey(targetWs, lesson.originalFilename);
    if (filenameKey && inventory.listeningFilenames.has(filenameKey)) {
      addSkip(
        skips,
        "listening_duplicate_filename",
        duplicateSkipSource(
          accountInventory.listeningFilenames.has(filenameKey),
        ),
        title,
      );
      continue;
    }
    inventory.listeningTitles.add(titleKey);
    if (filenameKey) inventory.listeningFilenames.add(filenameKey);
    willImport.listening += 1;
  }

  for (const session of backup.speaking) {
    const targetWs = previewTargetId.get(session.workspaceId);
    if (!targetWs || !workspaceLanguage.has(session.workspaceId)) {
      addSkip(skips, "invalid_workspace_ref", "other", session.title);
      continue;
    }
    const title = normalizeBackupName(session.title);
    if (!title) {
      addSkip(skips, "invalid_record", "other", session.title);
      continue;
    }
    const key = contentTitleKey(targetWs, "speaking", title);
    if (inventory.speaking.has(key)) {
      addSkip(
        skips,
        "speaking_duplicate",
        duplicateSkipSource(accountInventory.speaking.has(key)),
        title,
      );
      continue;
    }
    inventory.speaking.add(key);
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
      (item) => item.reason !== "unsupported_account_field",
    ),
    warnings,
  };
}
