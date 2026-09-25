"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import homeStyles from "@/components/style/dashboard/home.module.css";
import { mx } from "@/lib/css-module";
import type { WorkspaceActivitySnapshot } from "@/lib/onboarding/requirements";

type ModuleId =
  | "inbox"
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
  pro?: boolean;
};

const MODULES: ModuleDef[] = [
  { id: "vocabulary", href: "/vocabulary", accent: "vocab" },
  { id: "inbox", href: "/inbox", accent: "home" },
  { id: "theory", href: "/theory", accent: "theory" },
  { id: "exercises", href: "/exercises", accent: "exercise" },
  { id: "writing", href: "/writing", accent: "writing" },
  { id: "listening", href: "/listening", accent: "listen", pro: true },
  { id: "speaking", href: "/speaking", accent: "speak", pro: true },
];

function moduleById(id: ModuleId): ModuleDef {
  const found = MODULES.find((module) => module.id === id);
  if (!found) throw new Error(`Unknown guide module: ${id}`);
  return found;
}

export function suggestedModule(
  snapshot: WorkspaceActivitySnapshot,
  practiceReadyCount: number,
): ModuleDef {
  if (snapshot.vocabularyCount === 0) return moduleById("vocabulary");
  if (snapshot.theoryCount === 0) return moduleById("theory");
  if (practiceReadyCount < 5) return moduleById("vocabulary");
  if (snapshot.writingCount === 0) return moduleById("writing");
  return moduleById("exercises");
}

export function DashboardGuide() {
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
          className={mx(homeStyles, "home-guide-full-link")}
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
}: {
  module: ModuleDef;
  index: number;
  highlighted: boolean;
}) {
  const t = useTranslations("dashboard");
  const tb = useTranslations("billing");

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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-bold text-ink">
              {t(`steps.${module.id}.title`)}
            </h3>
            {module.pro ? <Badge variant="pro">{tb("proBadge")}</Badge> : null}
          </div>
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
      <LinkButton
        href={module.href}
        variant="outline"
        size="sm"
        className={mx(homeStyles, "home-guide-open mt-4 w-fit")}
      >
        {t("open")}
        <ArrowRight />
      </LinkButton>
    </article>
  );
}
