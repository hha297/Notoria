import { isSpeakingPastDeadline } from "@/lib/speaking/lifetime";

const CLOSED_TUTOR_STATUSES = new Set(["completed", "cancelled", "processing"]);

export type TutorConnectPlan = "reject" | "already_connected" | "claim";

export function tutorConnectPlan(input: {
  status: string;
  localConnected: boolean;
  startedAt?: Date | string | null;
  now?: Date;
}): TutorConnectPlan {
  if (CLOSED_TUTOR_STATUSES.has(input.status)) return "reject";
  if (isSpeakingPastDeadline(input.startedAt, input.now)) return "reject";
  if (input.localConnected) return "already_connected";
  return "claim";
}

export type SpeakingTranscriptPlan = "keep" | "complete_empty" | "summarize";

/**
 * Replay of a finished summary does nothing.
 * An empty transcript finishes the session without calling the model.
 * Text without a summary, including a retry after a failed summary, summarizes once.
 */
export function speakingTranscriptPlan(input: {
  hasSummary: boolean;
  incomingText: string;
}): SpeakingTranscriptPlan {
  if (input.hasSummary) return "keep";
  if (!input.incomingText.trim()) return "complete_empty";
  return "summarize";
}
