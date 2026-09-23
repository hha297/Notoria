import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "@/db";
import {
  exercises,
  flashcardProgress,
  flashcardReviews,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  vocabularyWords,
} from "@/db/schema";
import { displayPlan, entitlementPlan, type PlanId } from "@/lib/billing/plans";
import type { User } from "@/db/schema";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type CoachSnapshot = {
  language: string;
  vocabulary: Record<string, number>;
  dueReviews: number;
  weakWords: string[];
  last7Days: {
    flashcardReviews: number;
    againOrHard: number;
    listeningLessons: number;
    speakingSessions: number;
    writingDocuments: number;
    theoryNotes: number;
  };
  recentSpeakingLevel: string | null;
  focus: string[];
};

export type CoachResult =
  | {
      ok: true;
      snapshot: CoachSnapshot;
      note: string | null;
    }
  | {
      ok: false;
      code: "PREMIUM_REQUIRED";
      currentPlan: PlanId;
    };

type EntitlementUser = Pick<
  User,
  "id" | "role" | "subscriptionPlan" | "subscriptionStatus"
>;

export async function getLearningCoach(input: {
  user: EntitlementUser;
  workspaceId: string;
  language: string;
}): Promise<CoachResult> {
  if (entitlementPlan(input.user) !== "premium") {
    return {
      ok: false,
      code: "PREMIUM_REQUIRED",
      currentPlan: displayPlan(input.user),
    };
  }

  const since = new Date(Date.now() - WEEK_MS);
  const userId = input.user.id;
  const workspaceId = input.workspaceId;

  const [
    vocabRows,
    weakRows,
    reviewRows,
    listeningRows,
    speakingRows,
    writingRows,
    theoryRows,
    latestSpeaking,
  ] = await Promise.all([
    db
      .select({ status: vocabularyWords.status, total: count() })
      .from(vocabularyWords)
      .where(
        and(
          eq(vocabularyWords.userId, userId),
          eq(vocabularyWords.workspaceId, workspaceId),
        ),
      )
      .groupBy(vocabularyWords.status),
    db
      .select({ word: vocabularyWords.word })
      .from(flashcardProgress)
      .innerJoin(vocabularyWords, eq(vocabularyWords.id, flashcardProgress.wordId))
      .where(
        and(
          eq(flashcardProgress.userId, userId),
          eq(flashcardProgress.workspaceId, workspaceId),
          inArray(flashcardProgress.lastRating, ["AGAIN", "HARD"]),
        ),
      )
      .limit(8),
    db
      .select({ rating: flashcardReviews.rating, total: count() })
      .from(flashcardReviews)
      .where(
        and(
          eq(flashcardReviews.userId, userId),
          eq(flashcardReviews.workspaceId, workspaceId),
          gte(flashcardReviews.createdAt, since),
        ),
      )
      .groupBy(flashcardReviews.rating),
    db
      .select({ total: count() })
      .from(listeningLessons)
      .where(
        and(
          eq(listeningLessons.userId, userId),
          eq(listeningLessons.workspaceId, workspaceId),
          gte(listeningLessons.updatedAt, since),
        ),
      ),
    db
      .select({ total: count() })
      .from(speakingSessions)
      .where(
        and(
          eq(speakingSessions.userId, userId),
          eq(speakingSessions.workspaceId, workspaceId),
          gte(speakingSessions.createdAt, since),
        ),
      ),
    db
      .select({ total: count() })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          eq(exercises.workspaceId, workspaceId),
          gte(exercises.updatedAt, since),
        ),
      ),
    db
      .select({ total: count() })
      .from(grammarNotes)
      .where(
        and(
          eq(grammarNotes.userId, userId),
          eq(grammarNotes.workspaceId, workspaceId),
          gte(grammarNotes.updatedAt, since),
        ),
      ),
    db.query.speakingSessions.findFirst({
      where: and(
        eq(speakingSessions.userId, userId),
        eq(speakingSessions.workspaceId, workspaceId),
      ),
      columns: { cefrLevel: true },
      orderBy: [desc(speakingSessions.createdAt)],
    }),
  ]);

  const vocabulary: Record<string, number> = {};
  for (const row of vocabRows) {
    vocabulary[row.status] = Number(row.total);
  }

  const reviewTotal = reviewRows.reduce((sum, row) => sum + Number(row.total), 0);
  const againOrHard = reviewRows
    .filter((row) => row.rating === "AGAIN" || row.rating === "HARD")
    .reduce((sum, row) => sum + Number(row.total), 0);

  const dueReviews = await countDue(userId, workspaceId);

  const weakWords = weakRows.map((row) => row.word).filter(Boolean);
  const focus = buildFocus({
    dueReviews,
    weakWords,
    listening: Number(listeningRows[0]?.total ?? 0),
    speaking: Number(speakingRows[0]?.total ?? 0),
  });

  const snapshot: CoachSnapshot = {
    language: input.language,
    vocabulary,
    dueReviews,
    weakWords,
    last7Days: {
      flashcardReviews: reviewTotal,
      againOrHard,
      listeningLessons: Number(listeningRows[0]?.total ?? 0),
      speakingSessions: Number(speakingRows[0]?.total ?? 0),
      writingDocuments: Number(writingRows[0]?.total ?? 0),
      theoryNotes: Number(theoryRows[0]?.total ?? 0),
    },
    recentSpeakingLevel: latestSpeaking?.cefrLevel ?? null,
    focus,
  };

  return {
    ok: true,
    snapshot,
    note: await narrateSnapshot(snapshot),
  };
}

async function countDue(userId: string, workspaceId: string) {
  const now = new Date();
  const rows = await db
    .select({ total: count() })
    .from(flashcardProgress)
    .where(
      and(
        eq(flashcardProgress.userId, userId),
        eq(flashcardProgress.workspaceId, workspaceId),
      ),
    );
  const all = Number(rows[0]?.total ?? 0);
  if (all === 0) return 0;
  const due = await db
    .select({ total: count() })
    .from(flashcardProgress)
    .where(
      and(
        eq(flashcardProgress.userId, userId),
        eq(flashcardProgress.workspaceId, workspaceId),
        lte(flashcardProgress.nextReviewAt, now),
      ),
    );
  return Number(due[0]?.total ?? 0);
}

function buildFocus(input: {
  dueReviews: number;
  weakWords: string[];
  listening: number;
  speaking: number;
}) {
  const focus: string[] = [];
  if (input.dueReviews > 0) {
    focus.push("review-due");
  }
  if (input.weakWords.length > 0) {
    focus.push("weak-words");
  }
  if (input.listening === 0) {
    focus.push("listening");
  }
  if (input.speaking === 0) {
    focus.push("speaking");
  }
  if (focus.length === 0) {
    focus.push("keep-going");
  }
  return focus.slice(0, 3);
}

async function narrateSnapshot(snapshot: CoachSnapshot) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const client = new OpenAI({ apiKey, timeout: 20_000 });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Write 2 or 3 short sentences for a language learner. Use only the facts in the JSON. Do not invent scores, mistakes, or activities that are not listed.",
        },
        { role: "user", content: JSON.stringify(snapshot) },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}
