export function splitListeningSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

const WORDS_PER_SECOND = 2.4;
const SECONDS_PER_QUESTION_DENSE = 10;
const SECONDS_PER_QUESTION_TARGET = 12;
const SECONDS_PER_QUESTION_SPARSE = 18;
const ABSOLUTE_MIN = 3;
const ABSOLUTE_MAX = 60;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function estimateListeningDurationSeconds(
  transcript: string,
  durationSeconds?: number | null,
) {
  if (durationSeconds && durationSeconds > 0) {
    return durationSeconds;
  }

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(20, Math.round(wordCount / WORDS_PER_SECOND));
}

export function targetQuestionCount(input: {
  transcript: string;
  durationSeconds?: number | null;
}): { min: number; max: number; target: number } {
  const duration = estimateListeningDurationSeconds(
    input.transcript,
    input.durationSeconds,
  );
  const sentenceCount = splitListeningSentences(input.transcript).length;
  const contentCap = Math.max(
    ABSOLUTE_MIN,
    sentenceCount + Math.floor(sentenceCount / 2),
    Math.round(duration / SECONDS_PER_QUESTION_DENSE),
  );

  const min = clamp(
    Math.round(duration / SECONDS_PER_QUESTION_SPARSE),
    ABSOLUTE_MIN,
    ABSOLUTE_MAX,
  );
  const max = clamp(
    Math.min(Math.round(duration / SECONDS_PER_QUESTION_DENSE), contentCap),
    min,
    ABSOLUTE_MAX,
  );
  const target = clamp(
    Math.round(duration / SECONDS_PER_QUESTION_TARGET),
    min,
    max,
  );

  return { min, max, target };
}
