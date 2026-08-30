"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  Headphones,
  Languages,
  Lock,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  getVocabularyReadiness,
  type WorkspaceActivitySnapshot,
} from "@/lib/onboarding/requirements";
import type { TutorialSectionId } from "@/lib/onboarding/tutorials";
import { cn } from "@/lib/utils";

const GUIDE_STEPS = [
  "vocabulary",
  "theory",
  "exercises",
  "writing",
  "listening",
  "speaking",
] as const;

type ModuleId = (typeof GUIDE_STEPS)[number];

type ModuleDef = {
  id: ModuleId;
  href: string;
  tutorial: TutorialSectionId;
  icon: LucideIcon;
  pro?: boolean;
};

const MODULES: ModuleDef[] = [
  {
    id: "vocabulary",
    href: "/vocabulary",
    tutorial: "vocabulary",
    icon: Languages,
  },
  { id: "theory", href: "/theory", tutorial: "theory", icon: BookOpen },
  {
    id: "exercises",
    href: "/exercises",
    tutorial: "exercise",
    icon: Dumbbell,
  },
  { id: "writing", href: "/writing", tutorial: "writing", icon: PenLine },
  {
    id: "listening",
    href: "/listening",
    tutorial: "listening",
    icon: Headphones,
    pro: true,
  },
  {
    id: "speaking",
    href: "/speaking",
    tutorial: "speaking",
    icon: Video,
    pro: true,
  },
];

type DashboardGuideProps = {
  snapshot: WorkspaceActivitySnapshot;
  wordCount: number;
  practiceReadyCount: number;
};

function suggestedModule(snapshot: WorkspaceActivitySnapshot): ModuleId {
  const readiness = getVocabularyReadiness(snapshot.vocabularyCount);
  if (readiness !== "ready") return "vocabulary";
  if (snapshot.practiceCount === 0) return "exercises";
  if (snapshot.theoryCount === 0) return "theory";
  if (snapshot.writingCount === 0) return "writing";
  return "vocabulary";
}

export function DashboardGuide({
  snapshot,
  wordCount,
  practiceReadyCount,
}: DashboardGuideProps) {
  const t = useTranslations("dashboard");
  const highlight = suggestedModule(snapshot);

  const counts: Record<ModuleId, string | null> = {
    vocabulary: t("counts.words", { count: wordCount }),
    theory: t("counts.notes", { count: snapshot.theoryCount }),
    exercises: t("counts.practiceReady", { count: practiceReadyCount }),
    writing: t("counts.writings", { count: snapshot.writingCount }),
    listening: null,
    speaking: null,
  };

  return (
    <div className="space-y-8">
      <div className="card-surface-dark">
        <p className="text-[15px] font-medium uppercase tracking-[0.2px] text-on-dark-muted">
          {t("guideEyebrow")}
        </p>
        <h2 className="heading-md mt-2">{t("guideTitle")}</h2>
        <p className="mt-2 text-sm font-medium text-accent-lime sm:text-base">
          {t("guideTagline")}
        </p>
        <div className="mt-2 max-w-2xl space-y-3 text-sm leading-relaxed text-on-dark-muted sm:text-base">
          <p>{t("guideSubtitle")}</p>
          <p>{t("guideSubtitleSecondary")}</p>
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_STEPS.map((step, index) => (
            <li
              key={step}
              className="rounded-lg border border-hairline-violet bg-white/5 p-3 sm:p-4"
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-lime text-xs font-semibold text-ink">
                  {index + 1}
                </span>
                {t(`steps.${step}.title`)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-on-dark-muted">
                {t(`steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 border-t border-hairline-violet pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-dark-muted">{t("guideFullCtaPrompt")}</p>
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-lime transition-colors hover:text-accent-lime/80"
          >
            {t("guideFullCta")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div>
        <div className="mb-4 space-y-1">
          <h2 className="heading-md text-ink">{t("modulesTitle")}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("modulesSubtitle")}
          </p>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              countLabel={counts[module.id]}
              highlighted={module.id === highlight}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  countLabel,
  highlighted,
}: {
  module: ModuleDef;
  countLabel: string | null;
  highlighted: boolean;
}) {
  const t = useTranslations("dashboard");
  const { hasProAccess, openUpgrade } = useProAccess();
  const locked = Boolean(module.pro && !hasProAccess);
  const Icon = module.icon;

  return (
    <article
      className={cn(
        "card-surface flex flex-col",
        highlighted && "ring-2 ring-accent-lime ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-lime/20 text-ink">
            <Icon className="size-4" aria-hidden />
          </div>
          <h3 className="heading-md text-ink">{t(`modules.${module.id}.title`)}</h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {highlighted ? (
            <Badge variant="secondary" className="bg-accent-lime text-ink">
              {t("startHere")}
            </Badge>
          ) : null}
          {module.pro ? (
            <Badge variant="outline">{t("pro")}</Badge>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t(`modules.${module.id}.description`)}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink">
        {t(`modules.${module.id}.how`)}
      </p>
      {countLabel ? (
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.2px] text-muted-foreground">
          {countLabel}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {locked ? (
          <Button type="button" onClick={openUpgrade}>
            <Lock className="size-4" />
            {t("unlock")}
          </Button>
        ) : (
          <LinkButton href={module.href}>
            {t(`modules.${module.id}.cta`)}
            <ArrowRight className="size-4" />
          </LinkButton>
        )}
        <ShowTutorialButton section={module.tutorial} variant="outline" />
      </div>
    </article>
  );
}
