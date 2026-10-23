"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { ProgressiveHintReveal } from "@/components/exercises/progressive-hint-reveal";
import { TheoryPracticeFeedback } from "@/components/exercises/theory/theory-practice-feedback";
import {
  buildCanonicalCompletedSentence,
  extractSourceWordCueFromHint,
  revealTextForExercise,
  scrubFillBlankPresentation,
} from "@/lib/theory-exercises/generate-ai";
import type { TheoryFillBlankExercise } from "@/lib/theory-exercises/types";
import { EXERCISE_SET_QUESTION_CARD_CLASS } from "@/components/exercises/exercise-set-question-card";
import theoryStyles from "@/components/style/exercises/theory.module.css";
import sessionStyles from "@/components/style/exercises/session.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function TheoryFillBlankCard({
  item,
  number,
  value,
  onChange,
  submitted,
  correct,
  unanswered,
}: {
  item: TheoryFillBlankExercise;
  number: number;
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
  correct: boolean;
  unanswered: boolean;
}) {
  const t = useTranslations("exercises.theory");
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const isCorrect = submitted && correct && !unanswered;
  const sentenceMeaning = item.sentenceMeaning?.trim() || "";

  const scrubbed = scrubFillBlankPresentation({
    prefix: item.prefix,
    suffix: item.suffix,
    answer: item.answer,
    hint: item.hint ?? "",
    spaced: true,
    sourceWord: item.sourceWord,
  });
  const fromHint = extractSourceWordCueFromHint(scrubbed.hint);
  const prefixText = scrubbed.prefix;
  const suffixText = scrubbed.suffix;
  const displaySourceWord =
    scrubbed.sourceWordCue ||
    item.sourceWord?.trim() ||
    fromHint.cue ||
    "";
  const displayHint = displaySourceWord
    ? fromHint.hint
        .replace(
          new RegExp(
            `\\(\\s*${displaySourceWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\)`,
            "giu",
          ),
          " ",
        )
        .replace(/\s{2,}/g, " ")
        .trim()
    : fromHint.hint.trim();
  const canonicalCompleted = buildCanonicalCompletedSentence({
    prefix: scrubbed.prefix,
    suffix: scrubbed.suffix,
    answer: item.answer,
    sentence: scrubbed.sentence,
  });
  const revealDisplay = revealTextForExercise({
    ...item,
    prefix: scrubbed.prefix || undefined,
    suffix: scrubbed.suffix || undefined,
    hint: scrubbed.hint,
    sourceWord: displaySourceWord || item.sourceWord,
    sentence: scrubbed.sentence,
    completedSentence: canonicalCompleted,
  });
  const blankMinWidth = Math.min(Math.max(item.answer.length + 2, 6), 16);
  const trailingPunctuation = /^[.!?…]+$/.test(suffixText.trim())
    ? suffixText.trim()
    : "";
  const bodySuffix = trailingPunctuation ? "" : suffixText;
  const filledText = submitted ? item.answer : "";

  return (
    <motion.article
      id={`theory-q-${item.id}`}
      data-question-id={item.id}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
      className={EXERCISE_SET_QUESTION_CARD_CLASS}
    >
      <header className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {number}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {item.instruction?.trim() || t("instructions.fillBlank")}
            </span>
          </p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" />
          {tAi("generated")}
        </p>
      </header>

      <div className="relative mt-5 sm:mt-8">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
        />
        <div className="min-w-0 pl-4 sm:pl-5">
          <p className="font-heading text-[1.35rem] leading-[1.55] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.65rem]">
            {prefixText ? (
              <>
                {prefixText}
                {/\s$/u.test(prefixText) ? null : " "}
              </>
            ) : null}
            <span
              className={cn(
                "inline-flex max-w-full min-w-0 flex-col items-center align-baseline",
                submitted &&
                  !isCorrect &&
                  !reduceMotion &&
                  mx(sessionStyles, "exercise-shake"),
              )}
            >
              <span
                className={cn(
                  "relative inline-flex max-w-full min-w-26 items-end justify-center border-b-2 px-1.5 transition-colors duration-200",
                  !submitted &&
                    "border-(--exercise-accent) has-focus-visible:border-b-[3px]",
                  submitted && isCorrect && "border-success",
                  submitted && !isCorrect && "border-error",
                )}
                style={{ minWidth: `${blankMinWidth}ch` }}
              >
                {submitted ? (
                  <span
                    className={cn(
                      "px-0.5 text-center font-medium wrap-anywhere",
                      isCorrect ? "text-success" : "text-error",
                    )}
                  >
                    {filledText || "\u00a0"}
                  </span>
                ) : (
                  <input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name={`theory-blank-${item.id}`}
                    aria-label={`${number}. ${t("fillPlaceholder")}`}
                    placeholder="?"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    className="h-[1.15em] w-full max-w-full bg-transparent p-0 text-center text-[1em] leading-none font-heading font-semibold tracking-tight text-(--exercise-accent) caret-(--exercise-accent) outline-none placeholder:text-(--exercise-accent)/30"
                  />
                )}
              </span>
            </span>
            {trailingPunctuation}
            {displaySourceWord ? (
              <>
                {" "}
                <span className={mx(theoryStyles, "theory-lesson-term text-[0.72em] font-medium")}>
                  ({displaySourceWord})
                </span>
              </>
            ) : null}
            {bodySuffix ? (
              <>
                {/^\s/u.test(bodySuffix) ? null : " "}
                {bodySuffix}
              </>
            ) : null}
          </p>

          {!submitted ? (
            <ProgressiveHintReveal
              hints={item.hints}
              legacyHint={displayHint}
              grounding={item.learningObjective}
              answers={item.acceptedAnswers}
              resetKey={item.id}
              answered={submitted}
            />
          ) : null}

          <TheoryPracticeFeedback
            checked={submitted}
            correct={isCorrect}
            unanswered={unanswered}
            userValue={value}
            revealDisplay={revealDisplay}
            explanation={item.explanation}
            learningObjective={item.learningObjective}
            sentenceMeaning={sentenceMeaning}
          />
        </div>
      </div>
    </motion.article>
  );
}
