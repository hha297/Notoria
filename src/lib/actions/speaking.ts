"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { TranscriptionSettingsRequest } from "@stream-io/node-sdk";
import { db } from "@/db";
import { speakingSessions, users } from "@/db/schema";
import { ProAccessError } from "@/lib/auth/paid-access";
import { requireAiAssistanceEnabled } from "@/lib/ai/preferences-server";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getCurrentUserId, getSession } from "@/lib/auth/session";
import { consumeUsage } from "@/lib/billing/entitlements";
import { isQuotaExceededError } from "@/lib/billing/errors";
import { SPEAKING_MAX_SESSION_SECONDS } from "@/lib/billing/plans";
import {
  finalizeUsageReservation,
  refundUsageReservation,
} from "@/lib/billing/usage";
import { SpeakingError } from "@/lib/speaking/errors";
import { finalizeSpeakingSession } from "@/lib/speaking/finalize";
import { defaultSpeakingTitle } from "@/lib/speaking/instructions";
import {
  isSpeakingJoinable,
  speakingTokenValiditySeconds,
} from "@/lib/speaking/lifetime";
import {
  recoverExpiredSpeakingSession,
  recoverExpiredSpeakingSessionsForUser,
} from "@/lib/speaking/recovery";
import {
  speakingAvatarUri,
  speakingTutorUserId,
  SPEAKING_TUTOR_NAME,
  streamTranscriptionLanguage,
} from "@/lib/speaking/stream";
import {
  toSpeakingListItem,
  type SpeakingSessionDetail,
  type SpeakingSessionListItem,
} from "@/lib/speaking/types";
import { generateStreamUserToken, getStreamVideo } from "@/lib/stream-video";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import { connectSpeakingTutorToCall } from "@/lib/speaking/tutor";
import { createSpeakingSessionSchema } from "@/schemas/speaking";

/** Page-scoped revalidation for session CRUD (speaking has no folder layout tree). */
function revalidateSpeaking(id?: string) {
  revalidatePath("/speaking");
  if (id) {
    revalidatePath(`/speaking/${id}`);
    revalidatePath(`/speaking/${id}/call`);
  }
}

async function requireOwnedSession(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, id),
  });

  if (
    !session ||
    session.userId !== userId ||
    session.workspaceId !== workspace.id
  ) {
    throw new SpeakingError("SESSION_NOT_FOUND");
  }

  return { session, userId, workspace };
}

/** One joinable session at a time — recover expired first, then reject duplicates. */
async function assertNoOtherActiveSpeakingSession(
  userId: string,
  exceptId?: string,
) {
  await recoverExpiredSpeakingSessionsForUser(userId);

  const open = await db.query.speakingSessions.findMany({
    where: and(
      eq(speakingSessions.userId, userId),
      inArray(speakingSessions.status, ["upcoming", "active"]),
    ),
    columns: { id: true, status: true, startedAt: true },
    limit: 5,
  });

  const blocking = open.find(
    (row) =>
      row.id !== exceptId &&
      isSpeakingJoinable(row.status, row.startedAt),
  );
  if (blocking) {
    throw new SpeakingError("ACTIVE_SESSION_EXISTS");
  }
}

export async function getSpeakingSessions(): Promise<SpeakingSessionListItem[]> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return [];

  await recoverExpiredSpeakingSessionsForUser(userId);

  const rows = await db.query.speakingSessions.findMany({
    where: and(
      eq(speakingSessions.userId, userId),
      eq(speakingSessions.workspaceId, workspace.id),
    ),
    columns: {
      id: true,
      title: true,
      topic: true,
      cefrLevel: true,
      language: true,
      status: true,
      createdAt: true,
      startedAt: true,
      endedAt: true,
    },
    orderBy: [desc(speakingSessions.createdAt)],
  });

  return rows.map(toSpeakingListItem);
}

export async function getSpeakingSession(
  id: string,
): Promise<SpeakingSessionDetail | null> {
  try {
    const { session } = await requireOwnedSession(id);
    await recoverExpiredSpeakingSession(session.id);
    const latest = await db.query.speakingSessions.findFirst({
      where: eq(speakingSessions.id, session.id),
    });
    return latest ?? session;
  } catch (error) {
    if (
      error instanceof SpeakingError ||
      error instanceof ProAccessError ||
      (error instanceof Error && error.message === "Unauthorized")
    ) {
      return null;
    }
    throw error;
  }
}

