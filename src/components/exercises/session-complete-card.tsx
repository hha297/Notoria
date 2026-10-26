"use client";

import type { ReactNode } from "react";
import {
  CircleHelp,
  Focus,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  onRetryIncorrect?: () => void;
  onRetryUnanswered?: () => void;
  /** Kept for callers; back link is hidden for now. */
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

type ResultMood = "perfect" | "strong" | "mixed" | "unanswered";

function resolveMood(input: {
  questions: number;
  correct: number;
  incorrect: number;
  unanswered: number;
}): ResultMood {
  const { questions, correct, incorrect, unanswered } = input;
  if (questions > 0 && incorrect + unanswered === 0) return "perfect";
  if (unanswered > correct && unanswered >= incorrect) return "unanswered";
  if (questions > 0 && correct / questions >= 0.7) return "strong";
  return "mixed";
}

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
  onRetryIncorrect,
  onRetryUnanswered,
  extraAction,
}: SessionCompleteCardProps) {
  const t = useTranslations("exercises.session");
  const reduceMotion = useReducedMotion();
  const hasStats = typeof questions === "number" && typeof correct === "number";
  const derivedIncorrect =
    typeof incorrect === "number"
      ? incorrect
      : hasStats
        ? Math.max(0, questions - correct - (unanswered ?? 0))
        : 0;
  const derivedUnanswered = unanswered ?? 0;
  const needsReview = derivedIncorrect + derivedUnanswered;
  const showRetryIncorrect =
    Boolean(onRetryIncorrect) && derivedIncorrect > 0;
  const showRetryUnanswered =
    Boolean(onRetryUnanswered) && derivedUnanswered > 0;

  const mood = hasStats
    ? resolveMood({
        questions: questions!,
        correct: correct!,
        incorrect: derivedIncorrect,
        unanswered: derivedUnanswered,
      })
    : "mixed";
  const ratio =
    hasStats && questions! > 0 ? Math.min(1, correct! / questions!) : 0;
  const percent = Math.round(ratio * 100);

  const MoodIcon =
    mood === "perfect"
      ? PartyPopper
      : mood === "strong"
        ? Sparkles
        : mood === "unanswered"
          ? CircleHelp
          : Target;

  const moodTone =
    mood === "perfect" || mood === "strong"
      ? "text-success"
      : mood === "unanswered"
        ? "text-muted-foreground"
        : "text-(--exercise-accent)";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
      }
      className="exercise-panel relative w-full overflow-hidden rounded-xl border px-5 py-7 sm:rounded-2xl sm:px-7 sm:py-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 left-[18%] h-36 w-48 rounded-full bg-(--exercise-accent)/16 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-10 h-32 w-40 rounded-full bg-success/12 blur-3xl"
      />

      <div className="relative">
        <p className="font-mono text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
          {title}
        </p>

        {hasStats ? (
          <div className="mt-5 flex flex-col items-center gap-6 sm:mt-6 sm:flex-row sm:items-center sm:gap-8 lg:gap-10">
            <ScoreRing
              ratio={ratio}
              mood={mood}
              reduceMotion={Boolean(reduceMotion)}
            >
              <p className="font-heading text-[2.1rem] leading-none font-bold tracking-tight tabular-nums text-ink sm:text-[2.45rem]">
                {correct}
                <span className="text-[1.05rem] font-semibold text-muted-foreground sm:text-[1.2rem]">
                  {" "}
                  / {questions}
                </span>
              </p>
              <p className="mt-1.5 text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {t("scorePercent", { percent })}
              </p>
            </ScoreRing>

            <div className="min-w-0 flex-1 space-y-4 text-center sm:space-y-5 sm:text-left">
              <div className="space-y-1">
                <p
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 font-heading text-lg font-semibold tracking-tight sm:justify-start sm:text-xl",
                    moodTone,
                  )}
                >
                  <MoodIcon className="size-5 shrink-0" strokeWidth={2.2} />
                  {t(`result.${mood}.headline`)}
                </p>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:mx-0">
                  {t(`result.${mood}.body`)}
                </p>
              </div>

              <dl className="grid grid-cols-3 gap-2">
                <Stat
                  label={t("correctLabel")}
                  value={correct!}
                  tone="success"
                />
                <Stat
                  label={t("incorrectLabel")}
                  value={derivedIncorrect}
                  tone="error"
                />
                <Stat
                  label={t("unansweredLabel")}
                  value={derivedUnanswered}
                  tone="warning"
                />
              </dl>
            </div>
          </div>
        ) : scoreLabel ? (
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            {scoreLabel}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            onClick={onTryAgain}
            disabled={extraAction?.loading}
          >
            <RotateCcw className="size-4" />
            {tryAgainLabel}
          </Button>
          {needsReview > 0 && onViewWrong ? (
            <Button type="button" variant="outline" onClick={onViewWrong}>
              <Focus className="size-4" />
              {t("review.viewWrong")}
            </Button>
          ) : null}
          {showRetryIncorrect ? (
            <Button type="button" variant="outline" onClick={onRetryIncorrect}>
              <XCircle className="size-4 text-error" />
              {t("retryIncorrect")}
            </Button>
          ) : null}
          {showRetryUnanswered ? (
            <Button type="button" variant="outline" onClick={onRetryUnanswered}>
              <CircleHelp className="size-4 text-warning" />
              {t("retryUnanswered")}
            </Button>
          ) : null}
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
        </div>
      </div>
    </motion.div>
  );
}

function ScoreRing({
  ratio,
  mood,
  reduceMotion,
  children,
}: {
  ratio: number;
  mood: ResultMood;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const size = 136;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));
  const strokeColor =
    mood === "perfect" || mood === "strong"
      ? "var(--success)"
      : "var(--exercise-accent)";

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in oklab, var(--hairline-cloud) 70%, transparent)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={
            reduceMotion
              ? { strokeDashoffset: offset }
              : { strokeDashoffset: circumference }
          }
          animate={{ strokeDashoffset: offset }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.08 }
          }
        />
      </svg>
      <div className="relative px-3 text-center">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "error" | "warning";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-2.5 py-3 sm:px-3.5",
        tone === "success" &&
          "border-success-border/80 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--success)_28%,transparent),color-mix(in_oklab,var(--success-muted)_80%,transparent)_55%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--success)_22%,transparent)]",
        tone === "error" &&
          "border-error-border/80 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--error)_28%,transparent),color-mix(in_oklab,var(--error-muted)_80%,transparent)_55%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--error)_22%,transparent)]",
        tone === "warning" &&
          "border-warning/70 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--warning)_26%,transparent),color-mix(in_oklab,var(--warning)_10%,transparent)_55%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--warning)_20%,transparent)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1",
          tone === "success" && "bg-success",
          tone === "error" && "bg-error",
          tone === "warning" && "bg-warning",
        )}
      />
      <dt
        className={cn(
          "text-[0.7rem] font-semibold tracking-wide",
          tone === "success" && "text-success",
          tone === "error" && "text-error",
          tone === "warning" && "text-warning",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-heading text-2xl font-bold tabular-nums sm:text-[1.7rem]",
          tone === "success" && "text-success",
          tone === "error" && "text-error",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
