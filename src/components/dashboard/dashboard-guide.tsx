"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import homeStyles from "@/components/style/dashboard/home.module.css";
import { mx } from "@/lib/css-module";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";

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
  accent: string;
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
    accent: "vocab",
    count: ({ wordCount }) => wordCount,
    countKey: "words",
  },
  {
    id: "theory",
    href: "/theory",
    accent: "theory",
    count: ({ snapshot }) => snapshot.theoryCount,
    countKey: "notes",
  },
  {
    id: "exercises",
    href: "/exercises",
    accent: "exercise",
    count: ({ practiceReadyCount }) => practiceReadyCount,
    countKey: "practiceReady",
  },
  {
    id: "writing",
    href: "/writing",
    accent: "writing",
    count: ({ snapshot }) => snapshot.writingCount,
    countKey: "writings",
  },
  {
    id: "listening",
    href: "/listening",
    accent: "listen",
    count: () => 0,
    countKey: "notes",
  },
  {
    id: "speaking",
    href: "/speaking",
    accent: "speak",
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
    <section className={mx(homeStyles, "home-guide")}>
      <header className={mx(homeStyles, "home-guide-head")}>
        <p className={mx(homeStyles, "writing-kicker home-kicker")}>
          {t("guideEyebrow")}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
          {t("guideTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-module-home-fg">
          {t("guideTagline")}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink/80">
          {t("guideSubtitle")}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/80">
          {t("guideSubtitleSecondary")}
        </p>
        <Link
          href="/getting-started"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-module-guide-fg hover:underline"
        >
          {t("guideFullCta")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      <div className={mx(homeStyles, "home-guide-grid")}>
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
      data-home-accent={module.accent}
      className={mx(
        homeStyles,
        "home-guide-card",
        highlighted && "is-highlighted",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={mx(homeStyles, "home-guide-index")} aria-hidden>
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-ink">
            {t(`steps.${module.id}.title`)}
          </h3>
          {highlighted ? (
            <p className="mt-1 font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-module-vocab-fg">
              {t("startHere")}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        {t(`steps.${module.id}.body`)}
      </p>
      {showCount ? (
        <p className={mx(homeStyles, "home-hub-count mt-3")}>
          {t(`counts.${module.countKey}`, { count })}
        </p>
      ) : (
        <p className={mx(homeStyles, "home-hub-count mt-3")}>{t("pro")}</p>
      )}
      <LinkButton href={module.href} variant="outline" size="sm" className="mt-4 w-fit">
        {t("open")}
        <ArrowRight />
      </LinkButton>
    </article>
  );
}
