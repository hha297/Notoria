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
  /** home = dashboard home teal; coach = coach cyan (default) */
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

  const hoverLines = hover
    ? activityLines(hover.activity, (key, values) =>
        t(key as "dayReviews", values),
      )
    : [];

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

  function setDayHover(
    day: (typeof streak.recentDays)[number],
    target: HTMLElement,
  ) {
    const rect = target.getBoundingClientRect();
    setHover({
      ...day,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top,
    });
  }

  return (
    <aside
      className={mx(
        styles,
        "coach-streak",
        variant === "home" && "coach-streak-home",
      )}
      aria-labelledby="coach-streak-heading"
    >
      <div className={mx(styles, "coach-streak-top")}>
        <p
          className={mx(styles, "coach-section-kicker")}
          id="coach-streak-heading"
        >
          {t("label")}
        </p>
        {streak.longest > 0 ? (
          <p className={mx(styles, "coach-streak-best")}>
            {t("best", { count: streak.longest })}
          </p>
        ) : null}
      </div>

      <div className={mx(styles, "coach-streak-body")}>
        <div className={mx(styles, "coach-streak-hero")}>
          <span
            className={mx(
              styles,
              "coach-streak-flame",
              streak.current > 0 && "coach-streak-flame-lit",
            )}
            aria-hidden
          >
            <Flame className="size-5" strokeWidth={2.4} fill="currentColor" />
          </span>
          <div className={mx(styles, "coach-streak-count-wrap")}>
            <p className={mx(styles, "coach-streak-count")}>{streak.current}</p>
            <p className={mx(styles, "coach-streak-unit")}>
              {t("days", { count: streak.current })}
            </p>
          </div>
        </div>

        <ul
          className={mx(styles, "coach-streak-week")}
          aria-label={t("weekLabel")}
        >
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
                onMouseEnter={(event) =>
                  setDayHover(day, event.currentTarget)
                }
                onMouseLeave={() => setHover(null)}
                onFocus={(event) => setDayHover(day, event.currentTarget)}
                onBlur={() => setHover(null)}
              />
              <span className={mx(styles, "coach-streak-day-label")}>
                {weekdayLabel(day.key, locale)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {streak.current === 0 ? (
        <p className={mx(styles, "coach-streak-start")}>{t("start")}</p>
      ) : null}

      {tooltip}
    </aside>
  );
}
