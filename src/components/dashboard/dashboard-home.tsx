"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Dumbbell,
  Headphones,
  History,
  Inbox,
  Languages,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardContinue } from "@/components/dashboard/dashboard-continue";
import {
  DashboardGuide,
  suggestedModule,
} from "@/components/dashboard/dashboard-guide";
import { CoachStreakCard } from "@/components/coach/coach-streak-card";
import { LinkButton } from "@/components/ui/link-button";
import homeStyles from "@/components/style/dashboard/home.module.css";
import { mx } from "@/lib/css-module";
import type { CoachLearningStreak } from "@/lib/billing/coach-progress";
import type { DashboardContinueItem } from "@/lib/dashboard/activity";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";

type ReviewLaterHomeItem = {
  id: string;
  title: string;
  href: string;
  entityType: string;
};

type ActivityHomeItem = {
  id: string;
  verb: string;
  entityType: string;
  title: string | null;
  href: string | null;
  createdAt: string;
};

type LearningNoteHomeItem = {
  id: string;
  title: string;
  href: string;
};

type DashboardHomeProps = {
  userName: string;
  snapshot: WorkspaceActivitySnapshot;
  practiceReadyCount: number;
  continueItems: DashboardContinueItem[];
  streak: CoachLearningStreak | null;
  inboxUnprocessedCount: number;
  reviewLaterItems: ReviewLaterHomeItem[];
  recentActivity: ActivityHomeItem[];
  latestLearningNote: LearningNoteHomeItem | null;
};

type HubModule = {
  id: "vocabulary" | "exercises" | "writing" | "theory" | "listening" | "speaking";
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
  {
    id: "listening",
    href: "/listening",
    icon: Headphones,
    accent: "listen",
  },
  {
    id: "speaking",
    href: "/speaking",
    icon: Video,
    accent: "speak",
  },
];

const LOOP_STEPS = ["collect", "practice", "use"] as const;

const ENTITY_ACCENT: Record<string, string> = {
  vocabulary: "vocab",
  theory: "theory",
  writing: "writing",
  exercise: "exercise",
  listening: "listen",
  speaking: "speak",
  inbox: "home",
};

