import type { ReadingErrorCode } from "@/lib/reading/errors";
import type {
  ReadingExerciseMode,
  ReadingQuestionType,
  ReadingSourceType,
  ReadingTfnsAnswer,
} from "@/lib/reading/types";
import {
  READING_EXERCISE_MODES,
  READING_QUESTION_TYPES,
  READING_SOURCE_TYPES,
  READING_TFNS_ANSWERS,
} from "@/lib/reading/types";

const MAX_PASSAGE_CHARS = 50_000;
const MAX_TITLE_CHARS = 160;
const MIN_PASSAGE_CHARS = 40;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function normalizePassageBody(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_PASSAGE_CHARS);
}

export function normalizePassageTitle(title: string, body: string): string {
  const trimmed = title.trim().slice(0, MAX_TITLE_CHARS);
  if (trimmed) return trimmed;
  const firstLine = body
    .split(/\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine) return firstLine.slice(0, MAX_TITLE_CHARS);
  return "Untitled passage";
}

export function suggestedTitleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.slice(0, MAX_TITLE_CHARS) || "Imported passage";
}

/** Alias used by actions / import dialog. */
export const titleFromFilename = suggestedTitleFromFilename;

export function validatePassageBody(text: string):
  | { ok: true; normalized: string; wordCount: number; code?: undefined }
  | {
      ok: false;
      normalized: string;
      wordCount: number;
      code: ReadingErrorCode;
    } {
  const normalized = normalizePassageBody(text);
  const wordCount = countWords(normalized);
  if (!normalized || normalized.length < MIN_PASSAGE_CHARS) {
    return { ok: false, normalized, wordCount, code: "EMPTY_CONTENT" };
  }
  return { ok: true, normalized, wordCount };
}

export function isReadingSourceType(value: string): value is ReadingSourceType {
  return (READING_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isReadingExerciseMode(
  value: string,
): value is ReadingExerciseMode {
  return (READING_EXERCISE_MODES as readonly string[]).includes(value);
}

export function isReadingQuestionType(
  value: string,
): value is ReadingQuestionType {
  return (READING_QUESTION_TYPES as readonly string[]).includes(value);
}

export function isReadingTfnsAnswer(value: string): value is ReadingTfnsAnswer {
  return (READING_TFNS_ANSWERS as readonly string[]).includes(value);
}

export function questionTypesForMode(
  mode: ReadingExerciseMode,
): ReadingQuestionType[] {
  if (mode === "mixed") {
    return [...READING_QUESTION_TYPES];
  }
  return [mode];
}

export function normalizeComparable(value: unknown): string {
  if (typeof value === "string") return value.trim().toLocaleLowerCase();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim().toLocaleLowerCase();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeComparable).join("|");
  }
  if (value && typeof value === "object" && "value" in value) {
    return normalizeComparable((value as { value: unknown }).value);
  }
  return "";
}

export function findExcerptOffsets(
  body: string,
  excerpt: string | null | undefined,
): { start: number | null; end: number | null } {
  if (!excerpt?.trim()) return { start: null, end: null };
  const haystack = body.toLocaleLowerCase();
  const needle = excerpt.trim().toLocaleLowerCase();
  const index = haystack.indexOf(needle);
  if (index < 0) return { start: null, end: null };
  return { start: index, end: index + excerpt.trim().length };
}

export { MAX_PASSAGE_CHARS, MAX_TITLE_CHARS };
