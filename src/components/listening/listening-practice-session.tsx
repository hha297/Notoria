"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  Lock,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { ListeningAudioPlayer } from "@/components/listening/listening-audio-player";
import { ListeningExerciseFeedback } from "@/components/listening/listening-exercise-feedback";
import {
  ListeningFillBlankQuestion,
  ListeningMultipleChoiceQuestion,
} from "@/components/listening/listening-exercise-questions";
import { ListeningTranscript } from "@/components/listening/listening-transcript";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import exerciseStyles from "@/components/style/listening/exercise.module.css";
import {
  generateListeningExercises,
  ensureListeningSpeakers,
} from "@/lib/actions/listening";
import { mx } from "@/lib/css-module";
import { isListeningErrorCode } from "@/lib/listening/errors";
import {
  isMultiSpeakerTranscript,
  SPEAKER_ASSIGNMENT_VERSION,
} from "@/lib/listening/speakers";
import {
  asStringArray,
  checkExercise,
  formatExpected,
  hasAnswer,
  isSparseExerciseSet,
  scoreResults,
  toFillBlankPassage,
} from "@/lib/listening/practice-session";
import { LISTENING_PRACTICE_TYPES } from "@/lib/listening/types";
import type {
  ListeningLessonDetail,
  ListeningPracticeType,
} from "@/lib/listening/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type Phase = "lobby" | "active" | "complete";

type ListeningPracticeSessionProps = {
  lesson: ListeningLessonDetail;
};

