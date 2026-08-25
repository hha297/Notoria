"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, CheckCircle2, ChevronRight, Loader2, RotateCcw, Sparkles, X, XCircle } from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { shuffleArray } from "@/lib/exercises/utils";
import { answersMatchAny, revealTextForExercise, scrubFillBlankPresentation } from "@/lib/theory-exercises/generate-ai";
import type {
  TheoryExercise,
  TheoryExerciseSession,
  TheoryFillBlankExercise,
  TheoryMultipleChoiceExercise,
  TheoryTransformationExercise,
} from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

type TheoryExerciseSessionViewProps = {
  session: TheoryExerciseSession;
};

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

function HintText({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <p>{text}</p>;
}

export function TheoryExerciseSessionView({ session }: TheoryExerciseSessionViewProps) {
  const t = useTranslations("exercises.theory");
  const tSession = useTranslations("exercises.session");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [items, setItems] = useState<TheoryExercise[]>(() => shuffleArray(session.items));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [complete, setComplete] = useState(false);
  const [round, setRound] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const restart = useCallback((nextItems: TheoryExercise[]) => {
    setItems(shuffleArray(nextItems));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setComplete(false);
    setRound((r) => r + 1);
  }, []);

  const generateWithAi = useCallback(async () => {
    if (!hasProAccess) {
      openUpgrade();
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/theory-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theoryId: session.theoryId, count: 24 }),
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
      restart(incoming);
      toast.success(t("aiReady"));
    } catch {
      toast.error(t("aiUnavailable"));
    } finally {
      setGenerating(false);
    }
  }, [hasProAccess, openUpgrade, restart, session.theoryId, t]);

  useEffect(() => {
    setItems(shuffleArray(session.items));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setComplete(false);
    setRound((r) => r + 1);
    setAutoTried(false);
  }, [session.theoryId, session.items]);

  useEffect(() => {
    if (autoTried || items.length > 0 || generating) return;
    setAutoTried(true);
    if (hasProAccess) {
      void generateWithAi();
    }
  }, [autoTried, generateWithAi, generating, hasProAccess, items.length]);

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
        {generating ? (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
            <p className="mt-4 font-heading text-lg font-medium text-ink">
              {t("generatingTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("generatingDescription")}
            </p>
          </>
        ) : (
          <>
            <p className="font-heading text-lg font-medium text-ink">{t("needAiTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {hasProAccess ? t("needAiDescription") : t("needAiProDescription")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                onClick={generateWithAi}
                disabled={generating}
                aria-disabled={!hasProAccess || undefined}
                className={cn(!hasProAccess && lockedFeatureClassName)}
              >
                <Sparkles className="size-4" />
                {hasProAccess ? t("generateAi") : t("unlockAi")}
              </Button>
              <LinkButton href={`/theory/${session.theoryId}/edit`} variant="outline">
                {t("editTheory")}
              </LinkButton>
              <LinkButton href="/exercises" variant="outline">
                {t("backToStudio")}
              </LinkButton>
            </div>
          </>
        )}
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
        onTryAgain={() => restart(items)}
        extraAction={{
          label: t("generateMore"),
          onClick: () => void generateWithAi(),
          loading: generating,
          locked: !hasProAccess,
        }}
      />
    );
  }

  return (
    <div className="space-y-4" key={`${round}-${current?.id ?? index}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <ExerciseProgressHeader
            progressLabel={t("progress", { current: index + 1, total })}
            scoreLabel={t("score", {
              correct: score.correct,
              answered: score.answered,
            })}
            progressValue={progressValue}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void generateWithAi()}
            disabled={generating}
            aria-disabled={!hasProAccess || undefined}
            className={cn(!hasProAccess && lockedFeatureClassName)}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {t("regenerate")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => restart(items)}>
            <RotateCcw className="size-4" />
            {t("reshuffle")}
          </Button>
        </div>
      </div>

      {current?.type === "fill_blank" ? (
        <FillBlankCard item={current} onResolved={recordAnswer} onNext={goNext} />
      ) : null}
      {current?.type === "transformation" ? (
        <TransformationCard item={current} onResolved={recordAnswer} onNext={goNext} />
      ) : null}
      {current?.type === "multiple_choice" ? (
        <MultipleChoiceCard item={current} onResolved={recordAnswer} onNext={goNext} />
      ) : null}
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
        "mt-5 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        correct ? "bg-[#f4fae0]" : "bg-[#fff1f6]",
      )}
    >
      <p
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium",
          correct ? "text-[#4a6b0a]" : "text-destructive",
        )}
      >
        {correct ? <Check className="size-4" /> : <X className="size-4" />}
        {message}
      </p>
      <Button type="button" onClick={onNext} className="sm:w-auto">
        {nextLabel}
        <ChevronRight className="size-4" />
      </Button>
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
  const tAi = useTranslations("exercises.ai");
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && answersMatchAny(value, item.acceptedAnswers);

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
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-mid">
            {item.skillLabel || t("types.fill_blank")}
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3" />
            {tAi("generated")}
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
  const isCorrect = !peeked && answersMatchAny(value, item.acceptedAnswers);
  const revealDisplay = revealTextForExercise(item);

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
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("instructions.applyRule")}
        fallbackType={t("types.transformation")}
      />
      <p className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        {item.showArrow !== false ? (
          <>
            {item.promptWord} →{" "}
            {checked ? (
              <span
                className={cn(
                  "border-b-2 font-semibold",
                  isCorrect
                    ? "border-[#b8d96a] text-[#4a6b0a]"
                    : "border-destructive/50 text-destructive",
                )}
              >
                {isCorrect ? value.trim() : item.answer}
              </span>
            ) : (
              <span
                aria-hidden
                className="inline-block min-w-[7ch] translate-y-[-0.08em] border-b-2 border-dashed border-muted-foreground/55"
              />
            )}
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
          correctAnswer={revealDisplay}
          onRevealAnswer={revealAnswer}
        >
          <HintText text={item.hint} />
        </ExerciseHint>
      </div>
      {checked ? (
        <>
          <FeedbackRow
            correct={isCorrect}
            message={
              isCorrect
                ? t("feedback.correct")
                : t("feedback.incorrectWithAnswer", { answer: revealDisplay })
            }
            onNext={onNext}
            nextLabel={t("next")}
          />
          {item.explanation ? (
            <p className="mt-3 text-sm text-muted-foreground">{item.explanation}</p>
          ) : null}
        </>
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
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && selected === item.correctOption;
  const revealDisplay = revealTextForExercise(item);

  const check = () => {
    if (checked || !selected) return;
    setChecked(true);
    onResolved(selected === item.correctOption);
  };

  const revealAnswer = () => {
    if (checked) return;
    setPeeked(true);
    setChecked(true);
    setSelected(item.correctOption);
    onResolved(false);
  };

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction ?? t("instructions.chooseForm")}
        fallbackType={t("types.multiple_choice")}
      />
      <p className="font-heading text-xl font-medium leading-snug text-ink">{item.prompt}</p>
      <div className="mt-5 grid gap-2">
        {item.options.map((option) => {
          const isSelected = selected === option;
          const showState = checked && isSelected;
          return (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setSelected(option)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                isSelected && !checked && "border-ink bg-muted/40",
                showState && isCorrect && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                showState && !isCorrect && "border-destructive/40 bg-[#fff1f6] text-destructive",
                !isSelected && "border-hairline-cloud hover:bg-muted/30",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!checked ? (
          <Button type="button" onClick={check} disabled={!selected}>
            {t("check")}
          </Button>
        ) : null}
      </div>
      <div className="mt-4">
        <ExerciseHint
          resetKey={item.id}
          answered={checked}
          correctAnswer={revealDisplay}
          onRevealAnswer={revealAnswer}
        >
          <HintText text={item.hint} />
        </ExerciseHint>
      </div>
      {checked ? (
        <>
          <FeedbackRow
            correct={isCorrect}
            message={
              isCorrect
                ? t("feedback.correct")
                : t("feedback.incorrectWithAnswer", { answer: revealDisplay })
            }
            onNext={onNext}
            nextLabel={t("next")}
          />
          {item.explanation ? (
            <p className="mt-3 text-sm text-muted-foreground">{item.explanation}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
