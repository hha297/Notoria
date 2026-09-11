"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, Sparkles, XCircle } from "lucide-react";
import { HintText } from "@/components/exercises/theory/theory-card-shared";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  answersMatchAny,
  extractSourceWordCueFromHint,
  revealTextForExercise,
  scrubFillBlankPresentation,
} from "@/lib/theory-exercises/generate-ai";
import type { TheoryFillBlankExercise } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

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
    : fromHint.hint;
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
    <div className="w-full min-w-0 space-y-4">
      <div className="mx-auto w-full min-w-0 max-w-3xl rounded-3xl border border-hairline-cloud bg-card p-6 shadow-xl shadow-ink/5 sm:p-10 md:p-12">
        <div className="space-y-2">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-mid">
              {item.skillLabel || t("types.fill_blank")}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3" />
              {tAi("generated")}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-ink">
            {item.instruction?.trim() || t("instructions.fillBlank")}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (checked) onNext();
            else check();
          }}
          className="mt-8 space-y-8"
        >
          <div className="rounded-2xl border border-hairline-cloud bg-muted/20 px-4 py-10 sm:px-8 sm:py-12 md:py-14">
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-4 text-center leading-snug">
              {prefixText ? (
                <span className="max-w-full break-words text-xl font-medium text-ink [overflow-wrap:anywhere] sm:text-2xl md:text-3xl">
                  {prefixText}
                </span>
              ) : null}

              <span
                className="inline-flex max-w-full min-w-0 shrink items-center justify-center gap-0"
                style={{ width: `min(100%, ${blankMinWidth}ch)` }}
              >
                {checked ? (
                  <span
                    className={cn(
                      "max-w-full break-words rounded-xl px-3 py-1.5 text-xl font-semibold [overflow-wrap:anywhere] sm:text-2xl md:text-3xl",
                      isCorrect
                        ? "bg-[#f4fae0] text-[#4a6b0a] ring-2 ring-[#b8d96a]/60"
                        : "bg-[#fff1f6] text-destructive ring-2 ring-[#f3b8cc]/60",
                    )}
                  >
                    {isCorrect ? value.trim() : item.answer}
                  </span>
                ) : (
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="theory-exercise-blank"
                    placeholder="?"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    className={cn(
                      "h-12 w-full min-w-0 max-w-full rounded-xl border-2 border-dashed border-accent-lime/50 bg-background/90 px-4",
                      "text-center text-xl font-semibold text-ink shadow-sm sm:h-14 sm:text-2xl md:text-3xl",
                      "placeholder:text-muted-foreground/40",
                      "focus-visible:border-accent-lime focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent-lime/20",
                    )}
                  />
                )}
                {trailingPunctuation ? (
                  <span className="pl-0.5 text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                    {trailingPunctuation}
                  </span>
                ) : null}
              </span>

              {displaySourceWord ? (
                <span className="max-w-full break-words text-xl font-medium text-accent-violet-mid [overflow-wrap:anywhere] sm:text-2xl md:text-3xl">
                  ({displaySourceWord})
                </span>
              ) : null}

              {bodySuffix ? (
                <span className="max-w-full break-words text-xl font-medium text-ink [overflow-wrap:anywhere] sm:text-2xl md:text-3xl">
                  {bodySuffix}
                </span>
              ) : null}
            </div>

            {checked && sentenceMeaning ? (
              <p className="mt-6 break-words text-center text-base leading-relaxed text-ink/75 [overflow-wrap:anywhere] sm:text-lg">
                ({sentenceMeaning})
              </p>
            ) : null}
          </div>

          <ExerciseHint
            resetKey={item.id}
            answered={checked}
            correctAnswer={revealDisplay}
            onRevealAnswer={revealAnswer}
          >
            {displayHint ? <HintText text={displayHint} /> : null}
          </ExerciseHint>

          {checked ? (
            <div
              className={cn(
                "flex min-w-0 items-start gap-3 rounded-xl px-5 py-4 text-sm font-medium sm:text-base",
                isCorrect ? "bg-[#f4fae0] text-[#4a6b0a]" : "bg-[#fff1f6] text-[#c7366a]",
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0" />
              )}
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {isCorrect
                  ? t("feedback.correct")
                  : t("feedback.incorrectWithAnswer", { answer: revealDisplay })}
              </span>
            </div>
          ) : null}

          {checked && item.explanation ? (
            <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {item.explanation}
            </p>
          ) : null}
        </form>
      </div>

      <div className="flex flex-col items-center gap-4 pt-2 sm:gap-5">
        <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-3">
          {checked ? (
            <Button type="button" onClick={onNext} className="h-11 w-full sm:h-9 sm:w-auto">
              {t("next")}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={check}
              disabled={!value.trim()}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              {t("check")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