export function ListeningPracticeSession({
  lesson,
}: ListeningPracticeSessionProps) {
  const t = useTranslations("listening");
  const tPractice = useTranslations("listening.practice");
  const tTypes = useTranslations("listening.types");
  const tCommon = useTranslations("common");
  const { hasProAccess, openUpgrade } = useProAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [speakersPending, startSpeakersTransition] = useTransition();
  const speakersRequested = useRef(false);

  const [phase, setPhase] = useState<Phase>("lobby");
  const [showTranscript, setShowTranscript] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [seekRequest, setSeekRequest] = useState<{
    ms: number;
    nonce: number;
  } | null>(null);
  const [selectedType, setSelectedType] = useState<ListeningPracticeType | null>(
    null,
  );
  const [questionIndex, setQuestionIndex] = useState(0);
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

  const isFillBlank = selectedType === "FILL_BLANK";
  const current = practiceExercises[questionIndex] ?? null;

  const results = useMemo(() => {
    if (!checked && phase !== "complete") return {};
    return Object.fromEntries(
      practiceExercises.map((exercise) => [
        exercise.id,
        checkExercise(exercise, answers[exercise.id]),
      ]),
    ) as Record<string, boolean[]>;
  }, [answers, checked, phase, practiceExercises]);

  const score = useMemo(
    () => scoreResults(practiceExercises, results, isFillBlank),
    [practiceExercises, results, isFillBlank],
  );

  const currentResult = current ? results[current.id] : undefined;
  const currentCorrect =
    Boolean(currentResult?.length) && Boolean(currentResult?.every(Boolean));

  const canCheck = current
    ? hasAnswer(current, answers[current.id])
    : false;

  const mcAnsweredCount = isFillBlank
    ? 0
    : practiceExercises.filter((exercise) =>
        hasAnswer(exercise, answers[exercise.id]),
      ).length;
  const mcUnansweredIds = isFillBlank
    ? []
    : practiceExercises
        .filter((exercise) => !hasAnswer(exercise, answers[exercise.id]))
        .map((exercise) => exercise.id);

  const progressLabel = isFillBlank
    ? tPractice("blanksProgress", {
        filled: asStringArray(answers[current?.id ?? ""]).filter((v) =>
          v.trim(),
        ).length,
        total: asStringArray(current?.correctAnswer).length,
      })
    : checked || phase === "complete"
      ? tPractice("completeScore", {
          correct: score.correctCount,
          total: score.total,
        })
      : tPractice("answeredProgress", {
          answered: mcAnsweredCount,
          total: practiceExercises.length || 0,
        });
  const progressRatio = isFillBlank
    ? checked
      ? 1
      : asStringArray(current?.correctAnswer).length
        ? asStringArray(answers[current?.id ?? ""]).filter((v) => v.trim())
            .length / asStringArray(current?.correctAnswer).length
        : 0
    : practiceExercises.length
      ? (checked || phase === "complete"
          ? score.total
            ? score.correctCount / score.total
            : 0
          : mcAnsweredCount / practiceExercises.length)
      : 0;

  const mistakes = useMemo(() => {
    return practiceExercises
      .map((exercise, index) => {
        const result = results[exercise.id];
        if (!result || result.every(Boolean)) return null;
        return {
          index,
          exercise,
          expected: formatExpected(exercise),
          given: isFillBlank
            ? asStringArray(answers[exercise.id]).join(" / ")
            : String(answers[exercise.id] ?? ""),
        };
      })
      .filter(Boolean) as Array<{
      index: number;
      exercise: (typeof practiceExercises)[number];
      expected: string;
      given: string;
    }>;
  }, [answers, isFillBlank, practiceExercises, results]);

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

  function resetRound() {
    setChecked(false);
    setAnswers({});
    setQuestionIndex(0);
    setShowReview(false);
    setRound((value) => value + 1);
  }

  function chooseType(type: ListeningPracticeType) {
    if (isPending) return;
    if (!hasProAccess) {
      openUpgrade();
      return;
    }

    const existing = lesson.exercises.filter(
      (exercise) => exercise.type === type,
    );
    const sparse = isSparseExerciseSet(lesson, type, existing.length);
    const ready = existing.length > 0 && !sparse;

    setSelectedType(type);
    resetRound();

    if (ready) {
      setPhase("active");
      return;
    }

    startTransition(async () => {
      try {
        const generated = await generateListeningExercises(lesson.id, type);
        if (generated.inProgress) {
          toast.message(t("generationInProgress"));
          setSelectedType(null);
          setPhase("lobby");
          return;
        }
        toast.success(t("exercisesGenerated"));
        setPhase("active");
        void queryClient.invalidateQueries({ queryKey: ["listening"] });
        router.refresh();
      } catch (error) {
        if (error instanceof Error && error.message === "PRO_REQUIRED") {
          openUpgrade();
          return;
        }
        toast.error(errorMessage(error));
        setSelectedType(null);
        setPhase("lobby");
      }
    });
  }

  function exitToLobby() {
    setPhase("lobby");
    setChecked(false);
    setQuestionIndex(0);
    setShowReview(false);
  }

  function handleCheck() {
    // Fill-blank keeps a single Check for the passage.
    if (!isFillBlank) return;
    if (!current || !canCheck) return;
    setChecked(true);
  }

  function handleSubmitMc() {
    if (isFillBlank || checked) return;
    if (mcUnansweredIds.length > 0) {
      setSubmitConfirmOpen(true);
      return;
    }
    // Stay on the full list so feedback appears beside each question.
    setChecked(true);
  }

  function confirmSubmitMc() {
    setSubmitConfirmOpen(false);
    setChecked(true);
  }

  function handleNext() {
    if (!checked) return;
    setPhase("complete");
  }

  function jumpToUnansweredMc() {
    const first = mcUnansweredIds[0];
    if (!first) return;
    document
      .getElementById(`listening-q-${first}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function tryAgain() {
    resetRound();
    setPhase("active");
  }

  const media = (
    <div className={mx(exerciseStyles, "mediaDock")}>
      <ListeningAudioPlayer
        key={lesson.cloudinaryUrl}
        src={lesson.cloudinaryUrl}
        mediaType={lesson.mediaType}
        compact
        label={tPractice("listenPrompt")}
        seekRequest={seekRequest}
      />
    </div>
  );

  const transcriptBlock =
    lesson.transcript ? (
      <div className={mx(exerciseStyles, "transcriptPanel")}>
        <Button
          type="button"
          variant="outline"
          className={mx(exerciseStyles, "transcriptToggle")}
          onClick={() => setShowTranscript((open) => !open)}
        >
          {showTranscript ? t("hideTranscript") : t("showTranscript")}
        </Button>
        {showTranscript ? (
          <div className="mt-3">
            {speakersPending ? (
              <p className={mx(exerciseStyles, "instruction")}>
                {t("identifyingSpeakers")}
              </p>
            ) : null}
            <ListeningTranscript
              transcript={lesson.transcript}
              transcriptionData={lesson.transcriptionData}
              onSeekMs={(ms) => setSeekRequest({ ms, nonce: Date.now() })}
            />
          </div>
        ) : null}
      </div>
    ) : null;

  if (phase === "lobby") {
    return (
      <div className={mx(exerciseStyles, "shell shellWide")}>
        {media}
        {transcriptBlock}

        <section className={mx(exerciseStyles, "lobby")} aria-label={t("exerciseTitle")}>
          <div>
            <p className={mx(exerciseStyles, "eyebrow")}>{t("exerciseTitle")}</p>
            <p className={mx(exerciseStyles, "lobbyLead")}>
              {t("chooseTypeHint")}
            </p>
          </div>

          <div className={mx(exerciseStyles, "typeGrid")}>
            {LISTENING_PRACTICE_TYPES.map((type) => {
              const locked = !hasProAccess;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={hasProAccess && isPending}
                  aria-disabled={locked || undefined}
                  onClick={() => chooseType(type)}
                  className={cn(
                    mx(exerciseStyles, "typeCard"),
                    locked && lockedFeatureClassName,
                  )}
                >
                  <p className={mx(exerciseStyles, "typeCardTitle")}>
                    {locked ? <Lock className="size-3.5" /> : null}
                    {tTypes(type)}
                  </p>
                  <p className={mx(exerciseStyles, "typeCardBody")}>
                    {type === "FILL_BLANK"
                      ? t("fillBlankOverview")
                      : tPractice("typeHintMc")}
                  </p>
                </button>
              );
            })}
          </div>

          {isPending ? (
            <div className={mx(exerciseStyles, "status")} role="status">
              <Loader2 className="size-4 animate-spin" />
              {t("steps.generating")}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className={mx(exerciseStyles, "shell")}>
        <div className={mx(exerciseStyles, "complete")}>
          <p className={mx(exerciseStyles, "completeKicker")}>{t("title")}</p>
          <h2 className={mx(exerciseStyles, "completeTitle")}>
            {tPractice("completeTitle")}
          </h2>
          <p className={mx(exerciseStyles, "completeScore")}>
            {tPractice("completeScore", {
              correct: score.correctCount,
              total: score.total,
            })}
          </p>
          <p className={mx(exerciseStyles, "completePercent")}>
            {tPractice("completePercent", { percent: score.percent })}
          </p>

          <div className={mx(exerciseStyles, "completeActions")}>
            {mistakes.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReview((value) => !value)}
              >
                {showReview ? tPractice("hideReview") : tPractice("review")}
              </Button>
            ) : null}
            <Button type="button" onClick={tryAgain}>
              <RotateCcw className="size-4" />
              {tPractice("tryAgain")}
            </Button>
            <Button type="button" variant="outline" onClick={exitToLobby}>
              {tPractice("changeType")}
            </Button>
          </div>
        </div>

        {showReview && mistakes.length > 0 ? (
          <div className={mx(exerciseStyles, "reviewList")} aria-live="polite">
            {mistakes.map((item) => (
              <article
                key={item.exercise.id}
                className={mx(exerciseStyles, "reviewItem")}
              >
                <p className={mx(exerciseStyles, "reviewPrompt")}>
                  {isFillBlank
                    ? t("fillBlankOverview")
                    : item.exercise.question}
                </p>
                <p className={mx(exerciseStyles, "reviewMeta")}>
                  {tPractice("yourAnswer")}: {item.given || "—"}
                </p>
                <p className={mx(exerciseStyles, "reviewMeta")}>
                  {tPractice("expected")}: {item.expected}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {media}
      </div>
    );
  }

  // active
  if (!current || practiceExercises.length === 0) {
    return (
      <div className={mx(exerciseStyles, "shell")}>
        <div className={mx(exerciseStyles, "status")} role="status">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("steps.generating")}
            </>
          ) : (
            t("chooseTypeHint")
          )}
        </div>
        <Button type="button" variant="outline" onClick={exitToLobby}>
          <ArrowLeft className="size-4" />
          {tPractice("changeType")}
        </Button>
      </div>
    );
  }

  return (
    <div className={mx(exerciseStyles, "shell")}>
      <header className={mx(exerciseStyles, "header")}>
        <div className={mx(exerciseStyles, "headerMeta")}>
          <p className={mx(exerciseStyles, "eyebrow")}>{t("title")}</p>
          <p className={mx(exerciseStyles, "headerTitle")}>
            {selectedType ? tTypes(selectedType) : t("exerciseTitle")}
          </p>
        </div>
        <div className={mx(exerciseStyles, "headerActions")}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={mx(exerciseStyles, "exit")}
            onClick={exitToLobby}
          >
            <ArrowLeft className="size-4" />
            {tPractice("changeType")}
          </Button>
        </div>
      </header>

      <div className={mx(exerciseStyles, "progressBlock")}>
        <div className={mx(exerciseStyles, "progressRow")}>
          <p className={mx(exerciseStyles, "progressLabel")}>
            {isFillBlank
              ? t("fillBlankOverview")
              : tPractice("listenPrompt")}
          </p>
          <p className={mx(exerciseStyles, "progressCount")}>{progressLabel}</p>
        </div>
        <div
          className={mx(exerciseStyles, "progressTrack")}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, progressRatio) * 100)}
          aria-label={progressLabel}
        >
          <div
            className={mx(exerciseStyles, "progressFill")}
            style={{ width: `${Math.min(100, progressRatio * 100)}%` }}
          />
        </div>
      </div>

      {media}

      <div className={mx(exerciseStyles, "stage")}>
        {isFillBlank ? (
          <>
            <p className={mx(exerciseStyles, "instruction")}>
              {tPractice("listenPrompt")}
            </p>
            <AnimatePresence mode="wait">
              <motion.section
                key={`${current.id}:${round}`}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE }}
                className={mx(exerciseStyles, "questionPanel")}
              >
                <ListeningFillBlankQuestion
                  exercise={current}
                  answer={asStringArray(answers[current.id])}
                  checked={checked}
                  onChange={(value) => setAnswer(current.id, value)}
                />
                {checked ? (
                  <ListeningExerciseFeedback
                    correct={currentCorrect}
                    userAnswer={asStringArray(answers[current.id]).join(" / ")}
                    expected={formatExpected(current)}
                  />
                ) : null}
              </motion.section>
            </AnimatePresence>
            <div className={mx(exerciseStyles, "actions")}>
              {!checked ? (
                <Button type="button" onClick={handleCheck} disabled={!canCheck}>
                  {tPractice("checkAnswers")}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  {tPractice("finish")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className={mx(exerciseStyles, "instruction")}>
              {tPractice("typeHintMc")}
            </p>
            <div className="flex flex-col gap-6" key={`mc-set-${round}`}>
              {practiceExercises.map((exercise, index) => {
                const result = results[exercise.id];
                const itemChecked = checked;
                const itemCorrect =
                  Boolean(result?.length) && Boolean(result?.every(Boolean));
                return (
                  <section
                    key={exercise.id}
                    id={`listening-q-${exercise.id}`}
                    className={mx(exerciseStyles, "questionPanel")}
                  >
                    <ListeningMultipleChoiceQuestion
                      exercise={exercise}
                      index={index}
                      answer={
                        typeof answers[exercise.id] === "string"
                          ? String(answers[exercise.id])
                          : null
                      }
                      checked={itemChecked}
                      onChange={(value) => setAnswer(exercise.id, value)}
                    />
                    {itemChecked ? (
                      <ListeningExerciseFeedback
                        correct={itemCorrect}
                        userAnswer={String(answers[exercise.id] ?? "")}
                        expected={formatExpected(exercise)}
                      />
                    ) : null}
                  </section>
                );
              })}
            </div>
            <div className={mx(exerciseStyles, "actions")}>
              {!checked ? (
                <>
                  {mcUnansweredIds.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={jumpToUnansweredMc}
                    >
                      {tPractice("jumpToUnanswered")}
                    </Button>
                  ) : null}
                  <Button type="button" onClick={handleSubmitMc}>
                    {tPractice("submitSet")}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={tryAgain}>
                    <RotateCcw className="size-4" />
                    {tPractice("tryAgain")}
                  </Button>
                  <Button type="button" onClick={handleNext}>
                    {tPractice("finish")}
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {transcriptBlock}
      </div>

      <ConfirmActionDialog
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        title={tPractice("unansweredWarnTitle")}
        description={tPractice("unansweredWarn")}
        confirmLabel={tPractice("submitAnyway")}
        cancelLabel={tCommon("cancel")}
        onConfirm={confirmSubmitMc}
        onCancel={jumpToUnansweredMc}
      />
    </div>
  );
}
