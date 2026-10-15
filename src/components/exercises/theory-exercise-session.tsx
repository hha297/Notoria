"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { ExerciseSetSubmitBar } from "@/components/exercises/exercise-set-submit-bar";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { TheoryFillBlankCard } from "@/components/exercises/theory/theory-fill-blank-card";
import { TheoryLessonStudy, type TheoryLessonView } from "@/components/exercises/theory/theory-lesson-study";
import { TheoryMultipleChoiceCard } from "@/components/exercises/theory/theory-multiple-choice-card";
import { TheoryTransformationCard } from "@/components/exercises/theory/theory-transformation-card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { shuffleArray } from "@/lib/exercises/utils";
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

type TheoryExerciseSessionViewProps = {
  session: TheoryExerciseSession;
  /**
   * When true, practice persisted items only (no AI generate / regenerate).
   * Used by Import sessions.
   */
  practiceOnly?: boolean;
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
}: TheoryExerciseSessionViewProps) {
  const t = useTranslations("exercises.theory");
  const tSession = useTranslations("exercises.session");
  const { hasProAccess, openUpgrade } = useProAccess();
  const exerciseQuota = useQuotaLockMessage("ai_exercise");
  const [items, setItems] = useState<TheoryExercise[]>(() =>
    shuffleArray(filterPersistedTheoryExercises(session.items)),
  );
  const [autoTried, setAutoTried] = useState(false);
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
    progressRatio,
    unansweredIds,
    score,
    setAnswer,
    resetAttempt,
    submit,
  } = useExerciseSetAttempt({ questionIds });

  const loadItems = useCallback(
    (nextItems: TheoryExercise[], shuffle = true) => {
      const filtered = filterPersistedTheoryExercises(nextItems);
      setItems(shuffle ? shuffleArray(filtered) : filtered);
      setActiveIds(null);
      resetAttempt();
    },
    [resetAttempt],
  );

  const uiLocale = useLocale();

  const generateWithAi = useCallback(async () => {
    setStage("generating", { title: session.theoryTitle });
    try {
      const response = await fetch("/api/ai/theory-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theoryId: session.theoryId,
          count: 24,
          uiLocale,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        code?: string;
        exercises?: TheoryExercise[];
      };
      if (!response.ok || !result.ok) {
        if (result.code === "AI_QUOTA_EXCEEDED") {
          fail(exerciseQuota.message);
          await exerciseQuota.refreshQuotas();
          return;
        }
        if (result.code === "AI_FORBIDDEN") {
          fail(t("aiForbidden"));
          openUpgrade();
          return;
        }
        if (result.code === "AI_DISABLED") {
          fail(t("aiDisabled"));
          return;
        }
        fail(t("aiUnavailable"));
        return;
      }
      const incoming = filterPersistedTheoryExercises(result.exercises ?? []);
      if (incoming.length === 0) {
        fail(t("aiUnavailable"));
        return;
      }
      setStage("saving");
      completeProcessing();
      loadItems(incoming, true);
      toast.success(t("aiReady"));
      window.setTimeout(() => resetProcessing(), 350);
    } catch {
      fail(t("aiUnavailable"));
    }
  }, [
    completeProcessing,
    exerciseQuota,
    fail,
    loadItems,
    openUpgrade,
    resetProcessing,
    session.theoryId,
    session.theoryTitle,
    setStage,
    t,
    uiLocale,
  ]);

  useEffect(() => {
    const filtered = filterPersistedTheoryExercises(session.items);
    setItems(shuffleArray(filtered));
    setActiveIds(null);
    resetAttempt();
    setAutoTried(false);
    setPhase(hasLesson ? "overview" : "practice");
    // Only reset when the theory document / item source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid reshuffling mid-attempt
  }, [hasLesson, session.theoryId, session.items]);

  useEffect(() => {
    if (practiceOnly || autoTried || items.length > 0 || generating) return;
    setAutoTried(true);
    if (hasProAccess) {
      void generateWithAi();
    }
  }, [
    autoTried,
    generateWithAi,
    generating,
    hasProAccess,
    items.length,
    practiceOnly,
  ]);

  const total = practiceItems.length;
  const submitted = attemptPhase === "submitted";
  const progressValue = progressRatio * 100;
  const generateError =
    processing.stage === "error"
      ? processing.errorMessage || t("aiUnavailable")
      : null;

  const jumpToUnanswered = () => {
    const first = unansweredIds[0];
    if (!first) return;
    document
      .getElementById(`theory-q-${first}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = () => {
    void submit((currentAnswers, ids) => {
      const subset = practiceItems.filter((item) => ids.includes(item.id));
      return gradeTheorySet(subset, currentAnswers);
    });
  };

  const goToPractice = () => setPhase("practice");
  const lessonView: TheoryLessonView | null =
    phase === "overview" || phase === "quick" ? phase : null;

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
          onSkipToPractice={goToPractice}
          onStartPractice={goToPractice}
          onRetryGenerate={() => void generateWithAi()}
        />
      </div>
    );
  }

  if (
    items.length === 0 &&
    (generating ||
      processing.stage === "error" ||
      processing.stage === "completed")
  ) {
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
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <QuotaLockButton
                type="button"
                locked={exerciseQuota.locked}
                lockMessage={exerciseQuota.message}
                pending={generating}
                icon={<Sparkles className="size-4" />}
                onClick={generateWithAi}
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

  return (
    <div
      data-exercise="theory"
      data-theory-category={session.category}
      className={mx(featureStyles, "theory-practice-stage -mx-4 space-y-5 px-4 py-4 sm:-mx-6 sm:space-y-8 sm:px-6 sm:py-9")}
    >
      <div className="space-y-4">
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <ExerciseProgressHeader
              progressLabel={
                submitted
                  ? tSession("score", {
                      correct: score.correct,
                      total: score.total,
                    })
                  : tSession("answeredProgress", {
                      answered: answeredCount,
                      total: totalQuestionCount,
                    })
              }
              current={submitted ? score.correct : answeredCount}
              total={submitted ? score.total : totalQuestionCount}
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
                  : progressValue
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
                onClick={() => void generateWithAi()}
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
      </div>

      <div className="space-y-4" key={attemptKey}>
        {practiceItems.map((item, index) => {
          const value =
            typeof answers[item.id] === "string" ? String(answers[item.id]) : "";
          const result = results[item.id];
          const correct = Boolean(result?.correct);
          const unanswered = Boolean(result?.unanswered);
          if (item.type === "fill_blank") {
            return (
              <TheoryFillBlankCard
                key={item.id}
                item={item}
                number={index + 1}
                value={value}
                onChange={(next) => setAnswer(item.id, next)}
                submitted={submitted}
                correct={correct}
                unanswered={unanswered}
              />
            );
          }
          if (item.type === "transformation") {
            return (
              <TheoryTransformationCard
                key={item.id}
                item={item}
                number={index + 1}
                value={value}
                onChange={(next) => setAnswer(item.id, next)}
                submitted={submitted}
                correct={correct}
                unanswered={unanswered}
              />
            );
          }
          return (
            <TheoryMultipleChoiceCard
              key={item.id}
              item={item}
              number={index + 1}
              value={value}
              onChange={(next) => setAnswer(item.id, next)}
              submitted={submitted}
              correct={correct}
              unanswered={unanswered}
            />
          );
        })}
      </div>

      {!submitted ? (
        <ExerciseSetSubmitBar
          answeredCount={answeredCount}
          totalQuestionCount={totalQuestionCount}
          unansweredCount={unansweredIds.length}
          submitting={submitting}
          onSubmit={handleSubmit}
          onJumpToUnanswered={jumpToUnanswered}
        />
      ) : (
        <div className="space-y-4 pt-2">
          <SessionCompleteCard
            title={tSession("complete")}
            scoreLabel={tSession("score", {
              correct: score.correct,
              total: score.total,
            })}
            tryAgainLabel={tSession("restartSet")}
            onTryAgain={() => {
              setActiveIds(null);
              resetAttempt();
            }}
            extraAction={
              practiceOnly
                ? undefined
                : {
                    label: t("generateMore"),
                    onClick: () => void generateWithAi(),
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
