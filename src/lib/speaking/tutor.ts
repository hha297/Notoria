import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import type {
  RealtimeClient,
  RealtimeEventEnvelope,
} from "@stream-io/openai-realtime-api";
import { AI_JOBS, releaseJobLock } from "@/lib/ai/job-lock";
import { db } from "@/db";
import { speakingSessions, type SpeakingSession } from "@/db/schema";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { SpeakingError } from "@/lib/speaking/errors";
import { speakingTutorInstructions } from "@/lib/speaking/instructions";
import {
  emptyOpenAiTranscriptState,
  openAiTranscriptionLanguage,
  OpenAiTranscriptCollector,
} from "@/lib/speaking/openai-transcript";
import { persistOpenAiTranscriptFromCollector } from "@/lib/speaking/openai-transcript-persist";
import { speakingTutorUserId } from "@/lib/speaking/stream";
import { claimSpeakingTutor } from "@/lib/speaking/tutor-claim";
import { getStreamVideo } from "@/lib/stream-video";

const TUTOR_HEARTBEAT_MS = 30_000;
const OPENAI_FLUSH_MS = 1_200;
/** Bound wait for late transcription events before closing the realtime socket. */
const OPENAI_DRAIN_MS = 4_000;
const OPENAI_DRAIN_QUIET_MS = 800;

type TutorHandle = {
  client: RealtimeClient;
  done: Promise<void>;
  finish: () => void;
  ownerId: string;
  stopHeartbeat: () => void;
  openaiCollector: OpenAiTranscriptCollector;
  stopFlush: () => void;
};

const globalForTutors = globalThis as unknown as {
  speakingTutors?: Map<string, TutorHandle>;
};

function tutorHandles() {
  globalForTutors.speakingTutors ??= new Map();
  return globalForTutors.speakingTutors;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hasLiveSpeakingTutor(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  return Boolean(handle?.client.isConnected());
}

function flushOpenAi(
  sessionId: string,
  collector: OpenAiTranscriptCollector,
  awaitPersist = false,
) {
  const promise = persistOpenAiTranscriptFromCollector(
    sessionId,
    collector,
  ).catch(() => {
    // Persistence must never block tutor audio during the call.
  });
  if (awaitPersist) return promise;
  return undefined;
}

async function ensureOpenAiTranscriptRow(sessionId: string) {
  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: { transcriptDebug: true },
  });
  if (!session || session.transcriptDebug) return;
  await db
    .update(speakingSessions)
    .set({
      transcriptDebug: emptyOpenAiTranscriptState("collecting"),
      updatedAt: new Date(),
    })
    .where(eq(speakingSessions.id, sessionId));
}

function attachOpenAiTranscript(
  sessionId: string,
  client: RealtimeClient,
): { collector: OpenAiTranscriptCollector; stopFlush: () => void } {
  const collector = new OpenAiTranscriptCollector();
  void ensureOpenAiTranscriptRow(sessionId);

  const onEvent = (raw: unknown) => {
    const envelope = raw as RealtimeEventEnvelope;
    if (!envelope || envelope.source !== "server") return;
    collector.handleServerEvent(envelope.event);
  };

  client.on("realtime.event", onEvent);

  const flushTimer = setInterval(() => {
    if (!collector.consumeDirty()) return;
    flushOpenAi(sessionId, collector);
  }, OPENAI_FLUSH_MS);
  flushTimer.unref?.();

  const stopFlush = () => {
    clearInterval(flushTimer);
  };

  return { collector, stopFlush };
}

/**
 * Drain pending OpenAI transcript events while the socket is still open,
 * then mark ready/error and persist. Idempotent if already terminal in DB
 * or no live handle.
 */
export async function drainSpeakingOpenAiTranscript(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  if (!handle) return;

  const { openaiCollector: collector } = handle;
  collector.markFinalizing();
  await flushOpenAi(sessionId, collector, true);

  const started = Date.now();
  let lastActivity = Date.now();

  while (Date.now() - started < OPENAI_DRAIN_MS) {
    await sleep(150);
    if (collector.consumeDirty()) {
      lastActivity = Date.now();
      await flushOpenAi(sessionId, collector, true);
      continue;
    }
    if (Date.now() - lastActivity >= OPENAI_DRAIN_QUIET_MS) break;
  }

  const snap = collector.snapshot();
  if (snap.status === "ready" || snap.status === "error") {
    await flushOpenAi(sessionId, collector, true);
    return;
  }

  if (snap.entries.length === 0) {
    collector.markError(
      snap.errorMessage ?? "OpenAI transcript incomplete",
    );
  } else {
    collector.markReady();
  }
  await flushOpenAi(sessionId, collector, true);
}

function dropLocalTutor(sessionId: string) {
  const handle = tutorHandles().get(sessionId);
  if (!handle) return null;
  // Remove before disconnect so the `close` handler does not double-finalize.
  tutorHandles().delete(sessionId);
  handle.stopHeartbeat();
  handle.stopFlush();
  handle.client.disconnect();
  handle.finish();
  return handle.ownerId;
}

/**
 * Finalize OpenAI transcript (bounded drain), then disconnect the tutor socket.
 */
export async function disconnectSpeakingTutor(sessionId: string) {
  try {
    await drainSpeakingOpenAiTranscript(sessionId);
  } catch (error) {
    console.error("Failed to drain speaking OpenAI transcript", sessionId, error);
  }
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

  const transcriptionLanguage = openAiTranscriptionLanguage(session.language);
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
      model: "gpt-4o-transcribe",
      ...(transcriptionLanguage ? { language: transcriptionLanguage } : {}),
    },
  });

  // Attach before the initial tutor response so greeting transcript events are kept.
  const { collector, stopFlush } = attachOpenAiTranscript(
    session.id,
    realtimeClient,
  );

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
    openaiCollector: collector,
    stopFlush,
  });

  // When the call ends on another instance, this host still owns the socket.
  // Finalize whatever was collected once the realtime connection closes.
  realtimeClient.on("close", () => {
    const handle = tutorHandles().get(session.id);
    if (!handle) return;
    const snap = handle.openaiCollector.snapshot();
    if (snap.status === "collecting" || snap.status === "finalizing") {
      if (snap.entries.length === 0) {
        handle.openaiCollector.markError(
          snap.errorMessage ?? "OpenAI transcript incomplete",
        );
      } else {
        handle.openaiCollector.markReady();
      }
      void flushOpenAi(session.id, handle.openaiCollector, true);
    }
    const releasedOwner = dropLocalTutor(session.id);
    if (releasedOwner) {
      void releaseJobLock({
        operation: AI_JOBS.speakingTutor,
        subjectId: session.id,
        ownerId: releasedOwner,
      });
    }
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