export async function createSpeakingSession(formData: FormData) {
  const user = await getCurrentUserRecord();
  if (!user) {
    throw new SpeakingError("UNAUTHORIZED");
  }
  const userId = user.id;
  const workspace = await requireActiveWorkspace();

  const topicValue = String(formData.get("topic") ?? "");
  const cefrValue = String(formData.get("cefrLevel") ?? "");
  const parsed = createSpeakingSessionSchema.safeParse({
    title: String(formData.get("title") ?? "").trim() || undefined,
    topic: topicValue && topicValue !== "none" ? topicValue : undefined,
    cefrLevel: cefrValue && cefrValue !== "none" ? cefrValue : undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    throw new SpeakingError("INVALID_INPUT");
  }

  await assertNoOtherActiveSpeakingSession(userId);

  let reservation: Awaited<ReturnType<typeof consumeUsage>>;
  try {
    reservation = await consumeUsage(user, "ai_meeting");
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new SpeakingError("AI_QUOTA_EXCEEDED");
    }
    throw error;
  }

  try {
    const title =
      parsed.data.title ||
      defaultSpeakingTitle({
        topic: parsed.data.topic,
        cefrLevel: parsed.data.cefrLevel,
      });

    const [created] = await db
      .insert(speakingSessions)
      .values({
        userId,
        workspaceId: workspace.id,
        title,
        language: workspace.language,
        topic: parsed.data.topic ?? null,
        cefrLevel: parsed.data.cefrLevel ?? null,
        notes: parsed.data.notes ?? null,
        status: "upcoming",
      })
      .returning();

    if (!created) {
      throw new SpeakingError("STREAM_CALL_FAILED");
    }

    try {
      const streamVideo = getStreamVideo();
      const call = streamVideo.video.call("default", created.id);
      const tutorId = speakingTutorUserId(created.id);

      const learnerName = user.name || "Learner";
      await streamVideo.upsertUsers([
        {
          id: userId,
          name: learnerName,
          // Minimum role — do not grant Stream admin to ordinary learners.
          role: "user",
          image: speakingAvatarUri(learnerName, "initials"),
        },
        {
          id: tutorId,
          name: SPEAKING_TUTOR_NAME,
          role: "user",
          image: speakingAvatarUri(SPEAKING_TUTOR_NAME, "bottts"),
        },
      ]);

      await call.create({
        data: {
          created_by_id: userId,
          members: [
            { user_id: userId },
            { user_id: tutorId },
          ],
          custom: {
            speakingSessionId: created.id,
            title: created.title,
            maxDurationSeconds: SPEAKING_MAX_SESSION_SECONDS,
          },
          settings_override: {
            limits: {
              max_duration_seconds: SPEAKING_MAX_SESSION_SECONDS,
              max_participants: 2,
            },
            transcription: {
              language: streamTranscriptionLanguage(
                workspace.language,
              ) as NonNullable<TranscriptionSettingsRequest["language"]>,
              mode: "auto-on",
              closed_caption_mode: "auto-on",
            },
            recording: {
              mode: "disabled",
            },
          },
        },
      });
    } catch (error) {
      await db.delete(speakingSessions).where(eq(speakingSessions.id, created.id));
      if (error instanceof SpeakingError) throw error;
      throw new SpeakingError("STREAM_CALL_FAILED");
    }

    await finalizeUsageReservation(reservation.reservationId);
    revalidateSpeaking(created.id);
    return { id: created.id };
  } catch (error) {
    await refundUsageReservation(reservation.reservationId);
    throw error;
  }
}

export async function deleteSpeakingSession(id: string) {
  const { session } = await requireOwnedSession(id);

  await db.delete(speakingSessions).where(eq(speakingSessions.id, session.id));

  try {
    const streamVideo = getStreamVideo();
    const call = streamVideo.video.call("default", session.id);
    await call.end();
  } catch {
    // Stream cleanup is best-effort; the DB row is already gone.
  }

  revalidateSpeaking();
}

/**
 * Issue a Stream user token only after ownership + joinability checks.
 * Tokens are scoped by validity to the remaining session deadline.
 */
export async function generateSpeakingToken(sessionId: string) {
  if (!sessionId?.trim()) {
    throw new SpeakingError("INVALID_INPUT");
  }

  const auth = await getSession();
  const userId = auth?.user?.id;
  if (!userId) {
    throw new SpeakingError("UNAUTHORIZED");
  }

  const { session } = await requireOwnedSession(sessionId);
  const recovered = await recoverExpiredSpeakingSession(session.id);
  const current = recovered ?? session;

  if (!isSpeakingJoinable(current.status, current.startedAt)) {
    throw new SpeakingError(
      current.startedAt && current.status !== "upcoming"
        ? "SESSION_EXPIRED"
        : "SESSION_NOT_JOINABLE",
    );
  }

  await assertNoOtherActiveSpeakingSession(userId, session.id);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true, image: true },
  });

  const name = user?.name || auth.user?.name || "Learner";
  const image =
    user?.image ||
    auth.user?.image ||
    speakingAvatarUri(name, "initials");

  const streamVideo = getStreamVideo();
  await streamVideo.upsertUsers([
    {
      id: userId,
      name,
      role: "user",
      image,
    },
  ]);

  return generateStreamUserToken({
    userId,
    validityInSeconds: speakingTokenValiditySeconds(current.startedAt),
  });
}

export async function connectSpeakingTutor(sessionId: string) {
  await requireAiAssistanceEnabled();
  const { session } = await requireOwnedSession(sessionId);
  const recovered = await recoverExpiredSpeakingSession(session.id);
  const current = recovered ?? session;
  if (!isSpeakingJoinable(current.status, current.startedAt)) {
    throw new SpeakingError("SESSION_NOT_JOINABLE");
  }
  await connectSpeakingTutorToCall(sessionId);
  const latest = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: { startedAt: true },
  });
  return {
    startedAt: latest?.startedAt?.toISOString() ?? null,
  };
}

export async function endSpeakingSession(sessionId: string, captions?: string) {
  await requireOwnedSession(sessionId);
  await finalizeSpeakingSession(sessionId, captions);
}
