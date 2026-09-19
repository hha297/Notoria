"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import type { FormSentenceItem } from "@/lib/exercises/form-sentence";
import {
  FORM_SENTENCE_MAX_LENGTH,
  type FormSentenceAiResult,
} from "@/lib/exercises/form-sentence-ai-types";
import { cn } from "@/lib/utils";

type FormSentenceFeedback = FormSentenceAiResult & {
  sentence: string;
  saved: boolean;
};

type FormSentenceStageProps = {
  item: FormSentenceItem;
  input: string;
  feedback: FormSentenceFeedback | null;
  evaluating: boolean;
  onInputChange: (value: string) => void;
  onInsertWord: () => void;
};

export function FormSentenceStage({
  item,
  input,
  feedback,
  evaluating,
  onInputChange,
  onInsertWord,
}: FormSentenceStageProps) {
  const t = useTranslations("exercises.formSentence");
  const tType = useTranslations("exercises.types.form-sentence");
  const reduceMotion = useReducedMotion();
  const locked = Boolean(feedback) || evaluating;
  const wordPlaced = wordAppearsIn(input, item.word);

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
        className="pointer-events-none absolute inset-x-0 -top-8 h-48 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_74%)] opacity-80 dark:opacity-60"
      />

      <div className="relative space-y-8 sm:space-y-10">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {tType("label")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t("prompt")}
            </p>
          </div>
        </header>

        <WordBank
          word={item.word}
          meaning={item.meaning}
          partOfSpeech={item.partOfSpeech}
          placed={wordPlaced}
          disabled={locked}
          vocabularyLabel={t("vocabularyLabel")}
          meaningLabel={t("meaningLabel")}
          insertLabel={t("insertWord")}
          reduceMotion={Boolean(reduceMotion)}
          onInsert={onInsertWord}
        />

        <SentenceCanvas
          input={input}
          feedback={feedback}
          evaluating={evaluating}
          vocabWord={item.word}
          locked={locked}
          placeholder={t("placeholder")}
          evaluatingLabel={t("evaluating")}
          yourSentenceLabel={t("yourSentence")}
          reduceMotion={Boolean(reduceMotion)}
          onInputChange={onInputChange}
        />

        <AnimatePresence>
          {feedback ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <FeedbackPanel
                feedback={feedback}
                vocabWord={item.word}
                correctLabel={t("correct")}
                incorrectLabel={t("incorrect")}
                correctedLabel={t("corrected")}
                betterLabel={t("betterSuggestion")}
                meaningLabel={t("sentenceMeaning")}
                reduceMotion={Boolean(reduceMotion)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SentenceCanvas({
  input,
  feedback,
  evaluating,
  vocabWord,
  locked,
  placeholder,
  evaluatingLabel,
  yourSentenceLabel,
  reduceMotion,
  onInputChange,
}: {
  input: string;
  feedback: FormSentenceFeedback | null;
  evaluating: boolean;
  vocabWord: string;
  locked: boolean;
  placeholder: string;
  evaluatingLabel: string;
  yourSentenceLabel: string;
  reduceMotion: boolean;
  onInputChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displaySentence = feedback?.sentence ?? input;
  const tone = feedback
    ? feedback.isCorrect
      ? "success"
      : "error"
    : evaluating
      ? "busy"
      : "idle";

  useEffect(() => {
    if (!locked) textareaRef.current?.focus();
  }, [locked]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || locked) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [input, locked]);

  return (
    <section
      aria-label={yourSentenceLabel}
      className={cn(
        "relative overflow-hidden transition-colors duration-200",
        tone === "success" && "bg-success-muted/40",
        tone === "error" && "bg-error-muted/25",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-0 h-full w-0.75 transition-colors duration-200",
          tone === "success" && "bg-success",
          tone === "error" && "bg-error",
          tone === "busy" && "bg-(--exercise-accent)/50",
          tone === "idle" && "bg-(--exercise-accent)",
        )}
      />

      <div
        className={cn(
          "relative min-h-40 px-4 py-5 sm:min-h-48 sm:px-6 sm:py-6",
          "bg-[repeating-linear-gradient(transparent,transparent_calc(2.5rem-1px),color-mix(in_oklab,var(--ink)_9%,transparent)_calc(2.5rem-1px),color-mix(in_oklab,var(--ink)_9%,transparent)_2.5rem)]",
        )}
      >
        {feedback ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0.65, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "font-heading text-[1.35rem] leading-10 font-semibold tracking-tight text-pretty wrap-break-word sm:text-[1.6rem] sm:leading-10",
              feedback.isCorrect ? "text-ink" : "text-ink/90",
            )}
          >
            <SentenceWords
              sentence={displaySentence}
              vocabWord={vocabWord}
              emphasizeVocab={feedback.isCorrect}
            />
            {feedback.isCorrect ? (
              <Check
                className="ml-2 inline size-5 -translate-y-0.5 text-success"
                strokeWidth={2.6}
                aria-hidden
              />
            ) : null}
          </motion.p>
        ) : (
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={placeholder}
            maxLength={FORM_SENTENCE_MAX_LENGTH}
            disabled={evaluating}
            autoComplete="off"
            spellCheck={false}
            aria-label={yourSentenceLabel}
            className="relative min-h-40 w-full resize-none bg-transparent font-heading text-[1.35rem] leading-10 font-semibold tracking-tight text-ink caret-(--exercise-accent) outline-none placeholder:font-medium placeholder:text-muted-foreground/55 disabled:cursor-wait sm:min-h-48 sm:text-[1.6rem] sm:leading-10"
          />
        )}

        {evaluating ? (
          <div className="absolute inset-0 flex items-end justify-start bg-background/45 px-4 py-5 backdrop-blur-[1px] sm:px-6 sm:py-6">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {evaluatingLabel}
            </p>
          </div>
        ) : null}
      </div>

      {!feedback ? (
        <p className="px-4 pb-3 text-right font-mono text-[11px] tabular-nums text-muted-foreground/80 sm:px-6">
          {input.trim().length}/{FORM_SENTENCE_MAX_LENGTH}
        </p>
      ) : null}
    </section>
  );
}

