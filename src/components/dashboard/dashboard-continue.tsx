"use client";

import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  Headphones,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import type {
  DashboardContinueItem,
  DashboardContinueModule,
} from "@/lib/dashboard/activity";

const MODULE_ICONS: Record<DashboardContinueModule, LucideIcon> = {
  theory: BookOpen,
  writing: PenLine,
  listening: Headphones,
  speaking: Video,
};

type DashboardContinueProps = {
  items: DashboardContinueItem[];
  wordCount: number;
  practiceReadyCount: number;
};

export function DashboardContinue({
  items,
  wordCount,
  practiceReadyCount,
}: DashboardContinueProps) {
  const t = useTranslations("dashboard");
  const showPractice = wordCount > 0;
  const showItems = items.length > 0;

  if (!showPractice && !showItems) return null;

  return (
    <div
      className={
        showPractice && showItems
          ? "grid gap-3 sm:gap-4 lg:grid-cols-2"
          : "grid gap-3 sm:gap-4"
      }
    >
      {showPractice ? (
        <div className="card-surface-dark flex flex-col justify-between">
          <div>
            <p className="text-[15px] font-medium uppercase tracking-[0.2px] text-on-dark-muted">
              {t("practiceNowEyebrow")}
            </p>
            <h2 className="heading-md mt-2">{t("practiceNowTitle")}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-on-dark-muted sm:text-base">
              {practiceReadyCount > 0
                ? t("practiceNowReady", { count: practiceReadyCount })
                : t("practiceNowNeedsMeaning")}
            </p>
          </div>
          <div className="mt-5">
            {practiceReadyCount > 0 ? (
              <LinkButton
                href="/exercises"
                variant="secondary"
                className="bg-on-primary text-ink hover:bg-on-primary/90"
              >
                <Dumbbell className="size-4" />
                {t("practiceNowCta")}
                <ArrowRight className="size-4" />
              </LinkButton>
            ) : (
              <LinkButton
                href="/vocabulary"
                variant="secondary"
                className="bg-on-primary text-ink hover:bg-on-primary/90"
              >
                {t("practiceNowVocabCta")}
                <ArrowRight className="size-4" />
              </LinkButton>
            )}
          </div>
        </div>
      ) : null}

      {showItems ? (
        <div className="card-surface">
          <h2 className="heading-md">{t("continueTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("continueSubtitle")}
          </p>
          <ul className="mt-4 space-y-2">
            {items.map((item) => {
              const Icon = MODULE_ICONS[item.module];
              return (
                <li key={`${item.module}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border border-hairline-cloud p-3 transition-colors hover:bg-muted/50 sm:p-3.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-lime/20 text-ink">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium uppercase tracking-[0.2px] text-muted-foreground">
                        {t(`modules.${item.module}.title`)}
                      </span>
                      <span className="mt-0.5 block truncate font-medium text-ink">
                        {item.title}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
