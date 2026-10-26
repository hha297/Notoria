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

const MOOD_WASH: Record<ResultMood, string> = {
  perfect:
    "bg-[radial-gradient(ellipse_at_18%_0%,color-mix(in_oklab,var(--success)_14%,transparent),transparent_62%),radial-gradient(ellipse_at_88%_12%,color-mix(in_oklab,var(--exercise-accent)_8%,transparent),transparent_56%)]",
  strong:
    "bg-[radial-gradient(ellipse_at_18%_0%,color-mix(in_oklab,var(--success)_12%,transparent),transparent_62%),radial-gradient(ellipse_at_92%_8%,color-mix(in_oklab,var(--exercise-accent)_10%,transparent),transparent_56%)]",
  mixed:
    "bg-[radial-gradient(ellipse_at_14%_0%,color-mix(in_oklab,var(--exercise-accent)_12%,transparent),transparent_62%),radial-gradient(ellipse_at_90%_18%,color-mix(in_oklab,var(--warning)_6%,transparent),transparent_56%)]",
  unanswered:
    "bg-[radial-gradient(ellipse_at_16%_0%,color-mix(in_oklab,var(--warning)_12%,transparent),transparent_62%),radial-gradient(ellipse_at_88%_14%,color-mix(in_oklab,var(--exercise-accent)_7%,transparent),transparent_56%)]",
};

const MOOD_RAIL: Record<ResultMood, string> = {
  perfect: "from-success/55 via-success/25 to-transparent",
  strong: "from-success/50 via-(--exercise-accent)/25 to-transparent",
  mixed: "from-(--exercise-accent)/55 via-warning/20 to-transparent",
  unanswered: "from-warning/55 via-(--exercise-accent)/20 to-transparent",
};

const MOOD_BADGE: Record<ResultMood, string> = {
  perfect:
    "border-success-border/35 bg-success-muted/45 text-success dark:bg-success-muted/35",
  strong:
    "border-success-border/30 bg-[color-mix(in_oklab,var(--success-muted)_40%,var(--exercise-accent-soft)_30%,transparent)] text-success",
  mixed:
    "border-(--exercise-accent)/25 bg-(--exercise-accent-soft)/70 text-(--exercise-accent)",
  unanswered:
    "border-warning/30 bg-[color-mix(in_oklab,var(--warning)_8%,var(--surface))] text-warning",
};

