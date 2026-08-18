import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import {
  formatSpeakingTranscript,
  parseTranscriptJsonl,
  summarizeSpeakingSession,
} from "@/lib/speaking/summary";
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

  if (session.status === "completed" && session.transcript) {
    return;
  }

  const transcriptText = input.transcriptText?.trim() || "";
  let summary: string | null = session.summary;
  if (transcriptText) {
    try {
      summary = await summarizeSpeakingSession({
        language: session.language,
        cefrLevel: session.cefrLevel,
        topic: session.topic,
        title: session.title,
        transcript: transcriptText,
      });
    } catch (error) {
      console.error("Failed to summarize speaking session", error);
    }
  }

  await db
    .update(speakingSessions)
    .set({
      transcriptUrl: input.transcriptUrl ?? session.transcriptUrl,
      transcript: transcriptText || session.transcript,
      summary,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(speakingSessions.id, session.id));
}

export async function markSpeakingSessionEnded(sessionId: string) {
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
}

export async function completeSpeakingSession(sessionId: string, captions?: string) {
  try {
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
          return;
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
      return;
    }

    await saveSpeakingTranscript({ sessionId, transcriptText: "" });
  } catch (error) {
    console.error("Failed to complete speaking session", error);
    await db
      .update(speakingSessions)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(speakingSessions.id, sessionId));
  }
}

export async function finalizeSpeakingSession(
  sessionId: string,
  captions?: string,
) {
  await markSpeakingSessionEnded(sessionId);
  after(async () => {
    await completeSpeakingSession(sessionId, captions);
  });
}
