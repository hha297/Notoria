"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import styles from "@/components/style/coach/coach.module.css";
import type {
  CoachProgressMetricId,
  CoachProgressPoint,
} from "@/lib/billing/coach-progress";
import { mx } from "@/lib/css-module";

type CoachProgressChartProps = {
  points: CoachProgressPoint[];
  metric: CoachProgressMetricId;
  label: string;
  description: string;
};

type HoverState = {
  clientX: number;
  clientY: number;
  point: CoachProgressPoint;
};

function formatChartDate(iso: string, locale: string, week: boolean) {
  const date = new Date(iso);
  if (week) {
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatChartTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CoachProgressChart({
  points,
  metric,
  label,
  description,
}: CoachProgressChartProps) {
  const t = useTranslations("coach.progress.tooltip");
  const locale = useLocale();
  const tooltipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 560;
  const height = 180;
  const padX = 28;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padX + innerW / 2
        : padX + (index / (points.length - 1)) * innerW;
    const y = padY + innerH - (point.value / max) * innerH;
    return { x, y, point };
  });

  const line = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const summaryKey =
    metric === "flashcardReviews"
      ? "reviews"
      : metric === "againOrHard"
        ? "againOrHard"
        : "speaking";

  const samplesLabelKey =
    metric === "speakingSessions" ? "topics" : "words";

  function showPoint(coord: (typeof coords)[number]) {
    const svg = svgRef.current;
    if (!svg) {
      setHover({
        clientX: 0,
        clientY: 0,
        point: coord.point,
      });
      return;
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    setHover({
      clientX: rect.left + coord.x * scaleX,
      clientY: rect.top + coord.y * scaleY,
      point: coord.point,
    });
  }

  const tooltip =
    hover && typeof document !== "undefined"
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={mx(styles, "coach-chart-tooltip")}
            style={{
              left: hover.clientX,
              top: hover.clientY,
            }}
          >
            <p className={mx(styles, "coach-chart-tooltip-date")}>
              {hover.point.bucketKind === "week"
                ? t("weekOf", {
                    date: formatChartDate(
                      hover.point.bucketStart,
                      locale,
                      true,
                    ),
                  })
                : formatChartDate(hover.point.bucketStart, locale, false)}
            </p>
            {hover.point.bucketKind === "day" && hover.point.firstAt ? (
              <p className={mx(styles, "coach-chart-tooltip-time")}>
                {t("firstAt", {
                  time: formatChartTime(hover.point.firstAt, locale),
                })}
              </p>
            ) : null}
            <p className={mx(styles, "coach-chart-tooltip-summary")}>
              {hover.point.value > 0
                ? t(summaryKey, { count: hover.point.value })
                : t("none")}
            </p>
            {hover.point.samples && hover.point.samples.length > 0 ? (
              <p className={mx(styles, "coach-chart-tooltip-samples")}>
                {t(samplesLabelKey, {
                  list: hover.point.samples.join(" · "),
                })}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <figure className={mx(styles, "coach-chart")}>
      <figcaption className={mx(styles, "coach-chart-caption")}>
        <span className={mx(styles, "coach-chart-title")}>{label}</span>
        <span className="sr-only">{description}</span>
      </figcaption>
      <div className={mx(styles, "coach-chart-frame")}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={mx(styles, "coach-chart-svg")}
          role="img"
          aria-label={description}
        >
          <line
            x1={padX}
            y1={padY + innerH}
            x2={padX + innerW}
            y2={padY + innerH}
            className={mx(styles, "coach-chart-axis")}
          />
          {coords.length > 1 ? (
            <path
              d={line}
              className={mx(styles, "coach-chart-line")}
              fill="none"
            />
          ) : null}
          {coords.map((coord) => {
            const active =
              hover?.point.bucketStart === coord.point.bucketStart;
            return (
              <g key={coord.point.bucketStart}>
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={14}
                  className={mx(styles, "coach-chart-hit")}
                  onMouseEnter={() => showPoint(coord)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => showPoint(coord)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  role="button"
                  aria-describedby={active ? tooltipId : undefined}
                  aria-label={`${coord.point.label}: ${coord.point.value}`}
                />
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={active ? 5 : 3.5}
                  className={mx(
                    styles,
                    "coach-chart-dot",
                    active && "coach-chart-dot-active",
                  )}
                  pointerEvents="none"
                />
              </g>
            );
          })}
          {coords.map((coord, index) =>
            index === 0 ||
            index === coords.length - 1 ||
            coords.length <= 5 ? (
              <text
                key={`label-${coord.point.bucketStart}`}
                x={coord.x}
                y={height - 4}
                textAnchor="middle"
                className={mx(styles, "coach-chart-tick")}
              >
                {coord.point.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      {tooltip}
    </figure>
  );
}
