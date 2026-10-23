import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  vocabularyWords,
  workspaceFolders,
  workspaces,
  workspaceTags,
} from "@/db/schema";
import {
  contentTitleKey,
  emptyInventory,
  exerciseSectionKey,
  folderMatchKey,
  indexCanonicalIds,
  listeningFilenameKey,
  tagMatchKey,
  vocabWordKey,
  type ExistingInventory,
} from "./match";

type InventoryExecutor = Pick<typeof db, "select">;

/** Load the current user's learning inventory for duplicate matching. */
export async function loadExistingInventory(
  userId: string,
  executor: InventoryExecutor = db,
): Promise<ExistingInventory> {
  const existingWorkspaces = await executor
    .select({
      id: workspaces.id,
      language: workspaces.language,
      name: workspaces.name,
    })
    .from(workspaces)
    .where(eq(workspaces.userId, userId));

  const workspaceIds = existingWorkspaces.map((ws) => ws.id);
  const inventory = emptyInventory(existingWorkspaces);

  if (workspaceIds.length === 0) return inventory;

  const [
    folderRows,
    tagRows,
    vocabRows,
    theoryRows,
    exerciseRows,
    listeningRows,
    speakingRows,
  ] = await Promise.all([
    executor
      .select({
        id: workspaceFolders.id,
        workspaceId: workspaceFolders.workspaceId,
        section: workspaceFolders.section,
        parentId: workspaceFolders.parentId,
        name: workspaceFolders.name,
      })
      .from(workspaceFolders)
      .where(
        and(
          eq(workspaceFolders.userId, userId),
          inArray(workspaceFolders.workspaceId, workspaceIds),
        ),
      ),
    executor
      .select({
        workspaceId: workspaceTags.workspaceId,
        name: workspaceTags.name,
      })
      .from(workspaceTags)
      .where(inArray(workspaceTags.workspaceId, workspaceIds)),
    executor
      .select({
        workspaceId: vocabularyWords.workspaceId,
        word: vocabularyWords.word,
      })
      .from(vocabularyWords)
      .where(
        and(
          eq(vocabularyWords.userId, userId),
          inArray(vocabularyWords.workspaceId, workspaceIds),
        ),
      ),
    executor
      .select({
        workspaceId: grammarNotes.workspaceId,
        title: grammarNotes.title,
      })
      .from(grammarNotes)
      .where(
        and(
          eq(grammarNotes.userId, userId),
          inArray(grammarNotes.workspaceId, workspaceIds),
        ),
      ),
    executor
      .select({
        workspaceId: exercises.workspaceId,
        title: exercises.title,
        type: exercises.type,
      })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          inArray(exercises.workspaceId, workspaceIds),
        ),
      ),
    executor
      .select({
        workspaceId: listeningLessons.workspaceId,
        title: listeningLessons.title,
        originalFilename: listeningLessons.originalFilename,
      })
      .from(listeningLessons)
      .where(
        and(
          eq(listeningLessons.userId, userId),
          inArray(listeningLessons.workspaceId, workspaceIds),
        ),
      ),
    executor
      .select({
        workspaceId: speakingSessions.workspaceId,
        title: speakingSessions.title,
      })
      .from(speakingSessions)
      .where(
        and(
          eq(speakingSessions.userId, userId),
          inArray(speakingSessions.workspaceId, workspaceIds),
        ),
      ),
  ]);

  const folderIndex = indexCanonicalIds(
    folderRows.map((row) => ({
      id: row.id,
      key: folderMatchKey(
        row.workspaceId,
        row.section,
        row.parentId,
        row.name,
      ),
    })),
  );
  inventory.folders = folderIndex.map;
  inventory.folderAmbiguous = folderIndex.ambiguousCount;

  for (const row of tagRows) {
    inventory.tags.add(tagMatchKey(row.workspaceId, row.name));
  }
  for (const row of vocabRows) {
    inventory.vocabulary.add(vocabWordKey(row.workspaceId, row.word));
  }
  for (const row of theoryRows) {
    inventory.theory.add(contentTitleKey(row.workspaceId, "theory", row.title));
  }
  for (const row of exerciseRows) {
    const section = exerciseSectionKey(row.type);
    const key = contentTitleKey(row.workspaceId, section, row.title);
    if (section === "writing") {
      inventory.writing.add(key);
    } else {
      inventory.exercises.add(key);
    }
  }
  for (const row of listeningRows) {
    inventory.listeningTitles.add(
      contentTitleKey(row.workspaceId, "listening", row.title),
    );
    const filenameKey = listeningFilenameKey(
      row.workspaceId,
      row.originalFilename,
    );
    if (filenameKey) inventory.listeningFilenames.add(filenameKey);
  }
  for (const row of speakingRows) {
    inventory.speaking.add(
      contentTitleKey(row.workspaceId, "speaking", row.title),
    );
  }

  return inventory;
}
