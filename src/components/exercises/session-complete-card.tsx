"use client";

import { Focus, RotateCcw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

type SessionCompleteCardProps = {
  title: string;
  scoreLabel?: string;
  questions?: number;
  correct?: number;
  incorrect?: number;
  unanswered?: number;
  tryAgainLabel: string;
  onTryAgain: () => void;
  onViewWrong?: () => void;
  backHref?: string;
  extraAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    locked?: boolean;
    lockMessage?: string;
  };
};

export function SessionCompleteCard({
  title,
  scoreLabel,
  questions,
  correct,
  incorrect,
  unanswered,
  tryAgainLabel,
  onTryAgain,
  onViewWrong,
  backHref = "/exercises",
  extraAction,
}: SessionCompleteCardProps) {
  const t = useTranslations("exercises.session");
  const tExercises = useTranslations("exercises");
  const hasStats = typeof questions === "number" && typeof correct === "number";
  const derivedIncorrect =
    typeof incorrect === "number"
      ? incorrect
      : hasStats
        ? Math.max(0, questions - correct - (unanswered ?? 0))
        : 0;
  const derivedUnanswered = unanswered ?? 0;
  const needsReview = derivedIncorrect + derivedUnanswered;
  const perfect = hasStats && needsReview === 0 && questions > 0;

  return (
    <div className="mx-auto w-full max-w-lg py-8 text-center sm:py-12">
      <p className="font-mono text-xs font-semibold tracking-[0.18em] text-(--exercise-accent) uppercase">
        {title}
      </p>
      {perfect ? (
        <p className="mt-3 text-sm font-medium text-ink">{t("review.allCorrect")}</p>
      ) : null}
      {hasStats ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 text-ink sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">{t("questionsLabel")}</dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
              {questions}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("correctLabel")}</dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
              {correct}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("incorrectLabel")}</dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
              {derivedIncorrect}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("unansweredLabel")}</dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
              {derivedUnanswered}
            </dd>
          </div>
        </dl>
      ) : scoreLabel ? (
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          {scoreLabel}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        {needsReview > 0 && onViewWrong ? (
          <Button type="button" variant="outline" onClick={onViewWrong}>
            <Focus className="size-4" />
            {t("review.viewWrong")}
          </Button>
        ) : null}
        <Button type="button" onClick={onTryAgain} disabled={extraAction?.loading}>
          <RotateCcw className="size-4" />
          {tryAgainLabel}
        </Button>
        {extraAction ? (
          <QuotaLockButton
            type="button"
            variant="outline"
            locked={Boolean(extraAction.locked)}
            lockMessage={extraAction.lockMessage ?? extraAction.label}
            pending={extraAction.loading}
            disabled={extraAction.disabled}
            icon={<Sparkles className="size-4" />}
            onClick={extraAction.onClick}
          >
            {extraAction.label}
          </QuotaLockButton>
        ) : null}
        <LinkButton href={backHref} variant="ghost">
          {tExercises("backToStudio")}
        </LinkButton>
      </div>
    </div>
  );
}
