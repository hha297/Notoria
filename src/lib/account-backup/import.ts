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
import { buildBackupPreview, type ExistingVocabKey } from "./preview";
import type {
  AccountBackupDocument,
  BackupImportCounts,
  BackupImportResult,
  BackupSkipReason,
  BackupSkipSummary,
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

function normalizeVocabStatus(status: string) {
  const upper = status.toUpperCase();
  return VOCAB_STATUSES.has(upper) ? (upper as "NEW" | "LEARNING" | "REVIEW" | "MASTERED") : "NEW";
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
  // Older backups may use READY
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

function vocabKey(workspaceId: string, word: string, partOfSpeech: string | null) {
  return `${workspaceId}::${word.trim().toLowerCase()}::${(partOfSpeech ?? "").trim().toLowerCase()}`;
}

/**
 * Import learning data from a validated account backup into the current user's account.
 * Never touches identity, auth, or billing. Uses "add as new" with language-based workspace reuse.
 */
export async function importAccountBackupLearningData(options: {
  userId: string;
  backup: AccountBackupDocument;
}): Promise<BackupImportResult> {
  const { userId, backup } = options;
  const skips: SkipBucket = new Map();
  const imported = EMPTY_BACKUP_COUNTS();

  const existingWorkspaces = await db.query.workspaces.findMany({
    where: eq(workspaces.userId, userId),
    columns: { id: true, language: true, name: true },
  });

  const existingVocabRows = existingWorkspaces.length
    ? await db
        .select({
          workspaceId: vocabularyWords.workspaceId,
          word: vocabularyWords.word,
          partOfSpeech: vocabularyWords.partOfSpeech,
        })
        .from(vocabularyWords)
        .where(
          and(
            eq(vocabularyWords.userId, userId),
            inArray(
              vocabularyWords.workspaceId,
              existingWorkspaces.map((ws) => ws.id),
            ),
          ),
        )
    : [];

  const existingVocabKeys: ExistingVocabKey[] = existingVocabRows.map((row) => ({
    workspaceId: row.workspaceId,
    word: row.word,
    partOfSpeech: row.partOfSpeech ?? "",
  }));

  // Warm preview for consistent skip accounting (not returned; import does the writes)
  buildBackupPreview(
    backup,
    existingWorkspaces.map((ws) => ({ id: ws.id, language: ws.language })),
    existingVocabKeys,
  );

  const languageToId = new Map(
    existingWorkspaces.map((ws) => [ws.language.trim().toLowerCase(), ws.id]),
  );
  const workspaceIdMap = new Map<string, string>();
  const folderIdMap = new Map<string, string>();
  const existingVocab = new Set(
    existingVocabKeys.map((item) =>
      vocabKey(item.workspaceId, item.word, item.partOfSpeech || null),
    ),
  );

  await db.transaction(async (tx) => {
    // 1. Workspaces
    for (const workspace of backup.workspaces) {
      const langKey = workspace.language.trim().toLowerCase();
      const existingId = languageToId.get(langKey);
      if (existingId) {
        workspaceIdMap.set(workspace.id, existingId);
        addSkip(skips, "workspace_language_exists", workspace.name);
        continue;
      }

      const [created] = await tx
        .insert(workspaces)
        .values({
          userId,
          name: workspace.name,
          language: workspace.language,
        })
        .returning({ id: workspaces.id });

      workspaceIdMap.set(workspace.id, created.id);
      languageToId.set(langKey, created.id);
      imported.workspaces += 1;
    }

    // 2. Workspace tags + folders
    for (const workspace of backup.workspaces) {
      const newWorkspaceId = workspaceIdMap.get(workspace.id);
      if (!newWorkspaceId) continue;

      for (const tagName of workspace.tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;

        const existingTag = await tx.query.workspaceTags.findFirst({
          where: and(
            eq(workspaceTags.workspaceId, newWorkspaceId),
            eq(workspaceTags.name, trimmed),
          ),
          columns: { id: true },
        });
        if (existingTag) continue;

        await tx.insert(workspaceTags).values({
          workspaceId: newWorkspaceId,
          name: trimmed,
        });
        imported.tags += 1;
      }

      // Insert folders in parent-first passes
      const pending = [...workspace.folders];
      let safety = pending.length + 2;
      while (pending.length > 0 && safety-- > 0) {
        const nextRound: typeof pending = [];
        for (const folder of pending) {
          if (folder.parentId && !folderIdMap.has(folder.parentId)) {
            // Parent not yet mapped — wait unless parent isn't in this workspace
            const parentInBackup = workspace.folders.some((f) => f.id === folder.parentId);
            if (parentInBackup) {
              nextRound.push(folder);
              continue;
            }
          }

          const parentId =
            folder.parentId && folderIdMap.has(folder.parentId)
              ? folderIdMap.get(folder.parentId)!
              : null;

          const [created] = await tx
            .insert(workspaceFolders)
            .values({
              userId,
              workspaceId: newWorkspaceId,
              section: folder.section as FolderSection,
              parentId,
              name: folder.name,
            })
            .returning({ id: workspaceFolders.id });

          folderIdMap.set(folder.id, created.id);
          imported.folders += 1;
        }
        if (nextRound.length === pending.length) {
          // Cycle / orphan — insert remaining without parent
          for (const folder of nextRound) {
            const [created] = await tx
              .insert(workspaceFolders)
              .values({
                userId,
                workspaceId: newWorkspaceId,
                section: folder.section as FolderSection,
                parentId: null,
                name: folder.name,
              })
              .returning({ id: workspaceFolders.id });
            folderIdMap.set(folder.id, created.id);
            imported.folders += 1;
          }
          break;
        }
        pending.length = 0;
        pending.push(...nextRound);
      }
    }

    // 3. Vocabulary
    for (const item of backup.vocabulary) {
      const newWorkspaceId = workspaceIdMap.get(item.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", item.word);
        continue;
      }

      const key = vocabKey(newWorkspaceId, item.word, item.partOfSpeech);
      if (existingVocab.has(key)) {
        addSkip(skips, "vocabulary_duplicate", item.word);
        continue;
      }

      try {
        const [created] = await tx
          .insert(vocabularyWords)
          .values({
            userId,
            workspaceId: newWorkspaceId,
            word: item.word.trim(),
            partOfSpeech: item.partOfSpeech?.trim() || null,
            synonyms: item.synonyms,
            notes: item.notes,
            status: normalizeVocabStatus(item.status),
          })
          .returning({ id: vocabularyWords.id });

        existingVocab.add(key);

        if (item.meanings.length > 0) {
          await tx.insert(wordMeanings).values(
            item.meanings.map((meaning, index) => ({
              wordId: created.id,
              meaning: meaning.meaning,
              isPrimary: meaning.isPrimary,
              sortOrder: meaning.sortOrder ?? index,
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

        imported.vocabulary += 1;
      } catch {
        addSkip(skips, "vocabulary_duplicate", item.word);
      }
    }

    // 4. Theory
    for (const note of backup.theory) {
      const newWorkspaceId = workspaceIdMap.get(note.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", note.title);
        continue;
      }
      const folderId =
        note.folderId && folderIdMap.has(note.folderId)
          ? folderIdMap.get(note.folderId)!
          : null;

      await tx.insert(grammarNotes).values({
        userId,
        workspaceId: newWorkspaceId,
        folderId,
        title: note.title,
        content: note.content as object,
      });
      imported.theory += 1;
    }

    // 5. Exercises (including writing)
    for (const exercise of backup.exercises) {
      const newWorkspaceId = workspaceIdMap.get(exercise.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", exercise.title);
        continue;
      }
      const type = normalizeExerciseType(exercise.type);
      if (!type) {
        addSkip(skips, "invalid_record", exercise.title);
        continue;
      }
      const folderId =
        exercise.folderId && folderIdMap.has(exercise.folderId)
          ? folderIdMap.get(exercise.folderId)!
          : null;

      await tx.insert(exercises).values({
        userId,
        workspaceId: newWorkspaceId,
        folderId,
        title: exercise.title,
        description: exercise.description,
        type,
        content: exercise.content as object,
      });

      if (type === "WRITING") {
        imported.writing += 1;
      } else {
        imported.exercises += 1;
      }
    }

    // 6. Listening
    for (const lesson of backup.listening) {
      const newWorkspaceId = workspaceIdMap.get(lesson.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", lesson.title);
        continue;
      }
      if (!lesson.mediaUrl?.trim() || !lesson.mediaPublicId?.trim()) {
        addSkip(skips, "listening_missing_media", lesson.title);
        continue;
      }

      const folderId =
        lesson.folderId && folderIdMap.has(lesson.folderId)
          ? folderIdMap.get(lesson.folderId)!
          : null;

      const exerciseType = lesson.exerciseType
        ? normalizeListeningExerciseType(lesson.exerciseType)
        : null;

      try {
        const [created] = await tx
          .insert(listeningLessons)
          .values({
            userId,
            workspaceId: newWorkspaceId,
            folderId,
            title: lesson.title,
            originalFilename: lesson.originalFilename,
            cloudinaryUrl: lesson.mediaUrl,
            cloudinaryPublicId: lesson.mediaPublicId,
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

        imported.listening += 1;
      } catch (error) {
        // Unique filename per workspace
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          addSkip(skips, "listening_duplicate_filename", lesson.title);
          continue;
        }
        addSkip(skips, "invalid_record", lesson.title);
      }
    }

    // 7. Speaking
    for (const session of backup.speaking) {
      const newWorkspaceId = workspaceIdMap.get(session.workspaceId);
      if (!newWorkspaceId) {
        addSkip(skips, "invalid_workspace_ref", session.title);
        continue;
      }

      await tx.insert(speakingSessions).values({
        userId,
        workspaceId: newWorkspaceId,
        title: session.title,
        language: session.language,
        topic: session.topic,
        cefrLevel: session.cefrLevel,
        notes: session.notes,
        status: normalizeSpeakingStatus(session.status),
        transcript: session.transcript,
        transcriptUrl: session.transcriptUrl,
        recordingUrl: session.recordingUrl,
        summary: session.summary,
        startedAt: parseDate(session.startedAt),
        endedAt: parseDate(session.endedAt),
      });
      imported.speaking += 1;
    }
  });

  // Touch updatedAt on reused workspaces so they feel fresh
  const reusedIds = Array.from(
    new Set(
      Array.from(workspaceIdMap.values()).filter((id) =>
        existingWorkspaces.some((ws) => ws.id === id),
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
