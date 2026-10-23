import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningExercises,
  listeningLessons,
  speakingSessions,
  vocabularyWordTags,
  vocabularyWords,
  wordExamples,
  wordMeanings,
  workspaceFolders,
  workspaces,
  workspaceTags,
  type FolderSection,
} from "@/db/schema";
import { normalizeMeaningUsageLabels } from "@/lib/vocabulary/meaning-usage";
import { loadExistingInventory } from "./inventory";
import {
  contentTitleKey,
  exerciseSectionKey,
  folderMatchKey,
  listeningFilenameKey,
  normalizeBackupName,
  setCanonicalId,
  tagMatchKey,
  vocabWordKey,
} from "./match";
import {
  addSkip,
  createSkipBucket,
  duplicateSkipSource,
  toSkipSummaries,
} from "./skip-bucket";
import type {
  AccountBackupDocument,
  BackupImportCounts,
  BackupImportResult,
  BackupSkipReason,
} from "./types";
import { EMPTY_BACKUP_COUNTS } from "./types";

const VOCAB_STATUSES = new Set(["NEW", "LEARNING", "REVIEW", "MASTERED"]);
const EXERCISE_TYPES = new Set([
  "QUESTIONS",
  "FILL_BLANK",
  "TRANSLATION",
  "WRITING",
  "READING",
  "GRAMMAR_DRILL",
]);
const LISTENING_STATUSES = new Set([
  "UPLOADING",
  "TRANSCRIBING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);
const LISTENING_EXERCISE_TYPES = new Set([
  "FILL_BLANK",
  "MULTIPLE_CHOICE",
  "DICTATION",
  "WORD_ORDERING",
]);
const SPEAKING_STATUSES = new Set([
  "upcoming",
  "active",
  "processing",
  "completed",
  "cancelled",
]);

function normalizeVocabStatus(status: string) {
  const upper = status.toUpperCase();
  return VOCAB_STATUSES.has(upper)
    ? (upper as "NEW" | "LEARNING" | "REVIEW" | "MASTERED")
    : "NEW";
}

function normalizeExerciseType(type: string) {
  const upper = type.toUpperCase();
  return EXERCISE_TYPES.has(upper)
    ? (upper as
        | "QUESTIONS"
        | "FILL_BLANK"
        | "TRANSLATION"
        | "WRITING"
        | "READING"
        | "GRAMMAR_DRILL")
    : null;
}

function normalizeListeningStatus(status: string) {
  const upper = status.toUpperCase();
  if (LISTENING_STATUSES.has(upper)) {
    return upper as
      | "UPLOADING"
      | "TRANSCRIBING"
      | "GENERATING"
      | "COMPLETED"
      | "FAILED";
  }
  if (upper === "READY") return "COMPLETED";
  return "COMPLETED";
}

function normalizeListeningExerciseType(type: string) {
  const upper = type.toUpperCase();
  return LISTENING_EXERCISE_TYPES.has(upper)
    ? (upper as "FILL_BLANK" | "MULTIPLE_CHOICE" | "DICTATION" | "WORD_ORDERING")
    : null;
}

function normalizeSpeakingStatus(status: string) {
  const lower = status.toLowerCase();
  return SPEAKING_STATUSES.has(lower)
    ? (lower as "upcoming" | "active" | "processing" | "completed" | "cancelled")
    : "completed";
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type ImportTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && String((current as { code?: unknown }).code) === "23505") {
      return true;
    }
    current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}

async function runInSavepoint<T>(
  tx: ImportTx,
  label: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  const sp = `imp_${label.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40)}_${Math.random().toString(36).slice(2, 8)}`;
  await tx.execute(sql.raw(`savepoint ${sp}`));
  try {
    const value = await fn();
    await tx.execute(sql.raw(`release savepoint ${sp}`));
    return { ok: true, value };
  } catch (error) {
    await tx.execute(sql.raw(`rollback to savepoint ${sp}`));
    return { ok: false, error };
  }
}

/**
 * Import learning data from a validated account backup into the current user's account.
 * Never touches identity, auth, or billing. Uses "add as new" with language-based workspace reuse
 * and name-based duplicate skips (trim + NFC, case/accent sensitive).
 */
export async function importAccountBackupLearningData(options: {
  userId: string;
  backup: AccountBackupDocument;
}): Promise<BackupImportResult> {
  const { userId, backup } = options;
  const skips = createSkipBucket();
  const imported = EMPTY_BACKUP_COUNTS();

  const workspaceIdMap = new Map<string, string>();
  const folderIdMap = new Map<string, string>();
  /** Workspaces that already existed before this import (language reuse). */
  const preExistingWorkspaceIds = new Set<string>();

  await db.transaction(async (tx) => {
    // Serialize concurrent confirms for the same account so inventory recheck is reliable.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`account-backup-import:${userId}`}))`,
    );

    const inventory = await loadExistingInventory(userId, tx);
    // Snapshot of names already on the account (before this backup claims any).
    const accountFolders = new Set(inventory.folders.keys());
    const accountTags = new Set(inventory.tags);
    const accountVocabulary = new Set(inventory.vocabulary);
    const accountTheory = new Set(inventory.theory);
    const accountWriting = new Set(inventory.writing);
    const accountExercises = new Set(inventory.exercises);
    const accountListeningTitles = new Set(inventory.listeningTitles);
    const accountListeningFilenames = new Set(inventory.listeningFilenames);
    const accountSpeaking = new Set(inventory.speaking);

    for (const ws of inventory.workspaces) {
      preExistingWorkspaceIds.add(ws.id);
    }

    const languageToId = new Map(
      inventory.workspaces.map((ws) => [
        normalizeBackupName(ws.language).toLowerCase(),
        ws.id,
      ]),
    );

    // 1. Workspaces — reuse by language (existing product rule).
    for (const workspace of backup.workspaces) {
      const langKey = normalizeBackupName(workspace.language).toLowerCase();
      const existingId = languageToId.get(langKey);
      if (existingId) {
        workspaceIdMap.set(workspace.id, existingId);
        addSkip(skips, "workspace_language_exists", "account", workspace.name);
        continue;
      }

      const [created] = await tx
        .insert(workspaces)
        .values({
          userId,
          name: normalizeBackupName(workspace.name) || workspace.name,
          language: workspace.language.trim(),
        })
        .returning({ id: workspaces.id });

      workspaceIdMap.set(workspace.id, created.id);
      languageToId.set(langKey, created.id);
      imported.workspaces += 1;
    }

    // 2. Tags + folders (parent-first; reuse matching folders).
    for (const workspace of backup.workspaces) {
      const newWorkspaceId = workspaceIdMap.get(workspace.id);
      if (!newWorkspaceId) continue;

      for (const tagName of workspace.tags) {
        const name = normalizeBackupName(tagName);
        if (!name) continue;
        const key = tagMatchKey(newWorkspaceId, name);
        if (inventory.tags.has(key)) {
          addSkip(
            skips,
            "tag_duplicate",
            duplicateSkipSource(accountTags.has(key)),
            name,
          );
          continue;
        }

        const tagResult = await runInSavepoint(tx, "tag", async () => {
          await tx.insert(workspaceTags).values({
            workspaceId: newWorkspaceId,
            name,
          });
        });
        if (!tagResult.ok) {
          if (isUniqueViolation(tagResult.error)) {
            inventory.tags.add(key);
            addSkip(skips, "tag_duplicate", "account", name);
            continue;
          }
          addSkip(skips, "invalid_record", "other", name);
          continue;
        }
        inventory.tags.add(key);
        imported.tags += 1;
      }

      const pending = [...workspace.folders];
      let safety = pending.length + 2;
      while (pending.length > 0 && safety-- > 0) {
        const nextRound: typeof pending = [];
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
          const section = folder.section as FolderSection;
          const name = normalizeBackupName(folder.name) || folder.name;
          const key = folderMatchKey(newWorkspaceId, section, parentId, name);
          const existingFolderId = inventory.folders.get(key);
          if (existingFolderId) {
            folderIdMap.set(folder.id, existingFolderId);
            addSkip(
              skips,
              "folder_duplicate",
              duplicateSkipSource(accountFolders.has(key)),
              name,
            );
            continue;
          }

          const folderResult = await runInSavepoint(tx, "folder", async () => {
            const [created] = await tx
              .insert(workspaceFolders)
              .values({
                userId,
                workspaceId: newWorkspaceId,
                section,
                parentId,
                name,
              })
              .returning({ id: workspaceFolders.id });
            return created.id;
          });

          if (!folderResult.ok) {
            addSkip(skips, "invalid_record", "other", name);
            continue;
          }

          folderIdMap.set(folder.id, folderResult.value);
          setCanonicalId(inventory.folders, key, folderResult.value);
          imported.folders += 1;
        }

        if (nextRound.length === pending.length) {
          for (const folder of nextRound) {
            const section = folder.section as FolderSection;
            const name = normalizeBackupName(folder.name) || folder.name;
            const key = folderMatchKey(newWorkspaceId, section, null, name);
            const existingFolderId = inventory.folders.get(key);
            if (existingFolderId) {
              folderIdMap.set(folder.id, existingFolderId);
              addSkip(
                skips,
                "folder_duplicate",
                duplicateSkipSource(accountFolders.has(key)),
                name,
              );
              continue;
            }

            const folderResult = await runInSavepoint(tx, "folder_orphan", async () => {
              const [created] = await tx
                .insert(workspaceFolders)
                .values({
                  userId,
                  workspaceId: newWorkspaceId,
                  section,
                  parentId: null,
                  name,
                })
                .returning({ id: workspaceFolders.id });
              return created.id;
            });
            if (!folderResult.ok) {
              addSkip(skips, "invalid_record", "other", name);
              continue;
            }
            folderIdMap.set(folder.id, folderResult.value);
            setCanonicalId(inventory.folders, key, folderResult.value);
            imported.folders += 1;
          }
          break;
        }
        pending.length = 0;
        pending.push(...nextRound);
      }
    }

    // 3. Vocabulary — duplicate by word only (POS ignored).
    for (const item of backup.vocabulary) {
      const newWorkspaceId = workspaceIdMap.get(item.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", "other", item.word);
        continue;
      }

      const word = normalizeBackupName(item.word);
      if (!word) {
        addSkip(skips, "invalid_record", "other", item.word);
        continue;
      }
      const key = vocabWordKey(newWorkspaceId, word);
      if (inventory.vocabulary.has(key)) {
        addSkip(
          skips,
          "vocabulary_duplicate",
          duplicateSkipSource(accountVocabulary.has(key)),
          word,
        );
        continue;
      }

      const vocabResult = await runInSavepoint(tx, "vocab", async () => {
        const [created] = await tx
          .insert(vocabularyWords)
          .values({
            userId,
            workspaceId: newWorkspaceId,
            word,
            partOfSpeech: item.partOfSpeech?.trim() || null,
            synonyms: item.synonyms,
            notes: item.notes,
            status: normalizeVocabStatus(item.status),
          })
          .returning({ id: vocabularyWords.id });

        if (item.meanings.length > 0) {
          await tx.insert(wordMeanings).values(
            item.meanings.map((meaning, index) => ({
              wordId: created.id,
              meaning: meaning.meaning,
              isPrimary: meaning.isPrimary,
              sortOrder: meaning.sortOrder ?? index,
              usageLabels: normalizeMeaningUsageLabels(meaning.usageLabels),
            })),
          );
        }

        if (item.examples.length > 0) {
          await tx.insert(wordExamples).values(
            item.examples.map((example, index) => ({
              wordId: created.id,
              sentence: example.sentence,
              meaning: example.meaning,
              notes: example.notes,
              sortOrder: example.sortOrder ?? index,
            })),
          );
        }

        if (item.tags.length > 0) {
          await tx.insert(vocabularyWordTags).values(
            item.tags.map((tag) => ({
              wordId: created.id,
              tag: tag.trim(),
            })),
          );
        }
      });

      if (!vocabResult.ok) {
        if (isUniqueViolation(vocabResult.error)) {
          inventory.vocabulary.add(key);
          addSkip(skips, "vocabulary_duplicate", "account", word);
          continue;
        }
        addSkip(skips, "invalid_record", "other", word);
        continue;
      }
      inventory.vocabulary.add(key);
      imported.vocabulary += 1;
    }

    // 4. Theory — title within workspace (any folder).
    for (const note of backup.theory) {
      const newWorkspaceId = workspaceIdMap.get(note.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", "other", note.title);
        continue;
      }
      const title = normalizeBackupName(note.title);
      if (!title) {
        addSkip(skips, "invalid_record", "other", note.title);
        continue;
      }
      const key = contentTitleKey(newWorkspaceId, "theory", title);
      if (inventory.theory.has(key)) {
        addSkip(
          skips,
          "theory_duplicate",
          duplicateSkipSource(accountTheory.has(key)),
          title,
        );
        continue;
      }

      const folderId =
        note.folderId && folderIdMap.has(note.folderId)
          ? folderIdMap.get(note.folderId)!
          : null;

      const theoryResult = await runInSavepoint(tx, "theory", async () => {
        await tx.insert(grammarNotes).values({
          userId,
          workspaceId: newWorkspaceId,
          folderId,
          title,
          content: note.content as object,
        });
      });
      if (!theoryResult.ok) {
        addSkip(skips, "invalid_record", "other", title);
        continue;
      }
      inventory.theory.add(key);
      imported.theory += 1;
    }

    // 5. Exercises / writing — title within workspace + type section.
    for (const exercise of backup.exercises) {
      const newWorkspaceId = workspaceIdMap.get(exercise.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", "other", exercise.title);
        continue;
      }
      const type = normalizeExerciseType(exercise.type);
      if (!type) {
        addSkip(skips, "invalid_record", "other", exercise.title);
        continue;
      }
      const title = normalizeBackupName(exercise.title);
      if (!title) {
        addSkip(skips, "invalid_record", "other", exercise.title);
        continue;
      }

      const section = exerciseSectionKey(type);
      const key = contentTitleKey(newWorkspaceId, section, title);
      const isWriting = section === "writing";
      const duplicateSet = isWriting ? inventory.writing : inventory.exercises;
      const accountSet = isWriting ? accountWriting : accountExercises;
      const skipReason: BackupSkipReason = isWriting
        ? "writing_duplicate"
        : "exercise_duplicate";

      if (duplicateSet.has(key)) {
        addSkip(
          skips,
          skipReason,
          duplicateSkipSource(accountSet.has(key)),
          title,
        );
        continue;
      }

      const folderId =
        exercise.folderId && folderIdMap.has(exercise.folderId)
          ? folderIdMap.get(exercise.folderId)!
          : null;

      const exerciseResult = await runInSavepoint(tx, "exercise", async () => {
        await tx.insert(exercises).values({
          userId,
          workspaceId: newWorkspaceId,
          folderId,
          title,
          description: exercise.description,
          type,
          content: exercise.content as object,
        });
      });
      if (!exerciseResult.ok) {
        addSkip(skips, "invalid_record", "other", title);
        continue;
      }
      duplicateSet.add(key);
      if (isWriting) imported.writing += 1;
      else imported.exercises += 1;
    }

    // 6. Listening — title within workspace; also filename uniqueness.
    for (const lesson of backup.listening) {
      const newWorkspaceId = workspaceIdMap.get(lesson.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", "other", lesson.title);
        continue;
      }
      const mediaUrl = lesson.mediaUrl?.trim() ?? "";
      const mediaPublicId = lesson.mediaPublicId?.trim() ?? "";
      if (!mediaUrl || !mediaPublicId) {
        addSkip(skips, "listening_missing_media", "other", lesson.title);
        continue;
      }

      const title = normalizeBackupName(lesson.title);
      if (!title) {
        addSkip(skips, "invalid_record", "other", lesson.title);
        continue;
      }
      const titleKey = contentTitleKey(newWorkspaceId, "listening", title);
      if (inventory.listeningTitles.has(titleKey)) {
        addSkip(
          skips,
          "listening_duplicate",
          duplicateSkipSource(accountListeningTitles.has(titleKey)),
          title,
        );
        continue;
      }

      const filenameKey = listeningFilenameKey(
        newWorkspaceId,
        lesson.originalFilename,
      );
      if (filenameKey && inventory.listeningFilenames.has(filenameKey)) {
        addSkip(
          skips,
          "listening_duplicate_filename",
          duplicateSkipSource(accountListeningFilenames.has(filenameKey)),
          title,
        );
        continue;
      }

      const folderId =
        lesson.folderId && folderIdMap.has(lesson.folderId)
          ? folderIdMap.get(lesson.folderId)!
          : null;
      const exerciseType = lesson.exerciseType
        ? normalizeListeningExerciseType(lesson.exerciseType)
        : null;

      const listeningResult = await runInSavepoint(tx, "listen", async () => {
        const [created] = await tx
          .insert(listeningLessons)
          .values({
            userId,
            workspaceId: newWorkspaceId,
            folderId,
            title,
            originalFilename: lesson.originalFilename,
            cloudinaryUrl: mediaUrl,
            cloudinaryPublicId: mediaPublicId,
            mediaType: lesson.mediaType || "audio",
            format: lesson.format,
            duration: lesson.duration,
            transcript: lesson.transcript,
            transcriptionData: lesson.transcriptionData as object | null,
            language: lesson.language,
            cefrLevel: lesson.cefrLevel,
            topic: lesson.topic,
            formality: lesson.formality,
            exerciseType,
            status: normalizeListeningStatus(lesson.status),
          })
          .returning({ id: listeningLessons.id });

        const validItems = lesson.exercises
          .map((item) => {
            const type = normalizeListeningExerciseType(item.type);
            if (!type) return null;
            return {
              lessonId: created.id,
              type,
              question: item.question,
              data: item.data as object,
              correctAnswer: item.correctAnswer as object,
              sortOrder: item.sortOrder,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        if (validItems.length > 0) {
          await tx.insert(listeningExercises).values(validItems);
        }
      });

      if (!listeningResult.ok) {
        if (isUniqueViolation(listeningResult.error)) {
          if (filenameKey) inventory.listeningFilenames.add(filenameKey);
          inventory.listeningTitles.add(titleKey);
          addSkip(skips, "listening_duplicate_filename", "account", title);
          continue;
        }
        addSkip(skips, "invalid_record", "other", title);
        continue;
      }
      inventory.listeningTitles.add(titleKey);
      if (filenameKey) inventory.listeningFilenames.add(filenameKey);
      imported.listening += 1;
    }

    // 7. Speaking — title within workspace.
    for (const session of backup.speaking) {
      const newWorkspaceId = workspaceIdMap.get(session.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", "other", session.title);
        continue;
      }
      const title = normalizeBackupName(session.title);
      if (!title) {
        addSkip(skips, "invalid_record", "other", session.title);
        continue;
      }
      const key = contentTitleKey(newWorkspaceId, "speaking", title);
      if (inventory.speaking.has(key)) {
        addSkip(
          skips,
          "speaking_duplicate",
          duplicateSkipSource(accountSpeaking.has(key)),
          title,
        );
        continue;
      }

      const speakingResult = await runInSavepoint(tx, "speak", async () => {
        await tx.insert(speakingSessions).values({
          userId,
          workspaceId: newWorkspaceId,
          title,
          language: session.language,
          topic: session.topic,
          cefrLevel: session.cefrLevel,
          notes: session.notes,
          status: normalizeSpeakingStatus(session.status),
          transcript: session.transcript,
          transcriptUrl: null,
          recordingUrl: null,
          summary: session.summary,
          startedAt: parseDate(session.startedAt),
          endedAt: parseDate(session.endedAt),
        });
      });

      if (!speakingResult.ok) {
        addSkip(skips, "invalid_record", "other", title);
        continue;
      }
      inventory.speaking.add(key);
      imported.speaking += 1;
    }
  });

  const reusedIds = Array.from(
    new Set(
      Array.from(workspaceIdMap.values()).filter((id) =>
        preExistingWorkspaceIds.has(id),
      ),
    ),
  );
  if (reusedIds.length > 0) {
    await db
      .update(workspaces)
      .set({ updatedAt: sql`now()` })
      .where(inArray(workspaces.id, reusedIds));
  }

  return {
    imported,
    skipped: toSkipSummaries(skips).filter(
      (item) => item.reason !== "unsupported_account_field",
    ),
    workspaceIdMap: Object.fromEntries(workspaceIdMap),
  };
}

export type { BackupImportCounts };
