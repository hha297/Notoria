"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseAdditionalInstructions } from "@/components/exercises/exercise-additional-instructions";
import { ExerciseDisplayModePicker } from "@/components/exercises/exercise-display-mode-picker";
import { ExerciseOneByOneBar } from "@/components/exercises/exercise-one-by-one-bar";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { ExerciseSetSubmitBar } from "@/components/exercises/exercise-set-submit-bar";
import {
  ExerciseSetReviewNav,
  exerciseReviewFocusClass,
} from "@/components/exercises/exercise-set-review-nav";
import { NextSetStatusChip } from "@/components/exercises/next-set-status";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { TheoryFillBlankCard } from "@/components/exercises/theory/theory-fill-blank-card";
import { TheoryLessonStudy, type TheoryLessonView } from "@/components/exercises/theory/theory-lesson-study";
import { TheoryMultipleChoiceCard } from "@/components/exercises/theory/theory-multiple-choice-card";
import { TheoryTransformationCard } from "@/components/exercises/theory/theory-transformation-card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseNextSet } from "@/hooks/use-exercise-next-set";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
import { useExerciseSetUi } from "@/hooks/use-exercise-set-ui";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { DEFAULT_NEXT_SET_COUNT } from "@/lib/exercises/next-set-fingerprint";
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { shuffleArray } from "@/lib/exercises/utils";
import { requestTheoryExerciseAi } from "@/lib/theory-exercises/ai-client";
import {
  buildTheoryLessonBeats,
  theoryLessonHasMaterial,
} from "@/lib/theory-exercises/lesson-content";
import {
  answersMatchAny,
  filterPersistedTheoryExercises,
} from "@/lib/theory-exercises/generate-ai";
import type { TheoryExercise, TheoryExerciseSession } from "@/lib/theory-exercises/types";
import featureStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type TheoryNextPayload = {
  theoryIds: string[];
  perTheory: number;
};

type TheoryExerciseSessionViewProps = {
  session: TheoryExerciseSession;
  /**
   * When true, practice persisted items only (no AI generate / regenerate).
   * Used by Import sessions.
   */
  practiceOnly?: boolean;
  /** Extra theory ids selected in the studio picker (same workspace). */
  alsoTheoryIds?: string[];
};

function gradeTheorySet(
  items: TheoryExercise[],
  answers: Readonly<Record<string, unknown>>,
): Record<string, SetQuestionResult> {
  const results: Record<string, SetQuestionResult> = {};
  for (const item of items) {
    const raw = answers[item.id];
    const value = typeof raw === "string" ? raw : "";
    const unanswered = !isNonEmptyAnswer(value);
    if (unanswered) {
      results[item.id] = { correct: false, unanswered: true };
      continue;
    }
    if (item.type === "multiple_choice") {
      results[item.id] = {
        correct: value === item.correctOption,
        unanswered: false,
      };
      continue;
    }
    results[item.id] = {
      correct: answersMatchAny(value, item.acceptedAnswers),
      unanswered: false,
    };
  }
  return results;
}

