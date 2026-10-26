"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Sparkles, XCircle } from "lucide-react";
import { ProgressiveHintReveal } from "@/components/exercises/progressive-hint-reveal";
import {
  applyAnswerFormCasing,
  splitPromptAtBlank,
} from "@/lib/exercises/blank-hint";
import {
  contextualSurfaceAnswer,
  displayContextualOption,
  type MultipleChoiceQuestion,
} from "@/lib/exercises/multiple-choice";
import { EXERCISE_SET_QUESTION_CARD_CLASS } from "@/components/exercises/exercise-set-question-card";
import featureStyles from "@/components/style/exercises/session.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type MultipleChoiceStageProps = {
  question: MultipleChoiceQuestion;
  promptLabel: string;
  selected: string | null;
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  onPick: (option: string) => void;
  /** Omit in set-answering mode so answers are not revealed before submit. */
  onRevealAnswer?: () => void;
  /** 1-based index when rendering a full set list. */
  number?: number;
  unanswered?: boolean;
};

export function MultipleChoiceStage({
  question,
  promptLabel,
  selected,
  revealed,
  peeked,
  isCorrect,
  onPick,
  onRevealAnswer,
  number,
  unanswered = false,
}: MultipleChoiceStageProps) {
  const t = useTranslations("exercises.multipleChoice");
  const tSession = useTranslations("exercises.session");
  const tType = useTranslations("exercises.types.multiple-choice");
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const surface = contextualSurfaceAnswer(question);
  const cue = question.meaningHint?.trim() || null;
  const sentenceMeaning = question.sentenceMeaning?.trim() || "";

  const inSetList = typeof number === "number";

  return (
    <motion.article
      id={`mc-q-${question.id}`}
      data-question-id={question.id}
      key={question.id}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
      }
      className={
        inSetList
          ? EXERCISE_SET_QUESTION_CARD_CLASS
          : "relative mx-auto w-full min-w-0 max-w-3xl"
      }
    >
      {!inSetList ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_72%)] opacity-90 dark:opacity-70"
        />
      ) : null}

      <div className="relative">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {inSetList ? (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
                  {number}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {promptLabel}
                </span>
              </p>
            ) : (
              <>
                <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
                  {tType("label")}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {promptLabel}
                </p>
              </>
            )}
          </div>
          {question.aiGenerated ? (
            <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <Sparkles className="size-3" />
              {tAi("generated")}
            </p>
          ) : null}
        </header>

        <div className="relative mt-8 sm:mt-11">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
          />
          <div className="min-w-0 pl-4 sm:pl-5">
            {question.direction === "CONTEXTUAL" ? (
              <ContextualPrompt
                prompt={question.prompt}
                cue={cue}
                fill={surface}
                revealed={revealed}
                isCorrect={isCorrect}
                reduceMotion={Boolean(reduceMotion)}
              />
            ) : (
              <p className="font-heading text-[1.5rem] leading-[1.45] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.9rem] md:text-[2.15rem]">
                {question.prompt}
              </p>
            )}

            <AnimatePresence>
              {revealed && sentenceMeaning ? (
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
          </div>
        </div>

        {!revealed ? (
          <ProgressiveHintReveal
            hints={question.hints}
            grounding={question.meaningHint}
            answers={[surface, ...question.options]}
            resetKey={question.id}
            answered={revealed}
            correctAnswer={onRevealAnswer ? surface : undefined}
            onRevealAnswer={onRevealAnswer}
          />
        ) : null}

        <div
          role="group"
          aria-label={promptLabel}
          className="mt-6 grid grid-cols-1 gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3"
        >
          {question.options.map((option, optionIndex) => {
            const label = displayContextualOption(question, option);
            const isSelected = selected === option;
            const isAnswer = label === surface;
            return (
              <ChoiceOption
                key={option}
                index={optionIndex}
                label={label}
                revealed={revealed}
                peeked={peeked}
                isSelected={isSelected}
                isAnswer={isAnswer}
                reduceMotion={Boolean(reduceMotion)}
                onPick={() => onPick(option)}
              />
            );
          })}
        </div>

        <AnswerCaption
          revealed={revealed}
          peeked={peeked}
          isCorrect={isCorrect}
          unanswered={unanswered}
          surface={surface}
          correctLabel={t("correct")}
          incorrectLabel={t("incorrect", { answer: surface })}
          unansweredLabel={tSession("unanswered")}
          reduceMotion={Boolean(reduceMotion)}
        />
      </div>
    </motion.article>
  );
}

