import type {
  ListeningSentence,
  ListeningTranscriptionData,
  ListeningUtterance,
  ListeningWordTimestamp,
} from "@/lib/listening/types";

export const MAX_LISTENING_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["mp3", "mp4"]);

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "video/mp4",
  "video/mpeg",
  "application/mp4",
]);

export function getFileExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function isAllowedListeningFile(file: File) {
  const extension = getFileExtension(file.name);
  if (ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }

  return ALLOWED_MIME_TYPES.has(file.type);
}

export function isValidListeningSourceUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function mediaTypeFromFormat(
  format: string | undefined,
  mimeType: string,
) {
  const normalized = (format ?? "").toLowerCase();
  if (normalized === "mp4" || mimeType.startsWith("video/")) {
    return "video";
  }
  return "audio";
}

export function titleFromFilename(filename: string) {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!base) return "Listening";
  return base.replace(/\b\w/g, (char) => char.toLocaleUpperCase());
}

export function formatListeningDuration(
  totalSeconds: number | null | undefined,
) {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) {
    return null;
  }

  const seconds = Math.round(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function normalizeListeningText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function listeningAnswersMatch(input: string, expected: string) {
  return normalizeListeningText(input) === normalizeListeningText(expected);
}

export function transcriptContains(transcript: string, excerpt: string) {
  const haystack = normalizeListeningText(transcript);
  const needle = normalizeListeningText(excerpt);
  return needle.length > 0 && haystack.includes(needle);
}

export function countBlanks(text: string) {
  return (text.match(/_{3,}/g) ?? []).length;
}

export function tokenizeSentence(sentence: string) {
  return sentence
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^[^ \p{L}\p{N}]+|[^ \p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

export function deriveSentencesFromWords(
  words: ListeningWordTimestamp[],
): ListeningSentence[] {
  const sentences: ListeningSentence[] = [];
  let current: ListeningWordTimestamp[] = [];

  const flush = () => {
    if (current.length === 0) return;
    sentences.push({
      text: current
        .map((word) => word.text)
        .join(" ")
        .replace(/\s+([.,!?;:])/g, "$1"),
      start: current[0].start,
      end: current[current.length - 1].end,
    });
    current = [];
  };

  for (const word of words) {
    current.push(word);
    if (/[.!?…]["')\]]*$/.test(word.text)) {
      flush();
    }
  }

  flush();
  return sentences;
}

export function toTranscriptionData(input: {
  words?: ListeningWordTimestamp[];
  sentences?: ListeningSentence[];
  utterances?: ListeningUtterance[];
  speakerMap?: Record<string, string>;
  speakersResolved?: boolean;
  speakerAssignmentVersion?: number;
  audioDuration?: number | null;
}): ListeningTranscriptionData {
  const words = (input.words ?? []).filter(
    (word) =>
      typeof word.text === "string" &&
      Number.isFinite(word.start) &&
      Number.isFinite(word.end),
  );

  const sentences =
    input.sentences && input.sentences.length > 0
      ? input.sentences
      : deriveSentencesFromWords(words);

  const speakerMap: Record<string, string> = {};
  for (const [speaker, name] of Object.entries(input.speakerMap ?? {})) {
    const trimmed = name.trim();
    if (trimmed) speakerMap[speaker] = trimmed;
  }

  const utterances = (input.utterances ?? [])
    .filter(
      (utterance) =>
        utterance.text.trim().length > 0 &&
        Number.isFinite(utterance.start) &&
        Number.isFinite(utterance.end),
    )
    .map((utterance, index) => ({
      speaker: utterance.speaker,
      displayName:
        utterance.displayName?.trim() || speakerMap[utterance.speaker] || null,
      text: utterance.text.trim(),
      start: utterance.start,
      end: utterance.end,
      order: Number.isFinite(utterance.order) ? utterance.order : index,
    }));

  return {
    words,
    sentences,
    utterances,
    speakerMap,
    speakersResolved: Boolean(input.speakersResolved),
    speakerAssignmentVersion:
      typeof input.speakerAssignmentVersion === "number"
        ? input.speakerAssignmentVersion
        : 0,
    audioDuration:
      typeof input.audioDuration === "number" ? input.audioDuration : null,
  };
}
