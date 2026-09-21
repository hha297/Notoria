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
        <div className="card-surface flex flex-col justify-between gap-5 bg-surface-active">
          <div className="min-w-0">
            <p className="eyebrow">
              {t("practiceNowEyebrow")}
            </p>
            <h2 className="heading-md mt-2 break-words">{t("practiceNowTitle")}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
              {practiceReadyCount > 0
                ? t("practiceNowReady", { count: practiceReadyCount })
                : t("practiceNowNeedsMeaning")}
            </p>
          </div>
          <div className="mt-auto">
            {practiceReadyCount > 0 ? (
              <LinkButton href="/exercises" className="max-w-full">
                <Dumbbell className="size-4" />
                <span className="truncate">{t("practiceNowCta")}</span>
                <ArrowRight className="size-4" />
              </LinkButton>
            ) : (
              <LinkButton href="/vocabulary" className="max-w-full">
                <span className="truncate">{t("practiceNowVocabCta")}</span>
                <ArrowRight className="size-4" />
              </LinkButton>
            )}
          </div>
        </div>
      ) : null}

      {showItems ? (
        <div className="card-surface min-w-0">
          <h2 className="heading-md break-words">{t("continueTitle")}</h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {t("continueSubtitle")}
          </p>
          <ul className="mt-4 space-y-2">
            {items.map((item) => {
              const Icon = MODULE_ICONS[item.module];
              return (
                <li key={`${item.module}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-sm border border-hairline-cloud bg-surface p-2.5 transition-colors hover:bg-surface-hover"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-active text-primary">
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
