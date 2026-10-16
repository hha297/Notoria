import { eq } from "drizzle-orm";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import {
  formatOpenAiTranscript,
  type OpenAiTranscriptCollector,
  type OpenAiTranscriptState,
  parseOpenAiTranscriptState,
} from "@/lib/speaking/openai-transcript";

/**
 * Persist OpenAI transcript state server-side. Mirrors formatted text into
 * `transcript` so results pages and feedback see content without waiting for
 * finalization. Never shrinks an existing non-empty transcript with an empty
 * overwrite (late empty flushes / races).
 */
export async function persistOpenAiTranscript(
  sessionId: string,
  state: OpenAiTranscriptState,
) {
  const formatted = formatOpenAiTranscript(state);
  const existing = await db.query.speakingSessions.findFirst({
    where: eq(speakingSessions.id, sessionId),
    columns: { transcript: true, transcriptDebug: true },
  });
  if (!existing) return;

  const prior = parseOpenAiTranscriptState(existing.transcriptDebug);
  // Do not regress terminal status with a stale in-memory snapshot.
  if (
    prior &&
    (prior.status === "ready" || prior.status === "error") &&
    state.status === "collecting"
  ) {
    return;
  }
  if (
    prior?.status === "ready" &&
    state.status === "finalizing" &&
    prior.updatedAt >= state.updatedAt
  ) {
    return;
  }

  const nextTranscript =
    formatted.trim() ||
    (existing.transcript?.trim() ? existing.transcript : formatted);

  await db
    .update(speakingSessions)
    .set({
      transcriptDebug: state,
      ...(nextTranscript.trim()
        ? { transcript: nextTranscript }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(speakingSessions.id, sessionId));
}

export async function persistOpenAiTranscriptFromCollector(
  sessionId: string,
  collector: OpenAiTranscriptCollector,
) {
  await persistOpenAiTranscript(sessionId, collector.snapshot());
}
