import { countBlanks, transcriptContains } from "@/lib/listening/utils";

export const FILL_BLANK_MARKER = "______";

const PLACEHOLDER_PATTERN =
  /\{\{?\s*blank\s*\}?\}|\[\s*blank\s*\]|<\s*blank\s*>|\(\s*\.{3,}\s*\)|_{2,}|\.{5,}/gi;

export function normalizeFillBlankPlaceholders(text: string) {
  return text.replace(PLACEHOLDER_PATTERN, FILL_BLANK_MARKER);
}

export function parseJsonObject(content: string): unknown | null {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through and try to slice out an object.
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asBlankList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" && item.trim()) return [item.trim()];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const text = record.text ?? record.word ?? record.answer ?? record.value;
        return typeof text === "string" && text.trim() ? [text.trim()] : [];
      }
      return [];
    });
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;|/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function asPassage(value: Record<string, unknown>): string {
  const text =
    value.sentenceWithBlanks ??
    value.passage ??
    value.text ??
    value.question ??
    value.displayText;
  return typeof text === "string" ? text : "";
}

export function extractFillBlankQuestions(raw: unknown): Array<{
  speaker?: string;
  sentenceWithBlanks: string;
  blanks: string[];
}> {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;

  const nested = Object.values(record).find(
    (value) =>
      value &&
      typeof value === "object" &&
      Array.isArray((value as { questions?: unknown }).questions),
  ) as { questions?: unknown[] } | undefined;

  const source = Array.isArray(record.questions)
    ? record.questions
    : Array.isArray(record.exercises)
      ? record.exercises
      : nested?.questions
        ? nested.questions
        : asPassage(record)
          ? [record]
          : [];

  return source.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const question = item as Record<string, unknown>;
    const sentenceWithBlanks = normalizeFillBlankPlaceholders(asPassage(question));
    const blanks = asBlankList(
      question.blanks ?? question.answers ?? question.correctAnswer,
    );
    if (!sentenceWithBlanks.trim() || countBlanks(sentenceWithBlanks) === 0) {
      return [];
    }
    if (blanks.length === 0) return [];
    return [
      {
        speaker:
          typeof question.speaker === "string" && question.speaker.trim()
            ? question.speaker.trim()
            : undefined,
        sentenceWithBlanks,
        blanks,
      },
    ];
  });
}

export function replaceNthBlank(
  text: string,
  index: number,
  replacement: string,
) {
  let current = 0;
  return text.replace(/_{3,}/g, (match) => {
    if (current++ === index) return replacement;
    return match;
  });
}

export function alignFillBlankAnswers(text: string, blanks: string[]) {
  const blankCount = countBlanks(text);
  if (blankCount === 0) {
    return { sentenceWithBlanks: text, blanks: [] as string[] };
  }

  if (blanks.length === blankCount) {
    return { sentenceWithBlanks: text, blanks };
  }

  if (blanks.length > blankCount) {
    return { sentenceWithBlanks: text, blanks: blanks.slice(0, blankCount) };
  }

  let next = text;
  for (let index = blankCount - 1; index >= blanks.length; index -= 1) {
    next = replaceNthBlank(next, index, "")
      .replace(/\s+([.,!?;:])/g, "$1")
      .replace(/\s{2,}/g, " ");
  }

  return {
    sentenceWithBlanks: next.trim(),
    blanks,
  };
}

export function keepGroundedFillBlanks(
  text: string,
  blanks: string[],
  transcript: string,
  extraTerms: string[] = [],
  isGrounded: (blank: string, transcript: string, extraTerms: string[]) => boolean,
) {
  let nextText = text;
  const nextBlanks: string[] = [];

  blanks.forEach((blank, index) => {
    if (isGrounded(blank, transcript, extraTerms)) {
      nextBlanks.push(blank);
      return;
    }

    const restoreAt = nextBlanks.length;
    nextText = replaceNthBlank(nextText, restoreAt, blank);
  });

  const aligned = alignFillBlankAnswers(nextText, nextBlanks);
  if (aligned.blanks.length === 0) return null;
  return aligned;
}

const FALLBACK_SKIP = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "ja",
  "se",
  "on",
  "oli",
  "että",
  "kun",
  "tai",
]);

function splitWord(token: string) {
  const match = token.match(
    /^([^\p{L}\p{N}]*)([\p{L}\p{N}'-]+)([^\p{L}\p{N}]*)$/u,
  );
  if (!match) return null;
  return { lead: match[1] ?? "", word: match[2] ?? "", trail: match[3] ?? "" };
}

function isBlankableWord(word: string) {
  const normalized = word.trim().toLocaleLowerCase();
  if (normalized.length < 4) return false;
  if (FALLBACK_SKIP.has(normalized)) return false;
  return true;
}

export function buildFillBlankFromTranscript(
  transcript: string,
  blankTarget: number,
) {
  const tokens = transcript.split(/(\s+)/);
  const candidates: number[] = [];

  tokens.forEach((token, index) => {
    if (/^\s+$/.test(token)) return;
    const parts = splitWord(token);
    if (!parts || !isBlankableWord(parts.word)) return;
    candidates.push(index);
  });

  const target = Math.max(1, Math.min(blankTarget, candidates.length));
  if (target === 0 || candidates.length === 0) return null;

  const picked = new Set<number>();
  const minGap = candidates.length > target * 2 ? 1 : 0;
  for (let i = 0; i < target; i += 1) {
    const ratio = target === 1 ? 0.5 : i / Math.max(1, target - 1);
    let choice = candidates[Math.min(candidates.length - 1, Math.round(ratio * (candidates.length - 1)))];
    while (
      choice !== undefined &&
      [...picked].some((index) => Math.abs(index - choice!) <= minGap)
    ) {
      const next = candidates.find((index) => !picked.has(index) && Math.abs(index - choice!) > minGap);
      if (next == null) break;
      choice = next;
    }
    if (choice !== undefined) picked.add(choice);
  }

  const blanks: string[] = [];
  const sentenceWithBlanks = tokens
    .map((token, index) => {
      if (!picked.has(index)) return token;
      const parts = splitWord(token);
      if (!parts) return token;
      blanks.push(parts.word);
      return `${parts.lead}${FILL_BLANK_MARKER}${parts.trail}`;
    })
    .join("");

  if (blanks.length === 0) return null;
  return { sentenceWithBlanks, blanks };
}
