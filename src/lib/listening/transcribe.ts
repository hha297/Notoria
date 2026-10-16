import { AssemblyAI } from "assemblyai";
import {
  AI_DEADLINES_MS,
  afterProviderError,
  beforeProviderError,
  createAiDeadline,
  type AiDeadline,
} from "@/lib/ai/bounds";
import { LISTENING_MAX_TRANSCRIPT_SECONDS } from "@/lib/billing/plans";
import {
  inferSpeakerDisplayNames,
  assignDialogueSpeakers,
} from "@/lib/listening/infer-speakers";
import { ListeningError } from "@/lib/listening/errors";
import {
  isMultiSpeakerTranscript,
  normalizeSpeakerId,
  SPEAKER_ASSIGNMENT_VERSION,
  utterancesFromWords,
} from "@/lib/listening/speakers";
import { toTranscriptionData } from "@/lib/listening/utils";
import type {
  ListeningTranscriptionData,
  ListeningUtterance,
  ListeningWordTimestamp,
} from "@/lib/listening/types";

function getAssemblyClient() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw beforeProviderError(new ListeningError("ASSEMBLYAI_NOT_CONFIGURED"));
  }

  return new AssemblyAI({ apiKey });
}

function toWordTimestamps(
  words:
    | Array<{
        text?: string | null;
        start?: number | null;
        end?: number | null;
        speaker?: string | number | null;
      }>
    | null
    | undefined,
): ListeningWordTimestamp[] {
  if (!words) return [];

  return words.flatMap((word) => {
    if (!word.text || word.start == null || word.end == null) {
      return [];
    }

    return [
      {
        text: word.text,
        start: word.start,
        end: word.end,
        speaker: word.speaker != null ? normalizeSpeakerId(word.speaker) : null,
      },
    ];
  });
}

function utterancesFromAssembly(
  raw:
    | Array<{
        speaker?: string | number | null;
        text?: string | null;
        start?: number | null;
        end?: number | null;
      }>
    | null
    | undefined,
): ListeningUtterance[] {
  if (!raw?.length) return [];

  return raw.flatMap((utterance, index) => {
    if (
      !utterance.text?.trim() ||
      utterance.start == null ||
      utterance.end == null
    ) {
      return [];
    }

    return [
      {
        speaker: normalizeSpeakerId(utterance.speaker),
        displayName: null,
        text: utterance.text.trim(),
        start: utterance.start,
        end: utterance.end,
        order: index,
      },
    ];
  });
}

type TranscribeAttempt = {
  languageHint?: string | null;
  speakerLabels: boolean;
};

type AssemblyTranscript = Awaited<
  ReturnType<AssemblyAI["transcripts"]["get"]>
>;

async function waitForTranscript(
  client: AssemblyAI,
  id: string,
  deadline: AiDeadline,
) {
  deadline.throwIfExpired();
  const remaining = Math.max(5_000, deadline.remainingMs());
  try {
    return await client.transcripts.waitUntilReady(id, {
      pollingInterval: 3_000,
      pollingTimeout: remaining,
    });
  } catch (error) {
    throw afterProviderError(error, "TRANSCRIPTION_FAILED");
  }
}

async function submitTranscript(
  client: AssemblyAI,
  audioUrl: string,
  attempt: TranscribeAttempt,
) {
  const params = {
    audio: audioUrl,
    punctuate: true,
    format_text: true,
    speaker_labels: attempt.speakerLabels,
    ...(attempt.languageHint
      ? { language_code: attempt.languageHint }
      : { language_detection: true }),
  };

  try {
    return await client.transcripts.submit(params);
  } catch (error) {
    // Submit itself may still bill on some failures; treat as after_provider.
    throw afterProviderError(error, "TRANSCRIPTION_FAILED");
  }
}

/**
 * Require a known duration before paid transcription.
 * Unknown duration is rejected so we never start an unbounded AssemblyAI job.
 */
export function assertListeningDurationAllowed(
  durationSeconds: number | null | undefined,
) {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) {
    throw beforeProviderError(new ListeningError("AUDIO_DURATION_UNKNOWN"));
  }
  if (durationSeconds <= 0) {
    throw beforeProviderError(new ListeningError("AUDIO_DURATION_UNKNOWN"));
  }
  if (durationSeconds > LISTENING_MAX_TRANSCRIPT_SECONDS) {
    throw beforeProviderError(new ListeningError("AUDIO_TOO_LONG"));
  }
}

