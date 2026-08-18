import { and, desc, eq, countDistinct } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  vocabularyWords,
  wordMeanings,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

export type DashboardContinueModule =
  | "theory"
  | "writing"
  | "listening"
  | "speaking";

export type DashboardContinueItem = {
  id: string;
  module: DashboardContinueModule;
  title: string;
  href: string;
};

const MAX_ITEMS = 4;

export async function countPracticeReadyWords(
  workspaceId: string,
): Promise<number> {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select({ value: countDistinct(vocabularyWords.id) })
    .from(vocabularyWords)
    .innerJoin(wordMeanings, eq(wordMeanings.wordId, vocabularyWords.id))
    .where(
      and(
        eq(vocabularyWords.workspaceId, workspaceId),
        eq(vocabularyWords.userId, userId),
        eq(wordMeanings.isPrimary, true),
      ),
    );

  return row?.value ?? 0;
}

export async function getDashboardContinueItems(
  workspaceId: string,
): Promise<DashboardContinueItem[]> {
  const userId = await getCurrentUserId();
  const owned = and(
    eq(exercises.userId, userId),
    eq(exercises.workspaceId, workspaceId),
  );

  const [note, writing, listening, speaking] = await Promise.all([
    db.query.grammarNotes.findFirst({
      where: and(
        eq(grammarNotes.userId, userId),
        eq(grammarNotes.workspaceId, workspaceId),
      ),
      columns: { id: true, title: true, updatedAt: true },
      orderBy: [desc(grammarNotes.updatedAt)],
    }),
    db.query.exercises.findFirst({
      where: and(owned, eq(exercises.type, "WRITING")),
      columns: { id: true, title: true, updatedAt: true },
      orderBy: [desc(exercises.updatedAt)],
    }),
    db.query.listeningLessons.findFirst({
      where: and(
        eq(listeningLessons.userId, userId),
        eq(listeningLessons.workspaceId, workspaceId),
      ),
      columns: { id: true, title: true, updatedAt: true },
      orderBy: [desc(listeningLessons.updatedAt)],
    }),
    db.query.speakingSessions.findFirst({
      where: and(
        eq(speakingSessions.userId, userId),
        eq(speakingSessions.workspaceId, workspaceId),
      ),
      columns: { id: true, title: true, updatedAt: true },
      orderBy: [desc(speakingSessions.updatedAt)],
    }),
  ]);

  const items: Array<DashboardContinueItem & { updatedAt: Date }> = [];

  if (note) {
    items.push({
      id: note.id,
      module: "theory",
      title: note.title,
      href: `/theory/${note.id}`,
      updatedAt: note.updatedAt,
    });
  }
  if (writing) {
    items.push({
      id: writing.id,
      module: "writing",
      title: writing.title,
      href: `/writing/${writing.id}`,
      updatedAt: writing.updatedAt,
    });
  }
  if (listening) {
    items.push({
      id: listening.id,
      module: "listening",
      title: listening.title,
      href: `/listening/${listening.id}`,
      updatedAt: listening.updatedAt,
    });
  }
  if (speaking) {
    items.push({
      id: speaking.id,
      module: "speaking",
      title: speaking.title,
      href: `/speaking/${speaking.id}`,
      updatedAt: speaking.updatedAt,
    });
  }

  return items
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, MAX_ITEMS)
    .map(({ updatedAt: _updatedAt, ...item }) => item);
}
