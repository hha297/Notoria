"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  Languages,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DashboardGuide,
  suggestedModule,
} from "@/components/dashboard/dashboard-guide";
import { LinkButton } from "@/components/ui/link-button";
import homeStyles from "@/components/style/dashboard/home.module.css";
import { mx } from "@/lib/css-module";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";

type DashboardHomeProps = {
  userName: string;
  snapshot: WorkspaceActivitySnapshot;
  practiceReadyCount: number;
};

type HubModule = {
  id: "vocabulary" | "exercises" | "writing" | "theory";
  href: string;
  icon: LucideIcon;
  accent: string;
};

const HUB_MODULES: HubModule[] = [
  {
    id: "vocabulary",
    href: "/vocabulary",
    icon: Languages,
    accent: "vocab",
  },
  {
    id: "exercises",
    href: "/exercises",
    icon: Dumbbell,
    accent: "exercise",
  },
  {
    id: "writing",
    href: "/writing",
    icon: PenLine,
    accent: "writing",
  },
  {
    id: "theory",
    href: "/theory",
    icon: BookOpen,
    accent: "theory",
  },
];

export function DashboardHome({
  userName,
  snapshot,
  practiceReadyCount,
}: DashboardHomeProps) {
  const t = useTranslations("dashboard");
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const next = suggestedModule(snapshot, practiceReadyCount);

  const stats = [
    {
      label: t("wordsSaved"),
      value: snapshot.vocabularyCount,
      accent: "vocab",
    },
    {
      label: t("wordsReadyToPractice"),
      value: practiceReadyCount,
      accent: "exercise",
    },
    {
      label: t("theoryNotes"),
      value: snapshot.theoryCount,
      accent: "theory",
    },
    {
      label: t("writingPieces"),
      value: snapshot.writingCount,
      accent: "writing",
    },
  ];

  const quickActions = [
    { href: "/vocabulary/new", label: t("quickAddWord"), accent: "vocab" },
    { href: "/exercises", label: t("quickStartExercise"), accent: "exercise" },
    { href: "/writing", label: t("quickOpenWriting"), accent: "writing" },
    { href: "/theory", label: t("quickOpenTheory"), accent: "theory" },
  ];

  return (
    <div className={mx(homeStyles, "home-atelier flex flex-col gap-10 lg:gap-12")}>
      <header className="writing-hero">
        <div className="writing-hero-copy">
          <p className={mx(homeStyles, "writing-kicker home-kicker")}>
            {t("practiceNowEyebrow")}
          </p>
          <h1 className="writing-brand-title">
            {t("helloTitle", { name: firstName })}
          </h1>
          <p className="writing-brand-lede">{t("description")}</p>
          <ul
            className={mx(homeStyles, "home-canopy mt-6")}
            aria-label={t("snapshotTitle")}
          >
            {stats.map((stat) => (
              <li
                key={stat.label}
                data-home-accent={stat.accent}
                className={mx(homeStyles, "home-canopy-item")}
              >
                <span className={mx(homeStyles, "home-canopy-value")}>
                  {stat.value}
                </span>
                <span className={mx(homeStyles, "home-canopy-label")}>
                  {stat.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="writing-hero-actions">
          <LinkButton href="/exercises">
            <Dumbbell className="size-4" />
            {t("practiceNowCta")}
            <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </header>

      <section className={mx(homeStyles, "writing-workspace home-workspace")}>
        <div className={mx(homeStyles, "home-next")}>
          <div className="min-w-0">
            <p className={mx(homeStyles, "writing-kicker home-kicker")}>
              {t("nextStepTitle")}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/80">
              {t(`modules.${next.id}.how`)}
            </p>
          </div>
          <Link
            href={next.href}
            className={mx(
              homeStyles,
              "home-next-link inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold",
            )}
          >
            {t(`modules.${next.id}.cta`)}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div
          className={mx(homeStyles, "home-quick")}
          aria-label={t("quickActions")}
        >
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              data-home-accent={action.accent}
              className={mx(homeStyles, "home-quick-chip")}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <div
        className={mx(homeStyles, "home-atelier-rule shrink-0")}
        aria-hidden="true"
      />

      <section className="writing-stage">
        <p className={mx(homeStyles, "writing-kicker home-kicker writing-stage-kicker")}>
          {t("continueLearning")}
        </p>
        <p className="mb-5 max-w-xl text-sm text-muted-foreground">
          {t("continueLearningSubtitle")}
        </p>
        <div className={mx(homeStyles, "home-hub-grid")}>
          {HUB_MODULES.map((module) => {
            const Icon = module.icon;

            return (
              <article
                key={module.id}
                data-home-accent={module.accent}
                className={mx(homeStyles, "home-hub-card")}
              >
                <span className={mx(homeStyles, "home-hub-icon")} aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
                    {t(`modules.${module.id}.title`)}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(`modules.${module.id}.description`)}
                  </p>
                  <Link
                    href={module.href}
                    className={mx(
                      homeStyles,
                      "home-hub-cta mt-3 inline-flex items-center gap-1 text-sm font-semibold",
                    )}
                  >
                    {t(`modules.${module.id}.cta`)}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <DashboardGuide />
    </div>
  );
}
