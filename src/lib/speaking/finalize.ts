import { after } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { AI_JOBS, JobLockLostError, runExclusiveJob } from "@/lib/ai/job-lock";
import { trackAiProviderEvent } from "@/lib/ai/telemetry";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import { speakingElapsedSeconds } from "@/lib/speaking/lifetime";
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

async function fetchTranscriptFromUrl(url: string) {
  const response = await fetch(url);
  const raw = await response.text();
  return formatSpeakingTranscript(parseTranscriptJsonl(raw));
}

async function latestStreamTranscript(sessionId: string) {
  const streamVideo = getStreamVideo();
  const call = streamVideo.video.call("default", sessionId);
  const listed = await call.listTranscriptions();
  const items = listed.transcriptions ?? [];
  const latest = items.at(-1);
  if (!latest?.url) return { url: null, text: "" };
  const text = await fetchTranscriptFromUrl(latest.url);
  return { url: latest.url, text };
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

  if (outcome.action !== "empty") return;

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

  disconnectSpeakingTutor(sessionId);

  try {
    const streamVideo = getStreamVideo();
    const call = streamVideo.video.call("default", sessionId);
    try {
      await call.stopTranscription();
    } catch {
      // Transcription may already be stopped.
    }
    await call.end();
  } catch {
    // Stream cleanup is best-effort.
  }
}

export async function completeSpeakingSession(sessionId: string, captions?: string) {
  try {
    await runExclusiveJob({
      operation: AI_JOBS.speakingFinalize,
      subjectId: sessionId,
      ttlMs: 3 * 60 * 1000,
      run: async () => {
        const existing = await db.query.speakingSessions.findFirst({
          where: eq(speakingSessions.id, sessionId),
          columns: { summary: true, transcript: true, status: true },
        });
        if (existing?.summary?.trim()) return { done: true };

        for (let attempt = 0; attempt < 15; attempt += 1) {
          if (attempt > 0) await sleep(2000);
          try {
            const latest = await latestStreamTranscript(sessionId);
            if (latest.text) {
              await saveSpeakingTranscript({
                sessionId,
                transcriptUrl: latest.url,
                transcriptText: latest.text,
              });
              return { done: true };
            }
          } catch (error) {
            console.error("Failed to list speaking transcriptions", error);
          }
        }

        if (captions?.trim()) {
          await saveSpeakingTranscript({
            sessionId,
            transcriptText: captions,
          });
          return { done: true };
        }

        await saveSpeakingTranscript({ sessionId, transcriptText: "" });
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
