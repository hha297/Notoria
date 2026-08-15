import type { ListeningExercise, ListeningLesson } from "@/db/schema";

export const LISTENING_STATUSES = [
  "UPLOADING",
  "TRANSCRIBING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
] as const;

export type ListeningStatus = (typeof LISTENING_STATUSES)[number];

export const LISTENING_EXERCISE_TYPES = [
  "FILL_BLANK",
  "MULTIPLE_CHOICE",
  "DICTATION",
  "WORD_ORDERING",
] as const;

export type ListeningExerciseType = (typeof LISTENING_EXERCISE_TYPES)[number];

export const LISTENING_PRACTICE_TYPES = [
  "FILL_BLANK",
  "MULTIPLE_CHOICE",
] as const;

export type ListeningPracticeType = (typeof LISTENING_PRACTICE_TYPES)[number];

export type ListeningWordTimestamp = {
  text: string;
  start: number;
  end: number;
  speaker?: string | null;
};

export type ListeningSentence = {
  text: string;
  start: number;
  end: number;
};

export type ListeningUtterance = {
  speaker: string;
  displayName: string | null;
  text: string;
  start: number;
  end: number;
  order: number;
};

export type ListeningTranscriptionData = {
  words: ListeningWordTimestamp[];
  sentences: ListeningSentence[];
  utterances: ListeningUtterance[];
  speakerMap: Record<string, string>;
  speakersResolved?: boolean;
  speakerAssignmentVersion?: number;
  audioDuration: number | null;
};

export type ListeningLessonListItem = {
  id: string;
  title: string;
  cefrLevel: string | null;
  topic: string | null;
  formality: string | null;
  duration: number | null;
  status: ListeningStatus;
  errorCode: string | null;
  exerciseType: ListeningExerciseType | null;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListeningExerciseClient = {
  id: string;
  type: ListeningExerciseType;
  question: string;
  data: unknown;
  correctAnswer: unknown;
  sortOrder: number;
};

export type ListeningLessonDetail = {
  id: string;
  title: string;
  cloudinaryUrl: string;
  mediaType: string;
  format: string | null;
  duration: number | null;
  transcript: string | null;
  transcriptionData: ListeningTranscriptionData | null;
  language: string | null;
  cefrLevel: string | null;
  topic: string | null;
  formality: string | null;
  exerciseType: ListeningExerciseType | null;
  status: ListeningStatus;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  exercises: ListeningExerciseClient[];
};

export type ListeningLessonRow = ListeningLesson & {
  exercises: ListeningExercise[];
};
