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
    <header className={cn("writing-hero", mx(styles, "vocab-composer-hero"))}>
      <div className="writing-hero-copy">
        <p className="writing-kicker">{eyebrow}</p>
        <h1 className="writing-brand-title">
          {title}
          {highlight ? (
            <>
              {" "}
              <span className="text-module-vocab-fg">{highlight}</span>
            </>
          ) : null}
        </h1>
        <p className="writing-brand-lede">{description}</p>
        {language ? (
          <p className={mx(styles, "vocab-composer-lang")}>
            <span className="text-muted-foreground">{addingToLabel}</span>
            <span className="inline-flex items-center gap-2 font-medium text-ink">
              <CountryFlag code={language.flagCode} className="h-3.5 w-5" />
              {language.name}
            </span>
          </p>
        ) : null}
      </div>
      {actions ? <div className="writing-hero-actions">{actions}</div> : null}
    </header>
  );
}

type VocabularyComposerSectionProps = {
  slot: "word" | "meaning" | "example" | "extra";
  index: number;
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  "data-tutorial"?: string;
};

export function VocabularyComposerSection({
  slot,
  index,
  title,
  hint,
  action,
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
      <div className={mx(styles, "vocab-composer-section-grid")}>
        <p className={mx(styles, "vocab-composer-section-index")} aria-hidden>
          {String(index).padStart(2, "0")}
        </p>
        <div className={mx(styles, "vocab-composer-section-main")}>
          {title || action ? (
            <div className={mx(styles, "vocab-composer-section-head")}>
              <div className={mx(styles, "vocab-composer-section-copy")}>
                {title ? (
                  <h2 className={mx(styles, "vocab-composer-section-title")}>
                    {title}
                  </h2>
                ) : null}
                {hint ? (
                  <p className={mx(styles, "vocab-composer-section-hint")}>
                    {hint}
                  </p>
                ) : null}
              </div>
              {action ? (
                <div className={mx(styles, "vocab-composer-section-action")}>
                  {action}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className={mx(styles, "vocab-composer-section-body")}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