async function buildResultFromAssembly(
  client: AssemblyAI,
  result: AssemblyTranscript,
  languageHint: string | null | undefined,
  deadline: AiDeadline,
) {
  if (result.status === "error" || !result.text?.trim()) {
    throw afterProviderError(
      new ListeningError(
        result.status === "error" ? "TRANSCRIPTION_FAILED" : "EMPTY_TRANSCRIPT",
      ),
    );
  }

  const duration =
    typeof result.audio_duration === "number"
      ? Math.round(result.audio_duration)
      : null;
  if (
    typeof duration === "number" &&
    duration > LISTENING_MAX_TRANSCRIPT_SECONDS
  ) {
    throw afterProviderError(new ListeningError("AUDIO_TOO_LONG"));
  }

  const words = toWordTimestamps(result.words);
  let sentences = toTranscriptionData({ words }).sentences;

  deadline.throwIfExpired();
  try {
    const sentenceResponse = await client.transcripts.sentences(result.id);
    if (sentenceResponse.sentences?.length) {
      sentences = sentenceResponse.sentences.flatMap((sentence) => {
        if (!sentence.text || sentence.start == null || sentence.end == null) {
          return [];
        }
        return [
          {
            text: sentence.text,
            start: sentence.start,
            end: sentence.end,
          },
        ];
      });
    }
  } catch {
    // Word-derived sentences are enough for later playback mapping.
  }

  const transcript = result.text.trim();
  let utterances = utterancesFromAssembly(
    (
      result as {
        utterances?: Array<{
          speaker?: string | number | null;
          text?: string | null;
          start?: number | null;
          end?: number | null;
        }>;
      }
    ).utterances,
  );

  if (utterances.length === 0) {
    utterances = utterancesFromWords(words);
  }

  let speakerMap: Record<string, string> = {};
  deadline.throwIfExpired();
  if (isMultiSpeakerTranscript(utterances)) {
    const inferred = await inferSpeakerDisplayNames({
      transcript,
      utterances,
      deadline,
    });
    utterances = inferred.utterances;
    speakerMap = inferred.speakerMap;
  } else {
    const assigned = await assignDialogueSpeakers({
      transcript,
      sentences,
      deadline,
    });
    if (isMultiSpeakerTranscript(assigned.utterances)) {
      utterances = assigned.utterances;
      speakerMap = assigned.speakerMap;
    }
  }

  return {
    transcript,
    language: result.language_code ?? languageHint ?? null,
    duration,
    transcriptionData: toTranscriptionData({
      words,
      sentences,
      utterances,
      speakerMap,
      speakersResolved: true,
      speakerAssignmentVersion: SPEAKER_ASSIGNMENT_VERSION,
      audioDuration: duration,
      assemblyTranscriptId: result.id,
    }),
  };
}

export async function transcribeListeningMedia(input: {
  audioUrl: string;
  languageHint?: string | null;
  /** Known media duration in seconds. Required before paid work. */
  durationSeconds?: number | null;
  /** Reuse a previously submitted AssemblyAI job after a poll/crash. */
  existingAssemblyId?: string | null;
  onJobSubmitted?: (assemblyTranscriptId: string) => Promise<void>;
  deadlineMs?: number;
}): Promise<{
  transcript: string;
  language: string | null;
  duration: number | null;
  transcriptionData: ListeningTranscriptionData;
}> {
  assertListeningDurationAllowed(input.durationSeconds);

  const client = getAssemblyClient();
  const deadline = createAiDeadline(
    input.deadlineMs ?? AI_DEADLINES_MS.listeningTranscribe,
  );

  try {
    if (input.existingAssemblyId) {
      const existing = await waitForTranscript(
        client,
        input.existingAssemblyId,
        deadline,
      );
      return buildResultFromAssembly(
        client,
        existing,
        input.languageHint,
        deadline,
      );
    }

    // Language fallback once, then drop speaker labels — never unbounded.
    const attempts: TranscribeAttempt[] = [
      { languageHint: input.languageHint, speakerLabels: true },
      ...(input.languageHint
        ? [{ languageHint: null, speakerLabels: true } satisfies TranscribeAttempt]
        : []),
    ];

    let lastError: unknown = new ListeningError("TRANSCRIPTION_FAILED");
    let submitted = false;

    for (const [index, attempt] of attempts.entries()) {
      deadline.throwIfExpired();
      const created = await submitTranscript(client, input.audioUrl, attempt);
      submitted = true;
      if (created.id) {
        await input.onJobSubmitted?.(created.id);
      }

      try {
        const ready = await waitForTranscript(client, created.id, deadline);
        if (ready.status !== "error" && ready.text?.trim()) {
          return buildResultFromAssembly(
            client,
            ready,
            input.languageHint,
            deadline,
          );
        }
        lastError = new ListeningError(
          ready.status === "error" ? "TRANSCRIPTION_FAILED" : "EMPTY_TRANSCRIPT",
        );
      } catch (error) {
        lastError = error;
        // After the first submit, do not start a second paid job on poll timeout.
        if (index === 0 && error instanceof Error) {
          const message = error.message;
          if (
            message.includes("timeout") ||
            message.includes("DEADLINE") ||
            message === "TRANSCRIPTION_FAILED"
          ) {
            throw afterProviderError(error);
          }
        }
      }

      const isLast = index === attempts.length - 1;
      if (isLast) {
        throw afterProviderError(lastError);
      }
    }

    if (submitted) throw afterProviderError(lastError);
    throw beforeProviderError(lastError);
  } finally {
    deadline.clear();
  }
}
