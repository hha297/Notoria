"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  filterQuestionIdsForReview,
  reviewCounts,
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

const FILTERS: ExerciseReviewFilter[] = ["all", "needs_review", "correct"];

/**
 * Post-submit review chrome: filters, jump to wrong, prev/next among
 * needs-review items. Does not re-grade or mutate answers.
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
  const tSession = useTranslations("exercises.session");
  const counts = useMemo(
    () => reviewCounts(questionIds, results),
    [questionIds, results],
  );
  const needsReviewIds = useMemo(
    () => filterQuestionIdsForReview(questionIds, results, "needs_review"),
    [questionIds, results],
  );

  const focusIndex = focusedId ? needsReviewIds.indexOf(focusedId) : -1;

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

  useEffect(() => {
    if (!focusedId) return;
    const el = document.getElementById(questionDomId(focusedId));
    if (!el) return;
    el.setAttribute("data-review-focus", "true");
    return () => {
      el.removeAttribute("data-review-focus");
    };
  }, [focusedId, questionDomId]);

  if (questionIds.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-(--exercise-accent)/25 bg-(--exercise-accent-soft)/35 p-3 sm:p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-(--exercise-accent) uppercase">
          {t("title")}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          {counts.needsReview === 0 ? (
            <span className="font-medium text-success">{t("allCorrect")}</span>
          ) : (
            <>
              <span className="font-semibold text-error tabular-nums">
                {counts.incorrect} {tSession("incorrectLabel").toLowerCase()}
              </span>
              <span className="text-muted-foreground/45" aria-hidden>
                ·
              </span>
              <span className="font-semibold text-warning tabular-nums">
                {counts.unanswered} {tSession("unansweredLabel").toLowerCase()}
              </span>
              <span className="text-muted-foreground/45" aria-hidden>
                ·
              </span>
              <span className="text-muted-foreground tabular-nums">
                {t("toReviewCount", { count: counts.needsReview })}
              </span>
            </>
          )}
        </p>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label={t("filtersLabel")}
      >
        {FILTERS.map((key) => {
          const count =
            key === "all"
              ? counts.all
              : key === "needs_review"
                ? counts.needsReview
                : counts.correct;
          const selected = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onFilterChange(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors",
                selected
                  ? "border-(--exercise-accent) bg-(--exercise-accent) text-background"
                  : "border-hairline-cloud bg-surface text-ink hover:border-(--exercise-accent)/40",
              )}
            >
              {t(`filter.${key}`, { count })}
            </button>
          );
        })}
      </div>

      {counts.needsReview > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={needsReviewIds.length === 0}
            onClick={() => goNeedsReview(-1)}
          >
            <ChevronUp className="size-4" />
            {t("prevWrong")}
          </Button>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t("wrongPosition", {
              current: focusIndex >= 0 ? focusIndex + 1 : 0,
              total: needsReviewIds.length,
            })}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={needsReviewIds.length === 0}
            onClick={() => goNeedsReview(1)}
          >
            {t("nextWrong")}
            <ChevronDown className="size-4" />
          </Button>
        </div>
      ) : null}
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
