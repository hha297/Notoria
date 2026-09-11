"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { TheoryFillBlankCard } from "@/components/exercises/theory/theory-fill-blank-card";
import { TheoryMultipleChoiceCard } from "@/components/exercises/theory/theory-multiple-choice-card";
import { TheoryTransformationCard } from "@/components/exercises/theory/theory-transformation-card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { shuffleArray } from "@/lib/exercises/utils";
import type { TheoryExercise, TheoryExerciseSession } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

type TheoryExerciseSessionViewProps = {
  session: TheoryExerciseSession;
  /**
   * When true, practice persisted items only (no AI generate / regenerate).
   * Used by Import sessions.
   */
  practiceOnly?: boolean;
};

export function TheoryExerciseSessionView({
  session,
  practiceOnly = false,
}: TheoryExerciseSessionViewProps) {
  const t = useTranslations("exercises.theory");
  const tSession = useTranslations("exercises.session");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [items, setItems] = useState<TheoryExercise[]>(() => shuffleArray(session.items));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [complete, setComplete] = useState(false);
  const [round, setRound] = useState(0);
  const [autoTried, setAutoTried] = useState(false);
  const {
    state: processing,
    setStage,
    reset: resetProcessing,
    fail,
    complete: completeProcessing,
    isActive: generating,
  } = useAiProcessing();

  const restart = useCallback((nextItems: TheoryExercise[]) => {
    setItems(shuffleArray(nextItems));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setComplete(false);
    setRound((r) => r + 1);
  }, []);

  const uiLocale = useLocale();

  const generateWithAi = useCallback(async () => {
    if (!hasProAccess) {
      openUpgrade();
      return;
    }
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
        if (result.code === "AI_FORBIDDEN") {
          fail(t("aiForbidden"));
          openUpgrade();
          return;
        }
        fail(t("aiUnavailable"));
        return;
      }
      const incoming = result.exercises ?? [];
      if (incoming.length === 0) {
        fail(t("aiUnavailable"));
        return;
      }
      setStage("saving");
      completeProcessing();
      restart(incoming);
      toast.success(t("aiReady"));
      window.setTimeout(() => resetProcessing(), 350);
    } catch {
      fail(t("aiUnavailable"));
    }
  }, [
    completeProcessing,
    fail,
    hasProAccess,
    openUpgrade,
    resetProcessing,
    restart,
    session.theoryId,
    session.theoryTitle,
    setStage,
    t,
    uiLocale,
  ]);

  useEffect(() => {
    setItems(shuffleArray(session.items));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setComplete(false);
    setRound((r) => r + 1);
    setAutoTried(false);
  }, [session.theoryId, session.items]);

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

  const current = items[index];
  const total = items.length;
  const progressValue = total ? ((complete ? total : index) / total) * 100 : 0;

  const recordAnswer = (correct: boolean) => {
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
    }));
  };

  const goNext = () => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setComplete(true);
  };

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
      <div className="rounded-2xl border border-hairline-cloud bg-card p-8 text-center">
        {practiceOnly ? (
          <>
            <p className="font-heading text-lg font-medium text-ink">
              {t("backToStudio")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("aiUnavailable")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <LinkButton href="/exercises" variant="outline">
                {t("backToStudio")}
              </LinkButton>
            </div>
          </>
        ) : (
          <>
            <p className="font-heading text-lg font-medium text-ink">{t("needAiTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {hasProAccess ? t("needAiDescription") : t("needAiProDescription")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                onClick={generateWithAi}
                disabled={generating}
                aria-disabled={!hasProAccess || undefined}
                className={cn(!hasProAccess && lockedFeatureClassName)}
              >
                <Sparkles className="size-4" />
                {hasProAccess ? t("generateAi") : t("unlockAi")}
              </Button>
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

  if (complete) {
    return (
      <SessionCompleteCard
        title={tSession("complete")}
        scoreLabel={tSession("score", {
          correct: score.correct,
          total: score.answered,
        })}
        tryAgainLabel={tSession("tryAgain")}
        onTryAgain={() => restart(items)}
        extraAction={
          practiceOnly
            ? undefined
            : {
                label: t("generateMore"),
                onClick: () => void generateWithAi(),
                loading: generating,
                locked: !hasProAccess,
              }
        }
      />
    );
  }

  return (
    <div className="space-y-4" key={`${round}-${current?.id ?? index}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <ExerciseProgressHeader
            progressLabel={t("progress", { current: index + 1, total })}
            scoreLabel={t("score", {
              correct: score.correct,
              answered: score.answered,
            })}
            progressValue={progressValue}
          />
        </div>
        <div className="flex items-center gap-2">
          {!practiceOnly ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void generateWithAi()}
              disabled={generating}
              aria-disabled={!hasProAccess || undefined}
              className={cn(!hasProAccess && lockedFeatureClassName)}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t("regenerate")}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => restart(items)}>
            <RotateCcw className="size-4" />
            {t("reshuffle")}
          </Button>
        </div>
      </div>

      {current?.type === "fill_blank" ? (
        <TheoryFillBlankCard item={current} onResolved={recordAnswer} onNext={goNext} />
      ) : null}
      {current?.type === "transformation" ? (
        <TheoryTransformationCard item={current} onResolved={recordAnswer} onNext={goNext} />
      ) : null}
      {current?.type === "multiple_choice" ? (
        <TheoryMultipleChoiceCard item={current} onResolved={recordAnswer} onNext={goNext} />
      ) : null}
    </div>
  );
}
