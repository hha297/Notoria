import { after } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { AI_JOBS, JobLockLostError, runExclusiveJob } from "@/lib/ai/job-lock";
import { trackAiProviderEvent } from "@/lib/ai/telemetry";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import { speakingElapsedSeconds } from "@/lib/speaking/lifetime";
import {
  formatOpenAiTranscript,
  parseOpenAiTranscriptState,
  type OpenAiTranscriptState,
} from "@/lib/speaking/openai-transcript";
import { persistOpenAiTranscript } from "@/lib/speaking/openai-transcript-persist";
import {
  formatSpeakingTranscript,
  parseTranscriptJsonl,
  summarizeSpeakingSession,
} from "@/lib/speaking/summary";
import { saveSpeakingTranscriptOnce } from "@/lib/speaking/transcript-job";
import { disconnectSpeakingTutor } from "@/lib/speaking/tutor";
import { getStreamVideo } from "@/lib/stream-video";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolve display/feedback text: prefer OpenAI structured entries, else legacy `transcript`. */
function resolveTranscriptText(input: {
  transcript: string | null | undefined;
  transcriptDebug: unknown;
}): { text: string; openai: OpenAiTranscriptState | null } {
  const openai = parseOpenAiTranscriptState(input.transcriptDebug);
  if (openai && openai.entries.length > 0) {
    return { text: formatOpenAiTranscript(openai), openai };
  }
  return { text: input.transcript?.trim() || "", openai };
}

export async function saveSpeakingTranscript(input: {
  sessionId: string;
  transcriptUrl?: string | null;
  transcriptText?: string | null;
}) {
  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, input.sessionId),
  });
  if (!session) return;

  const transcriptText = input.transcriptText?.trim() || "";
  const outcome = await saveSpeakingTranscriptOnce({
    hasSummary: Boolean(session.summary?.trim()),
    incomingText: transcriptText,
    subjectId: session.id,
    summarize: async ({ stillOwner }) => {
      const summary = await summarizeSpeakingSession({
        language: session.language,
        cefrLevel: session.cefrLevel,
        topic: session.topic,
        title: session.title,
        transcript: transcriptText,
      });
      if (!(await stillOwner())) throw new JobLockLostError();
      await db
        .update(speakingSessions)
        .set({
          transcriptUrl: input.transcriptUrl ?? session.transcriptUrl,
          transcript: transcriptText,
          summary,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(speakingSessions.id, session.id));
      return summary;
    },
  });

  if (outcome.action !== "empty") {
    return;
  }

  await db
    .update(speakingSessions)
    .set({
      transcriptUrl: input.transcriptUrl ?? session.transcriptUrl,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(speakingSessions.id, session.id),
        sql`${speakingSessions.summary} is null`,
      ),
    );
}

export async function markSpeakingSessionEnded(sessionId: string) {
  const prior = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: { userId: true, startedAt: true, status: true },
  });

  await db
    .update(speakingSessions)
    .set({
      status: "processing",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(speakingSessions.id, sessionId),
        inArray(speakingSessions.status, ["upcoming", "active"]),
      ),
    );

  // Speaking duration is tracked separately from text-generation token usage.
  // Cleanup remains available even when AI_PAID_OPS_STOP is set.
  if (prior && (prior.status === "upcoming" || prior.status === "active")) {
    const durationSeconds = speakingElapsedSeconds(prior.startedAt) ?? 0;
    trackAiProviderEvent({
      userId: prior.userId,
      operation: "speaking.session_duration",
      feature: "ai_meeting",
      outcome: "ok",
      speakingDurationSeconds: durationSeconds,
      workKind: "cleanup",
    });
  }

  // Drain OpenAI transcript while the realtime socket is still open, then disconnect.
  await disconnectSpeakingTutor(sessionId);

  try {
    const streamVideo = getStreamVideo();
    const call = streamVideo.video.call("default", sessionId);
    await call.end();
  } catch {
    // Stream cleanup is best-effort.
  }
}

