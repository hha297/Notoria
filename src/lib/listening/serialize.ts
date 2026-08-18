import type { ListeningExercise, ListeningLesson } from "@/db/schema";
import type {
  ListeningExerciseClient,
  ListeningExerciseType,
  ListeningLessonDetail,
  ListeningLessonListItem,
  ListeningPracticeType,
  ListeningStatus,
  ListeningTranscriptionData,
} from "@/lib/listening/types";
import { LISTENING_PRACTICE_TYPES } from "@/lib/listening/types";
import { normalizeSpeakerId } from "@/lib/listening/speakers";
import { toTranscriptionData } from "@/lib/listening/utils";

function asStatus(value: string): ListeningStatus {
  switch (value) {
    case "UPLOADING":
    case "TRANSCRIBING":
    case "GENERATING":
    case "COMPLETED":
    case "FAILED":
      return value;
    default:
      return "FAILED";
  }
}

function asExerciseType(value: string | null | undefined): ListeningExerciseType | null {
  switch (value) {
    case "FILL_BLANK":
    case "MULTIPLE_CHOICE":
    case "DICTATION":
    case "WORD_ORDERING":
      return value;
    default:
      return null;
  }
}

function asPracticeType(value: string | null | undefined): ListeningPracticeType | null {
  return value === "FILL_BLANK" || value === "MULTIPLE_CHOICE" ? value : null;
}

function isPracticeType(value: string | null | undefined): value is ListeningPracticeType {
  return (LISTENING_PRACTICE_TYPES as readonly string[]).includes(value ?? "");
}

export function parseTranscriptionData(
  raw: unknown,
): ListeningTranscriptionData | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const words = Array.isArray(record.words)
    ? record.words.flatMap((word) => {
        if (!word || typeof word !== "object") return [];
        const item = word as Record<string, unknown>;
        if (
          typeof item.text !== "string" ||
          typeof item.start !== "number" ||
          typeof item.end !== "number"
        ) {
          return [];
        }
        return [
          {
            text: item.text,
            start: item.start,
            end: item.end,
            speaker:
              typeof item.speaker === "string" || typeof item.speaker === "number"
                ? String(item.speaker)
                : null,
          },
        ];
      })
    : [];

  const sentences = Array.isArray(record.sentences)
    ? record.sentences.flatMap((sentence) => {
        if (!sentence || typeof sentence !== "object") return [];
        const item = sentence as Record<string, unknown>;
        if (
          typeof item.text !== "string" ||
          typeof item.start !== "number" ||
          typeof item.end !== "number"
        ) {
          return [];
        }
        return [{ text: item.text, start: item.start, end: item.end }];
      })
    : undefined;

  const utterances = Array.isArray(record.utterances)
    ? record.utterances.flatMap((utterance, index) => {
        if (!utterance || typeof utterance !== "object") return [];
        const item = utterance as Record<string, unknown>;
        if (
          typeof item.text !== "string" ||
          typeof item.start !== "number" ||
          typeof item.end !== "number"
        ) {
          return [];
        }
        const speaker = normalizeSpeakerId(
          typeof item.speaker === "string" || typeof item.speaker === "number"
            ? item.speaker
            : "A",
        );
        return [
          {
            speaker,
            displayName:
              typeof item.displayName === "string" && item.displayName.trim()
                ? item.displayName.trim()
                : null,
            text: item.text,
            start: item.start,
            end: item.end,
            order: typeof item.order === "number" ? item.order : index,
          },
        ];
      })
    : [];

  const speakerMap =
    record.speakerMap && typeof record.speakerMap === "object"
      ? Object.fromEntries(
          Object.entries(record.speakerMap as Record<string, unknown>).flatMap(
            ([speaker, name]) =>
              typeof name === "string" && name.trim() ? [[speaker, name.trim()]] : [],
          ),
        )
      : {};

  return toTranscriptionData({
    words,
    sentences,
    utterances,
    speakerMap,
    speakersResolved: record.speakersResolved === true,
    speakerAssignmentVersion:
      typeof record.speakerAssignmentVersion === "number"
        ? record.speakerAssignmentVersion
        : 0,
    audioDuration:
      typeof record.audioDuration === "number" ? record.audioDuration : null,
  });
}

export function toListeningListItem(
  lesson: ListeningLesson & { exercises?: Pick<ListeningExercise, "id" | "type">[] },
): ListeningLessonListItem {
  return {
    id: lesson.id,
    title: lesson.title,
    originalFilename: lesson.originalFilename,
    format: lesson.format,
    cefrLevel: lesson.cefrLevel,
    topic: lesson.topic,
    formality: lesson.formality,
    folderId: lesson.folderId ?? null,
    duration: lesson.duration,
    status: asStatus(lesson.status),
    errorCode: lesson.errorCode,
    exerciseType:
      asPracticeType(lesson.exerciseType) ??
      asPracticeType(lesson.exercises?.find((exercise) => isPracticeType(exercise.type))?.type ?? null),
    exerciseCount:
      lesson.exercises?.filter((exercise) => isPracticeType(exercise.type)).length ?? 0,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
  };
}

export function toListeningExerciseClient(
  exercise: ListeningExercise,
): ListeningExerciseClient {
  return {
    id: exercise.id,
    type: asExerciseType(exercise.type) ?? "FILL_BLANK",
    question: exercise.question,
    data: exercise.data,
    correctAnswer: exercise.correctAnswer,
    sortOrder: exercise.sortOrder,
  };
}

export function toListeningLessonDetail(
  lesson: ListeningLesson & { exercises: ListeningExercise[] },
): ListeningLessonDetail {
  const exercises = [...lesson.exercises]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toListeningExerciseClient)
    .filter((exercise) => isPracticeType(exercise.type));
  const exerciseType =
    asPracticeType(lesson.exerciseType) ??
    asPracticeType(exercises[0]?.type ?? null);

  return {
    id: lesson.id,
    title: lesson.title,
    originalFilename: lesson.originalFilename,
    cloudinaryUrl: lesson.cloudinaryUrl,
    mediaType: lesson.mediaType,
    format: lesson.format,
    duration: lesson.duration,
    transcript: lesson.transcript,
    transcriptionData: parseTranscriptionData(lesson.transcriptionData),
    language: lesson.language,
    cefrLevel: lesson.cefrLevel,
    topic: lesson.topic,
    formality: lesson.formality,
    folderId: lesson.folderId ?? null,
    exerciseType,
    status: asStatus(lesson.status),
    errorCode: lesson.errorCode,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
    exercises,
  };
}
