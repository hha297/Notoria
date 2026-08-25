"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { hintInitialLetter } from "@/lib/exercises/hint";
import { shuffleArray } from "@/lib/exercises/utils";
import { fillBlankAcceptableAnswers } from "@/lib/theory-exercises/patterns";
import type {
  TheoryConceptExercise,
  TheoryExercise,
  TheoryExerciseSession,
  TheoryFillBlankExercise,
  TheoryMatchPairsExercise,
  TheoryMultipleChoiceExercise,
  TheoryTransformationExercise,
  TheoryTrueFalseExercise,
} from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

type TheoryExerciseSessionViewProps = {
  session: TheoryExerciseSession;
};

function answersMatch(input: string, answer: string) {
  return input.trim().toLowerCase() === answer.trim().toLowerCase();
}

function fillBlankMatches(input: string, item: TheoryFillBlankExercise) {
  const acceptable = fillBlankAcceptableAnswers(item.answer, item.prefix
    ? { prefix: item.prefix, suffix: item.suffix, spaced: item.spaced }
    : undefined);
  const normalized = input.trim().toLowerCase();
  return acceptable.some((candidate) => candidate.toLowerCase() === normalized);
}

function fillBlankDisplayAnswer(item: TheoryFillBlankExercise) {
  if (!item.prefix) return item.answer;
  return item.spaced
    ? `${item.prefix} ${item.answer}${item.suffix ?? ""}`
    : `${item.prefix}${item.answer}${item.suffix ?? ""}`;
}

function SkillHeader({
  skillLabel,
  instruction,
  fallbackType,
}: {
  skillLabel?: string;
  instruction?: string;
  fallbackType: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {skillLabel || fallbackType}
      </p>
      {instruction ? (
        <p className="text-sm text-muted-foreground">{instruction}</p>
      ) : null}
    </div>
  );
}

/**
 * Pattern hints are useful for form practice.
 * "Starts with X" is skipped when it just restates the base word's first letter,
 * or when a pattern hint is already shown.
 */
function TheoryHintContent({
  patternHint,
  answer,
  baseWord,
  options,
}: {
  patternHint?: string;
  answer: string;
  baseWord?: string;
  options?: string[];
}) {
  const t = useTranslations("exercises.theory");
  const tHint = useTranslations("exercises.timedHint");

  const letter = hintInitialLetter(answer);
  const baseLetter = baseWord ? hintInitialLetter(baseWord) : "";
  const allOptionsSameInitial =
    options &&
    options.length > 0 &&
    options.every((opt) => hintInitialLetter(opt) === letter);

  const showStartsWith =
    !patternHint &&
    Boolean(letter) &&
    !allOptionsSameInitial &&
    (!baseLetter || baseLetter !== letter);

  if (!patternHint && !showStartsWith) return null;

  return (
    <div className="space-y-1">
      {patternHint ? <p>{t("endingHint", { hint: patternHint })}</p> : null}
      {showStartsWith ? (
        <p>{tHint("startsWith", { letter })}</p>
      ) : null}
    </div>
  );
}

