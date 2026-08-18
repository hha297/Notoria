import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type {
  CallEndedEvent,
  CallRecordingReadyEvent,
  CallSessionParticipantLeftEvent,
  CallSessionStartedEvent,
  CallTranscriptionReadyEvent,
} from "@stream-io/node-sdk";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import { isSpeakingTutorUserId } from "@/lib/speaking/stream";
import {
  markSpeakingSessionEnded,
  saveSpeakingTranscript,
} from "@/lib/speaking/finalize";
import {
  formatSpeakingTranscript,
  parseTranscriptJsonl,
} from "@/lib/speaking/summary";
import { connectSpeakingTutorToCall } from "@/lib/speaking/tutor";
import { getStreamVideo, isStreamVideoConfigured } from "@/lib/stream-video";

export const runtime = "nodejs";
export const maxDuration = 300;

function speakingSessionIdFromCall(payload: {
  call?: { custom?: Record<string, unknown>; id?: string };
  call_cid?: string;
}) {
  const customId = payload.call?.custom?.speakingSessionId;
  if (typeof customId === "string" && customId.length > 0) {
    return customId;
  }
  if (payload.call?.id) return payload.call.id;
  const cid = payload.call_cid;
  if (!cid) return null;
  const parts = cid.split(":");
  return parts[1] ?? null;
}

export async function POST(request: NextRequest) {
  if (!isStreamVideoConfigured()) {
    return NextResponse.json(
      { error: "Stream Video is not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("x-signature");
  const apiKey = request.headers.get("x-api-key");
  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 },
    );
  }

  const body = await request.text();
  const streamVideo = getStreamVideo();
  if (!streamVideo.verifyWebhook(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType =
    typeof payload === "object" && payload !== null && "type" in payload
      ? String((payload as { type?: unknown }).type ?? "")
      : "";

  try {
    if (eventType === "call.session_started") {
      await handleSessionStarted(payload as CallSessionStartedEvent);
    } else if (eventType === "call.session_participant_left") {
      await handleParticipantLeft(
        payload as CallSessionParticipantLeftEvent,
      );
    } else if (eventType === "call.session_ended") {
      await handleSessionEnded(payload as CallEndedEvent);
    } else if (eventType === "call.transcription_ready") {
      await handleTranscriptionReady(payload as CallTranscriptionReadyEvent);
    } else if (eventType === "call.recording_ready") {
      await handleRecordingReady(payload as CallRecordingReadyEvent);
    }
  } catch (error) {
    console.error("Stream speaking webhook failed", eventType, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}

async function handleSessionStarted(event: CallSessionStartedEvent) {
  const sessionId = speakingSessionIdFromCall(event);
  if (!sessionId) return;
  await connectSpeakingTutorToCall(sessionId);
}

async function handleParticipantLeft(event: CallSessionParticipantLeftEvent) {
  const sessionId = speakingSessionIdFromCall(event);
  if (!sessionId) return;

  const leavingUserId = event.participant?.user?.id;

  if (isSpeakingTutorUserId(leavingUserId)) {
    return;
  }

  await markSpeakingSessionEnded(sessionId);
}

async function handleSessionEnded(event: CallEndedEvent) {
  const sessionId = speakingSessionIdFromCall(event);
  if (!sessionId) return;
  await markSpeakingSessionEnded(sessionId);
}

async function handleTranscriptionReady(event: CallTranscriptionReadyEvent) {
  const sessionId = speakingSessionIdFromCall(event);
  const transcriptUrl = event.call_transcription?.url;
  if (!sessionId || !transcriptUrl) return;

  let transcriptText = "";
  try {
    const response = await fetch(transcriptUrl);
    const raw = await response.text();
    transcriptText = formatSpeakingTranscript(parseTranscriptJsonl(raw));
  } catch (error) {
    console.error("Failed to fetch speaking transcript", error);
  }

  await saveSpeakingTranscript({
    sessionId,
    transcriptUrl,
    transcriptText,
  });
}

async function handleRecordingReady(event: CallRecordingReadyEvent) {
  const sessionId = speakingSessionIdFromCall(event);
  const recordingUrl = event.call_recording?.url;
  if (!sessionId || !recordingUrl) return;

  await db
    .update(speakingSessions)
    .set({
      recordingUrl,
      updatedAt: new Date(),
    })
    .where(eq(speakingSessions.id, sessionId));
}