function ContextualPrompt({
  prompt,
  cue,
  fill,
  revealed,
  isCorrect,
  reduceMotion,
}: {
  prompt: string;
  cue: string | null;
  fill: string;
  revealed: boolean;
  isCorrect: boolean;
  reduceMotion: boolean;
}) {
  const split = splitPromptAtBlank(prompt);
  const tone = revealed ? (isCorrect ? "success" : "reveal") : "idle";
  const slotText =
    revealed && fill.trim() ? applyAnswerFormCasing(prompt, fill) : "\u00a0";

  if (!split) {
    return (
      <p className="font-heading text-[1.5rem] leading-[1.45] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.9rem] md:text-[2.15rem]">
        {prompt}
      </p>
    );
  }

  return (
    <p
      className={cn(
        "font-heading text-[1.5rem] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.9rem] md:text-[2.15rem]",
        cue ? "leading-[1.85]" : "leading-[1.45]",
      )}
    >
      {split.before}
      <span className="inline-flex max-w-full flex-col items-center align-baseline">
        <span
          className={cn(
            "relative inline-flex min-w-26 max-w-full items-end justify-center border-b-2 px-1.5 transition-colors duration-200",
            tone === "idle" && "border-(--exercise-accent)",
            tone === "success" && "border-success",
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
                tone === "reveal" && "text-(--exercise-accent)",
              )}
            >
              {slotText}
              {tone === "success" ? (
                <Check className="mb-0.5 size-4 shrink-0" strokeWidth={2.6} />
              ) : null}
            </motion.span>
          ) : (
            <span className="inline-block min-h-[1.15em] min-w-[3ch]" aria-hidden>
              {"\u00a0"}
            </span>
          )}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 -bottom-0.5 h-2 bg-(--exercise-accent)/20 blur-[6px] transition-opacity duration-200",
              revealed ? "opacity-0" : "opacity-100",
            )}
          />
        </span>
        {cue ? (
          <span className="mt-2 max-w-[min(100%,16rem)] text-center text-sm leading-snug font-medium text-muted-foreground wrap-anywhere">
            {cue}
          </span>
        ) : null}
      </span>
      {split.after}
    </p>
  );
}

function ChoiceOption({
  index,
  label,
  revealed,
  peeked,
  isSelected,
  isAnswer,
  reduceMotion,
  onPick,
}: {
  index: number;
  label: string;
  revealed: boolean;
  peeked: boolean;
  isSelected: boolean;
  isAnswer: boolean;
  reduceMotion: boolean;
  onPick: () => void;
}) {
  const showCorrect = revealed && isAnswer && !peeked;
  const showWrong = revealed && isSelected && !isAnswer && !peeked;
  const showReveal = revealed && peeked && isAnswer;
  const dimmed = revealed && !isSelected && !isAnswer;
  const mark = String(index + 1).padStart(2, "0");

  return (
    <motion.button
      type="button"
      disabled={revealed}
      onClick={onPick}
      aria-pressed={isSelected}
      aria-label={`${index + 1}. ${label}`}
      whileHover={reduceMotion || revealed ? undefined : { y: -1 }}
      whileTap={reduceMotion || revealed ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "relative flex min-h-14 min-w-0 cursor-pointer items-center gap-3 overflow-hidden border px-4 py-3.5 text-left",
        "sm:min-h-25 sm:flex-col sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-default",
        !revealed &&
          !isSelected &&
          "border-hairline-cloud control-surface shadow-sm shadow-ink/4 hover:border-(--exercise-accent)/55 hover:bg-(--exercise-accent-soft)/70 hover:shadow-md hover:shadow-ink/6",
        !revealed &&
          isSelected &&
          "border-(--exercise-accent) [background-image:none] bg-[color-mix(in_oklab,var(--exercise-accent)_24%,var(--exercise-accent-soft))] shadow-sm",
        showCorrect &&
          "border-success-border bg-success-muted/80 text-success shadow-sm",
        showWrong &&
          "border-error-border bg-error-muted/80 text-error shadow-sm",
        showReveal &&
          "border-(--exercise-accent) bg-(--exercise-accent-soft) text-ink shadow-sm",
        dimmed && "opacity-40",
        showWrong && !reduceMotion && mx(featureStyles, "exercise-shake"),
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.75",
          !revealed && isSelected && "bg-(--exercise-accent)",
          showCorrect && "bg-success",
          showWrong && "bg-error",
          showReveal && "bg-(--exercise-accent)",
        )}
      />
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center self-center font-mono text-[11px] leading-none tracking-wide tabular-nums",
          "sm:size-auto sm:justify-start sm:self-auto sm:text-[0.68rem] sm:tracking-[0.18em]",
          showCorrect
            ? "text-success"
            : showWrong
              ? "text-error"
              : "text-(--exercise-accent)",
        )}
      >
        {showCorrect || showReveal ? (
          <Check className="size-3.5 sm:size-4" strokeWidth={2.6} />
        ) : (
          mark
        )}
      </span>
      <span className="min-w-0 self-center font-heading text-[1.05rem] leading-snug font-semibold tracking-tight wrap-anywhere sm:self-auto sm:text-[1.2rem]">
        {label}
      </span>
    </motion.button>
  );
}

function AnswerCaption({
  revealed,
  peeked,
  isCorrect,
  unanswered,
  correctLabel,
  incorrectLabel,
  unansweredLabel,
  reduceMotion,
}: {
  revealed: boolean;
  peeked: boolean;
  isCorrect: boolean;
  unanswered: boolean;
  surface: string;
  correctLabel: string;
  incorrectLabel: string;
  unansweredLabel: string;
  reduceMotion: boolean;
}) {
  return (
    <AnimatePresence>
      {revealed ? (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className={cn(
            "mt-5 inline-flex items-center gap-1.5 text-sm font-medium wrap-anywhere",
            unanswered
              ? "font-semibold text-warning"
              : peeked || !isCorrect
                ? "text-muted-foreground"
                : "text-success",
          )}
          aria-live="polite"
        >
          {unanswered ? (
            <>
              <XCircle className="size-4 shrink-0" strokeWidth={2.4} />
              {unansweredLabel}
            </>
          ) : peeked || !isCorrect ? (
            incorrectLabel
          ) : (
            correctLabel
          )}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
