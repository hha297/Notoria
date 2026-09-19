"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import {
  applyAnswerFormCasing,
  blankMeaningHintFromItem,
  splitPromptAtBlank,
} from "@/lib/exercises/blank-hint";
import { hintInitialLetter } from "@/lib/exercises/hint";
import type { TypeAnswerItem } from "@/lib/exercises/type-answer";
import { cn } from "@/lib/utils";

type TypeAnswerStageProps = {
  item: TypeAnswerItem;
  promptLabel: string;
  input: string;
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  onInputChange: (value: string) => void;
  onCheck: () => void;
  onRevealAnswer: () => void;
};

export function TypeAnswerStage({
  item,
  promptLabel,
  input,
  revealed,
  peeked,
  isCorrect,
  onInputChange,
  onCheck,
  onRevealAnswer,
}: TypeAnswerStageProps) {
  const t = useTranslations("exercises.typeAnswer");
  const tHint = useTranslations("exercises.timedHint");
  const tAi = useTranslations("exercises.ai");
  const tType = useTranslations("exercises.types.type-answer");
  const reduceMotion = useReducedMotion();
  const expected = item.answerDisplay;
  const cue = blankMeaningHintFromItem(item);
  const sentenceMeaning = item.sentenceMeaning?.trim() || "";
  const isContextual = item.direction === "CONTEXTUAL";
  const filledText = revealed ? (isCorrect ? input : expected) : "";
  const showUserAttempt =
    revealed && !peeked && !isCorrect && input.trim().length > 0;
  const split = isContextual ? splitPromptAtBlank(item.prompt) : null;

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
        className="pointer-events-none absolute inset-x-0 -top-8 h-44 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_72%)] opacity-80 dark:opacity-60"
      />

      <div className="relative">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {tType("label")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {promptLabel}
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
            if (!revealed) onCheck();
          }}
          className="mt-8 sm:mt-12"
        >
          {split ? (
            <ContextualPrompt
              before={split.before}
              after={split.after}
              cue={cue}
              value={input}
              filledText={
                filledText
                  ? applyAnswerFormCasing(item.prompt, filledText)
                  : ""
              }
              revealed={revealed}
              peeked={peeked}
              isCorrect={isCorrect}
              placeholder={t("placeholder")}
              reduceMotion={Boolean(reduceMotion)}
              onChange={onInputChange}
            />
          ) : (
            <RecallPrompt
              prompt={item.prompt}
              value={input}
              filledText={filledText}
              revealed={revealed}
              peeked={peeked}
              isCorrect={isCorrect}
              placeholder={t("placeholder")}
              reduceMotion={Boolean(reduceMotion)}
              onChange={onInputChange}
            />
          )}

          <AnimatePresence>
            {revealed && sentenceMeaning ? (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground wrap-anywhere sm:text-[0.9375rem]"
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
            yourAnswerLabel={t("yourAnswer")}
            correctAnswerLabel={t("correctAnswer")}
            correctLabel={t("correct")}
            incorrectLabel={t("incorrect")}
            reduceMotion={Boolean(reduceMotion)}
          />

          <div className="mt-8">
            <ExerciseHint
              resetKey={item.id}
              answered={revealed}
              correctAnswer={expected}
              onRevealAnswer={onRevealAnswer}
            >
              {tHint("startsWith", {
                letter: hintInitialLetter(expected),
              })}
            </ExerciseHint>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function ContextualPrompt({
  before,
  after,
  cue,
  value,
  filledText,
  revealed,
  peeked,
  isCorrect,
  placeholder,
  reduceMotion,
  onChange,
}: {
  before: string;
  after: string;
  cue: string | null;
  value: string;
  filledText: string;
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  placeholder: string;
  reduceMotion: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
      />
      <p
        className={cn(
          "min-w-0 pl-4 font-heading text-[1.5rem] font-semibold tracking-tight text-pretty wrap-break-word text-ink sm:pl-5 sm:text-[1.95rem] md:text-[2.2rem]",
          cue ? "leading-[1.9]" : "leading-normal",
        )}
      >
        {before}
        <BlankSlot
          value={value}
          filledText={filledText}
          revealed={revealed}
          peeked={peeked}
          isCorrect={isCorrect}
          cue={cue}
          placeholder={placeholder}
          reduceMotion={reduceMotion}
          onChange={onChange}
        />
        {after}
      </p>
    </div>
  );
}

function RecallPrompt({
  prompt,
  value,
  filledText,
  revealed,
  peeked,
  isCorrect,
  placeholder,
  reduceMotion,
  onChange,
}: {
  prompt: string;
  value: string;
  filledText: string;
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  placeholder: string;
  reduceMotion: boolean;
  onChange: (value: string) => void;
}) {
  const tone = revealed
    ? peeked
      ? "reveal"
      : isCorrect
        ? "success"
        : "error"
    : "idle";

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
      />
      <div className="min-w-0 pl-4 sm:pl-5">
        <p className="font-heading text-[1.85rem] font-semibold tracking-tight text-pretty wrap-break-word text-ink sm:text-[2.25rem] md:text-[2.55rem] md:leading-[1.2]">
          {prompt}
        </p>
        <div
          className={cn(
            "mt-10 w-full max-w-xl",
            revealed && tone === "error" && !reduceMotion && "exercise-shake",
          )}
        >
          <div
            className={cn(
              "relative border-b-2 transition-colors duration-200",
              tone === "idle" &&
                "border-(--exercise-accent) has-focus-visible:border-b-[3px]",
              tone === "success" && "border-success",
              tone === "error" && "border-error",
              tone === "reveal" && "border-(--exercise-accent)",
            )}
          >
            {revealed ? (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "flex min-h-11 items-end gap-2 pb-2 font-heading text-2xl font-semibold tracking-tight wrap-anywhere sm:min-h-12 sm:text-[1.85rem]",
                  tone === "success" && "text-success",
                  tone === "error" && "text-ink",
                  tone === "reveal" && "text-(--exercise-accent)",
                )}
              >
                <span>{filledText || "\u00a0"}</span>
                {tone === "success" ? (
                  <Check className="mb-1 size-5 shrink-0" strokeWidth={2.6} />
                ) : null}
              </motion.p>
            ) : (
              <RecallField
                value={value}
                placeholder={placeholder}
                onChange={onChange}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 -bottom-0.5 h-2 bg-(--exercise-accent)/20 blur-[6px] transition-opacity duration-200",
                revealed || value ? "opacity-0" : "opacity-100",
              )}
            />
          </div>
        </div>
      </div>
    </div>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tone = revealed
    ? peeked
      ? "reveal"
      : isCorrect
        ? "success"
        : "error"
    : "idle";
  const displayLength = revealed ? filledText.length : value.length;
  const widthCh = Math.min(32, Math.max(8, displayLength + 1));

  useEffect(() => {
    if (!revealed) inputRef.current?.focus();
  }, [revealed]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || revealed) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, revealed]);

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
            transition={{
              duration: reduceMotion ? 0 : 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "inline-flex max-w-full items-baseline gap-1.5 px-0.5 text-center font-medium wrap-anywhere",
              tone === "success" && "text-success",
              tone === "error" && "text-ink",
              tone === "reveal" && "text-(--exercise-accent)",
            )}
          >
            {filledText || "\u00a0"}
            {tone === "success" ? (
              <Check className="mb-0.5 size-4 shrink-0" strokeWidth={2.6} />
            ) : null}
          </motion.span>
        ) : (
          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            onFocus={(event) => {
              event.currentTarget.scrollIntoView({
                block: "center",
                behavior: reduceMotion ? "auto" : "smooth",
              });
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            aria-label={placeholder}
            className="m-0 max-w-full resize-none overflow-hidden bg-transparent p-0 text-center text-[1em] leading-[1.15] font-heading font-semibold tracking-tight text-(--exercise-accent) caret-(--exercise-accent) outline-none placeholder:text-(--exercise-accent)/30"
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

function RecallField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 44)}px`;
  }, [value]);

  return (
    <textarea
      ref={inputRef}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }}
      onFocus={(event) => {
        event.currentTarget.scrollIntoView({
          block: "center",
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      enterKeyHint="done"
      aria-label={placeholder}
      placeholder={placeholder}
      className="m-0 min-h-11 w-full resize-none overflow-hidden bg-transparent py-2 font-heading text-2xl font-semibold tracking-tight text-(--exercise-accent) caret-(--exercise-accent) outline-none placeholder:font-medium placeholder:text-(--exercise-accent)/28 sm:min-h-12 sm:text-[1.85rem]"
    />
  );
}

function AnswerFeedback({
  revealed,
  peeked,
  isCorrect,
  expected,
  showUserAttempt,
  userInput,
  yourAnswerLabel,
  correctAnswerLabel,
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
  yourAnswerLabel: string;
  correctAnswerLabel: string;
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
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            delay: reduceMotion ? 0 : 0.04,
          }}
          className="mt-6"
          aria-live="polite"
        >
          {peeked ? (
            <p className="text-sm text-muted-foreground">
              {incorrectLabel}
              <span className="mt-1 block font-heading text-base font-semibold text-ink wrap-anywhere">
                {expected}
              </span>
            </p>
          ) : isCorrect ? (
            <p className="text-sm font-medium tracking-wide text-success">
              {correctLabel}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-error">{incorrectLabel}</p>
              {showUserAttempt ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="sr-only">{yourAnswerLabel}: </span>
                  <span className="line-through decoration-error/70 wrap-anywhere">
                    {userInput}
                  </span>
                  <span className="mx-2 text-muted-foreground/50" aria-hidden>
                    →
                  </span>
                  <span className="sr-only">{correctAnswerLabel}: </span>
                  <span className="font-medium text-ink wrap-anywhere">
                    {expected}
                  </span>
                </p>
              ) : (
                <p className="font-heading text-base font-semibold text-ink wrap-anywhere">
                  {expected}
                </p>
              )}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
