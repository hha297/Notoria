export const READING_SOURCE_TYPES = ["paste", "pdf", "docx"] as const;
export type ReadingSourceType = (typeof READING_SOURCE_TYPES)[number];

export const READING_EXERCISE_MODES = [
  "multiple_choice",
  "written",
  "true_false_not_stated",
  "mixed",
] as const;
export type ReadingExerciseMode = (typeof READING_EXERCISE_MODES)[number];

export const READING_QUESTION_TYPES = [
  "multiple_choice",
  "written",
  "true_false_not_stated",
] as const;
export type ReadingQuestionType = (typeof READING_QUESTION_TYPES)[number];

export const READING_SET_STATUSES = ["generating", "ready", "failed"] as const;
export type ReadingSetStatus = (typeof READING_SET_STATUSES)[number];

export const READING_ATTEMPT_STATUSES = [
  "in_progress",
  "submitted",
  "grading",
  "graded",
  "grading_failed",
] as const;
export type ReadingAttemptStatus = (typeof READING_ATTEMPT_STATUSES)[number];

export const READING_TFNS_ANSWERS = [
  "true",
  "false",
  "not_stated",
] as const;
export type ReadingTfnsAnswer = (typeof READING_TFNS_ANSWERS)[number];

export type ReadingPassageListItem = {
  id: string;
  title: string;
  language: string;
  sourceType: ReadingSourceType;
  sourceFilename: string | null;
  wordCount: number;
  contentVersion: number;
  folderId: string | null;
  questionSetCount: number;
  latestSetStatus: ReadingSetStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type ReadingQuestionSetSummary = {
  id: string;
  passageContentVersion: number;
  exerciseMode: ReadingExerciseMode;
  questionCount: number;
  questionLanguage: string;
  difficulty: string | null;
  status: ReadingSetStatus;
  errorCode: string | null;
  createdAt: string;
};

export type ReadingQuestionClient = {
  id: string;
  type: ReadingQuestionType;
  prompt: string;
  options: string[] | null;
  excerpt: string | null;
  excerptStart: number | null;
  excerptEnd: number | null;
  sortOrder: number;
  /** Only present after submit / graded attempt. */
  correctAnswer?: unknown;
  keyPoints?: string[] | null;
  explanation?: string | null;
};

export type ReadingPassageDetail = {
  id: string;
  title: string;
  body: string;
  language: string;
  sourceType: ReadingSourceType;
  sourceFilename: string | null;
  wordCount: number;
  contentVersion: number;
  createdAt: string;
  updatedAt: string;
  questionSets: ReadingQuestionSetSummary[];
};

export type ReadingAnswerFeedback = {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  score?: number;
};

export type ReadingAnswerClient = {
  questionId: string;
  response: unknown;
  isCorrect: boolean | null;
  feedback: ReadingAnswerFeedback | null;
  gradedAt: string | null;
};

export type ReadingAttemptClient = {
  id: string;
  setId: string;
  status: ReadingAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  objectiveCorrect: number | null;
  objectiveTotal: number | null;
  answers: ReadingAnswerClient[];
  questions: ReadingQuestionClient[];
  revealAnswers: boolean;
};

export type ReadingExtractedDocument = {
  text: string;
  sourceType: "pdf" | "docx";
  sourceFilename: string;
  suggestedTitle: string;
  wordCount: number;
};

export type ReadingPracticePayload = {
  passage: {
    id: string;
    title: string;
    body: string;
    language: string;
    contentVersion: number;
  };
  set: ReadingQuestionSetSummary;
  attempt: ReadingAttemptClient;
};
