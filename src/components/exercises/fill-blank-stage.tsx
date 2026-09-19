"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import {
  blankMeaningHintFromItem,
} from "@/lib/exercises/blank-hint";
import {
  expectedFillBlankAnswer,
  type FillBlankItem,
} from "@/lib/exercises/fill-blank";
import { cn } from "@/lib/utils";

type FillBlankStageProps = {
  item: FillBlankItem;
  input: string;
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  onInputChange: (value: string) => void;
  onCheck: () => void;
  onRevealAnswer: () => void;
};

export function FillBlankStage({
  item,
  input,
  revealed,
  peeked,
  isCorrect,
  onInputChange,
  onCheck,
  onRevealAnswer,
}: FillBlankStageProps) {
  const t = useTranslations("exercises.fillInBlank");
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const expected = expectedFillBlankAnswer(item);
  const cue = blankMeaningHintFromItem(item);
  const sentenceMeaning = item.sentenceMeaning?.trim() || "";
  const afterText = item.sentenceAfter?.trim() || "";
  const trailingPunctuation = /^[.!?…]+$/.test(afterText) ? afterText : "";
  const bodyAfter = trailingPunctuation ? "" : item.sentenceAfter;
  const filledText = revealed ? (isCorrect ? input : expected) : "";
  const showUserAttempt =
    revealed && !peeked && !isCorrect && input.trim().length > 0;

  return (
    <motion.div
      key={item.id}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
      }
      className="relative mx-auto w-full min-w-0 max-w-3xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_72%)] opacity-90 dark:opacity-70"
      />

      <div className="relative">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {t("prompt")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.instruction?.trim() || t("instruction")}
            </p>
          </div>
          {item.aiGenerated ? (
            <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <Sparkles className="size-3" />
              {tAi("generated")}
            </p>
          ) : null}
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onCheck();
          }}
          className="mt-8 sm:mt-10"
        >
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
            />
            <div className="min-w-0 pl-4 sm:pl-5">
              <p
                className={cn(
                  "font-heading text-[1.5rem] font-semibold tracking-tight text-pretty wrap-break-word text-ink sm:text-[1.9rem] md:text-[2.15rem]",
                  cue ? "leading-[1.85]" : "leading-[1.45]",
                )}
              >
                {item.sentenceBefore ? (
                  <>
                    {item.sentenceBefore}
                    {/\s$/u.test(item.sentenceBefore) ? null : " "}
                  </>
                ) : null}
                <BlankSlot
                  value={input}
                  filledText={filledText}
                  revealed={revealed}
                  peeked={peeked}
                  isCorrect={isCorrect}
                  cue={cue}
                  placeholder={t("placeholder")}
                  reduceMotion={Boolean(reduceMotion)}
                  onChange={onInputChange}
                />
                {bodyAfter ? (
                  <>
                    {/^\s/u.test(bodyAfter) ? null : " "}
                    {bodyAfter}
                  </>
                ) : null}
                {trailingPunctuation}
              </p>

              <AnimatePresence>
                {revealed && item.aiGenerated && sentenceMeaning ? (
                  <motion.p
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground wrap-anywhere sm:text-[0.9375rem]"
                  >
                    {sentenceMeaning}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <AnswerFeedback
                revealed={revealed}
                peeked={peeked}
                isCorrect={isCorrect}
                expected={expected}
                showUserAttempt={showUserAttempt}
                userInput={input}
                correctLabel={t("correct")}
                incorrectLabel={t("incorrect", { answer: expected })}
                reduceMotion={Boolean(reduceMotion)}
              />
            </div>
          </div>

          <div className="mt-8">
            <ExerciseHint
              resetKey={item.id}
              answered={revealed}
              correctAnswer={expected}
              onRevealAnswer={onRevealAnswer}
            />
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function BlankSlot({
  value,
  filledText,
  revealed,
  peeked,
  isCorrect,
  cue,
  placeholder,
  reduceMotion,
  onChange,
}: {
  value: string;
  filledText: string;
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  cue: string | null;
  placeholder: string;
  reduceMotion: boolean;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tone = revealed
    ? peeked
      ? "reveal"
      : isCorrect
        ? "success"
        : "error"
    : "idle";
  const displayLength = revealed ? filledText.length : value.length;
  const widthCh = Math.min(28, Math.max(8, displayLength + 1));

  useEffect(() => {
    if (!revealed) inputRef.current?.focus();
  }, [revealed]);

  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-col items-center align-baseline",
        revealed && tone === "error" && !reduceMotion && "exercise-shake",
      )}
    >
      <span
        className={cn(
          "relative inline-flex max-w-full min-w-26 items-end justify-center border-b-2 px-1.5 transition-colors duration-200",
          tone === "idle" &&
            "border-(--exercise-accent) has-focus-visible:border-b-[3px]",
          tone === "success" && "border-success",
          tone === "error" && "border-error",
          tone === "reveal" && "border-(--exercise-accent)",
        )}
      >
        {revealed ? (
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "inline-flex max-w-full items-baseline gap-1.5 px-0.5 text-center font-medium wrap-anywhere",
              tone === "success" && "text-success",
              tone === "error" && "text-error",
              tone === "reveal" && "text-(--exercise-accent)",
            )}
          >
            {filledText || "\u00a0"}
            {tone === "success" ? (
              <Check className="mb-0.5 size-4 shrink-0" strokeWidth={2.6} />
            ) : null}
          </motion.span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label={placeholder}
            className="h-[1.15em] max-w-full bg-transparent p-0 text-center text-[1em] leading-none font-heading font-semibold tracking-tight text-(--exercise-accent) caret-(--exercise-accent) outline-none placeholder:text-(--exercise-accent)/30"
            style={{ width: `${widthCh}ch` }}
          />
        )}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-0.5 h-2 bg-(--exercise-accent)/20 blur-[6px] transition-opacity duration-200",
            revealed || value ? "opacity-0" : "opacity-100",
          )}
        />
      </span>
      {cue ? (
        <span className="mt-2 max-w-[min(100%,16rem)] text-center text-sm leading-snug font-medium text-muted-foreground wrap-anywhere">
          {cue}
        </span>
      ) : null}
    </span>
  );
}

function AnswerFeedback({
  revealed,
  peeked,
  isCorrect,
  expected,
  showUserAttempt,
  userInput,
  correctLabel,
  incorrectLabel,
  reduceMotion,
}: {
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  expected: string;
  showUserAttempt: boolean;
  userInput: string;
  correctLabel: string;
  incorrectLabel: string;
  reduceMotion: boolean;
}) {
  return (
    <AnimatePresence>
      {revealed ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.04 }}
          className="mt-5"
          aria-live="polite"
        >
          {peeked ? (
            <p className="text-sm text-muted-foreground">{incorrectLabel}</p>
          ) : isCorrect ? (
            <p className="text-sm font-medium tracking-wide text-success">
              {correctLabel}
            </p>
          ) : (
            <div className="space-y-1">
              {showUserAttempt ? (
                <p className="text-sm text-muted-foreground">
                  <span className="line-through decoration-error/70">
                    {userInput}
                  </span>
                  <span className="mx-2 text-muted-foreground/50">→</span>
                  <span className="font-medium text-ink wrap-anywhere">
                    {expected}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{incorrectLabel}</p>
              )}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