export function DashboardHome({
  userName,
  snapshot,
  practiceReadyCount,
  continueItems,
  streak,
  inboxUnprocessedCount,
  reviewLaterItems,
  recentActivity,
  latestLearningNote,
}: DashboardHomeProps) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
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

  function entityLabel(entityType: string) {
    if (
      entityType === "vocabulary" ||
      entityType === "theory" ||
      entityType === "writing" ||
      entityType === "listening" ||
      entityType === "speaking" ||
      entityType === "inbox"
    ) {
      return tNav(entityType);
    }
    if (entityType === "exercise") return tNav("exercises");
    return entityType;
  }

  function activityVerbLabel(verb: string) {
    const verbKey = [
      "created",
      "updated",
      "completed",
      "processed",
      "review_later_added",
      "review_later_removed",
    ].includes(verb)
      ? verb
      : "created";
    return t(`recentActivity.verbLabels.${verbKey}`);
  }

  function activityTitle(item: ActivityHomeItem) {
    return item.title?.trim() || t("recentActivity.untitled");
  }

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
        <div className={mx(homeStyles, "home-hero-side")}>
          {streak ? (
            <div className={mx(homeStyles, "home-streak")}>
              <CoachStreakCard streak={streak} variant="home" />
            </div>
          ) : null}
          <div className="writing-hero-actions">
            <LinkButton href="/exercises">
              <Dumbbell className="size-4" />
              {t("practiceNowCta")}
              <ArrowRight className="size-4" />
            </LinkButton>
          </div>
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

      <DashboardContinue items={continueItems} />

      <section className={mx(homeStyles, "home-capture-grid")}>
        <div className={mx(homeStyles, "home-capture-card")} data-home-accent="home">
          <div className={mx(homeStyles, "home-capture-head")}>
            <span className={mx(homeStyles, "home-hub-icon")} aria-hidden>
              <Inbox className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={mx(homeStyles, "writing-kicker home-kicker")}>
                {t("inbox.title")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("inbox.subtitle")}
              </p>
            </div>
          </div>
          <p className={mx(homeStyles, "home-capture-count")}>
            {t("inbox.count", { count: inboxUnprocessedCount })}
          </p>
          <Link
            href="/inbox"
            className={mx(
              homeStyles,
              "home-hub-cta mt-3 inline-flex items-center gap-1 text-sm font-semibold",
            )}
          >
            {t("inbox.cta")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div className={mx(homeStyles, "home-capture-card")} data-home-accent="theory">
          <div className={mx(homeStyles, "home-capture-head")}>
            <span className={mx(homeStyles, "home-hub-icon")} aria-hidden>
              <Bookmark className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={mx(homeStyles, "writing-kicker home-kicker")}>
                {t("reviewLater.title")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("reviewLater.subtitle")}
              </p>
            </div>
          </div>
          {reviewLaterItems.length > 0 ? (
            <ul className={mx(homeStyles, "home-capture-list")}>
              {reviewLaterItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    data-home-accent={ENTITY_ACCENT[item.entityType] ?? "home"}
                    className={mx(homeStyles, "home-capture-row")}
                  >
                    <span className={mx(homeStyles, "home-continue-module")}>
                      {entityLabel(item.entityType)}
                    </span>
                    <span className={mx(homeStyles, "home-continue-title")}>
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={mx(homeStyles, "home-continue-empty")}>
              {t("reviewLater.empty")}
            </p>
          )}
        </div>

        <div
          className={mx(homeStyles, "home-capture-card home-activity-card")}
          data-home-accent="home"
        >
          <div className={mx(homeStyles, "home-capture-head")}>
            <span className={mx(homeStyles, "home-hub-icon")} aria-hidden>
              <History className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={mx(homeStyles, "writing-kicker home-kicker")}>
                {t("recentActivity.title")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("recentActivity.subtitle")}
              </p>
            </div>
          </div>
          {recentActivity.length > 0 ? (
            <ul className={mx(homeStyles, "home-activity-list")}>
              {recentActivity.map((item) => {
                const accent = ENTITY_ACCENT[item.entityType] ?? "home";
                const body = (
                  <>
                    <div className={mx(homeStyles, "home-activity-top")}>
                      <span className={mx(homeStyles, "home-activity-verb")}>
                        {activityVerbLabel(item.verb)}
                      </span>
                      <time
                        className={mx(homeStyles, "home-activity-time")}
                        dateTime={item.createdAt}
                      >
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </div>
                    <p className={mx(homeStyles, "home-activity-title")}>
                      {activityTitle(item)}
                    </p>
                    <span className={mx(homeStyles, "home-activity-entity")}>
                      {entityLabel(item.entityType)}
                    </span>
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        data-home-accent={accent}
                        className={mx(homeStyles, "home-activity-row")}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div
                        data-home-accent={accent}
                        className={mx(homeStyles, "home-activity-row is-static")}
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={mx(homeStyles, "home-continue-empty")}>
              {t("recentActivity.empty")}
            </p>
          )}
          {latestLearningNote ? (
            <Link
              href={latestLearningNote.href}
              className={mx(homeStyles, "home-learning-note")}
            >
              <span className={mx(homeStyles, "home-continue-module")}>
                {t("learningNote.label")}
              </span>
              <span className={mx(homeStyles, "home-continue-title")}>
                {latestLearningNote.title}
              </span>
            </Link>
          ) : null}
        </div>
      </section>

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

      <section className={mx(homeStyles, "home-loop")}>
        <p className={mx(homeStyles, "writing-kicker home-kicker")}>
          {t("loopEyebrow")}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
          {t("loopTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/80">
          {t("loopSubtitle")}
        </p>
        <ol className={mx(homeStyles, "home-loop-steps")}>
          {LOOP_STEPS.map((step, index) => (
            <li key={step} className={mx(homeStyles, "home-loop-step")}>
              <span className={mx(homeStyles, "home-loop-index")} aria-hidden>
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-heading text-base font-bold text-ink">
                  {t(`loop.${step}.title`)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(`loop.${step}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <DashboardGuide />
    </div>
  );
}
