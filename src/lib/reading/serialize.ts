import type {
  ReadingAnswerClient,
  ReadingAnswerFeedback,
  ReadingAttemptClient,
  ReadingAttemptStatus,
  ReadingExerciseMode,
  ReadingPassageDetail,
  ReadingPassageListItem,
  ReadingPracticePayload,
  ReadingQuestionClient,
  ReadingQuestionSetSummary,
  ReadingQuestionType,
  ReadingSetStatus,
  ReadingSourceType,
} from "@/lib/reading/types";
import {
  isReadingExerciseMode,
  isReadingQuestionType,
  isReadingSourceType,
} from "@/lib/reading/utils";

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function asSourceType(value: string): ReadingSourceType {
  return isReadingSourceType(value) ? value : "paste";
}

function asExerciseMode(value: string): ReadingExerciseMode {
  return isReadingExerciseMode(value) ? value : "multiple_choice";
}

function asQuestionType(value: string): ReadingQuestionType {
  return isReadingQuestionType(value) ? value : "multiple_choice";
}

function asSetStatus(value: string): ReadingSetStatus {
  if (value === "generating" || value === "ready" || value === "failed") {
    return value;
  }
  return "failed";
}

function asAttemptStatus(value: string): ReadingAttemptStatus {
  if (
    value === "in_progress" ||
    value === "submitted" ||
    value === "grading" ||
    value === "graded" ||
    value === "grading_failed"
  ) {
    return value;
  }
  return "in_progress";
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function asFeedback(value: unknown): ReadingAnswerFeedback | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    summary: typeof record.summary === "string" ? record.summary : undefined,
    strengths: asStringArray(record.strengths) ?? undefined,
    improvements: asStringArray(record.improvements) ?? undefined,
    score: typeof record.score === "number" ? record.score : undefined,
  };
}

export function toReadingPassageListItem(row: {
  id: string;
  title: string;
  language: string;
  sourceType: string;
  sourceFilename: string | null;
  wordCount: number;
  contentVersion: number;
  folderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  questionSetCount?: number;
  latestSetStatus?: string | null;
}): ReadingPassageListItem {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    sourceType: asSourceType(row.sourceType),
    sourceFilename: row.sourceFilename,
    wordCount: row.wordCount,
    contentVersion: row.contentVersion,
    folderId: row.folderId ?? null,
    questionSetCount: row.questionSetCount ?? 0,
    latestSetStatus: row.latestSetStatus
      ? asSetStatus(row.latestSetStatus)
      : null,
    createdAt: asIso(row.createdAt)!,
    updatedAt: asIso(row.updatedAt)!,
  };
}

export function toReadingQuestionSetSummary(row: {
  id: string;
  passageContentVersion: number;
  exerciseMode: string;
  questionCount: number;
  questionLanguage: string;
  difficulty: string | null;
  status: string;
  errorCode: string | null;
  createdAt: Date;
}): ReadingQuestionSetSummary {
  return {
    id: row.id,
    passageContentVersion: row.passageContentVersion,
    exerciseMode: asExerciseMode(row.exerciseMode),
    questionCount: row.questionCount,
    questionLanguage: row.questionLanguage,
    difficulty: row.difficulty,
    status: asSetStatus(row.status),
    errorCode: row.errorCode,
    createdAt: asIso(row.createdAt)!,
  };
}

export function toReadingPassageDetail(row: {
  id: string;
  title: string;
  body: string;
  language: string;
  sourceType: string;
  sourceFilename: string | null;
  wordCount: number;
  contentVersion: number;
  createdAt: Date;
  updatedAt: Date;
  questionSets: Array<{
    id: string;
    passageContentVersion: number;
    exerciseMode: string;
    questionCount: number;
    questionLanguage: string;
    difficulty: string | null;
    status: string;
    errorCode: string | null;
    createdAt: Date;
  }>;
}): ReadingPassageDetail {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    language: row.language,
    sourceType: asSourceType(row.sourceType),
    sourceFilename: row.sourceFilename,
    wordCount: row.wordCount,
    contentVersion: row.contentVersion,
    createdAt: asIso(row.createdAt)!,
    updatedAt: asIso(row.updatedAt)!,
    questionSets: [...row.questionSets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toReadingQuestionSetSummary),
  };
}

