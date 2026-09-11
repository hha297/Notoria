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
  });
  const prefixText = scrubbed.prefix;
  const suffixText = scrubbed.suffix;
  const displayHint = scrubbed.hint;
  const revealDisplay = revealTextForExercise({
    ...item,
    prefix: scrubbed.prefix || undefined,
    suffix: scrubbed.suffix || undefined,
    hint: scrubbed.hint,
    sentence: scrubbed.sentence,
    completedSentence: item.completedSentence ?? scrubbed.completedSentence,
  });
  const blankMinWidth = Math.max(item.answer.length + 2, 6);

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
    <div className="space-y-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-hairline-cloud bg-card p-6 shadow-xl shadow-ink/5 sm:p-10 md:p-12">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-mid">
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
          <div className="rounded-2xl border border-hairline-cloud bg-muted/20 px-5 py-10 sm:px-8 sm:py-12 md:py-14">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 text-center leading-snug">
              {prefixText ? (
                <span className="text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                  {prefixText}
                </span>
              ) : null}

              <span
                className="inline-flex shrink-0 items-center justify-center"
                style={{ minWidth: `${blankMinWidth}ch` }}
              >
                {checked ? (
                  <span
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xl font-semibold sm:text-2xl md:text-3xl",
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
                      "h-12 min-w-full rounded-xl border-2 border-dashed border-accent-lime/50 bg-background/90 px-4",
                      "text-center text-xl font-semibold text-ink shadow-sm sm:h-14 sm:text-2xl md:text-3xl",
                      "placeholder:text-muted-foreground/40",
                      "focus-visible:border-accent-lime focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent-lime/20",
                    )}
                  />
                )}
              </span>

              {item.sourceWord ? (
                <span className="text-xl font-medium text-muted-foreground sm:text-2xl md:text-3xl">
                  ({item.sourceWord})
                </span>
              ) : null}

              {suffixText ? (
                <span className="text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                  {suffixText}
                </span>
              ) : null}
            </div>

            {checked && sentenceMeaning ? (
              <p className="mt-6 text-center text-base leading-relaxed text-ink/75 sm:text-lg">
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
            <HintText text={displayHint} />
          </ExerciseHint>

          {checked ? (
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium sm:text-base",
                isCorrect ? "bg-[#f4fae0] text-[#4a6b0a]" : "bg-[#fff1f6] text-[#c7366a]",
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : (
                <XCircle className="size-5 shrink-0" />
              )}
              {isCorrect
                ? t("feedback.correct")
                : t("feedback.incorrectWithAnswer", { answer: revealDisplay })}
            </div>
          ) : null}

          {checked && item.explanation ? (
            <p className="text-sm text-muted-foreground">{item.explanation}</p>
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
