"use client";

import type { ReactNode } from "react";
import { CountryFlag } from "@/components/layout/country-flag";
import styles from "@/components/style/vocabulary/composer.module.css";
import { mx } from "@/lib/css-module";
import { getLanguageByCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

export { styles as composerStyles };

type VocabularyComposerHeroProps = {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  addingToLabel: string;
  languageCode?: string;
  actions?: ReactNode;
};

export function VocabularyComposerHero({
  eyebrow,
  title,
  highlight,
  description,
  addingToLabel,
  languageCode,
  actions,
}: VocabularyComposerHeroProps) {
  const language = languageCode ? getLanguageByCode(languageCode) : undefined;

  return (
    <header
      className={mx(
        styles,
        "vocab-composer-hero relative -mx-1 px-1 py-6 sm:py-7",
      )}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-3">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
          <h1 className="font-heading text-[1.7rem] font-bold tracking-tight text-pretty text-ink sm:text-[2rem]">
            {title}
            {highlight ? (
              <>
                {" "}
                <span className="text-primary">{highlight}</span>
              </>
            ) : null}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-ink/75 sm:text-[15px]">
            {description}
          </p>
          {language ? (
            <p
              className={mx(
                styles,
                "vocab-composer-lang mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2.5 py-1.5 text-sm",
              )}
            >
              <span className="text-muted-foreground">{addingToLabel}</span>
              <span className="inline-flex items-center gap-2 font-medium text-ink">
                <CountryFlag code={language.flagCode} className="h-3.5 w-5" />
                {language.name}
              </span>
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

type VocabularyComposerSectionProps = {
  slot: "word" | "meaning" | "example" | "extra";
  children: ReactNode;
  className?: string;
  "data-tutorial"?: string;
};

export function VocabularyComposerSection({
  slot,
  children,
  className,
  "data-tutorial": dataTutorial,
}: VocabularyComposerSectionProps) {
  return (
    <section
      data-composer={slot}
      data-tutorial={dataTutorial}
      className={cn(mx(styles, "vocab-composer-section"), className)}
    >
      {children}
    </section>
  );
}
