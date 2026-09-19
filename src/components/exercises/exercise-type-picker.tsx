"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EXERCISE_TYPES, type ExerciseTypeSlug } from "@/lib/exercise-types";
import { cn } from "@/lib/utils";

export function ExerciseTypePicker() {
  const t = useTranslations("exercises");
  const tBilling = useTranslations("billing");
  const { hasProAccess, openUpgrade } = useProAccess();

  return (
    <div className="divide-y divide-hairline-cloud" data-tutorial="exercise-types">
      {EXERCISE_TYPES.map((item, index) => {
        const locked = Boolean(item.pro && !hasProAccess);
        return (
          <ActivityModule
            key={item.slug}
            index={index + 1}
            slug={item.slug}
            reverse={index % 2 === 1}
            locked={locked}
            lockedLabel={tBilling("planName")}
            title={t(`types.${item.slug}.label`)}
            description={t(`types.${item.slug}.description`)}
            actionLabel={locked ? t("unlockActivity") : t("startActivity")}
            href={`/exercises/${item.slug}`}
            onLockedClick={openUpgrade}
            preview={<ActivityPreview slug={item.slug} />}
          />
        );
      })}
    </div>
  );
}

function ActivityModule({
  index,
  slug,
  reverse,
  locked,
  lockedLabel,
  title,
  description,
  actionLabel,
  href,
  onLockedClick,
  preview,
}: {
  index: number;
  slug: ExerciseTypeSlug;
  reverse: boolean;
  locked: boolean;
  lockedLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  onLockedClick: () => void;
  preview: ReactNode;
}) {
  const className = cn(
    "activity-module group grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 px-1 py-8 sm:px-2 sm:py-10",
    "lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-x-8",
    "rounded-md transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    locked && lockedFeatureClassName,
  );

  const cta = <ActivityCta locked={locked} label={actionLabel} />;

  const body = (
    <>
      <span
        className="font-mono text-[1.75rem] leading-none tabular-nums text-(--exercise-accent) sm:text-[2rem]"
        aria-hidden
      >
        {String(index).padStart(2, "0")}
      </span>

      <div
        className={cn("min-w-0 space-y-3", reverse && "lg:order-3")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">
            {title}
          </h3>
          {locked ? (
            <Badge variant="outline" className="gap-1 text-[11px]">
              <Lock className="size-3" aria-hidden />
              {lockedLabel}
            </Badge>
          ) : null}
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>
        <div className="hidden lg:block">{cta}</div>
      </div>

      <div
        className={cn(
          "col-start-2 min-w-0 max-w-full lg:col-start-auto",
          reverse && "lg:order-2",
        )}
        aria-hidden
      >
        {preview}
      </div>

      <div className="col-start-2 lg:hidden">{cta}</div>
    </>
  );

  if (locked) {
    return (
      <button
        type="button"
        data-exercise={slug}
        onClick={onLockedClick}
        className={cn(className, "w-full cursor-pointer text-left")}
        aria-label={`${title} — ${lockedLabel}`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href={href} data-exercise={slug} className={className}>
      {body}
    </Link>
  );
}

function ActivityCta({ locked, label }: { locked: boolean; label: string }) {
  return (
    <span
      className={cn(
        buttonVariants({ variant: locked ? "outline" : "default" }),
        "mt-1 inline-flex",
        !locked &&
        "border-transparent bg-(--exercise-accent) text-background hover:opacity-90",
      )}
    >
      {label}
      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
    </span>
  );
}

function ActivityPreview({ slug }: { slug: ExerciseTypeSlug }) {
  const t = useTranslations("exercises");

  switch (slug) {
    case "flashcard":
      return (
        <div className="relative mx-auto w-full max-w-[17rem]">
          <div className="absolute inset-x-5 top-3 bottom-1 rotate-[6deg] rounded-md border border-hairline-cloud bg-muted/80" />
          <div className="relative rounded-md border border-hairline-cloud bg-background px-5 py-6 shadow-[0_1px_2px_rgba(35,37,29,0.04)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:-rotate-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-(--exercise-accent) uppercase">
              {t("types.flashcard.previewHint")}
            </p>
            <p className="mt-3 font-heading text-2xl font-bold tracking-tight text-ink">
              {t("types.flashcard.previewWord")}
            </p>
            <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {t("types.flashcard.previewFlow")}
            </p>
          </div>
        </div>
      );

    case "fill-in-blank": {
      const sentence = t("types.fill-in-blank.preview");
      const [before = "", after = ""] = sentence.split("______");
      return (
        <p className="max-w-lg font-heading text-[1.35rem] leading-snug font-semibold text-pretty text-ink sm:text-[1.65rem]">
          {before}
          <span className="mx-1 inline-block min-w-[5.5rem] border-b-2 border-(--exercise-accent) bg-(--exercise-accent-soft) px-2 text-center font-mono text-(--exercise-accent) transition-colors group-hover:bg-[color-mix(in_srgb,var(--exercise-accent)_18%,transparent)]">
            ______
          </span>
          {after}
        </p>
      );
    }

    case "multiple-choice":
      return (
        <div className="max-w-sm space-y-3 border border-hairline-cloud bg-background p-4">
          <p className="text-sm font-semibold text-ink">
            {t("types.multiple-choice.previewPrompt")}
          </p>
          <ul className="space-y-2">
            {[
              t("types.multiple-choice.previewA"),
              t("types.multiple-choice.previewB"),
              t("types.multiple-choice.previewC"),
            ].map((option, optionIndex) => (
              <li
                key={option}
                className={cn(
                  "flex items-center gap-2.5 border border-hairline-cloud px-3 py-2 text-sm text-ink transition-colors",
                  optionIndex === 0 &&
                  "group-hover:border-(--exercise-accent) group-hover:bg-(--exercise-accent-soft)",
                )}
              >
                <span
                  className={cn(
                    "size-3.5 shrink-0 rounded-full border border-hairline-cloud",
                    optionIndex === 0 &&
                    "border-(--exercise-accent) group-hover:bg-(--exercise-accent)",
                  )}
                />
                {option}
              </li>
            ))}
          </ul>
        </div>
      );

    case "match-pairs":
      return (
        <div className="grid max-w-sm grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
          {[
            [t("types.match-pairs.previewLeft"), t("types.match-pairs.previewRight")],
            [t("types.match-pairs.previewLeftB"), t("types.match-pairs.previewRightB")],
          ].map(([left, right]) => (
            <div key={left} className="contents">
              <span className="border border-hairline-cloud bg-background px-3 py-2 text-center text-sm font-medium text-ink transition-transform duration-200 group-hover:-translate-x-0.5">
                {left}
              </span>
              <span className="font-mono text-sm text-(--exercise-accent)">
                ↔
              </span>
              <span className="border border-hairline-cloud bg-(--exercise-accent-soft) px-3 py-2 text-center text-sm font-medium text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                {right}
              </span>
            </div>
          ))}
        </div>
      );

    case "type-answer":
      return (
        <div className="flex h-12 max-w-sm items-center border border-hairline-cloud bg-background px-3.5 transition-colors duration-200 group-hover:border-(--exercise-accent)">
          <span className="truncate text-sm text-muted-foreground">
            {t("types.type-answer.preview")}
          </span>
          <span className="exercise-caret ml-0.5 inline-block h-4 w-px bg-(--exercise-accent)" />
        </div>
      );

    case "form-sentence":
      return (
        <div className="flex max-w-md flex-wrap items-center gap-2 border-b border-dashed border-hairline-cloud pb-3">
          {[
            t("types.form-sentence.previewChipA"),
            t("types.form-sentence.previewChipB"),
            t("types.form-sentence.previewChipC"),
          ].map((chip, chipIndex) => (
            <span
              key={chip}
              className="border border-hairline-cloud bg-background px-3 py-1.5 text-sm font-medium text-ink transition-transform duration-200 group-hover:-translate-y-0.5"
              style={{ transitionDelay: `${chipIndex * 40}ms` }}
            >
              {chip}
            </span>
          ))}
        </div>
      );
  }
}
