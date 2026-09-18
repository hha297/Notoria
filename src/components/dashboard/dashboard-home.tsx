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
import { DashboardGuide, suggestedModule } from "@/components/dashboard/dashboard-guide";
import { LinkButton } from "@/components/ui/link-button";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";
import { cn } from "@/lib/utils";

type DashboardHomeProps = {
  userName: string;
  languageName: string;
  snapshot: WorkspaceActivitySnapshot;
  practiceReadyCount: number;
};

type HubModule = {
  id: "vocabulary" | "exercises" | "writing" | "theory";
  href: string;
  icon: LucideIcon;
  countKey: "wordsSaved" | "wordsReadyToPractice" | "writingPieces" | "theoryNotes";
  well: string;
};

const HUB_MODULES: HubModule[] = [
  {
    id: "vocabulary",
    href: "/vocabulary",
    icon: Languages,
    countKey: "wordsSaved",
    well: "bg-module-vocab-bg text-module-vocab-fg",
  },
  {
    id: "exercises",
    href: "/exercises",
    icon: Dumbbell,
    countKey: "wordsReadyToPractice",
    well: "bg-module-exercise-bg text-module-exercise-fg",
  },
  {
    id: "writing",
    href: "/writing",
    icon: PenLine,
    countKey: "writingPieces",
    well: "bg-module-writing-bg text-module-writing-fg",
  },
  {
    id: "theory",
    href: "/theory",
    icon: BookOpen,
    countKey: "theoryNotes",
    well: "bg-module-theory-bg text-module-theory-fg",
  },
];

function moduleCount(
  module: HubModule,
  snapshot: WorkspaceActivitySnapshot,
  practiceReadyCount: number,
) {
  if (module.id === "vocabulary") return snapshot.vocabularyCount;
  if (module.id === "exercises") return practiceReadyCount;
  if (module.id === "writing") return snapshot.writingCount;
  return snapshot.theoryCount;
}

export function DashboardHome({
  userName,
  languageName,
  snapshot,
  practiceReadyCount,
}: DashboardHomeProps) {
  const t = useTranslations("dashboard");
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const next = suggestedModule(snapshot, practiceReadyCount);

  const stats = [
    { label: t("wordsSaved"), value: snapshot.vocabularyCount },
    { label: t("wordsReadyToPractice"), value: practiceReadyCount },
    { label: t("theoryNotes"), value: snapshot.theoryCount },
    { label: t("writingPieces"), value: snapshot.writingCount },
  ];

  const quickActions = [
    { href: "/vocabulary/new", label: t("quickAddWord") },
    { href: "/exercises", label: t("quickStartExercise") },
    { href: "/writing", label: t("quickOpenWriting") },
    { href: "/theory", label: t("quickOpenTheory") },
  ];

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18.75rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl bg-surface-active px-5 py-6 sm:px-6 sm:py-7">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">
              {t("practiceNowEyebrow")}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-ink sm:text-[2.5rem] sm:leading-tight">
              {t("helloTitle", { name: firstName })}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink/80">
              {t("description", { language: languageName })}
            </p>
            <LinkButton href="/exercises" className="mt-5">
              <Dumbbell />
              {t("practiceNowCta")}
              <ArrowRight />
            </LinkButton>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold tracking-tight text-ink sm:text-xl">
              {t("continueLearning")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("continueLearningSubtitle")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {HUB_MODULES.map((module) => {
                const Icon = module.icon;
                const count = moduleCount(module, snapshot, practiceReadyCount);

                return (
                  <article
                    key={module.id}
                    className="flex min-w-0 flex-col rounded-xl border border-hairline-cloud bg-surface-elevated p-4 sm:p-5"
                  >
                    <span
                      className={cn(
                        "mb-4 inline-flex size-9 items-center justify-center rounded-lg",
                        module.well,
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <h3 className="font-heading text-base font-bold text-ink">
                      {t(`modules.${module.id}.title`)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {t(`modules.${module.id}.description`)}
                    </p>
                    <p className="mt-4 font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {count} {t(module.countKey)}
                    </p>
                    <Link
                      href={module.href}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-hover hover:underline"
                    >
                      {t(`modules.${module.id}.cta`)}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <section className="overflow-hidden rounded-xl border border-hairline-cloud bg-surface-elevated">
            <h2 className="border-b border-hairline-cloud px-4 py-3 font-heading text-sm font-semibold text-ink">
              {t("snapshotTitle")}
            </h2>
            <dl>
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between gap-3 border-b border-hairline-cloud px-4 py-2.5 last:border-b-0"
                >
                  <dt className="min-w-0 text-sm text-ink">{stat.label}</dt>
                  <dd className="font-heading text-sm font-bold tabular-nums text-ink">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-hairline-cloud bg-surface-elevated">
            <h2 className="border-b border-hairline-cloud px-4 py-3 font-heading text-sm font-semibold text-ink">
              {t("quickActions")}
            </h2>
            <div className="flex flex-col gap-2 p-3">
              {quickActions.map((action) => (
                <LinkButton
                  key={action.href}
                  href={action.href}
                  variant="outline"
                  className="w-full justify-center"
                >
                  {action.label}
                </LinkButton>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-surface-active px-4 py-4">
            <h2 className="font-heading text-sm font-semibold text-ink">
              {t("nextStepTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/80">
              {t(`modules.${next.id}.how`)}
            </p>
            <Link
              href={next.href}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-hover hover:underline"
            >
              {t(`modules.${next.id}.cta`)}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </section>
        </aside>
      </div>

      <DashboardGuide
        snapshot={snapshot}
        wordCount={snapshot.vocabularyCount}
        practiceReadyCount={practiceReadyCount}
      />
    </div>
  );
}
