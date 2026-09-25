"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { HintText } from "@/components/exercises/theory/theory-card-shared";
import { TheoryPracticeFeedback } from "@/components/exercises/theory/theory-practice-feedback";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { Button } from "@/components/ui/button";
import {
  answersMatchAny,
  extractSourceWordCueFromHint,
  revealTextForExercise,
  scrubFillBlankPresentation,
} from "@/lib/theory-exercises/generate-ai";
import type { TheoryFillBlankExercise } from "@/lib/theory-exercises/types";
import theoryStyles from "@/components/style/exercises/theory.module.css";
import sessionStyles from "@/components/style/exercises/session.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function TheoryFillBlankCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryFillBlankExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && answersMatchAny(value, item.acceptedAnswers);
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
  const revealDisplay = revealTextForExercise({
    ...item,
    prefix: scrubbed.prefix || undefined,
    suffix: scrubbed.suffix || undefined,
    hint: scrubbed.hint,
    sourceWord: displaySourceWord || item.sourceWord,
    sentence: scrubbed.sentence,
    completedSentence: item.completedSentence ?? scrubbed.completedSentence,
  });
  const blankMinWidth = Math.min(Math.max(item.answer.length + 2, 6), 16);
  const trailingPunctuation = /^[.!?…]+$/.test(suffixText.trim())
    ? suffixText.trim()
    : "";
  const bodySuffix = trailingPunctuation ? "" : suffixText;
  const filledText = checked ? (isCorrect ? value.trim() : item.answer) : "";

  const check = () => {
    if (checked || !value.trim()) return;
    setChecked(true);
    onResolved(answersMatchAny(value, item.acceptedAnswers));
  };

  const revealAnswer = () => {
    if (checked) return;
    setPeeked(true);
    setChecked(true);
    setValue(item.answer);
    onResolved(false);
  };

  return (
    <motion.div
      key={item.id}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE }}
      className="relative mx-auto w-full min-w-0 max-w-3xl"
    >
      <header className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
            {t("lesson.tryIt")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {item.instruction?.trim() || t("instructions.fillBlank")}
          </p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" />
          {tAi("generated")}
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (checked) onNext();
          else check();
        }}
        className="relative mt-5 sm:mt-10"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
        />
        <div className="min-w-0 pl-4 sm:pl-5">
          <p className="font-heading text-[1.5rem] leading-[1.55] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.85rem] md:text-[2.05rem]">
            {prefixText ? (
              <>
                {prefixText}
                {/\s$/u.test(prefixText) ? null : " "}
              </>
            ) : null}
            <span
              className={cn(
                "inline-flex max-w-full min-w-0 flex-col items-center align-baseline",
                checked && !isCorrect && !reduceMotion && mx(sessionStyles, "exercise-shake"),
              )}
            >
              <span
                className={cn(
                  "relative inline-flex max-w-full min-w-26 items-end justify-center border-b-2 px-1.5 transition-colors duration-200",
                  !checked &&
                    "border-(--exercise-accent) has-focus-visible:border-b-[3px]",
                  checked && isCorrect && "border-success",
                  checked && !isCorrect && "border-error",
                )}
                style={{ minWidth: `${blankMinWidth}ch` }}
              >
                {checked ? (
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
                    onChange={(event) => setValue(event.target.value)}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="theory-exercise-blank"
                    aria-label={t("fillPlaceholder")}
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

          <ExerciseHint
            resetKey={item.id}
            answered={checked}
            correctAnswer={revealDisplay}
            onRevealAnswer={revealAnswer}
          >
            {displayHint ? <HintText text={displayHint} /> : null}
          </ExerciseHint>

          {!checked ? (
            <div className="mt-5">
              <Button
                type="submit"
                disabled={!value.trim()}
                className="h-11 w-full sm:h-9 sm:w-auto"
              >
                {t("check")}
              </Button>
            </div>
          ) : null}

          <TheoryPracticeFeedback
            checked={checked}
            correct={isCorrect}
            peeked={peeked}
            userValue={value}
            revealDisplay={revealDisplay}
            explanation={item.explanation}
            learningObjective={item.learningObjective}
            sentenceMeaning={sentenceMeaning}
            onNext={onNext}
          />
        </div>
      </form>
    </motion.div>
  );
}