export function TheoryExerciseSessionView({ session }: TheoryExerciseSessionViewProps) {
  const t = useTranslations("exercises.theory");
  const tSession = useTranslations("exercises.session");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [pool, setPool] = useState<TheoryExercise[]>(session.items);
  const [items, setItems] = useState<TheoryExercise[]>(() => shuffleArray(session.items));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [complete, setComplete] = useState(false);
  const [round, setRound] = useState(0);
  const [enhancing, setEnhancing] = useState(false);

  const restart = useCallback(
    (nextPool?: TheoryExercise[]) => {
      const source = nextPool ?? pool;
      setItems(shuffleArray(source));
      setIndex(0);
      setScore({ correct: 0, answered: 0 });
      setComplete(false);
      setRound((r) => r + 1);
    },
    [pool],
  );

  useEffect(() => {
    setPool(session.items);
    setItems(shuffleArray(session.items));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setComplete(false);
    setRound((r) => r + 1);
  }, [session.theoryId, session.items]);

  const enhanceWithAi = useCallback(async () => {
    if (!hasProAccess) {
      openUpgrade();
      return;
    }
    setEnhancing(true);
    try {
      const response = await fetch("/api/ai/theory-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theoryId: session.theoryId, count: 4 }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        code?: string;
        exercises?: TheoryExercise[];
      };
      if (!response.ok || !result.ok) {
        if (result.code === "AI_FORBIDDEN") {
          toast.error(t("aiForbidden"));
          openUpgrade();
          return;
        }
        toast.error(t("aiUnavailable"));
        return;
      }
      const incoming = result.exercises ?? [];
      if (incoming.length === 0) {
        toast.error(t("aiUnavailable"));
        return;
      }
      const seen = new Set(pool.map((item) => item.id));
      const merged = [...pool];
      for (const item of incoming) {
        if (seen.has(item.id)) continue;
        merged.push(item);
        seen.add(item.id);
      }
      setPool(merged);
      restart(merged);
      toast.success(t("aiAdded"));
    } catch {
      toast.error(t("aiUnavailable"));
    } finally {
      setEnhancing(false);
    }
  }, [hasProAccess, openUpgrade, pool, restart, session.theoryId, t]);

  const current = items[index];
  const total = items.length;
  const progressValue = total ? ((complete ? total : index) / total) * 100 : 0;

  const recordAnswer = (correct: boolean) => {
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
    }));
  };

  const goNext = () => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setComplete(true);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline-cloud bg-card p-8 text-center">
        <p className="font-heading text-lg font-medium text-ink">{t("tooThinTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("tooThinDescription")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            onClick={enhanceWithAi}
            disabled={enhancing}
            aria-disabled={!hasProAccess || undefined}
            className={cn(!hasProAccess && lockedFeatureClassName)}
          >
            {enhancing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {enhancing ? t("enhancingAi") : t("enhanceAi")}
          </Button>
          <LinkButton href={`/theory/${session.theoryId}/edit`} variant="outline">
            {t("editTheory")}
          </LinkButton>
          <LinkButton href="/exercises" variant="outline">
            {t("backToStudio")}
          </LinkButton>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <SessionCompleteCard
        title={tSession("complete")}
        scoreLabel={tSession("score", {
          correct: score.correct,
          total: score.answered,
        })}
        tryAgainLabel={tSession("tryAgain")}
        onTryAgain={() => restart()}
        extraAction={{
          label: enhancing ? t("enhancingAi") : t("enhanceAi"),
          onClick: enhanceWithAi,
          loading: enhancing,
          locked: !hasProAccess,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline-cloud bg-card px-4 py-3 sm:px-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("practicing")}
        </p>
        <p className="mt-0.5 font-heading text-lg font-medium text-ink">
          {session.theoryTitle}
        </p>
      </div>

      <ExerciseProgressHeader
        progressLabel={t("progress", { current: index + 1, total })}
        scoreLabel={
          score.answered > 0
            ? t("score", { correct: score.correct, answered: score.answered })
            : undefined
        }
        hint={current ? t(`types.${current.typeLabelKey}`) : undefined}
        progressValue={progressValue}
      />

      {current?.type === "transformation" ? (
        <TransformationCard
          key={`${current.id}-${round}`}
          item={current}
          onResolved={recordAnswer}
          onNext={goNext}
        />
      ) : null}

      {current?.type === "fill_blank" ? (
        <FillBlankCard
          key={`${current.id}-${round}`}
          item={current}
          onResolved={recordAnswer}
          onNext={goNext}
        />
      ) : null}

      {current?.type === "multiple_choice" ? (
        <MultipleChoiceCard
          key={`${current.id}-${round}`}
          item={current}
          onResolved={recordAnswer}
          onNext={goNext}
        />
      ) : null}

      {current?.type === "theory_question" ? (
        <TheoryQuestionCard
          key={`${current.id}-${round}`}
          item={current}
          onResolved={recordAnswer}
          onNext={goNext}
        />
      ) : null}

      {current?.type === "true_false" ? (
        <TrueFalseCard
          key={`${current.id}-${round}`}
          item={current}
          onResolved={recordAnswer}
          onNext={goNext}
        />
      ) : null}

      {current?.type === "match_pairs" ? (
        <MatchPairsCard
          key={`${current.id}-${round}`}
          item={current}
          onResolved={recordAnswer}
          onNext={goNext}
        />
      ) : null}

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => restart()}>
          <RotateCcw className="size-4" />
          {t("reshuffle")}
        </Button>
      </div>
    </div>
  );
}

function FeedbackRow({
  correct,
  message,
  onNext,
  nextLabel,
}: {
  correct: boolean;
  message: string;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div
      className={cn(
        "mt-5 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        correct
          ? "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]"
          : "border-destructive/30 bg-destructive/5 text-destructive",
      )}
    >
      <p className="inline-flex items-center gap-2 text-sm font-medium">
        {correct ? <Check className="size-4" /> : <X className="size-4" />}
        {message}
      </p>
      <Button type="button" size="sm" onClick={onNext}>
        {nextLabel}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function TransformationCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryTransformationExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && answersMatch(value, item.answer);

  const check = () => {
    if (checked || !value.trim()) return;
    setChecked(true);
    onResolved(answersMatch(value, item.answer));
  };

  const revealAnswer = () => {
    if (checked) return;
    setPeeked(true);
    setChecked(true);
    setValue(item.answer);
    onResolved(false);
  };

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("instructions.applyRule")}
        fallbackType={t("types.transformation")}
      />
      <p className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        {item.showArrow !== false ? (
          <>
            {item.promptWord} → <span className="text-muted-foreground">________</span>
          </>
        ) : (
          item.promptWord
        )}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={checked}
          placeholder={t("fillPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (checked) onNext();
              else check();
            }
          }}
          className="sm:flex-1"
          autoFocus
        />
        {!checked ? (
          <Button type="button" onClick={check} disabled={!value.trim()}>
            {t("check")}
          </Button>
        ) : null}
      </div>
      <div className="mt-4">
        <ExerciseHint
          resetKey={item.id}
          answered={checked}
          correctAnswer={item.answer}
          onRevealAnswer={revealAnswer}
        >
          <TheoryHintContent
            patternHint={item.hint}
            answer={item.answer}
            baseWord={item.promptWord}
          />
        </ExerciseHint>
      </div>
      {checked ? (
        <FeedbackRow
          correct={isCorrect}
          message={
            isCorrect
              ? t("feedback.correct")
              : t("feedback.incorrectWithAnswer", { answer: item.answer })
          }
          onNext={onNext}
          nextLabel={t("next")}
        />
      ) : null}
    </div>
  );
}

function MultipleChoiceCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryMultipleChoiceExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [selected, setSelected] = useState<string | null>(null);
  const [peeked, setPeeked] = useState(false);
  const revealed = selected !== null || peeked;
  const isCorrect = Boolean(!peeked && selected === item.correctOption);

  const revealAnswer = () => {
    if (revealed) return;
    setPeeked(true);
    setSelected(item.correctOption);
    onResolved(false);
  };

  // Recover quoted base word from prompts like: Which is the correct form of "…"?
  const baseFromPrompt =
    item.prompt.match(/[“"]([^”"]+)[”"]/)?.[1] ??
    item.prompt.match(/of\s+[“"]?([^\s?”"]+)/i)?.[1];

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("instructions.chooseForm")}
        fallbackType={t("types.multiple_choice")}
      />
      <p className="font-heading text-xl font-medium leading-snug text-ink">{item.prompt}</p>
      <div className="mt-4">
        <ExerciseHint
          resetKey={item.id}
          answered={revealed}
          correctAnswer={item.correctOption}
          onRevealAnswer={revealAnswer}
        >
          <TheoryHintContent
            answer={item.correctOption}
            baseWord={baseFromPrompt}
            options={item.options}
          />
        </ExerciseHint>
      </div>
      <div className="mt-5 grid gap-2">
        {item.options.map((option) => {
          const isSelected = selected === option;
          const showCorrect = revealed && option === item.correctOption;
          const showWrong = revealed && isSelected && option !== item.correctOption && !peeked;
          return (
            <button
              key={option}
              type="button"
              disabled={revealed}
              onClick={() => {
                if (revealed) return;
                setSelected(option);
                onResolved(option === item.correctOption);
              }}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                !revealed && "cursor-pointer hover:border-accent-lime/50 hover:bg-accent-lime/10",
                showCorrect && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                showWrong && "border-destructive/40 bg-destructive/5 text-destructive",
                !showCorrect && !showWrong && "border-hairline-cloud bg-background",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {revealed ? (
        <FeedbackRow
          correct={isCorrect}
          message={
            isCorrect
              ? t("feedback.correct")
              : t("feedback.incorrectWithAnswer", { answer: item.correctOption })
          }
          onNext={onNext}
          nextLabel={t("next")}
        />
      ) : null}
      {revealed && item.explanation ? (
        <p className="mt-3 text-sm text-muted-foreground">{item.explanation}</p>
      ) : null}
    </div>
  );
}

function FillBlankCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryFillBlankExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && fillBlankMatches(value, item);
  const blankChars = Math.max(
    item.answer.length,
    value.trim().length,
    item.spaced ? 6 : 3,
  );

  const check = () => {
    if (checked || !value.trim()) return;
    setChecked(true);
    onResolved(fillBlankMatches(value, item));
  };

  const revealAnswer = () => {
    if (checked) return;
    setPeeked(true);
    setChecked(true);
    setValue(item.answer);
    onResolved(false);
  };

  const baseFromSentence = item.prefix
    ?? (item.sentence.includes("→")
      ? item.sentence.split("→")[0]?.trim()
      : undefined);

  const blankValue = checked
    ? (isCorrect ? value.trim() : item.answer)
    : value;

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("instructions.fillBlank")}
        fallbackType={t("types.fill_blank")}
      />
      {item.prefix ? (
        <p className="mt-1 font-heading text-xl font-medium leading-[1.45] text-ink sm:text-2xl">
          {[
            <span key="prefix">{item.prefix}</span>,
            item.spaced ? " " : null,
            checked ? (
              <span
                key="answer"
                className={cn(
                  "border-b-2 font-semibold",
                  isCorrect
                    ? "border-[#b8d96a] text-[#4a6b0a]"
                    : "border-destructive/50 text-destructive",
                )}
              >
                {blankValue}
              </span>
            ) : (
              <input
                key="blank"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={checked}
                placeholder="…"
                aria-label={t("fillPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (checked) onNext();
                    else check();
                  }
                }}
                style={{ width: `${blankChars + 0.5}ch` }}
                className={cn(
                  "m-0 inline border-0 border-b-2 border-dashed border-muted-foreground/45",
                  "bg-transparent p-0 align-baseline font-heading text-xl font-semibold leading-[1.45] text-ink",
                  "outline-none placeholder:text-muted-foreground/40",
                  "focus:border-solid focus:border-accent-lime",
                  "sm:text-2xl",
                )}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            ),
            item.suffix ? <span key="suffix">{item.suffix}</span> : null,
          ]}
        </p>
      ) : (
        <p className="font-heading text-xl font-medium leading-snug text-ink">{item.sentence}</p>
      )}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {!item.prefix ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={checked}
            placeholder={t("fillPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (checked) onNext();
                else check();
              }
            }}
            className="sm:flex-1"
          />
        ) : null}
        {!checked ? (
          <Button type="button" onClick={check} disabled={!value.trim()}>
            {t("check")}
          </Button>
        ) : null}
      </div>
      <div className="mt-4">
        <ExerciseHint
          resetKey={item.id}
          answered={checked}
          correctAnswer={fillBlankDisplayAnswer(item)}
          onRevealAnswer={revealAnswer}
        >
          <TheoryHintContent
            patternHint={item.hint}
            answer={item.answer}
            baseWord={baseFromSentence}
          />
        </ExerciseHint>
      </div>
      {checked ? (
        <FeedbackRow
          correct={isCorrect}
          message={
            isCorrect
              ? t("feedback.correct")
              : t("feedback.incorrectWithAnswer", { answer: fillBlankDisplayAnswer(item) })
          }
          onNext={onNext}
          nextLabel={t("next")}
        />
      ) : null}
    </div>
  );
}

function TheoryQuestionCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryConceptExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");

  if (item.mode === "true_false") {
    return (
      <TrueFalseInner
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("instructions.theoryCheck")}
        statement={item.prompt}
        correct={item.correctBoolean ?? true}
        explanation={item.explanation}
        onResolved={onResolved}
        onNext={onNext}
      />
    );
  }

  if (item.mode === "multiple_choice" && item.options?.length) {
    return (
      <MultipleChoiceCard
        item={{
          ...item,
          type: "multiple_choice",
          typeLabelKey: "multiple_choice",
          prompt: item.prompt,
          options: item.options,
          correctOption: item.answer,
          instruction: item.instruction ?? t("instructions.theoryCheck"),
        }}
        onResolved={onResolved}
        onNext={onNext}
      />
    );
  }

  return (
    <FillBlankCard
      item={{
        ...item,
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        sentence: item.prompt,
        answer: item.answer,
        instruction: item.instruction ?? t("instructions.completeRule"),
      }}
      onResolved={onResolved}
      onNext={onNext}
    />
  );
}

function TrueFalseInner({
  skillLabel,
  instruction,
  statement,
  correct,
  explanation,
  onResolved,
  onNext,
}: {
  skillLabel?: string;
  instruction?: string;
  statement: string;
  correct: boolean;
  explanation?: string;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [selected, setSelected] = useState<boolean | null>(null);
  const revealed = selected !== null;
  const isCorrect = selected === correct;

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={skillLabel}
        instruction={instruction ?? t("instructions.theoryCheck")}
        fallbackType={t("types.theory_question")}
      />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("trueFalseLabel")}
      </p>
      <p className="mt-2 font-heading text-xl font-medium leading-snug text-ink">{statement}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[true, false].map((value) => {
          const label = value ? t("true") : t("false");
          const isSelected = selected === value;
          const showCorrect = revealed && value === correct;
          const showWrong = revealed && isSelected && value !== correct;
          return (
            <button
              key={String(value)}
              type="button"
              disabled={revealed}
              onClick={() => {
                if (revealed) return;
                setSelected(value);
                onResolved(value === correct);
              }}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                !revealed && "cursor-pointer hover:border-accent-lime/50 hover:bg-accent-lime/10",
                showCorrect && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                showWrong && "border-destructive/40 bg-destructive/5 text-destructive",
                !showCorrect && !showWrong && "border-hairline-cloud bg-background",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {revealed ? (
        <FeedbackRow
          correct={isCorrect}
          message={isCorrect ? t("feedback.correct") : t("feedback.incorrect")}
          onNext={onNext}
          nextLabel={t("next")}
        />
      ) : null}
      {revealed && explanation ? (
        <p className="mt-3 text-sm text-muted-foreground">{explanation}</p>
      ) : null}
    </div>
  );
}

function TrueFalseCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryTrueFalseExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  return (
    <TrueFalseInner
      skillLabel={item.skillLabel}
      instruction={item.instruction}
      statement={item.statement}
      correct={item.correct}
      explanation={item.explanation}
      onResolved={onResolved}
      onNext={onNext}
    />
  );
}

function MatchPairsCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryMatchPairsExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const leftColumn = useMemo(
    () => shuffleArray(item.pairs.map((p) => ({ id: p.id, label: p.left }))),
    [item.pairs],
  );
  const rightColumn = useMemo(
    () => shuffleArray(item.pairs.map((p) => ({ id: p.id, label: p.right }))),
    [item.pairs],
  );

  const pickRight = (id: string) => {
    if (!selectedLeft || matched.has(id) || finished) return;
    if (selectedLeft === id) {
      const next = new Set(matched);
      next.add(id);
      setMatched(next);
      setSelectedLeft(null);
      setWrong(null);
      if (next.size === item.pairs.length) {
        setFinished(true);
        onResolved(true);
      }
      return;
    }
    setWrong(id);
    window.setTimeout(() => {
      setWrong(null);
      setSelectedLeft(null);
    }, 650);
  };

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("matchHint")}
        fallbackType={t("types.match_pairs")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("matchBase")}
          </p>
          {leftColumn.map((entry) => {
            const isMatched = matched.has(entry.id);
            const isSelected = selectedLeft === entry.id;
            return (
              <button
                key={`l-${entry.id}`}
                type="button"
                disabled={isMatched || finished}
                onClick={() => {
                  if (isMatched || finished) return;
                  setSelectedLeft(entry.id);
                  setWrong(null);
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  isMatched && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                  isSelected && !isMatched && "border-accent-lime bg-accent-lime/20",
                  !isMatched && !isSelected && "border-hairline-cloud hover:border-accent-lime/40",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("matchForm")}
          </p>
          {rightColumn.map((entry) => {
            const isMatched = matched.has(entry.id);
            const isWrong = wrong === entry.id;
            return (
              <button
                key={`r-${entry.id}`}
                type="button"
                disabled={isMatched || !selectedLeft || finished}
                onClick={() => pickRight(entry.id)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  isMatched && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                  isWrong && "border-destructive/40 bg-destructive/5 text-destructive",
                  !isMatched &&
                    !isWrong &&
                    "border-hairline-cloud hover:border-accent-lime/40 disabled:opacity-50",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>
      {finished ? (
        <FeedbackRow
          correct
          message={t("feedback.correct")}
          onNext={onNext}
          nextLabel={t("next")}
        />
      ) : null}
    </div>
  );
}
