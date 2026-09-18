"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";
import { cn } from "@/lib/utils";

type DashboardGuideProps = {
  snapshot: WorkspaceActivitySnapshot;
  wordCount: number;
  practiceReadyCount: number;
};

type ModuleId =
  | "vocabulary"
  | "theory"
  | "exercises"
  | "writing"
  | "listening"
  | "speaking";

type ModuleDef = {
  id: ModuleId;
  href: string;
  count: (ctx: {
    snapshot: WorkspaceActivitySnapshot;
    wordCount: number;
    practiceReadyCount: number;
  }) => number;
  countKey: "words" | "notes" | "writings" | "practiceReady";
};

const MODULES: ModuleDef[] = [
  {
    id: "vocabulary",
    href: "/vocabulary",
    count: ({ wordCount }) => wordCount,
    countKey: "words",
  },
  {
    id: "theory",
    href: "/theory",
    count: ({ snapshot }) => snapshot.theoryCount,
    countKey: "notes",
  },
  {
    id: "exercises",
    href: "/exercises",
    count: ({ practiceReadyCount }) => practiceReadyCount,
    countKey: "practiceReady",
  },
  {
    id: "writing",
    href: "/writing",
    count: ({ snapshot }) => snapshot.writingCount,
    countKey: "writings",
  },
  {
    id: "listening",
    href: "/listening",
    count: () => 0,
    countKey: "notes",
  },
  {
    id: "speaking",
    href: "/speaking",
    count: () => 0,
    countKey: "notes",
  },
];

export function suggestedModule(
  snapshot: WorkspaceActivitySnapshot,
  practiceReadyCount: number,
): ModuleDef {
  if (snapshot.vocabularyCount === 0) return MODULES[0];
  if (snapshot.theoryCount === 0) return MODULES[1];
  if (practiceReadyCount < 5) return MODULES[0];
  if (snapshot.writingCount === 0) return MODULES[3];
  return MODULES[2];
}

export function DashboardGuide({
  snapshot,
  wordCount,
  practiceReadyCount,
}: DashboardGuideProps) {
  const t = useTranslations("dashboard");

  return (
    <section className="rounded-xl border border-hairline-cloud bg-surface-elevated p-5 sm:p-6">
      <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("guideEyebrow")}
      </p>
      <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink">
        {t("guideTitle")}
      </h2>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <p className="max-w-xl text-sm font-semibold text-primary-hover">
          {t("guideTagline")}
        </p>
        <Link
          href="/getting-started"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-hover hover:underline"
        >
          {t("guideFullCta")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/80">
        {t("guideSubtitle")}
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/80">
        {t("guideSubtitleSecondary")}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {MODULES.map((module, index) => (
          <ModuleCard
            key={module.id}
            module={module}
            index={index + 1}
            highlighted={module.id === "vocabulary"}
            wordCount={wordCount}
            practiceReadyCount={practiceReadyCount}
            snapshot={snapshot}
          />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({
  module,
  index,
  highlighted,
  wordCount,
  practiceReadyCount,
  snapshot,
}: {
  module: ModuleDef;
  index: number;
  highlighted: boolean;
  wordCount: number;
  practiceReadyCount: number;
  snapshot: WorkspaceActivitySnapshot;
}) {
  const t = useTranslations("dashboard");
  const count = module.count({ snapshot, wordCount, practiceReadyCount });
  const showCount = module.id !== "listening" && module.id !== "speaking";

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-hairline-cloud bg-surface p-4 sm:p-5",
        "transition-[border-color,background-color,box-shadow] duration-150",
        "hover:border-primary hover:bg-surface-active/30 hover:shadow-[0_0_0_1px_var(--primary)]",
        "focus-within:border-primary",
        highlighted && "border-primary bg-surface-active/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-inverse font-heading text-xs font-bold text-on-inverse">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-ink">
            {t(`steps.${module.id}.title`)}
          </h3>
          {highlighted ? (
            <p className="mt-1 font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">
              {t("startHere")}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/80">
        {t(`steps.${module.id}.body`)}
      </p>
      {showCount ? (
        <p className="mt-3 font-heading text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t(`counts.${module.countKey}`, { count })}
        </p>
      ) : (
        <p className="mt-3 font-heading text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t("pro")}
        </p>
      )}
      <LinkButton href={module.href} variant="outline" size="sm" className="mt-4 w-fit">
        {t("open")}
        <ArrowRight />
      </LinkButton>
    </article>
  );
}
