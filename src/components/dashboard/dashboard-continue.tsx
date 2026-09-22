"use client";

import {
  ArrowRight,
  BookOpen,
  Headphones,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import homeStyles from "@/components/style/dashboard/home.module.css";
import { mx } from "@/lib/css-module";
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

const MODULE_ACCENT: Record<DashboardContinueModule, string> = {
  theory: "theory",
  writing: "writing",
  listening: "listen",
  speaking: "speak",
};

type DashboardContinueProps = {
  items: DashboardContinueItem[];
};

export function DashboardContinue({ items }: DashboardContinueProps) {
  const t = useTranslations("dashboard");

  return (
    <section className="writing-stage">
      <p className={mx(homeStyles, "writing-kicker home-kicker writing-stage-kicker")}>
        {t("continueTitle")}
      </p>
      <p className="mb-5 max-w-xl text-sm text-muted-foreground">
        {t("continueSubtitle")}
      </p>

      {items.length > 0 ? (
        <ul className={mx(homeStyles, "home-continue-list")}>
          {items.map((item) => {
            const Icon = MODULE_ICONS[item.module];
            return (
              <li key={`${item.module}-${item.id}`}>
                <Link
                  href={item.href}
                  data-home-accent={MODULE_ACCENT[item.module]}
                  className={mx(homeStyles, "home-continue-row")}
                >
                  <span
                    className={mx(homeStyles, "home-hub-icon")}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={mx(homeStyles, "home-continue-module")}>
                      {t(`modules.${item.module}.title`)}
                    </span>
                    <span className={mx(homeStyles, "home-continue-title")}>
                      {item.title}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={mx(homeStyles, "home-continue-empty")}>
          {t("continueEmpty")}
        </p>
      )}
    </section>
  );
}
