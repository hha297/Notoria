import { listeningAnswersMatch } from "@/lib/listening/practice";
import { mergeFillBlankQuestions } from "@/lib/listening/fill-blank-passage";
import { targetQuestionCount } from "@/lib/listening/select-type";
import type {
  ListeningExerciseClient,
  ListeningLessonDetail,
  ListeningPracticeType,
} from "@/lib/listening/types";
import { fillBlankDataSchema } from "@/schemas/listening";

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function fillBlankDisplayText(exercise: ListeningExerciseClient) {
  const data = fillBlankDataSchema.safeParse(exercise.data);
  if (!data.success) return exercise.question;
  return data.data.sentenceWithBlanks ?? data.data.displayText ?? exercise.question;
}

export function checkExercise(
  exercise: ListeningExerciseClient,
  answer: unknown,
): boolean[] {
  if (exercise.type === "FILL_BLANK") {
    const expected = asStringArray(exercise.correctAnswer);
    const given = asStringArray(answer);
    return expected.map((item, index) =>
      listeningAnswersMatch(given[index] ?? "", item),
    );
  }

  return [
    listeningAnswersMatch(
      String(answer ?? ""),
      String(exercise.correctAnswer ?? ""),
    ),
  ];
}

export function hasAnswer(exercise: ListeningExerciseClient, answer: unknown) {
  if (exercise.type === "FILL_BLANK") {
    const expected = asStringArray(exercise.correctAnswer);
    const given = asStringArray(answer);
    return expected.every((_, index) => (given[index] ?? "").trim().length > 0);
  }
  return typeof answer === "string" && answer.length > 0;
}

export function toFillBlankPassage(
  exercises: ListeningExerciseClient[],
): ListeningExerciseClient | null {
  const items = exercises.filter((exercise) => exercise.type === "FILL_BLANK");
  if (items.length === 0) return null;

  const merged = mergeFillBlankQuestions(
    items.map((exercise) => {
      const data = fillBlankDataSchema.safeParse(exercise.data);
      return {
        speaker: data.success ? data.data.speaker : undefined,
        sentenceWithBlanks: fillBlankDisplayText(exercise),
        blanks: asStringArray(exercise.correctAnswer),
      };
    }),
  );
  if (!merged) return null;

  return {
    id: items.length === 1 ? items[0]!.id : "fill-blank-passage",
    type: "FILL_BLANK",
    question: merged.sentenceWithBlanks,
    data: {
      sentenceWithBlanks: merged.sentenceWithBlanks,
      speaker: merged.speaker,
    },
    correctAnswer: merged.blanks,
    sortOrder: 0,
  };
}

export function formatExpected(exercise: ListeningExerciseClient) {
  if (exercise.type === "FILL_BLANK") {
    return asStringArray(exercise.correctAnswer).join(" / ");
  }
  return String(exercise.correctAnswer ?? "");
}

export function isSparseExerciseSet(
  lesson: ListeningLessonDetail,
  type: ListeningPracticeType,
  count: number,
) {
  if (count === 0) return true;
  if (type === "FILL_BLANK") return false;
  const { min } = targetQuestionCount({
    transcript: lesson.transcript ?? "",
    durationSeconds: lesson.duration,
  });
  return count < min;
}

export function initialPracticeType(
  lesson: ListeningLessonDetail,
): ListeningPracticeType | null {
  const type =
    lesson.exerciseType === "FILL_BLANK" ||
    lesson.exerciseType === "MULTIPLE_CHOICE"
      ? lesson.exerciseType
      : null;
  if (!type) return null;
  const count = lesson.exercises.filter((exercise) => exercise.type === type)
    .length;
  if (isSparseExerciseSet(lesson, type, count)) return null;
  return type;
}

export function scoreResults(
  exercises: ListeningExerciseClient[],
  results: Record<string, boolean[]>,
  isFillBlank: boolean,
) {
  const blankResults = Object.values(results).flat();
  const total = isFillBlank
    ? exercises.reduce(
        (count, exercise) =>
          count + asStringArray(exercise.correctAnswer).length,
        0,
      )
    : exercises.length;
  const correctCount = isFillBlank
    ? blankResults.filter(Boolean).length
    : Object.values(results).filter((item) => item.every(Boolean)).length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;
  return { total, correctCount, percent };
}
