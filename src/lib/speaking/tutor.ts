import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import type { RealtimeClient } from "@stream-io/openai-realtime-api";
import { db } from "@/db";
import { speakingSessions, type SpeakingSession } from "@/db/schema";
import { SpeakingError } from "@/lib/speaking/errors";
import { speakingTutorInstructions } from "@/lib/speaking/instructions";
import { speakingTutorUserId } from "@/lib/speaking/stream";
import { getStreamVideo } from "@/lib/stream-video";

type TutorHandle = {
  client: RealtimeClient;
  done: Promise<void>;
  finish: () => void;
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

export function disconnectSpeakingTutor(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  if (!handle) return;
  handle.client.disconnect();
  handle.finish();
  tutorHandles().delete(sessionId);
}

export function keepSpeakingTutorAlive(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  if (!handle) return;
  after(async () => {
    await handle.done;
  });
}

async function joinOpenAiTutor(session: SpeakingSession) {
  disconnectSpeakingTutor(session.id);

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
    instructions: speakingTutorInstructions({
      language: session.language,
      cefrLevel: session.cefrLevel,
      topic: session.topic,
      notes: session.notes,
    }),
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
  tutorHandles().set(session.id, { client: realtimeClient, done, finish });
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

  if (existing.status === "active" && hasLiveSpeakingTutor(sessionId)) {
    keepSpeakingTutorAlive(sessionId);
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

  const session = claimed ?? existing;

  try {
    await joinOpenAiTutor(session);
    try {
      const streamVideo = getStreamVideo();
      await streamVideo.video.call("default", session.id).startTranscription();
    } catch {
      // Already transcribing from call create settings.
    }
    keepSpeakingTutorAlive(session.id);
    return { alreadyConnected: false };
  } catch (error) {
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
