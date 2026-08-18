"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, RotateCcw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { ListeningAudioPlayer } from "@/components/listening/listening-audio-player";
import { ListeningTranscript } from "@/components/listening/listening-transcript";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateListeningExercises, ensureListeningSpeakers } from "@/lib/actions/listening";
import { isListeningErrorCode } from "@/lib/listening/errors";
import { isMultiSpeakerTranscript, SPEAKER_ASSIGNMENT_VERSION } from "@/lib/listening/speakers";
import { LISTENING_PRACTICE_TYPES } from "@/lib/listening/types";
import type {
  ListeningExerciseClient,
  ListeningLessonDetail,
  ListeningPracticeType,
} from "@/lib/listening/types";
import { listeningAnswersMatch } from "@/lib/listening/practice";
import { mergeFillBlankQuestions } from "@/lib/listening/fill-blank-passage";
import { targetQuestionCount } from "@/lib/listening/select-type";
import { fillBlankDataSchema, multipleChoiceDataSchema } from "@/schemas/listening";
import { cn } from "@/lib/utils";

type ListeningPracticeSessionProps = {
  lesson: ListeningLessonDetail;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function fillBlankDisplayText(exercise: ListeningExerciseClient) {
  const data = fillBlankDataSchema.safeParse(exercise.data);
  if (!data.success) return exercise.question;
  return data.data.sentenceWithBlanks ?? data.data.displayText ?? exercise.question;
}

function checkExercise(exercise: ListeningExerciseClient, answer: unknown): boolean[] {
  if (exercise.type === "FILL_BLANK") {
    const expected = asStringArray(exercise.correctAnswer);
    const given = asStringArray(answer);
    return expected.map((item, index) =>
      listeningAnswersMatch(given[index] ?? "", item),
    );
  }

  return [
    listeningAnswersMatch(String(answer ?? ""), String(exercise.correctAnswer ?? "")),
  ];
}

function hasAnswer(exercise: ListeningExerciseClient, answer: unknown) {
  if (exercise.type === "FILL_BLANK") {
    const expected = asStringArray(exercise.correctAnswer);
    const given = asStringArray(answer);
    return expected.every((_, index) => (given[index] ?? "").trim().length > 0);
  }
  return typeof answer === "string" && answer.length > 0;
}

function toFillBlankPassage(
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

function formatExpected(exercise: ListeningExerciseClient) {
  if (exercise.type === "FILL_BLANK") {
    return asStringArray(exercise.correctAnswer).join(" / ");
  }
  return String(exercise.correctAnswer ?? "");
}

function isSparseExerciseSet(
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

function initialPracticeType(lesson: ListeningLessonDetail): ListeningPracticeType | null {
  const type =
    lesson.exerciseType === "FILL_BLANK" || lesson.exerciseType === "MULTIPLE_CHOICE"
      ? lesson.exerciseType
      : null;
  if (!type) return null;
  const count = lesson.exercises.filter((exercise) => exercise.type === type).length;
  if (isSparseExerciseSet(lesson, type, count)) return null;
  return type;
}

export function ListeningPracticeSession({ lesson }: ListeningPracticeSessionProps) {
  const t = useTranslations("listening");
  const tPractice = useTranslations("listening.practice");
  const tTypes = useTranslations("listening.types");
  const { hasProAccess, openUpgrade } = useProAccess();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [speakersPending, startSpeakersTransition] = useTransition();
  const speakersRequested = useRef(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [seekRequest, setSeekRequest] = useState<{ ms: number; nonce: number } | null>(
    null,
  );
  const [selectedType, setSelectedType] = useState<ListeningPracticeType | null>(
    () => initialPracticeType(lesson),
  );
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [round, setRound] = useState(0);

  useEffect(() => {
    const utterances = lesson.transcriptionData?.utterances ?? [];
    const needsSpeakers =
      Boolean(lesson.transcript?.trim()) &&
      !isMultiSpeakerTranscript(utterances) &&
      (lesson.transcriptionData?.speakerAssignmentVersion ?? 0) <
        SPEAKER_ASSIGNMENT_VERSION;
    if (!needsSpeakers || speakersRequested.current) return;

    speakersRequested.current = true;
    startSpeakersTransition(async () => {
      try {
        await ensureListeningSpeakers(lesson.id);
        router.refresh();
      } catch {
        speakersRequested.current = false;
      }
    });
  }, [lesson.id, lesson.transcript, lesson.transcriptionData, router]);

  const exercises = useMemo(
    () =>
      selectedType
        ? lesson.exercises.filter((exercise) => exercise.type === selectedType)
        : [],
    [lesson.exercises, selectedType],
  );

  const practiceExercises = useMemo(() => {
    if (selectedType !== "FILL_BLANK") return exercises;
    const passage = toFillBlankPassage(exercises);
    return passage ? [passage] : [];
  }, [exercises, selectedType]);

  const results = useMemo(() => {
    if (!checked) return {};
    return Object.fromEntries(
      practiceExercises.map((exercise) => [
        exercise.id,
        checkExercise(exercise, answers[exercise.id]),
      ]),
    ) as Record<string, boolean[]>;
  }, [answers, checked, practiceExercises]);

  const isFillBlank = selectedType === "FILL_BLANK";
  const blankResults = useMemo(
    () => Object.values(results).flat(),
    [results],
  );
  const total = isFillBlank
    ? practiceExercises.reduce(
        (count, exercise) => count + asStringArray(exercise.correctAnswer).length,
        0,
      )
    : practiceExercises.length;
  const correctCount = isFillBlank
    ? blankResults.filter(Boolean).length
    : Object.values(results).filter((item) => item.every(Boolean)).length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;
  const canCheck =
    practiceExercises.length > 0 &&
    practiceExercises.every((exercise) => hasAnswer(exercise, answers[exercise.id]));

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isListeningErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  function setAnswer(id: string, value: unknown) {
    if (checked) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function resetSession() {
    setChecked(false);
    setAnswers({});
    setRound((value) => value + 1);
  }

  function chooseType(type: ListeningPracticeType) {
    if (isPending) return;
    if (!hasProAccess) {
      openUpgrade();
      return;
    }

    const existing = lesson.exercises.filter((exercise) => exercise.type === type);
    const sparse = isSparseExerciseSet(lesson, type, existing.length);
    const alreadyLoaded = selectedType === type && existing.length > 0 && !sparse;
    if (alreadyLoaded) return;

    setSelectedType(type);
    resetSession();

    if (existing.length > 0 && !sparse) return;

    startTransition(async () => {
      try {
        await generateListeningExercises(lesson.id, type);
        toast.success(t("exercisesGenerated"));
        router.refresh();
      } catch (error) {
        if (error instanceof Error && error.message === "PRO_REQUIRED") {
          openUpgrade();
          return;
        }
        toast.error(errorMessage(error));
      }
    });
  }

  function tryAgain() {
    resetSession();
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-10">
        <ListeningAudioPlayer
          src={lesson.cloudinaryUrl}
          mediaType={lesson.mediaType}
          compact
          seekRequest={seekRequest}
        />
      </div>

      {lesson.transcript ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTranscript((open) => !open)}
          >
            {showTranscript ? t("hideTranscript") : t("showTranscript")}
          </Button>
          {showTranscript ? (
            <>
              {speakersPending ? (
                <p className="text-sm text-muted-foreground">{t("identifyingSpeakers")}</p>
              ) : null}
              <ListeningTranscript
                transcript={lesson.transcript}
                transcriptionData={lesson.transcriptionData}
                onSeekMs={(ms) => setSeekRequest({ ms, nonce: Date.now() })}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="heading-md">{t("exerciseTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("chooseExerciseType")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LISTENING_PRACTICE_TYPES.map((type) => {
            const locked = !hasProAccess;

            return (
              <Button
                key={type}
                type="button"
                variant={selectedType === type ? "default" : "outline"}
                aria-disabled={locked || undefined}
                onClick={() => chooseType(type)}
                disabled={hasProAccess && isPending}
                className={cn(locked && lockedFeatureClassName)}
              >
                {locked ? <Lock className="size-3.5" /> : null}
                {tTypes(type)}
              </Button>
            );
          })}
        </div>
      </section>

      {isPending ? (
        <div className="flex items-center gap-3 rounded-xl border border-hairline-cloud bg-muted/40 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("steps.generating")}
        </div>
      ) : null}

      {!selectedType && !isPending ? (
        <p className="text-sm text-muted-foreground">{t("chooseTypeHint")}</p>
      ) : null}

      {selectedType && !isPending && practiceExercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("chooseTypeHint")}</p>
      ) : null}

      {selectedType && !isPending && practiceExercises.length > 0 ? (
        <>
          {checked ? (
            <div className="rounded-2xl border border-[#b8d96a] bg-[#f4fae0] p-5 text-center sm:p-6">
              <p className="font-heading text-xl font-medium text-[#4a6b0a]">
                {tPractice("completeTitle")}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#4a6b0a]">
                {tPractice("completeScore", { correct: correctCount, total })}
              </p>
              <p className="text-sm font-medium text-[#4a6b0a]/80">
                {tPractice("completePercent", { percent })}
              </p>
            </div>
          ) : null}

          {isFillBlank ? (
            <p className="text-sm text-muted-foreground">{t("fillBlankOverview")}</p>
          ) : null}

          <div className="space-y-4">
            {practiceExercises.map((exercise, index) => {
              const blankChecks = results[exercise.id] ?? [];
              const isCorrect =
                blankChecks.length > 0 && blankChecks.every(Boolean);
              return (
                <section
                  key={`${exercise.id}:${round}`}
                  className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6"
                >
                  {exercise.type === "FILL_BLANK" ? (
                    <FillBlankQuestion
                      exercise={exercise}
                      answer={asStringArray(answers[exercise.id])}
                      checked={checked}
                      onChange={(value) => setAnswer(exercise.id, value)}
                    />
                  ) : (
                    <>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.2px] text-muted-foreground">
                          {tPractice("questionLabel", { number: index + 1 })}
                        </p>
                        {checked ? (
                          isCorrect ? (
                            <CheckCircle2 className="size-5 text-[#4a6b0a]" />
                          ) : (
                            <XCircle className="size-5 text-destructive" />
                          )
                        ) : null}
                      </div>
                      <p className="font-heading text-lg font-medium text-ink sm:text-xl">
                        {exercise.question}
                      </p>
                      <div className="mt-4">
                        <MultipleChoicePrompt
                          exercise={exercise}
                          answer={
                            typeof answers[exercise.id] === "string"
                              ? String(answers[exercise.id])
                              : null
                          }
                          checked={checked}
                          onChange={(value) => setAnswer(exercise.id, value)}
                        />
                      </div>
                      {checked && !isCorrect ? (
                        <p className="mt-4 text-sm text-destructive">
                          {tPractice("expected")}: {formatExpected(exercise)}
                        </p>
                      ) : null}
                    </>
                  )}
                </section>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline-cloud pt-4">
            {checked ? (
              <Button type="button" onClick={tryAgain}>
                <RotateCcw className="size-4" />
                {tPractice("tryAgain")}
              </Button>
            ) : (
              <Button
                type="button"
                className="ml-auto"
                onClick={() => setChecked(true)}
                disabled={!canCheck}
              >
                {tPractice("checkAnswers")}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function FillBlankQuestion({
  exercise,
  answer,
  checked,
  onChange,
}: {
  exercise: ListeningExerciseClient;
  answer: string[];
  checked: boolean;
  onChange: (value: string[]) => void;
}) {
  const t = useTranslations("listening.practice");
  const data = fillBlankDataSchema.safeParse(exercise.data);
  const speaker = data.success ? data.data.speaker : undefined;
  const displayText = fillBlankDisplayText(exercise);
  const blanks = asStringArray(exercise.correctAnswer);
  const parts = displayText.split(/_{3,}/);
  const blankResults = blanks.map((item, index) =>
    listeningAnswersMatch(answer[index] ?? "", item),
  );

  function update(index: number, value: string) {
    const next = blanks.map((_, blankIndex) => answer[blankIndex] ?? "");
    next[index] = value;
    onChange(next);
  }

  return (
    <div>
      {speaker ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
          {speaker}
        </p>
      ) : null}
      <div className="whitespace-pre-wrap text-base leading-[2.35] text-ink sm:text-lg">
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < blanks.length ? (
              <span className="inline-flex flex-wrap items-baseline gap-1 align-baseline">
                <Input
                  value={answer[index] ?? ""}
                  onChange={(event) => update(index, event.target.value)}
                  disabled={checked}
                  aria-label={t("blankLabel", { number: index + 1 })}
                  style={{
                    width: `${Math.min(22, Math.max(8, (blanks[index]?.length ?? 6) + 2))}ch`,
                  }}
                  className={cn(
                    "mx-1 inline-flex h-9 max-w-[min(100%,18rem)] align-baseline",
                    checked &&
                      blankResults[index] &&
                      "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                    checked &&
                      !blankResults[index] &&
                      "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                />
                {checked && !blankResults[index] ? (
                  <span className="text-sm text-destructive">
                    ({blanks[index]})
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function MultipleChoicePrompt({
  exercise,
  answer,
  checked,
  onChange,
}: {
  exercise: ListeningExerciseClient;
  answer: string | null;
  checked: boolean;
  onChange: (value: string) => void;
}) {
  const data = multipleChoiceDataSchema.safeParse(exercise.data);
  const options = data.success ? data.data.options : [];
  const correct = String(exercise.correctAnswer ?? "");

  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const selected = answer === option;
        const isCorrect = option === correct;
        return (
          <button
            key={option}
            type="button"
            disabled={checked}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-sm transition-colors sm:text-base",
              selected && !checked && "border-accent-lime bg-accent-lime/20",
              checked && isCorrect && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
              checked &&
                selected &&
                !isCorrect &&
                "border-destructive/40 bg-destructive/10 text-destructive",
              !selected &&
                !checked &&
                "border-hairline-cloud hover:border-accent-lime/50 hover:bg-muted/40",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
