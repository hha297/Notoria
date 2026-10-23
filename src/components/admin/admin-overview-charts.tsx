"use client";

import Link from "next/link";
import styles from "@/components/style/admin/admin.module.css";
import { mx } from "@/lib/css-module";

type SeriesPoint = { day: string; value: number };
type NamedPoint = { key: string; label: string; value: number; href?: string };

type AdminOverviewChartsProps = {
  signups: SeriesPoint[];
  active: SeriesPoint[];
  roles: NamedPoint[];
  content: NamedPoint[];
  labels: {
    signupsTitle: string;
    signupsLede: string;
    activeTitle: string;
    activeLede: string;
    rolesTitle: string;
    rolesLede: string;
    contentTitle: string;
    contentLede: string;
  };
};

function formatShortDay(day: string) {
  const [, , d] = day.split("-");
  return d ?? day.slice(-2);
}

function AreaChart({
  series,
  ariaLabel,
}: {
  series: SeriesPoint[];
  ariaLabel: string;
}) {
  const width = 560;
  const height = 180;
  const padX = 8;
  const padY = 16;
  const max = Math.max(1, ...series.map((point) => point.value));
  const step =
    series.length > 1 ? (width - padX * 2) / (series.length - 1) : width;

  const points = series.map((point, index) => {
    const x = padX + index * step;
    const y =
      height - padY - (point.value / max) * (height - padY * 2);
    return { x, y, ...point };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const area = `${line} L${points.at(-1)?.x ?? padX},${height - padY} L${padX},${height - padY} Z`;

  return (
    <svg
      className={mx(styles, "admin-chart-svg")}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="admin-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--primary)"
            stopOpacity="0.34"
          />
          <stop
            offset="100%"
            stopColor="var(--primary)"
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => {
        const y = padY + (1 - ratio) * (height - padY * 2);
        return (
          <line
            key={ratio}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            className={mx(styles, "admin-chart-grid")}
          />
        );
      })}
      <path d={area} fill="url(#admin-area-fill)" />
      <path d={line} className={mx(styles, "admin-chart-line")} fill="none" />
      {points.map((point) => (
        <circle
          key={point.day}
          cx={point.x}
          cy={point.y}
          r={point.value > 0 ? 3.2 : 2.2}
          className={mx(styles, "admin-chart-dot")}
        >
          <title>
            {point.day}: {point.value}
          </title>
        </circle>
      ))}
    </svg>
  );
}

function SparkBars({
  series,
  ariaLabel,
}: {
  series: SeriesPoint[];
  ariaLabel: string;
}) {
  const max = Math.max(1, ...series.map((point) => point.value));
  return (
    <div className={mx(styles, "admin-spark-bars")} role="img" aria-label={ariaLabel}>
      {series.map((point) => (
        <div key={point.day} className={mx(styles, "admin-spark-col")}>
          <div
            className={mx(styles, "admin-spark-bar")}
            style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
            title={`${point.day}: ${point.value}`}
          />
          <span>{formatShortDay(point.day)}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  items,
  ariaLabel,
}: {
  items: NamedPoint[];
  ariaLabel: string;
}) {
  const total = Math.max(
    1,
    items.reduce((sum, item) => sum + item.value, 0),
  );
  const radius = 54;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={mx(styles, "admin-donut-wrap")}>
      <svg
        className={mx(styles, "admin-donut-svg")}
        viewBox="0 0 140 140"
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          className={mx(styles, "admin-donut-track")}
          strokeWidth={stroke}
          fill="none"
        />
        {items.map((item, index) => {
          const length = (item.value / total) * circumference;
          const circle = (
            <circle
              key={item.key}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              className={mx(styles, `admin-donut-seg-${index % 4}`)}
              transform="rotate(-90 70 70)"
            >
              <title>
                {item.label}: {item.value}
              </title>
            </circle>
          );
          offset += length;
          return circle;
        })}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          className={mx(styles, "admin-donut-total")}
        >
          {items.reduce((sum, item) => sum + item.value, 0)}
        </text>
      </svg>
      <ul className={mx(styles, "admin-donut-legend")}>
        {items.map((item, index) => (
          <li key={item.key}>
            <span className={mx(styles, `admin-donut-swatch-${index % 4}`)} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentBars({ items }: { items: NamedPoint[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className={mx(styles, "admin-content-bars")}>
      {items.map((item) => (
        <li key={item.key}>
          <div className={mx(styles, "admin-content-bar-meta")}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
            <strong>{item.value.toLocaleString()}</strong>
          </div>
          <div className={mx(styles, "admin-content-bar-track")}>
            <div
              className={mx(styles, "admin-content-bar-fill")}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminOverviewCharts({
  signups,
  active,
  roles,
  content,
  labels,
}: AdminOverviewChartsProps) {
  return (
    <div className={mx(styles, "admin-dash-grid")}>
      <section className={mx(styles, "admin-dash-card", "is-wide")}>
        <div className={mx(styles, "admin-dash-card-head")}>
          <div>
            <h2 className={mx(styles, "admin-panel-title")}>
              {labels.signupsTitle}
            </h2>
            <p className={mx(styles, "admin-panel-lede")}>
              {labels.signupsLede}
            </p>
          </div>
        </div>
        <AreaChart series={signups} ariaLabel={labels.signupsTitle} />
      </section>

      <section className={mx(styles, "admin-dash-card")}>
        <div className={mx(styles, "admin-dash-card-head")}>
          <div>
            <h2 className={mx(styles, "admin-panel-title")}>
              {labels.activeTitle}
            </h2>
            <p className={mx(styles, "admin-panel-lede")}>{labels.activeLede}</p>
          </div>
        </div>
        <SparkBars series={active} ariaLabel={labels.activeTitle} />
      </section>

      <section className={mx(styles, "admin-dash-card")}>
        <div className={mx(styles, "admin-dash-card-head")}>
          <div>
            <h2 className={mx(styles, "admin-panel-title")}>
              {labels.rolesTitle}
            </h2>
            <p className={mx(styles, "admin-panel-lede")}>{labels.rolesLede}</p>
          </div>
        </div>
        <DonutChart items={roles} ariaLabel={labels.rolesTitle} />
      </section>

      <section className={mx(styles, "admin-dash-card", "is-wide")}>
        <div className={mx(styles, "admin-dash-card-head")}>
          <div>
            <h2 className={mx(styles, "admin-panel-title")}>
              {labels.contentTitle}
            </h2>
            <p className={mx(styles, "admin-panel-lede")}>
              {labels.contentLede}
            </p>
          </div>
        </div>
        <ContentBars items={content} />
      </section>
    </div>
  );
}
