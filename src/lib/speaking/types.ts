import type { SpeakingSession, SpeakingStatus } from "@/db/schema";
import { isSpeakingJoinable as joinableWithDeadline } from "@/lib/speaking/lifetime";

export type SpeakingSessionListItem = {
  id: string;
  title: string;
  topic: string | null;
  cefrLevel: string | null;
  language: string;
  status: SpeakingStatus;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
};

export type SpeakingSessionDetail = SpeakingSession;

export function toSpeakingListItem(
  session: Pick<
    SpeakingSession,
    | "id"
    | "title"
    | "topic"
    | "cefrLevel"
    | "language"
    | "status"
    | "createdAt"
    | "startedAt"
    | "endedAt"
  >,
): SpeakingSessionListItem {
  return {
    id: session.id,
    title: session.title,
    topic: session.topic,
    cefrLevel: session.cefrLevel,
    language: session.language,
    status: session.status,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

/** Joinable when status is open and the original session deadline has not passed. */
export function isSpeakingJoinable(
  status: SpeakingStatus,
  startedAt?: Date | string | null,
  now = new Date(),
) {
  return joinableWithDeadline(status, startedAt, now);
}

export {
  speakingDeadlineAt,
  speakingRemainingSeconds,
  isSpeakingPastDeadline,
} from "@/lib/speaking/lifetime";
