import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import type { RealtimeClient } from "@stream-io/openai-realtime-api";
import { AI_JOBS, releaseJobLock } from "@/lib/ai/job-lock";
import { db } from "@/db";
import { speakingSessions, type SpeakingSession } from "@/db/schema";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { SpeakingError } from "@/lib/speaking/errors";
import { speakingTutorInstructions } from "@/lib/speaking/instructions";
import { speakingTutorUserId } from "@/lib/speaking/stream";
import { claimSpeakingTutor } from "@/lib/speaking/tutor-claim";
import { getStreamVideo } from "@/lib/stream-video";

const TUTOR_HEARTBEAT_MS = 30_000;

type TutorHandle = {
  client: RealtimeClient;
  done: Promise<void>;
  finish: () => void;
  ownerId: string;
  stopHeartbeat: () => void;
};

const globalForTutors = globalThis as unknown as {
  speakingTutors?: Map<string, TutorHandle>;
};

function tutorHandles() {
  globalForTutors.speakingTutors ??= new Map();
  return globalForTutors.speakingTutors;
}

export function hasLiveSpeakingTutor(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  return Boolean(handle?.client.isConnected());
}

function dropLocalTutor(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  if (!handle) return null;
  handle.stopHeartbeat();
  handle.client.disconnect();
  handle.finish();
  tutorHandles().delete(sessionId);
  return handle.ownerId;
}

export function disconnectSpeakingTutor(sessionId: string) {
  const ownerId = dropLocalTutor(sessionId);
  if (!ownerId) return;
  void releaseJobLock({
    operation: AI_JOBS.speakingTutor,
    subjectId: sessionId,
    ownerId,
  });
}

export function keepSpeakingTutorAlive(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  if (!handle) return;
  after(async () => {
    await handle.done;
  });
}

async function joinOpenAiTutor(
  session: SpeakingSession,
  ownerId: string,
  renew: () => Promise<boolean>,
) {
  dropLocalTutor(session.id);

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiApiKey) {
    throw new SpeakingError("OPENAI_NOT_CONFIGURED");
  }

  const streamVideo = getStreamVideo();
  const call = streamVideo.video.call("default", session.id);
  const realtimeClient = await streamVideo.video.connectOpenAi({
    call,
    openAiApiKey,
    agentUserId: speakingTutorUserId(session.id),
    model: "gpt-realtime",
  });

  await realtimeClient.waitForSessionCreated();
  realtimeClient.updateSession({
    instructions: await aiSystemPrompt(
      speakingTutorInstructions({
        language: session.language,
        cefrLevel: session.cefrLevel,
        topic: session.topic,
        notes: session.notes,
      }),
      { responseStyle: true, correctionStyle: true },
    ),
    voice: "coral",
    turn_detection: { type: "semantic_vad" },
    input_audio_noise_reduction: { type: "near_field" },
    output_modalities: ["audio"],
    input_audio_transcription: {
      model: "gpt-4o-mini-transcribe",
      language: session.language.length === 2 ? session.language : undefined,
    },
  });
  realtimeClient.createResponse();

  let finish = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const timer = setInterval(() => {
    void renew();
  }, TUTOR_HEARTBEAT_MS);
  timer.unref?.();
  const stopHeartbeat = () => clearInterval(timer);
  done.finally(stopHeartbeat);
  tutorHandles().set(session.id, {
    client: realtimeClient,
    done,
    finish,
    ownerId,
    stopHeartbeat,
  });
}

/** Connects the AI tutor. Safe to call from join + webhook; only one live socket wins. */
export async function connectSpeakingTutorToCall(sessionId: string) {
  const existing = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
  });

  if (!existing) {
    throw new SpeakingError("SESSION_NOT_FOUND");
  }

  if (
    existing.status === "completed" ||
    existing.status === "cancelled" ||
    existing.status === "processing"
  ) {
    throw new SpeakingError("SESSION_NOT_JOINABLE");
  }

  const claim = await claimSpeakingTutor({
    status: existing.status,
    localConnected: hasLiveSpeakingTutor(sessionId),
    sessionId,
    startedAt: existing.startedAt,
  });

  if (claim.action === "reject") {
    throw new SpeakingError(
      existing.startedAt ? "SESSION_EXPIRED" : "SESSION_NOT_JOINABLE",
    );
  }
  if (claim.action === "already_connected") {
    if (hasLiveSpeakingTutor(sessionId)) keepSpeakingTutorAlive(sessionId);
    return { alreadyConnected: true };
  }

  const [claimed] = await db
    .update(speakingSessions)
    .set({
      status: "active",
      startedAt: existing.startedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(speakingSessions.id, sessionId),
        eq(speakingSessions.status, "upcoming"),
      ),
    )
    .returning();

  const session =
    claimed ??
    (await db.query.speakingSessions.findFirst({
      where: eq(speakingSessions.id, sessionId),
    })) ??
    existing;
  if (
    session.status === "completed" ||
    session.status === "cancelled" ||
    session.status === "processing"
  ) {
    await claim.release();
    throw new SpeakingError("SESSION_NOT_JOINABLE");
  }

  try {
    await joinOpenAiTutor(session, claim.ownerId, claim.renew);
    try {
      const streamVideo = getStreamVideo();
      await streamVideo.video.call("default", session.id).startTranscription();
    } catch {
      // Already transcribing from call create settings.
    }
    keepSpeakingTutorAlive(session.id);
    return { alreadyConnected: false };
  } catch (error) {
    await claim.release();
    if (claimed) {
      await db
        .update(speakingSessions)
        .set({
          status: "upcoming",
          updatedAt: new Date(),
        })
        .where(eq(speakingSessions.id, sessionId));
    }
    throw error;
  }
}
