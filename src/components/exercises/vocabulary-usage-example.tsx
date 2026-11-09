"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { BookOpenText } from "lucide-react";
import {
  highlightLemmaInSentence,
  highlightTermsInText,
} from "@/lib/flashcards/highlight-lemma";
import type { FlashcardExample } from "@/types/flashcards";
import { cn } from "@/lib/utils";

const LEMMA_MATCH_CLASS =
  "font-extrabold text-(--exercise-accent) underline decoration-(--exercise-accent)/70 decoration-2 underline-offset-[0.18em]";

type VocabularyUsageExampleProps = {
  example: FlashcardExample | null | undefined;
  lemma?: string | null;
  /** Meanings / glosses to emphasize inside the example translation. */
  highlightTerms?: Array<string | null | undefined>;
  /** When false, the section is hidden (pre-reveal). */
  revealed?: boolean;
  className?: string;
};

/**
 * Post-answer “How to use it” panel for vocabulary exercises.
 * Renders nothing when there is no example to show.
 */
export function VocabularyUsageExample({
  example,
  lemma,
  highlightTerms = [],
  revealed = true,
  className,
}: VocabularyUsageExampleProps) {
  const t = useTranslations("exercises.session");
  const reduceMotion = useReducedMotion();
  const sentence = example?.sentence?.trim() ?? "";
  const meaning = example?.meaning?.trim() || null;
  const visible = revealed && Boolean(sentence);
  const meaningHighlights = [...highlightTerms, lemma];

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.22,
            delay: reduceMotion ? 0 : 0.05,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={cn(
            "mt-5 overflow-hidden rounded-xl border border-(--exercise-accent)/22 bg-(--exercise-accent-soft)/40 shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)] dark:bg-(--exercise-accent-soft)/22",
            className,
          )}
          aria-label={t("howToUseIt")}
        >
          <div className="flex items-center gap-2 border-b border-(--exercise-accent)/22 px-3.5 py-3 sm:px-4">
            <BookOpenText
              aria-hidden
              className="size-4 shrink-0 text-(--exercise-accent)"
              strokeWidth={2.4}
            />
            <p className="text-[0.78rem] font-extrabold tracking-[0.14em] text-(--exercise-accent) uppercase">
              {t("howToUseIt")}
            </p>
          </div>
          <div className="space-y-2 px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="font-heading text-[1.05rem] leading-relaxed text-pretty wrap-anywhere text-ink sm:text-[1.125rem]">
              {lemma?.trim()
                ? highlightLemmaInSentence(sentence, lemma, {
                    matchClassName: LEMMA_MATCH_CLASS,
                  })
                : sentence}
            </p>
            {meaning ? (
              <p className="text-sm leading-relaxed text-muted-foreground wrap-anywhere sm:text-[0.9375rem]">
                {highlightTermsInText(meaning, meaningHighlights, {
                  matchClassName: LEMMA_MATCH_CLASS,
                })}
              </p>
            ) : null}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