export function toReadingQuestionClient(
  row: {
    id: string;
    type: string;
    prompt: string;
    options: unknown;
    correctAnswer: unknown;
    keyPoints: unknown;
    explanation: string | null;
    excerpt: string | null;
    excerptStart: number | null;
    excerptEnd: number | null;
    sortOrder: number;
  },
  revealAnswers: boolean,
): ReadingQuestionClient {
  const base: ReadingQuestionClient = {
    id: row.id,
    type: asQuestionType(row.type),
    prompt: row.prompt,
    options: asStringArray(row.options),
    excerpt: revealAnswers ? row.excerpt : null,
    excerptStart: revealAnswers ? row.excerptStart : null,
    excerptEnd: revealAnswers ? row.excerptEnd : null,
    sortOrder: row.sortOrder,
  };

  if (!revealAnswers) {
    return base;
  }

  return {
    ...base,
    correctAnswer: row.correctAnswer ?? null,
    keyPoints: asStringArray(row.keyPoints),
    explanation: row.explanation,
  };
}

export function toReadingAnswerClient(
  row: {
    questionId: string;
    response: unknown;
    isCorrect: boolean | null;
    feedback: unknown;
    gradedAt: Date | null;
  },
  revealAnswers = true,
): ReadingAnswerClient {
  return {
    questionId: row.questionId,
    response: row.response,
    isCorrect: revealAnswers ? row.isCorrect : null,
    feedback: revealAnswers ? asFeedback(row.feedback) : null,
    gradedAt: revealAnswers ? asIso(row.gradedAt) : null,
  };
}

export function toReadingAttemptClient(input: {
  attempt: {
    id: string;
    setId: string;
    status: string;
    startedAt: Date;
    submittedAt: Date | null;
    objectiveCorrect: number | null;
    objectiveTotal: number | null;
  };
  answers: Array<{
    questionId: string;
    response: unknown;
    isCorrect: boolean | null;
    feedback: unknown;
    gradedAt: Date | null;
  }>;
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    options: unknown;
    correctAnswer: unknown;
    keyPoints: unknown;
    explanation: string | null;
    excerpt: string | null;
    excerptStart: number | null;
    excerptEnd: number | null;
    sortOrder: number;
  }>;
  revealAnswers: boolean;
}): ReadingAttemptClient {
  const status = asAttemptStatus(input.attempt.status);
  const reveal =
    input.revealAnswers ||
    status === "graded" ||
    status === "grading_failed" ||
    status === "submitted";

  return {
    id: input.attempt.id,
    setId: input.attempt.setId,
    status,
    startedAt: asIso(input.attempt.startedAt)!,
    submittedAt: asIso(input.attempt.submittedAt),
    objectiveCorrect: reveal ? input.attempt.objectiveCorrect : null,
    objectiveTotal: reveal ? input.attempt.objectiveTotal : null,
    answers: input.answers.map((answer) =>
      toReadingAnswerClient(answer, reveal),
    ),
    questions: [...input.questions]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((question) => toReadingQuestionClient(question, reveal)),
    revealAnswers: reveal,
  };
}

export function toPracticePayload(input: {
  passage: {
    id: string;
    title: string;
    body: string;
    language: string;
    contentVersion: number;
  };
  set: {
    id: string;
    passageContentVersion: number;
    exerciseMode: string;
    questionCount: number;
    questionLanguage: string;
    difficulty: string | null;
    status: string;
    errorCode: string | null;
    createdAt: Date;
  };
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    options: unknown;
    correctAnswer: unknown;
    keyPoints: unknown;
    explanation: string | null;
    excerpt: string | null;
    excerptStart: number | null;
    excerptEnd: number | null;
    sortOrder: number;
  }>;
  attempt: {
    id: string;
    setId: string;
    status: string;
    startedAt: Date;
    submittedAt: Date | null;
    objectiveCorrect: number | null;
    objectiveTotal: number | null;
  };
  answers: Array<{
    questionId: string;
    response: unknown;
    isCorrect: boolean | null;
    feedback: unknown;
    gradedAt: Date | null;
  }>;
  revealed: boolean;
}): ReadingPracticePayload {
  return {
    passage: {
      id: input.passage.id,
      title: input.passage.title,
      body: input.passage.body,
      language: input.passage.language,
      contentVersion: input.passage.contentVersion,
    },
    set: toReadingQuestionSetSummary(input.set),
    attempt: toReadingAttemptClient({
      attempt: input.attempt,
      answers: input.answers,
      questions: input.questions,
      revealAnswers: input.revealed,
    }),
  };
}

/** List/detail aliases kept for call-site clarity. */
export const toReadingListItem = toReadingPassageListItem;
export const toQuestionSetSummary = toReadingQuestionSetSummary;
