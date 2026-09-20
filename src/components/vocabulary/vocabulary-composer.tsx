"use client";

import type { ReactNode } from "react";
import { CountryFlag } from "@/components/layout/country-flag";
import { getLanguageByCode } from "@/lib/languages";
import { cn } from "@/lib/utils";

type VocabularyComposerHeroProps = {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  addingToLabel: string;
  languageCode?: string;
};

export function VocabularyComposerHero({
  eyebrow,
  title,
  highlight,
  description,
  addingToLabel,
  languageCode,
}: VocabularyComposerHeroProps) {
  const language = languageCode ? getLanguageByCode(languageCode) : undefined;

  return (
    <header className="vocab-composer-hero relative -mx-1 px-1 py-6 sm:py-7">
      <div className="relative space-y-3">
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
          <p className="vocab-composer-lang mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2.5 py-1.5 text-sm">
            <span className="text-muted-foreground">{addingToLabel}</span>
            <span className="inline-flex items-center gap-2 font-medium text-ink">
              <CountryFlag code={language.flagCode} className="h-3.5 w-5" />
              {language.name}
            </span>
          </p>
        ) : null}
      </div>
    </header>
  );
}

type VocabularyComposerSectionProps = {
  slot: "word" | "meaning" | "example" | "extra";
  children: ReactNode;
  className?: string;
};

export function VocabularyComposerSection({
  slot,
  children,
  className,
}: VocabularyComposerSectionProps) {
  return (
    <section
      data-composer={slot}
      className={cn("vocab-composer-section", className)}
    >
      {children}
    </section>
  );
}
