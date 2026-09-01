"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { TranscriptionSettingsRequest } from "@stream-io/node-sdk";
import { db } from "@/db";
import { speakingSessions, users } from "@/db/schema";
import { ProAccessError } from "@/lib/auth/paid-access";
import { requireProAccess } from "@/lib/auth/pro-access";
import { getCurrentUserId, getSession } from "@/lib/auth/session";
import { SpeakingError } from "@/lib/speaking/errors";
import { defaultSpeakingTitle } from "@/lib/speaking/instructions";
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
import { getStreamVideo } from "@/lib/stream-video";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import { connectSpeakingTutorToCall } from "@/lib/speaking/tutor";
import { finalizeSpeakingSession } from "@/lib/speaking/finalize";
import { createSpeakingSessionSchema } from "@/schemas/speaking";

function revalidateSpeaking(id?: string) {
  revalidatePath("/speaking", "layout");
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

export async function getSpeakingSessions(): Promise<SpeakingSessionListItem[]> {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return [];

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
    await requireProAccess();
    const { session } = await requireOwnedSession(id);
    return session;
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
  await requireProAccess();
  const userId = await getCurrentUserId();
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
    await call.create({
      data: {
        created_by_id: userId,
        custom: {
          speakingSessionId: created.id,
          title: created.title,
        },
        settings_override: {
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

    await streamVideo.upsertUsers([
      {
        id: speakingTutorUserId(created.id),
        name: SPEAKING_TUTOR_NAME,
        role: "user",
        image: speakingAvatarUri(SPEAKING_TUTOR_NAME, "bottts"),
      },
    ]);
  } catch (error) {
    await db.delete(speakingSessions).where(eq(speakingSessions.id, created.id));
    if (error instanceof SpeakingError) throw error;
    throw new SpeakingError("STREAM_CALL_FAILED");
  }

  revalidateSpeaking(created.id);
  return { id: created.id };
}

export async function deleteSpeakingSession(id: string) {
  await requireProAccess();
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

export async function generateSpeakingToken() {
  await requireProAccess();
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new SpeakingError("UNAUTHORIZED");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true, image: true },
  });

  const name = user?.name || session.user?.name || "Learner";
  const image =
    user?.image ||
    session.user?.image ||
    speakingAvatarUri(name, "initials");

  const streamVideo = getStreamVideo();
  await streamVideo.upsertUsers([
    {
      id: userId,
      name,
      role: "admin",
      image,
    },
  ]);

  return streamVideo.generateUserToken({
    user_id: userId,
    validity_in_seconds: 3600,
  });
}

export async function connectSpeakingTutor(sessionId: string) {
  await requireProAccess();
  await requireOwnedSession(sessionId);
  await connectSpeakingTutorToCall(sessionId);
}

export async function endSpeakingSession(sessionId: string, captions?: string) {
  await requireProAccess();
  await requireOwnedSession(sessionId);
  await finalizeSpeakingSession(sessionId, captions);
}
