"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  filterQuestionIdsForReview,
  type ExerciseReviewFilter,
} from "@/lib/exercises/set-review";
import type { SetQuestionResult } from "@/lib/exercises/set-attempt";
import { scrollToExerciseQuestion } from "@/lib/exercises/scroll-set";
import { cn } from "@/lib/utils";

type ExerciseSetReviewNavProps = {
  questionIds: readonly string[];
  results: Readonly<Record<string, SetQuestionResult>>;
  /** Build DOM id for a question, e.g. (id) => `mc-q-${id}`. */
  questionDomId: (questionId: string) => string;
  filter: ExerciseReviewFilter;
  onFilterChange: (filter: ExerciseReviewFilter) => void;
  focusedId: string | null;
  onFocusedIdChange: (id: string | null) => void;
  className?: string;
};

/**
 * Floating prev/next for wrong & unanswered after “View wrong answers”.
 * The old full Review panel (filters + summary) is intentionally gone.
 */
export function ExerciseSetReviewNav({
  questionIds,
  results,
  questionDomId,
  filter,
  onFilterChange,
  focusedId,
  onFocusedIdChange,
  className,
}: ExerciseSetReviewNavProps) {
  const t = useTranslations("exercises.session.review");
  const needsReviewIds = useMemo(
    () => filterQuestionIdsForReview(questionIds, results, "needs_review"),
    [questionIds, results],
  );

  const focusIndex = focusedId ? needsReviewIds.indexOf(focusedId) : -1;
  const open = filter === "needs_review" && needsReviewIds.length > 0;

  const jumpTo = (id: string) => {
    onFocusedIdChange(id);
    onFilterChange("needs_review");
    scrollToExerciseQuestion(questionDomId(id));
  };

  const goNeedsReview = (delta: number) => {
    if (needsReviewIds.length === 0) return;
    const base = focusIndex >= 0 ? focusIndex : delta > 0 ? -1 : 0;
    const next =
      (base + delta + needsReviewIds.length * 10) % needsReviewIds.length;
    const id = needsReviewIds[next];
    if (id) jumpTo(id);
  };

  const closeReview = () => {
    onFilterChange("all");
    onFocusedIdChange(null);
  };

  useEffect(() => {
    if (!focusedId) return;
    const el = document.getElementById(questionDomId(focusedId));
    if (!el) return;
    el.setAttribute("data-review-focus", "true");
    return () => {
      el.removeAttribute("data-review-focus");
    };
  }, [focusedId, questionDomId]);

  if (!open) return null;

  return (
    <div
      role="navigation"
      aria-label={t("floatLabel")}
      data-scroll-top-clearance=""
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[min(100%,22rem)] items-center gap-1 rounded-xl border border-(--exercise-accent)/30",
          "bg-[color-mix(in_oklab,var(--exercise-accent-soft)_55%,var(--surface)_45%)]",
          "px-1.5 py-1.5 shadow-lg shadow-ink/10 backdrop-blur-md",
          "dark:bg-[color-mix(in_oklab,var(--exercise-accent-soft)_42%,var(--surface)_58%)]",
          "dark:shadow-ink/40",
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 gap-1 px-2.5 text-ink hover:bg-(--exercise-accent)/12"
          disabled={needsReviewIds.length === 0}
          onClick={() => goNeedsReview(-1)}
        >
          <ChevronUp className="size-4 shrink-0" />
          <span className="max-sm:sr-only">{t("prevWrong")}</span>
        </Button>

        <p className="min-w-[3.75rem] px-1 text-center text-[0.7rem] font-semibold tabular-nums tracking-wide text-(--exercise-accent)">
          {t("wrongPosition", {
            current: focusIndex >= 0 ? focusIndex + 1 : 0,
            total: needsReviewIds.length,
          })}
        </p>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 gap-1 px-2.5 text-ink hover:bg-(--exercise-accent)/12"
          disabled={needsReviewIds.length === 0}
          onClick={() => goNeedsReview(1)}
        >
          <span className="max-sm:sr-only">{t("nextWrong")}</span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>

        <span
          aria-hidden
          className="mx-0.5 h-5 w-px shrink-0 bg-(--exercise-accent)/25"
        />

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground hover:bg-(--exercise-accent)/12 hover:text-ink"
          aria-label={t("closeFloat")}
          onClick={closeReview}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Highlight styles for the focused review question (accent ring, no blink). */
export function exerciseReviewFocusClass(isFocused: boolean): string {
  return isFocused
    ? "ring-2 ring-(--exercise-accent)/55 ring-offset-2 ring-offset-surface"
    : "";
}

export function useExerciseReviewState() {
  const [filter, setFilter] = useState<ExerciseReviewFilter>("all");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const resetReview = useCallback(() => {
    setFilter("all");
    setFocusedId(null);
  }, []);

  return {
    filter,
    setFilter,
    focusedId,
    setFocusedId,
    resetReview,
  };
}
