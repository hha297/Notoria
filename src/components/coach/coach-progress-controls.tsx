"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "@/components/style/coach/coach.module.css";
import {
  COACH_PROGRESS_PERIODS,
  type CoachProgressMetricId,
  type CoachProgressPeriod,
} from "@/lib/billing/coach-progress";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type CoachProgressControlsProps = {
  periodDays: CoachProgressPeriod;
  metric: CoachProgressMetricId;
};

export function CoachProgressControls({
  periodDays,
  metric,
}: CoachProgressControlsProps) {
  const t = useTranslations("coach.progress");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function navigate(next: {
    period?: CoachProgressPeriod;
    metric?: CoachProgressMetricId;
  }) {
    const nextPeriod = next.period ?? periodDays;
    const nextMetric = next.metric ?? metric;
    if (nextPeriod === periodDays && nextMetric === metric) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", String(nextPeriod));
    params.set("metric", nextMetric);
    // Don't re-trigger seeded ask when only changing progress filters.
    params.delete("ask");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        mx(styles, "coach-progress-controls"),
        pending && mx(styles, "is-pending"),
      )}
      data-pending={pending ? "true" : undefined}
    >
      <div
        className={mx(styles, "coach-segment")}
        role="group"
        aria-label={t("periodLabel")}
      >
        {COACH_PROGRESS_PERIODS.map((days) => (
          <button
            key={days}
            type="button"
            className={cn(
              mx(styles, "coach-segment-btn"),
              periodDays === days && mx(styles, "is-active"),
            )}
            aria-pressed={periodDays === days}
            disabled={pending && periodDays !== days}
            onClick={() => navigate({ period: days })}
          >
            {t(`period.${days}`)}
          </button>
        ))}
      </div>
      <div
        className={mx(styles, "coach-segment")}
        role="group"
        aria-label={t("metricLabel")}
      >
        {(
          [
            "flashcardReviews",
            "againOrHard",
            "speakingSessions",
          ] as const
        ).map((id) => (
          <button
            key={id}
            type="button"
            className={cn(
              mx(styles, "coach-segment-btn"),
              metric === id && mx(styles, "is-active"),
            )}
            aria-pressed={metric === id}
            disabled={pending && metric !== id}
            onClick={() => navigate({ metric: id })}
          >
            {t(`metrics.${id}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