const MOOD_HEADLINE: Record<ResultMood, string> = {
  perfect: "text-success",
  strong: "text-success",
  mixed: "text-(--exercise-accent)",
  unanswered: "text-warning",
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

  const stagger = reduceMotion
    ? undefined
    : {
      hidden: {},
      show: {
        transition: { staggerChildren: 0.07, delayChildren: 0.18 },
      },
    };

  const item = reduceMotion
    ? undefined
    : {
      hidden: { opacity: 0, y: 10 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
      },
    };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
      className="exercise-panel relative w-full overflow-hidden rounded-xl border px-5 py-7 sm:rounded-2xl sm:px-8 sm:py-9"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70 dark:opacity-55",
          MOOD_WASH[mood],
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 bottom-0 left-0 w-0.5 bg-linear-to-b sm:w-1",
          MOOD_RAIL[mood],
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-(--exercise-accent)/12 to-transparent"
      />

      <div className="relative pl-1.5 sm:pl-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="font-mono text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
            {title}
          </p>
          {hasStats ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide",
                MOOD_BADGE[mood],
              )}
            >
              <MoodIcon className="size-3.5 shrink-0" strokeWidth={2.3} />
              {t("scorePercent", { percent })}
            </span>
          ) : null}
        </div>

        {hasStats ? (
          <motion.div
            className="mt-6 flex flex-col items-center gap-7 sm:mt-7 sm:flex-row sm:items-center sm:gap-9 lg:gap-11"
            variants={stagger}
            initial={reduceMotion ? undefined : "hidden"}
            animate={reduceMotion ? undefined : "show"}
          >
            <motion.div variants={item}>
              <ScoreRing
                ratio={ratio}
                mood={mood}
                reduceMotion={Boolean(reduceMotion)}
              >
                <p className="font-heading text-[2.15rem] leading-none font-bold tracking-tight tabular-nums text-ink sm:text-[2.55rem]">
                  {correct}
                  <span className="text-[1.05rem] font-semibold text-muted-foreground sm:text-[1.2rem]">
                    {" "}
                    / {questions}
                  </span>
                </p>
                <p className="mt-1.5 text-[0.8rem] font-medium tracking-wide text-muted-foreground">
                  {t("questionsLabel")}
                </p>
              </ScoreRing>
            </motion.div>

            <div className="min-w-0 flex-1 space-y-5 text-center sm:space-y-5 sm:text-left">
              <motion.div className="space-y-2" variants={item}>
                <p
                  className={cn(
                    "inline-flex items-center justify-center gap-2 font-heading text-[1.35rem] font-semibold tracking-tight sm:justify-start sm:text-[1.55rem]",
                    MOOD_HEADLINE[mood],
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-lg border sm:size-9",
                      MOOD_BADGE[mood],
                    )}
                  >
                    <MoodIcon className="size-[1.125rem]" strokeWidth={2.2} />
                  </span>
                  {t(`result.${mood}.headline`)}
                </p>
                <p className="mx-auto max-w-md text-[0.95rem] leading-relaxed text-muted-foreground sm:mx-0">
                  {t(`result.${mood}.body`)}
                </p>
              </motion.div>

              <motion.dl
                className="grid grid-cols-3 gap-2 sm:gap-2.5"
                variants={stagger}
              >
                <motion.div variants={item}>
                  <Stat
                    label={t("correctLabel")}
                    value={correct!}
                    tone="success"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <Stat
                    label={t("incorrectLabel")}
                    value={derivedIncorrect}
                    tone="error"
                  />
                </motion.div>
                <motion.div variants={item}>
                  <Stat
                    label={t("unansweredLabel")}
                    value={derivedUnanswered}
                    tone="warning"
                  />
                </motion.div>
              </motion.dl>
            </div>
          </motion.div>
        ) : scoreLabel ? (
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            {scoreLabel}
          </p>
        ) : null}

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { delay: 0.35, duration: 0.3, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <Button
            type="button"
            onClick={onTryAgain}
            disabled={extraAction?.loading}
            className="min-w-[9.5rem] shadow-sm shadow-(--exercise-accent)/15"
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
        </motion.div>
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
  const size = 148;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));
  const strokeColor =
    mood === "perfect" || mood === "strong"
      ? "var(--success)"
      : mood === "unanswered"
        ? "var(--warning)"
        : "var(--exercise-accent)";
  const glowClass =
    mood === "perfect" || mood === "strong"
      ? "bg-success/8"
      : mood === "unanswered"
        ? "bg-warning/7"
        : "bg-(--exercise-accent)/8";

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-[12%] rounded-full blur-xl",
          glowClass,
        )}
      />
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
          stroke="color-mix(in oklab, var(--hairline-cloud) 72%, transparent)"
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
              : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
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
        "relative overflow-hidden rounded-xl border px-2.5 py-3.5 sm:px-3.5",
        tone === "success" &&
        "border-success-border/40 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--success)_12%,transparent),color-mix(in_oklab,var(--success-muted)_55%,transparent)_55%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--success)_10%,transparent)]",
        tone === "error" &&
        "border-error-border/40 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--error)_12%,transparent),color-mix(in_oklab,var(--error-muted)_55%,transparent)_55%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--error)_10%,transparent)]",
        tone === "warning" &&
        "border-warning/35 bg-[linear-gradient(165deg,color-mix(in_oklab,var(--warning)_11%,transparent),color-mix(in_oklab,var(--warning)_5%,transparent)_55%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--warning)_10%,transparent)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1 opacity-70",
          tone === "success" && "bg-success",
          tone === "error" && "bg-error",
          tone === "warning" && "bg-warning",
        )}
      />
      <dt
        className={cn(
          "pl-1.5 text-[0.68rem] font-semibold tracking-[0.04em] uppercase",
          tone === "success" && "text-success",
          tone === "error" && "text-error",
          tone === "warning" && "text-warning",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 pl-1.5 font-heading text-[1.65rem] leading-none font-bold tabular-nums sm:text-[1.85rem]",
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