/**
 * Finalize feedback from the persisted OpenAI transcript (or legacy Stream text).
 * Does not poll Stream transcription files for new sessions.
 */
export async function completeSpeakingSession(
  sessionId: string,
  captions?: string,
) {
  try {
    await runExclusiveJob({
      operation: AI_JOBS.speakingFinalize,
      subjectId: sessionId,
      ttlMs: 3 * 60 * 1000,
      run: async () => {
        const existing = await db.query.speakingSessions.findFirst({
          where: eq(speakingSessions.id, sessionId),
          columns: {
            summary: true,
            transcript: true,
            transcriptDebug: true,
            status: true,
          },
        });
        if (existing?.summary?.trim()) return { done: true };

        // Bounded wait for OpenAI finalization (drain may still be running on the tutor host).
        let text = "";
        let openai: OpenAiTranscriptState | null = null;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          if (attempt > 0) await sleep(500);
          const row = await db.query.speakingSessions.findFirst({
            where: eq(speakingSessions.id, sessionId),
            columns: { transcript: true, transcriptDebug: true },
          });
          if (!row) return { done: true };

          const resolved = resolveTranscriptText(row);
          text = resolved.text;
          openai = resolved.openai;

          if (openai?.status === "ready" || openai?.status === "error") {
            break;
          }
          // Legacy Stream sessions: no OpenAI state — proceed with stored text.
          if (!openai && text) break;
          // Still collecting/finalizing with content — keep waiting briefly.
          if (openai && (openai.status === "collecting" || openai.status === "finalizing")) {
            continue;
          }
          break;
        }

        // Promote partial → ready when entries exist after the bound; empty → error.
        if (
          openai &&
          openai.status !== "ready" &&
          openai.status !== "error"
        ) {
          const next: OpenAiTranscriptState = {
            ...openai,
            status: openai.entries.length > 0 ? "ready" : "error",
            errorMessage:
              openai.entries.length > 0
                ? openai.errorMessage
                : (openai.errorMessage ?? "Transcript finalization timed out"),
            updatedAt: new Date().toISOString(),
          };
          await persistOpenAiTranscript(sessionId, next);
          openai = next;
          if (next.entries.length > 0) {
            text = formatOpenAiTranscript(next);
          }
        }

        if (!text.trim() && captions?.trim()) {
          text = captions.trim();
        }

        await saveSpeakingTranscript({
          sessionId,
          transcriptText: text,
        });
        return { done: true };
      },
    });
  } catch (error) {
    console.error("Failed to complete speaking session", error);
    await db
      .update(speakingSessions)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(speakingSessions.id, sessionId),
          inArray(speakingSessions.status, ["upcoming", "active", "processing"]),
        ),
      );
  }
}

export async function finalizeSpeakingSession(
  sessionId: string,
  captions?: string,
) {
  const existing = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: { status: true, summary: true, transcript: true },
  });
  if (
    existing?.status === "completed" &&
    (existing.summary?.trim() || existing.transcript?.trim())
  ) {
    return;
  }

  await markSpeakingSessionEnded(sessionId);
  after(async () => {
    await completeSpeakingSession(sessionId, captions);
  });
}

/**
 * Legacy Stream transcription webhook path.
 * Only applies when the session has no OpenAI transcript entries (pre-migration calls).
 */
export async function saveLegacyStreamTranscript(input: {
  sessionId: string;
  transcriptUrl: string;
  rawJsonl: string;
}) {
  const session = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, input.sessionId),
    columns: { transcriptDebug: true, transcript: true },
  });
  if (!session) return;

  const openai = parseOpenAiTranscriptState(session.transcriptDebug);
  if (openai && openai.entries.length > 0) {
    return;
  }

  const transcriptText = formatSpeakingTranscript(
    parseTranscriptJsonl(input.rawJsonl),
  );
  await saveSpeakingTranscript({
    sessionId: input.sessionId,
    transcriptUrl: input.transcriptUrl,
    transcriptText,
  });
}
