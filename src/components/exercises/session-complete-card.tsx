"use client";

import { Loader2, Lock, RotateCcw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";

type SessionCompleteCardProps = {
  title: string;
  scoreLabel?: string;
  questions?: number;
  correct?: number;
  tryAgainLabel: string;
  onTryAgain: () => void;
  backHref?: string;
  extraAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    locked?: boolean;
  };
};

export function SessionCompleteCard({
  title,
  scoreLabel,
  questions,
  correct,
  tryAgainLabel,
  onTryAgain,
  backHref = "/exercises",
  extraAction,
}: SessionCompleteCardProps) {
  const t = useTranslations("exercises.session");
  const tExercises = useTranslations("exercises");
  const hasStats = typeof questions === "number" && typeof correct === "number";
  const reviewCount = hasStats ? Math.max(0, questions - correct) : 0;

  return (
    <div className="mx-auto w-full max-w-lg py-8 text-center sm:py-12">
      <p className="font-mono text-xs font-semibold tracking-[0.18em] text-(--exercise-accent) uppercase">
        {title}
      </p>
      {hasStats ? (
        <dl className="mt-6 grid grid-cols-3 gap-3 text-ink">
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
            <dt className="text-xs text-muted-foreground">{t("reviewLabel")}</dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
              {reviewCount}
            </dd>
          </div>
        </dl>
      ) : scoreLabel ? (
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          {scoreLabel}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button type="button" onClick={onTryAgain} disabled={extraAction?.loading}>
          <RotateCcw className="size-4" />
          {tryAgainLabel}
        </Button>
        {extraAction ? (
          <Button
            type="button"
            variant="outline"
            aria-disabled={extraAction.locked || undefined}
            onClick={extraAction.onClick}
            disabled={
              !extraAction.locked && (extraAction.disabled || extraAction.loading)
            }
            className={cn(extraAction.locked && lockedFeatureClassName)}
          >
            {extraAction.loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : extraAction.locked ? (
              <Lock className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {extraAction.label}
          </Button>
        ) : null}
        <LinkButton href={backHref} variant="ghost">
          {tExercises("backToStudio")}
        </LinkButton>
      </div>
    </div>
  );
}
