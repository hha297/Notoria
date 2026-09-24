"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import styles from "@/components/style/coach/coach.module.css";
import type {
  CoachLearningStreak,
  CoachStreakDayActivity,
} from "@/lib/billing/coach-progress";
import { mx } from "@/lib/css-module";

type CoachStreakCardProps = {
  streak: CoachLearningStreak;
  /** home = dashboard teal; coach = accent lime (default) */
  variant?: "coach" | "home";
};

type HoverDay = {
  key: string;
  active: boolean;
  activity: CoachStreakDayActivity;
  clientX: number;
  clientY: number;
};

function weekdayLabel(key: string, locale: string) {
  return new Date(`${key}T12:00:00.000Z`).toLocaleDateString(locale, {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

function formatDayDate(key: string, locale: string) {
  return new Date(`${key}T12:00:00.000Z`).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function activityLines(
  activity: CoachStreakDayActivity,
  t: (key: string, values?: { count: number }) => string,
) {
  const lines: string[] = [];
  if (activity.flashcardReviews > 0) {
    lines.push(t("dayReviews", { count: activity.flashcardReviews }));
  }
  if (activity.speakingSessions > 0) {
    lines.push(t("daySpeaking", { count: activity.speakingSessions }));
  }
  if (activity.listeningLessons > 0) {
    lines.push(t("dayListening", { count: activity.listeningLessons }));
  }
  if (activity.writingDocuments > 0) {
    lines.push(t("dayWriting", { count: activity.writingDocuments }));
  }
  if (activity.theoryNotes > 0) {
    lines.push(t("dayTheory", { count: activity.theoryNotes }));
  }
  return lines;
}

export function CoachStreakCard({
  streak,
  variant = "coach",
}: CoachStreakCardProps) {
  const t = useTranslations("coach.progress.streak");
  const locale = useLocale();
  const tooltipId = useId();
  const [hover, setHover] = useState<HoverDay | null>(null);

  const hoverLines = hover ? activityLines(hover.activity, (key, values) =>
    t(key as "dayReviews", values),
  ) : [];

  const tooltip =
    hover && typeof document !== "undefined"
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={mx(
              styles,
              "coach-streak-tooltip",
              variant === "home" && "coach-streak-tooltip-home",
            )}
            style={{ left: hover.clientX, top: hover.clientY }}
          >
            <p className={mx(styles, "coach-streak-tooltip-date")}>
              {formatDayDate(hover.key, locale)}
            </p>
            {hover.active ? (
              hoverLines.length > 0 ? (
                <ul className={mx(styles, "coach-streak-tooltip-list")}>
                  {hoverLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className={mx(styles, "coach-streak-tooltip-empty")}>
                  {t("dayActive")}
                </p>
              )
            ) : (
              <p className={mx(styles, "coach-streak-tooltip-empty")}>
                {t("dayEmpty")}
              </p>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <aside
      className={mx(
        styles,
        "coach-streak",
        variant === "home" && "coach-streak-home",
      )}
      aria-labelledby="coach-streak-heading"
    >
      <p className={mx(styles, "coach-section-kicker")} id="coach-streak-heading">
        {t("label")}
      </p>

      <div className={mx(styles, "coach-streak-hero")}>
        <span
          className={mx(
            styles,
            "coach-streak-flame",
            streak.current > 0 && "coach-streak-flame-lit",
          )}
          aria-hidden
        >
          <Flame className="size-7" strokeWidth={2.25} />
        </span>
        <div className={mx(styles, "coach-streak-count-wrap")}>
          <p className={mx(styles, "coach-streak-count")}>{streak.current}</p>
          <p className={mx(styles, "coach-streak-unit")}>
            {t("days", { count: streak.current })}
          </p>
        </div>
      </div>

      <p className={mx(styles, "coach-streak-status")}>
        {streak.current === 0
          ? t("start")
          : streak.practicedToday
            ? t("practicedToday")
            : t("keepGoing")}
      </p>

      <ul className={mx(styles, "coach-streak-week")} aria-label={t("weekLabel")}>
        {streak.recentDays.map((day) => (
          <li key={day.key} className={mx(styles, "coach-streak-day")}>
            <button
              type="button"
              className={mx(
                styles,
                "coach-streak-dot",
                day.active && "coach-streak-dot-active",
              )}
              aria-label={formatDayDate(day.key, locale)}
              aria-describedby={
                hover?.key === day.key ? tooltipId : undefined
              }
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setHover({
                  ...day,
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
              onFocus={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setHover({
                  ...day,
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top,
                });
              }}
              onBlur={() => setHover(null)}
            />
            <span className={mx(styles, "coach-streak-day-label")}>
              {weekdayLabel(day.key, locale)}
            </span>
          </li>
        ))}
      </ul>

      {streak.longest > 0 ? (
        <p className={mx(styles, "coach-streak-best")}>
          {t("best", { count: streak.longest })}
        </p>
      ) : null}
      {tooltip}
    </aside>
  );
}
