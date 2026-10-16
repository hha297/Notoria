import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import { SPEAKING_MAX_SESSION_SECONDS } from "@/lib/billing/plans";
import {
  completeSpeakingSession,
  finalizeSpeakingSession,
} from "@/lib/speaking/finalize";
import {
  isSpeakingPastDeadline,
  SPEAKING_RECONNECT_GRACE_MS,
} from "@/lib/speaking/lifetime";
import { isSpeakingTutorUserId } from "@/lib/speaking/stream";
import { getStreamVideo } from "@/lib/stream-video";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callHasLearnerParticipant(sessionId: string) {
  try {
    const streamVideo = getStreamVideo();
    const call = streamVideo.video.call("default", sessionId);
    const response = await call.get();
    const participants = response.call.session?.participants ?? [];
    return participants.some(
      (participant) => !isSpeakingTutorUserId(participant.user?.id),
    );
  } catch {
    // If we cannot inspect the call, treat as abandoned so cleanup still runs.
    return false;
  }
}

/**
 * If the session is still open but past the fair-use deadline, end Stream and
 * finalize once. Safe to call from page loads / token issuance.
 */
export async function recoverExpiredSpeakingSession(sessionId: string) {
  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: {
      id: true,
      status: true,
      startedAt: true,
      summary: true,
      transcript: true,
    },
  });
  if (!session) return null;

  if (
    (session.status === "upcoming" || session.status === "active") &&
    isSpeakingPastDeadline(session.startedAt)
  ) {
    await finalizeSpeakingSession(session.id);
    return db.query.speakingSessions.findFirst({
      where: eq(speakingSessions.id, sessionId),
    });
  }

  // Stuck processing — retry completion (idempotent locks / summary plan).
  if (session.status === "processing" && !session.summary?.trim()) {
    await completeSpeakingSession(session.id);
    return db.query.speakingSessions.findFirst({
      where: eq(speakingSessions.id, sessionId),
    });
  }

  return session;
}

/**
 * Sweep expired open sessions for one user (create/join admission).
 * Reuses finalizeSpeakingSession — no second summary pipeline.
 */
export async function recoverExpiredSpeakingSessionsForUser(userId: string) {
  const cutoff = new Date(Date.now() - SPEAKING_MAX_SESSION_SECONDS * 1000);
  const expired = await db.query.speakingSessions.findMany({
    where: and(
      eq(speakingSessions.userId, userId),
      inArray(speakingSessions.status, ["upcoming", "active"]),
      isNotNull(speakingSessions.startedAt),
      lt(speakingSessions.startedAt, cutoff),
    ),
    columns: { id: true },
    limit: 10,
  });

  for (const row of expired) {
    await finalizeSpeakingSession(row.id);
  }
}

/**
 * After a learner leave: wait for reconnect grace, then finalize only if no
 * learner is back in the Stream call (and the DB row is still open).
 */
export async function scheduleSpeakingAbandonFinalize(sessionId: string) {
  after(async () => {
    await sleep(SPEAKING_RECONNECT_GRACE_MS);
    await finalizeSpeakingSessionIfAbandoned(sessionId);
  });
}

export async function finalizeSpeakingSessionIfAbandoned(sessionId: string) {
  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: { id: true, status: true, startedAt: true },
  });
  if (!session) return;
  if (session.status !== "upcoming" && session.status !== "active") return;

  if (await callHasLearnerParticipant(sessionId)) {
    // Learner reconnected within the grace window — keep the original deadline.
    if (isSpeakingPastDeadline(session.startedAt)) {
      await finalizeSpeakingSession(sessionId);
    }
    return;
  }

  await finalizeSpeakingSession(sessionId);
}
