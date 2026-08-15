import type {
  ListeningUtterance,
  ListeningWordTimestamp,
} from "@/lib/listening/types";
import { transcriptContains } from "@/lib/listening/utils";

export const SPEAKER_ASSIGNMENT_VERSION = 2;

export function normalizeSpeakerId(raw: string | number | null | undefined) {
  const value = String(raw ?? "").trim().toUpperCase();
  const labelled = value.match(/^(?:SPEAKER|PUHUJA|NGƯỜI NÓI|NGUOI NOI)\s*([A-Z0-9]+)$/);
  if (labelled) {
    return normalizeSpeakerId(labelled[1]);
  }

  if (/^[A-Z]$/.test(value)) return value;

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 26) {
    return String.fromCharCode(64 + numeric);
  }

  return /^[A-Z0-9]+$/.test(value) ? value.slice(0, 1) : "A";
}

export function uniqueSpeakerIds(utterances: ListeningUtterance[]) {
  return [...new Set(utterances.map((utterance) => utterance.speaker))];
}

export function isMultiSpeakerTranscript(utterances: ListeningUtterance[]) {
  return uniqueSpeakerIds(utterances).length > 1;
}

export function speakerDisplayName(
  utterance: Pick<ListeningUtterance, "speaker" | "displayName">,
  fallback: (id: string) => string,
) {
  return utterance.displayName?.trim() || fallback(utterance.speaker);
}

export function applySpeakerNames(
  utterances: ListeningUtterance[],
  speakerMap: Record<string, string>,
  transcript: string,
): { utterances: ListeningUtterance[]; speakerMap: Record<string, string> } {
  const validated: Record<string, string> = {};

  for (const [speaker, name] of Object.entries(speakerMap)) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (!transcriptContains(transcript, trimmed)) continue;
    if (/^speaker\s+[a-z0-9]+$/i.test(trimmed)) continue;
    validated[normalizeSpeakerId(speaker)] = trimmed;
  }

  return {
    speakerMap: validated,
    utterances: utterances.map((utterance) => ({
      ...utterance,
      displayName: validated[utterance.speaker] ?? null,
    })),
  };
}

export function utterancesFromWords(words: ListeningWordTimestamp[]) {
  const utterances: ListeningUtterance[] = [];
  let current: ListeningWordTimestamp[] = [];
  let currentSpeaker: string | null = null;

  const flush = () => {
    if (current.length === 0 || !currentSpeaker) return;
    utterances.push({
      speaker: currentSpeaker,
      displayName: null,
      text: current.map((word) => word.text).join(" ").replace(/\s+([.,!?;:])/g, "$1"),
      start: current[0].start,
      end: current[current.length - 1].end,
      order: utterances.length,
    });
    current = [];
  };

  for (const word of words) {
    const speaker = word.speaker ? normalizeSpeakerId(word.speaker) : null;
    if (!speaker) continue;
    if (currentSpeaker && speaker !== currentSpeaker) {
      flush();
    }
    currentSpeaker = speaker;
    current.push(word);
  }

  flush();
  return utterances;
}

export function dialogueTurnsForPrompt(utterances: ListeningUtterance[]) {
  return utterances.map((utterance) => ({
    speaker: utterance.speaker,
    displayName: utterance.displayName ?? `Speaker ${utterance.speaker}`,
    text: utterance.text,
    start: utterance.start,
    end: utterance.end,
    order: utterance.order,
  }));
}

export type TranscriptTurn = {
  speaker: string | null;
  displayName: string | null;
  text: string;
  start: number | null;
  end: number | null;
  order: number;
};

export function getTranscriptTurns(
  transcript: string,
  utterances: ListeningUtterance[] = [],
  sentences: Array<{ text: string; start: number; end: number }> = [],
): TranscriptTurn[] {
  if (isMultiSpeakerTranscript(utterances)) {
    return utterances.map((utterance) => ({
      speaker: utterance.speaker,
      displayName: utterance.displayName,
      text: utterance.text,
      start: utterance.start,
      end: utterance.end,
      order: utterance.order,
    }));
  }

  const sentenceTurns = sentencesToTurns(sentences);
  if (sentenceTurns.length > 1) {
    return sentenceTurns;
  }

  const fromUtterances = utterances.flatMap((utterance, index) => {
    const parts = splitTranscriptIntoSentences(utterance.text);
    if (parts.length <= 1) {
      return [
        {
          speaker: null,
          displayName: null,
          text: utterance.text,
          start: utterance.start,
          end: utterance.end,
          order: index,
        },
      ];
    }

    return parts.map((text, partIndex) => ({
      speaker: null,
      displayName: null,
      text,
      start: utterance.start,
      end: utterance.end,
      order: index * 100 + partIndex,
    }));
  });

  if (fromUtterances.length > 0) {
    return fromUtterances;
  }

  return splitTranscriptIntoSentences(transcript).map((text, index) => ({
    speaker: null,
    displayName: null,
    text,
    start: null,
    end: null,
    order: index,
  }));
}

function sentencesToTurns(
  sentences: Array<{ text: string; start: number; end: number }>,
): TranscriptTurn[] {
  if (sentences.length === 0) return [];

  if (sentences.length === 1) {
    const parts = splitTranscriptIntoSentences(sentences[0].text);
    if (parts.length > 1) {
      return parts.map((text, index) => ({
        speaker: null,
        displayName: null,
        text,
        start: sentences[0].start,
        end: sentences[0].end,
        order: index,
      }));
    }
  }

  return sentences.map((sentence, index) => ({
    speaker: null,
    displayName: null,
    text: sentence.text,
    start: sentence.start,
    end: sentence.end,
    order: index,
  }));
}

function splitTranscriptIntoSentences(transcript: string) {
  const parts = transcript
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return parts.length > 0 ? parts : [transcript.trim()].filter(Boolean);
}