export function TheoryExerciseSessionView({
  session,
  practiceOnly = false,
  alsoTheoryIds = [],
}: TheoryExerciseSessionViewProps) {
  const t = useTranslations("exercises.theory");
  const tSession = useTranslations("exercises.session");
  const { openUpgrade } = useProAccess();
  const exerciseQuota = useQuotaLockMessage("ai_exercise");
  const [items, setItems] = useState<TheoryExercise[]>(() =>
    shuffleArray(filterPersistedTheoryExercises(session.items)),
  );
  const [activeIds, setActiveIds] = useState<string[] | null>(null);
  const beats = useMemo(
    () => buildTheoryLessonBeats(session.doc),
    [session.doc],
  );
  const hasLesson =
    !practiceOnly &&
    theoryLessonHasMaterial({
      description: session.description,
      beats,
    });
  const [phase, setPhase] = useState<"overview" | "quick" | "practice">(
    () => (hasLesson ? "overview" : "practice"),
  );
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const {
    state: processing,
    setStage,
    reset: resetProcessing,
    fail,
    complete: completeProcessing,
    isActive: generating,
  } = useAiProcessing();

  const practiceItems = useMemo(() => {
    if (!activeIds) return items;
    const byId = new Map(items.map((item) => [item.id, item]));
    return activeIds
      .map((id) => byId.get(id))
      .filter((item): item is TheoryExercise => Boolean(item));
  }, [activeIds, items]);

  const questionIds = useMemo(
    () => practiceItems.map((item) => item.id),
    [practiceItems],
  );

  const {
    answers,
    phase: attemptPhase,
    results,
    submitting,
    attemptKey,
    answeredCount,
    totalQuestionCount,
    unansweredIds,
    score,
    checkedCount,
    setAnswer,
    resetAttempt,
    submit,
    checkOne,
    markSubmitted,
  } = useExerciseSetAttempt({ questionIds });

  const {
    displayMode,
    setDisplayMode,
    displayModeLocked,
    currentQuestionId,
    currentChecked,
    currentCanCheck,
    isLastQuestion,
    goNextQuestion,
    visibleQuestionIds,
    numbers,
    reviewFilter,
    setReviewFilter,
    focusedReviewId,
    setFocusedReviewId,
    afterNewSet,
    jumpToUnanswered,
    openWrongReview,
    submitted,
  } = useExerciseSetUi({
    questionIds,
    results,
    answers,
    attemptPhase,
    answeredCount,
    checkedCount,
    questionIdPrefix: "theory-q",
    setAnchorId: "theory-set-top",
  });

  const loadItems = useCallback(
    (nextItems: TheoryExercise[], shuffle = true) => {
      const filtered = filterPersistedTheoryExercises(nextItems);
      setItems(shuffle ? shuffleArray(filtered) : filtered);
      setActiveIds(null);
      resetAttempt();
      afterNewSet();
    },
    [afterNewSet, resetAttempt],
  );

  const uiLocale = useLocale();

  const buildTheoryPayload = useCallback((): TheoryNextPayload => {
    const theoryIds = [
      session.theoryId,
      ...alsoTheoryIds.filter((id) => id !== session.theoryId),
    ].slice(0, 3);
    const perTheory =
      theoryIds.length === 1
        ? DEFAULT_NEXT_SET_COUNT
        : Math.max(
            4,
            Math.ceil(DEFAULT_NEXT_SET_COUNT / theoryIds.length),
          );
    return { theoryIds, perTheory };
  }, [alsoTheoryIds, session.theoryId]);

  const {
    sessionId,
    sequence,
    status: nextSetStatus,
    notifyAnswerInteraction,
    openNextSet,
    retryPrefetch,
    markGeneratedSequence,
    resetForNewActiveSet,
  } = useExerciseNextSet<TheoryNextPayload, TheoryExercise[]>({
    enabled: !practiceOnly && items.length > 0,
    buildPayload: () => buildTheoryPayload(),
    generate: async (payload, meta) => {
      const merged: TheoryExercise[] = [];
      for (const [index, theoryId] of payload.theoryIds.entries()) {
        const result = await requestTheoryExerciseAi(
          {
            theoryId,
            count: payload.perTheory,
            uiLocale,
            additionalInstructions:
              additionalInstructions.trim() || undefined,
            nextSet: {
              sessionId: meta.sessionId,
              // Offset per theory so multi-source merges stay unique per sequence.
              sequence: meta.sequence * 10 + index,
              regenerate: meta.regenerate,
            },
          },
          { signal: meta.signal },
        );
        if (!result.ok) {
          return {
            ok: false,
            retryable:
              result.code === "AI_UNAVAILABLE" ||
              result.code === "AI_JOB_IN_PROGRESS",
          };
        }
        merged.push(...filterPersistedTheoryExercises(result.exercises));
      }
      if (merged.length === 0) return { ok: false, retryable: false };
      return { ok: true, result: merged };
    },
    applyResult: (nextItems) => {
      loadItems(nextItems, true);
    },
  });

  const generateWithAi = useCallback(
    async (options?: {
      sequence?: number;
      regenerate?: boolean;
      showProgress?: boolean;
      signal?: AbortSignal;
    }) => {
      const showProgress = options?.showProgress !== false;
      const targetSequence =
        options?.sequence ?? (items.length > 0 ? sequence + 1 : sequence);
      const payload = buildTheoryPayload();
      if (showProgress) {
        setStage("preparing", { title: session.theoryTitle });
        setStage("generating", { title: session.theoryTitle });
      }
      const controller = options?.signal
        ? null
        : new AbortController();
      const signal = options?.signal ?? controller!.signal;
      // Stay above the server interactive deadline so the UI does not abort
      // a request that is about to succeed.
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), 110_000)
        : null;
      try {
        const merged: TheoryExercise[] = [];
        for (const [index, theoryId] of payload.theoryIds.entries()) {
          const result = await requestTheoryExerciseAi(
            {
              theoryId,
              count: payload.perTheory,
              uiLocale,
              additionalInstructions:
                additionalInstructions.trim() || undefined,
              nextSet: {
                sessionId,
                sequence: targetSequence * 10 + index,
                regenerate: options?.regenerate,
              },
            },
            { signal },
          );
          if (!result.ok) {
            if (!showProgress) return false;
            if (result.code === "AI_QUOTA_EXCEEDED") {
              fail(exerciseQuota.message);
              await exerciseQuota.refreshQuotas();
              return false;
            }
            if (result.code === "PREMIUM_REQUIRED") {
              fail(t("aiPremiumRequired"));
              openUpgrade();
              return false;
            }
            if (result.code === "AI_FORBIDDEN") {
              fail(t("aiForbidden"));
              openUpgrade();
              return false;
            }
            if (result.code === "AI_DISABLED") {
              fail(t("aiDisabled"));
              return false;
            }
            fail(t("aiUnavailable"));
            return false;
          }
          merged.push(...filterPersistedTheoryExercises(result.exercises));
        }
        if (merged.length === 0) {
          if (showProgress) fail(t("aiUnavailable"));
          return false;
        }
        if (showProgress) {
          setStage("validating");
          setStage("saving");
        }
        loadItems(merged, true);
        markGeneratedSequence(targetSequence);
        if (showProgress) {
          completeProcessing();
          toast.success(t("aiReady"));
          window.setTimeout(() => resetProcessing(), 350);
        }
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (showProgress) fail(t("aiUnavailable"));
          return false;
        }
        if (showProgress) fail(t("aiUnavailable"));
        return false;
      } finally {
        if (timeoutId != null) window.clearTimeout(timeoutId);
      }
    },
    [
      additionalInstructions,
      buildTheoryPayload,
      completeProcessing,
      exerciseQuota,
      fail,
      items.length,
      loadItems,
      markGeneratedSequence,
      openUpgrade,
      resetProcessing,
      sequence,
      session.theoryTitle,
      sessionId,
      setStage,
      t,
      uiLocale,
    ],
  );

  const handleNewSet = useCallback(async () => {
    const outcome = await openNextSet();
    if (outcome.mode === "applied") {
      toast.success(t("aiReady"));
      return;
    }
    if (outcome.mode === "attached") {
      setStage("generating", { title: session.theoryTitle });
      const ok = await outcome.promise;
      if (ok) {
        completeProcessing();
        toast.success(t("aiReady"));
        window.setTimeout(() => resetProcessing(), 350);
      } else {
        fail(t("aiUnavailable"));
      }
      return;
    }
    await generateWithAi({ sequence: outcome.sequence, showProgress: true });
  }, [
    completeProcessing,
    fail,
    generateWithAi,
    openNextSet,
    resetProcessing,
    session.theoryTitle,
    setStage,
    t,
  ]);

  useEffect(() => {
    if (practiceOnly || items.length === 0) return;
    resetForNewActiveSet(sequence);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only invalidate on config
  }, [additionalInstructions, alsoTheoryIds.join("|")]);

  useEffect(() => {
    const filtered = filterPersistedTheoryExercises(session.items);
    setItems(shuffleArray(filtered));
    setActiveIds(null);
    resetAttempt();
    afterNewSet();
    setPhase(hasLesson ? "overview" : "practice");
    // Only reset when the theory document / item source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid reshuffling mid-attempt
  }, [hasLesson, session.theoryId, session.items]);

  const beginExercise = useCallback(async () => {
    if (items.length > 0) {
      setPhase("practice");
      return;
    }
    const ready = await generateWithAi();
    if (ready) setPhase("practice");
  }, [generateWithAi, items.length]);

  const total = practiceItems.length;
  const generateError =
    processing.stage === "error"
      ? processing.errorMessage || t("aiUnavailable")
      : null;

  const gradeQuestion = useCallback(
    (item: TheoryExercise, raw: unknown): SetQuestionResult => {
      return gradeTheorySet([item], { [item.id]: raw })[item.id]!;
    },
    [],
  );

  const handleSubmit = () => {
    void submit((currentAnswers, ids) => {
      const subset = practiceItems.filter((item) => ids.includes(item.id));
      return gradeTheorySet(subset, currentAnswers);
    });
  };

  const handleCheckOne = () => {
    if (!currentQuestionId) return;
    const item = practiceItems.find((row) => row.id === currentQuestionId);
    if (!item) return;
    void checkOne(item.id, (raw) => gradeQuestion(item, raw));
  };

  const handleViewResults = () => {
    markSubmitted();
  };

  const itemsById = useMemo(
    () => new Map(practiceItems.map((item) => [item.id, item] as const)),
    [practiceItems],
  );

  const instructionsField = practiceOnly ? null : (
    <ExerciseAdditionalInstructions
      scope="theory"
      value={additionalInstructions}
      onChange={setAdditionalInstructions}
      disabled={generating}
    />
  );

  const lessonView: TheoryLessonView | null =
    phase === "overview" || phase === "quick" ? phase : null;

  // Show progress as soon as generation starts — do not keep the lesson chrome
  // with only a button spinner while a multi-minute AI call runs.
  if (
    !practiceOnly &&
    items.length === 0 &&
    (generating ||
      processing.stage === "error" ||
      processing.stage === "completed")
  ) {
    return (
      <div data-exercise="theory" className="mx-auto max-w-xl py-6">
        <AiProcessingProgress
          state={processing}
          pipeline="aiGenerate"
          onRetry={
            processing.stage === "error"
              ? () => void generateWithAi()
              : undefined
          }
          onDismissError={
            processing.stage === "error"
              ? () => resetProcessing()
              : undefined
          }
        />
      </div>
    );
  }

  if (hasLesson && lessonView) {
    return (
      <div data-exercise="theory" data-theory-category={session.category} className="min-w-0">
        <TheoryLessonStudy
          title={session.theoryTitle}
          category={session.category}
          description={session.description}
          beats={beats}
          theoryHref={`/theory/${session.theoryId}`}
          view={lessonView}
          practiceReady={items.length > 0}
          generating={generating}
          generateError={generateError}
          practiceLocked={false}
          onQuickReview={() => setPhase("quick")}
          onSkipToPractice={() => void beginExercise()}
          onStartPractice={() => void beginExercise()}
          onRetryGenerate={() => void beginExercise()}
          instructions={instructionsField}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div data-exercise="theory" className="mx-auto max-w-xl py-6">
        {practiceOnly ? (
          <>
            <p className="font-heading text-2xl font-semibold tracking-tight text-ink">
              {t("backToStudio")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("aiUnavailable")}
            </p>
            <div className="mt-6">
              <LinkButton href="/exercises" variant="outline">
                {t("backToStudio")}
              </LinkButton>
            </div>
          </>
        ) : (
          <>
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {t("lesson.label")}
            </p>
            <p className="mt-3 font-heading text-2xl font-semibold tracking-tight text-ink">
              {t("needAiTitle")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("needAiDescription")}
            </p>
            <div className="mt-6">{instructionsField}</div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <QuotaLockButton
                type="button"
                locked={exerciseQuota.locked}
                lockMessage={exerciseQuota.message}
                pending={generating}
                icon={<Sparkles className="size-4" />}
                onClick={() => void beginExercise()}
              >
                {t("generateAi")}
              </QuotaLockButton>
              <LinkButton href={`/theory/${session.theoryId}/edit`} variant="outline">
                {t("editTheory")}
              </LinkButton>
              <LinkButton href="/exercises" variant="outline">
                {t("backToStudio")}
              </LinkButton>
            </div>
          </>
        )}
      </div>
    );
  }

  if (generating || processing.stage === "error") {
    return (
      <AiProcessingProgress
        state={processing}
        pipeline="aiGenerate"
        onRetry={
          processing.stage === "error" ? () => void generateWithAi() : undefined
        }
        onDismissError={
          processing.stage === "error" ? () => resetProcessing() : undefined
        }
      />
    );
  }

  const oneByOne = displayMode === "one_by_one";
  const progressCurrent = submitted
    ? score.correct
    : oneByOne
      ? Math.min(checkedCount + (currentChecked ? 0 : 1), totalQuestionCount)
      : answeredCount;
  const progressTotal = submitted ? score.total : totalQuestionCount;

  return (
    <div
      data-exercise="theory"
      data-theory-category={session.category}
      className={mx(featureStyles, "theory-practice-stage -mx-[var(--studio-main-pad,1rem)] space-y-5 px-4 py-4 sm:-mx-[var(--studio-main-pad,1.5rem)] sm:space-y-8 sm:px-6 sm:py-9")}
    >
      <div id="theory-set-top" className="scroll-mt-24" />
      <div className="space-y-4">
        {instructionsField}
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
            {submitted ? tSession("resultsTitle") : t("lesson.nowPractice")}
          </p>
          <p className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-2xl">
            {session.theoryTitle}
          </p>
          {hasLesson ? (
            <Link
              href={`/theory/${session.theoryId}`}
              className="mt-2 inline-block text-sm font-medium text-(--exercise-accent) underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-(--exercise-accent)/40 focus-visible:outline-none"
            >
              {t("lesson.openTheory")}
            </Link>
          ) : null}
        </div>

        <ExerciseDisplayModePicker
          value={displayMode}
          onChange={setDisplayMode}
          disabled={displayModeLocked}
        />

        {practiceOnly &&
        practiceItems.length > 0 &&
        practiceItems.length < 20 ? (
          <p className="text-xs text-muted-foreground">
            {tSession("shortSetNote", { count: practiceItems.length })}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <ExerciseProgressHeader
              progressLabel={
                submitted
                  ? tSession("score", {
                      correct: score.correct,
                      total: score.total,
                    })
                  : oneByOne
                    ? tSession("questionProgress", {
                        current: Math.min(
                          checkedCount + 1,
                          Math.max(totalQuestionCount, 1),
                        ),
                        total: totalQuestionCount,
                      })
                    : tSession("answeredProgress", {
                        answered: answeredCount,
                        total: totalQuestionCount,
                      })
              }
              current={progressCurrent}
              total={progressTotal}
              scoreLabel={
                submitted
                  ? t("score", {
                      correct: score.correct,
                      answered: score.total,
                    })
                  : undefined
              }
              progressValue={
                submitted
                  ? total
                    ? (score.correct / total) * 100
                    : 0
                  : oneByOne
                    ? totalQuestionCount
                      ? (checkedCount / totalQuestionCount) * 100
                      : 0
                    : totalQuestionCount
                      ? (answeredCount / totalQuestionCount) * 100
                      : 0
              }
            />
          </div>
          <div className="flex items-center gap-2">
            {!practiceOnly ? (
              <QuotaLockButton
                type="button"
                variant="ghost"
                size="sm"
                locked={exerciseQuota.locked}
                lockMessage={exerciseQuota.message}
                pending={generating}
                icon={<Sparkles className="size-4" />}
                onClick={() => void handleNewSet()}
              >
                {t("regenerate")}
              </QuotaLockButton>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => loadItems(items, true)}
            >
              <RotateCcw className="size-4" />
              {t("reshuffle")}
            </Button>
          </div>
        </div>
        {!practiceOnly ? (
          <NextSetStatusChip
            status={nextSetStatus}
            onRetry={() => retryPrefetch()}
            onOpen={() => void handleNewSet()}
          />
        ) : null}
      </div>

      {submitted ? (
        <ExerciseSetReviewNav
          questionIds={questionIds}
          results={results}
          questionDomId={(id) => `theory-q-${id}`}
          filter={reviewFilter}
          onFilterChange={setReviewFilter}
          focusedId={focusedReviewId}
          onFocusedIdChange={setFocusedReviewId}
        />
      ) : null}

      <div className="space-y-4" key={attemptKey}>
        {visibleQuestionIds.map((id) => {
          const item = itemsById.get(id);
          if (!item) return null;
          const value =
            typeof answers[item.id] === "string" ? String(answers[item.id]) : "";
          const result = results[item.id];
          const correct = Boolean(result?.correct);
          const unanswered = Boolean(result?.unanswered);
          const revealed = submitted || Boolean(result);
          const onAnswerChange = (next: string) => {
            setAnswer(item.id, next);
            if (next.trim()) notifyAnswerInteraction();
          };
          return (
            <div
              key={item.id}
              className={cn(
                exerciseReviewFocusClass(focusedReviewId === item.id),
              )}
            >
              {item.type === "fill_blank" ? (
                <TheoryFillBlankCard
                  item={item}
                  number={numbers[item.id]}
                  value={value}
                  onChange={onAnswerChange}
                  submitted={revealed}
                  correct={correct}
                  unanswered={unanswered}
                />
              ) : item.type === "transformation" ? (
                <TheoryTransformationCard
                  item={item}
                  number={numbers[item.id]}
                  value={value}
                  onChange={onAnswerChange}
                  submitted={revealed}
                  correct={correct}
                  unanswered={unanswered}
                />
              ) : (
                <TheoryMultipleChoiceCard
                  item={item}
                  number={numbers[item.id]}
                  value={value}
                  onChange={onAnswerChange}
                  submitted={revealed}
                  correct={correct}
                  unanswered={unanswered}
                />
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        oneByOne ? (
          <ExerciseOneByOneBar
            checked={currentChecked}
            isLast={isLastQuestion}
            canCheck={currentCanCheck}
            submitting={submitting}
            onCheck={handleCheckOne}
            onNext={goNextQuestion}
            onViewResults={handleViewResults}
          />
        ) : (
          <ExerciseSetSubmitBar
            answeredCount={answeredCount}
            totalQuestionCount={totalQuestionCount}
            unansweredCount={unansweredIds.length}
            submitting={submitting}
            onSubmit={handleSubmit}
            onJumpToUnanswered={() => jumpToUnanswered(unansweredIds)}
          />
        )
      ) : (
        <div className="space-y-4 pt-2">
          <SessionCompleteCard
            title={tSession("complete")}
            questions={score.total}
            correct={score.correct}
            incorrect={score.incorrect}
            unanswered={score.unanswered}
            scoreLabel={tSession("score", {
              correct: score.correct,
              total: score.total,
            })}
            tryAgainLabel={tSession("restartSet")}
            onTryAgain={() => {
              setActiveIds(null);
              resetAttempt();
              afterNewSet();
            }}
            onViewWrong={openWrongReview}
            extraAction={
              practiceOnly
                ? undefined
                : {
                    label: t("generateMore"),
                    onClick: () => void handleNewSet(),
                    loading: generating,
                    locked: exerciseQuota.locked,
                    lockMessage: exerciseQuota.message,
                  }
            }
          />
          <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
            {practiceItems.some(
              (item) =>
                results[item.id] &&
                !results[item.id]!.correct &&
                !results[item.id]!.unanswered,
            ) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const ids = practiceItems
                    .filter((item) => {
                      const row = results[item.id];
                      return row && !row.correct && !row.unanswered;
                    })
                    .map((item) => item.id);
                  setActiveIds(ids.length > 0 ? ids : null);
                  resetAttempt();
                  afterNewSet();
                }}
              >
                {tSession("retryIncorrect")}
              </Button>
            ) : null}
            {Object.values(results).some((row) => row.unanswered) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const ids = practiceItems
                    .filter((item) => results[item.id]?.unanswered)
                    .map((item) => item.id);
                  setActiveIds(ids.length > 0 ? ids : null);
                  resetAttempt();
                  afterNewSet();
                }}
              >
                {tSession("retryUnanswered")}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
