"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { Badge } from "@/components/ui/badge";
import { EXERCISE_TYPES } from "@/lib/exercise-types";
import { cn } from "@/lib/utils";

export function ExerciseTypePicker() {
  const t = useTranslations("exercises");
  const tBilling = useTranslations("billing");
  const { hasProAccess, openUpgrade } = useProAccess();

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-tutorial="exercise-types"
    >
      {EXERCISE_TYPES.map((item) => {
        const locked = Boolean(item.pro && !hasProAccess);
        const cardClassName = cn(
          "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-hairline-cloud bg-card p-4 text-left transition-all sm:p-6",
          locked
            ? lockedFeatureClassName
            : "hover:border-accent-lime/50 hover:shadow-[0_0_0_1px_rgba(194,239,78,0.35)]",
        );

        const content = (
          <>
            {item.pro ? (
              <Badge
                variant="outline"
                className="absolute top-3 right-3 z-10 gap-1 text-[11px]"
              >
                {locked ? <Lock className="size-3" aria-hidden /> : null}
                {tBilling("planName")}
              </Badge>
            ) : null}

            <div
              className={cn(
                "mb-5 flex aspect-[4/3] items-center justify-center rounded-lg border border-hairline-cloud bg-muted/40 p-4 transition-colors",
                !locked &&
                  "group-hover:border-accent-lime/50 group-hover:bg-accent-lime/25",
              )}
            >
              <div className="w-full max-w-[140px] rounded-md border border-hairline-cloud bg-background p-3 shadow-sm transition-transform group-hover:-translate-y-0.5">
                <item.icon className="mb-2 size-4 text-accent-violet-mid" />
                <p className="font-heading text-sm leading-snug text-ink">
                  {t(`types.${item.slug}.preview`)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3
                className={cn(
                  "font-heading text-lg font-medium text-ink transition-colors",
                  !locked && "group-hover:text-accent-lime",
                )}
              >
                {t(`types.${item.slug}.label`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`types.${item.slug}.description`)}
              </p>
            </div>
          </>
        );

        if (locked) {
          return (
            <button
              key={item.slug}
              type="button"
              onClick={openUpgrade}
              className={cardClassName}
              aria-label={`${t(`types.${item.slug}.label`)} — ${tBilling("compare.locked")}`}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={item.slug}
            href={`/exercises/${item.slug}`}
            className={cardClassName}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