function WordBank({
  word,
  meaning,
  partOfSpeech,
  placed,
  disabled,
  vocabularyLabel,
  meaningLabel,
  insertLabel,
  reduceMotion,
  onInsert,
}: {
  word: string;
  meaning: string;
  partOfSpeech: string | null;
  placed: boolean;
  disabled: boolean;
  vocabularyLabel: string;
  meaningLabel: string;
  insertLabel: string;
  reduceMotion: boolean;
  onInsert: () => void;
}) {
  return (
    <section aria-label={vocabularyLabel} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {vocabularyLabel}
        </p>
        {partOfSpeech ? (
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {partOfSpeech}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <motion.button
          type="button"
          onClick={onInsert}
          disabled={disabled}
          aria-label={insertLabel}
          aria-pressed={placed}
          whileTap={disabled || reduceMotion ? undefined : { scale: 0.97, y: 1 }}
          className={cn(
            "relative max-w-full border px-3.5 py-2 text-left font-heading text-lg font-semibold tracking-tight wrap-anywhere transition-[transform,box-shadow,background-color,border-color,opacity] duration-150",
            "focus-visible:ring-2 focus-visible:ring-(--exercise-accent) focus-visible:ring-offset-2 focus-visible:outline-none",
            disabled
              ? "cursor-not-allowed border-hairline-cloud bg-muted/30 text-muted-foreground opacity-70"
              : placed
                ? "border-(--exercise-accent)/35 bg-(--exercise-accent-soft) text-ink shadow-[0_1px_0_color-mix(in_oklab,var(--ink)_8%,transparent)]"
                : "border-(--exercise-accent)/45 bg-background text-ink shadow-[0_2px_0_color-mix(in_oklab,var(--ink)_12%,transparent)] hover:-translate-y-0.5 hover:border-(--exercise-accent) hover:shadow-[0_3px_0_color-mix(in_oklab,var(--ink)_14%,transparent)]",
          )}
        >
          {word}
        </motion.button>
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground wrap-anywhere">
        <span className="sr-only">{meaningLabel}: </span>
        {meaning}
      </p>
    </section>
  );
}

function FeedbackPanel({
  feedback,
  vocabWord,
  correctLabel,
  incorrectLabel,
  correctedLabel,
  betterLabel,
  meaningLabel,
  reduceMotion,
}: {
  feedback: FormSentenceFeedback;
  vocabWord: string;
  correctLabel: string;
  incorrectLabel: string;
  correctedLabel: string;
  betterLabel: string;
  meaningLabel: string;
  reduceMotion: boolean;
}) {
  return (
    <div className="space-y-4" aria-live="polite">
      <p
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium",
          feedback.isCorrect ? "text-success" : "text-error",
        )}
      >
        {feedback.isCorrect ? (
          <Check className="size-4" strokeWidth={2.6} />
        ) : (
          <X className="size-4" strokeWidth={2.4} />
        )}
        {feedback.isCorrect ? correctLabel : incorrectLabel}
      </p>

      {!feedback.isCorrect && feedback.correctedSentence ? (
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {correctedLabel}
          </p>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="font-heading text-xl leading-snug font-semibold tracking-tight text-ink wrap-break-word sm:text-[1.35rem]"
          >
            <SentenceWords
              sentence={feedback.correctedSentence}
              vocabWord={vocabWord}
              emphasizeVocab
            />
          </motion.p>
        </div>
      ) : null}

      {feedback.betterSuggestion ? (
        <p className="text-sm leading-relaxed text-muted-foreground wrap-anywhere">
          <span className="font-medium text-ink">{betterLabel}: </span>
          {feedback.betterSuggestion}
        </p>
      ) : null}

      {feedback.sentenceMeaning ? (
        <p className="text-sm leading-relaxed text-muted-foreground wrap-anywhere">
          <span className="font-medium text-ink">{meaningLabel}: </span>
          {feedback.sentenceMeaning}
        </p>
      ) : null}

      {feedback.grammarExplanation ? (
        <p className="text-sm leading-relaxed text-muted-foreground wrap-anywhere">
          {feedback.grammarExplanation}
        </p>
      ) : null}
    </div>
  );
}

function SentenceWords({
  sentence,
  vocabWord,
  emphasizeVocab,
}: {
  sentence: string;
  vocabWord: string;
  emphasizeVocab: boolean;
}) {
  const parts = sentence.split(/(\s+)/);

  return (
    <>
      {parts.map((part, index) => {
        if (/^\s+$/.test(part)) {
          return <span key={`s-${index}`}>{part}</span>;
        }
        const isVocab = emphasizeVocab && isSameWordToken(part, vocabWord);
        return (
          <span
            key={`w-${index}`}
            className={cn(
              "inline",
              isVocab &&
                "underline decoration-(--exercise-accent)/70 decoration-2 underline-offset-[0.28em]",
            )}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

function wordAppearsIn(sentence: string, word: string) {
  const target = word.trim().toLocaleLowerCase();
  if (!target) return false;
  return sentence
    .split(/\s+/)
    .some((token) => isSameWordToken(token, word));
}

function isSameWordToken(token: string, word: string) {
  const stripped = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!stripped) return false;
  return stripped.localeCompare(word.trim(), undefined, {
    sensitivity: "accent",
  }) === 0;
}
