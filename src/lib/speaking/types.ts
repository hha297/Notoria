import type { SpeakingSession, SpeakingStatus } from "@/db/schema";

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
  session: SpeakingSession,
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

export function isSpeakingJoinable(status: SpeakingStatus) {
  return status === "upcoming" || status === "active";
}
