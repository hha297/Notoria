import { AssemblyAI } from "assemblyai";
import { inferSpeakerDisplayNames, assignDialogueSpeakers } from "@/lib/listening/infer-speakers";
import { ListeningError } from "@/lib/listening/errors";
import {
  isMultiSpeakerTranscript,
  normalizeSpeakerId,
  SPEAKER_ASSIGNMENT_VERSION,
  utterancesFromWords,
} from "@/lib/listening/speakers";
import {
  toTranscriptionData,
} from "@/lib/listening/utils";
import type {
  ListeningTranscriptionData,
  ListeningUtterance,
  ListeningWordTimestamp,
} from "@/lib/listening/types";

function getAssemblyClient() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new ListeningError("ASSEMBLYAI_NOT_CONFIGURED");
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
    if (!utterance.text?.trim() || utterance.start == null || utterance.end == null) {
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

async function transcribeOnce(
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

  return client.transcripts.transcribe(params, {
    pollingInterval: 3000,
    pollingTimeout: 240_000,
  });
}

export async function transcribeListeningMedia(input: {
  audioUrl: string;
  languageHint?: string | null;
}): Promise<{
  transcript: string;
  language: string | null;
  duration: number | null;
  transcriptionData: ListeningTranscriptionData;
}> {
  const client = getAssemblyClient();
  const attempts: TranscribeAttempt[] = [
    { languageHint: input.languageHint, speakerLabels: true },
    ...(input.languageHint
      ? [{ languageHint: null, speakerLabels: true }]
      : []),
    { languageHint: input.languageHint ?? null, speakerLabels: false },
  ];

  let result: Awaited<ReturnType<typeof transcribeOnce>> | null = null;

  for (const [index, attempt] of attempts.entries()) {
    const next = await transcribeOnce(client, input.audioUrl, attempt);
    if (next.status !== "error" && next.text?.trim()) {
      result = next;
      break;
    }

    const isLast = index === attempts.length - 1;
    if (isLast) {
      throw new ListeningError(
        next.status === "error" ? "TRANSCRIPTION_FAILED" : "EMPTY_TRANSCRIPT",
      );
    }
  }

  if (!result?.text?.trim()) {
    throw new ListeningError("EMPTY_TRANSCRIPT");
  }

  const words = toWordTimestamps(result.words);
  let sentences = toTranscriptionData({ words }).sentences;

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

  const duration =
    typeof result.audio_duration === "number"
      ? Math.round(result.audio_duration)
      : null;

  const transcript = result.text.trim();
  let utterances = utterancesFromAssembly(
    (result as { utterances?: Array<{
      speaker?: string | number | null;
      text?: string | null;
      start?: number | null;
      end?: number | null;
    }> }).utterances,
  );

  if (utterances.length === 0) {
    utterances = utterancesFromWords(words);
  }

  let speakerMap: Record<string, string> = {};
  if (isMultiSpeakerTranscript(utterances)) {
    const inferred = await inferSpeakerDisplayNames({ transcript, utterances });
    utterances = inferred.utterances;
    speakerMap = inferred.speakerMap;
  } else {
    const assigned = await assignDialogueSpeakers({
      transcript,
      sentences,
    });
    if (isMultiSpeakerTranscript(assigned.utterances)) {
      utterances = assigned.utterances;
      speakerMap = assigned.speakerMap;
    }
  }

  return {
    transcript,
    language: result.language_code ?? input.languageHint ?? null,
    duration,
    transcriptionData: toTranscriptionData({
      words,
      sentences,
      utterances,
      speakerMap,
      speakersResolved: true,
      speakerAssignmentVersion: SPEAKER_ASSIGNMENT_VERSION,
      audioDuration: duration,
    }),
  };
}
