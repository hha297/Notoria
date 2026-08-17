"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { ExerciseAiBar } from "@/components/exercises/exercise-ai-bar";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestExerciseAi } from "@/lib/exercises/ai-client";
import type { ExerciseAiCefr } from "@/lib/exercises/ai-types";
import {
  fillBlankExerciseToItem,
  fillBlankItemSentence,
} from "@/lib/exercises/ai-validate";
import { pickFillBlankAiWords, toExerciseAiWord } from "@/lib/exercises/ai-words";
import {
  expectedFillBlankAnswer,
  buildFillBlankItems,
  type FillBlankItem,
} from "@/lib/exercises/fill-blank";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny, shuffleArray } from "@/lib/exercises/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

type FillBlankSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

export function FillBlankSession({
  workspaceId,
  words,
  language,
}: FillBlankSessionProps) {
  const t = useTranslations("exercises.fillInBlank");
  const tSession = useTranslations("exercises.session");
  const tAi = useTranslations("exercises.ai");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [aiItems, setAiItems] = useState<FillBlankItem[] | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [generating, setGenerating] = useState(false);
  const [level, setLevel] = useState<ExerciseAiCefr>("a2");
  const [usedWordIds, setUsedWordIds] = useState<string[]>([]);
  const avoidByWord = useRef<Record<string, string[]>>({});
  const batchRef = useRef(0);

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const exampleItems = useMemo(
    () => buildFillBlankItems(filteredWords),
    [filteredWords],
  );
  const sessionItems = aiItems ?? (!hasProAccess ? exampleItems : []);
  const itemMap = useMemo(
    () => new Map(sessionItems.map((item) => [item.id, item])),
    [sessionItems],
  );

  const resetRound = useCallback((ids: string[]) => {
    setItemIds(ids);
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setSessionComplete(false);
    setInput("");
    setRevealed(false);
  }, []);

  const startExampleSession = useCallback(() => {
    const sampled = sampleSessionItems(exampleItems, "fill_blank");
    setAiItems(null);
    resetRound(sampled.map((item) => item.id));
  }, [exampleItems, resetRound]);

  const startFromAiItems = useCallback(
    (items: FillBlankItem[]) => {
      resetRound(shuffleArray(items).map((item) => item.id));
    },
    [resetRound],
  );

  useEffect(() => {
    if (!hasProAccess) startExampleSession();
  }, [hasProAccess, startExampleSession]);

  useEffect(() => {
    if (!hasProAccess) return;
    setAiItems(null);
    setUsedWordIds([]);
    avoidByWord.current = {};
    resetRound([]);
  }, [hasProAccess, workspaceId, resetRound]);

  useEffect(() => {
    setInput("");
    setRevealed(false);
  }, [index, itemIds]);

  const generateQuestions = useCallback(async () => {
    if (!hasProAccess) {
      openUpgrade();
      return;
    }
    if (filteredWords.length === 0) {
      toast.error(tAi("emptyWords"));
      return;
    }

    setGenerating(true);
    try {
      const picked = pickFillBlankAiWords(filteredWords, 10, usedWordIds);
      const payloadWords = picked.map((word) =>
        toExerciseAiWord(word, avoidByWord.current[word.id] ?? []),
      );
      const result = await requestExerciseAi({
        exerciseType: "fill-in-blank",
        language: language ?? null,
        level,
        words: payloadWords,
      });

      if (!result.ok) {
        if (result.code === "AI_FORBIDDEN") {
          openUpgrade();
          return;
        }
        toast.error(
          result.code === "AI_EMPTY" ? tAi("emptyWords") : tAi("unavailable"),
        );
        return;
      }

      batchRef.current += 1;
      const batchId = `${Date.now()}-${batchRef.current}`;
      const remaining = [...picked];
      const nextItems: FillBlankItem[] = [];

      for (const [itemIndex, exercise] of result.exercises.entries()) {
        const matchIndex = remaining.findIndex((word) => word.id === exercise.wordId);
        const word =
          matchIndex >= 0
            ? remaining.splice(matchIndex, 1)[0]
            : picked.find((item) => item.id === exercise.wordId);
        if (!word) continue;
        const item = fillBlankExerciseToItem(
          exercise,
          { ...toExerciseAiWord(word), meanings: word.meanings },
          `${batchId}-${itemIndex}`,
        );
        if (item) nextItems.push(item);
      }

      if (nextItems.length === 0) {
        toast.error(tAi("noneValid"));
        return;
      }

      for (const item of nextItems) {
        const sentence = fillBlankItemSentence(item);
        const existing = avoidByWord.current[item.wordId] ?? [];
        avoidByWord.current[item.wordId] = [...existing, sentence].slice(-12);
      }

      setUsedWordIds((current) => [
        ...current,
        ...nextItems.map((item) => item.wordId),
      ]);
      setAiItems(nextItems);
      startFromAiItems(nextItems);
    } catch {
      toast.error(tAi("unavailable"));
    } finally {
      setGenerating(false);
    }
  }, [
    hasProAccess,
    openUpgrade,
    filteredWords,
    language,
    level,
    startFromAiItems,
    tAi,
    usedWordIds,
  ]);

  const current = itemMap.get(itemIds[index] ?? "");
  const total = itemIds.length;
  const isCorrect = current
    ? answersMatchAny(input, current.acceptableAnswers)
    : false;
  const hasSession = total > 0;

  const check = useCallback(() => {
    if (!current || revealed || !input.trim()) return;
    setRevealed(true);
    setScore((s) => ({
      correct: s.correct + (answersMatchAny(input, current.acceptableAnswers) ? 1 : 0),
      answered: s.answered + 1,
    }));
  }, [current, input, revealed]);

  const next = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setSessionComplete(true);
  }, [index, total]);

  const tryAgain = useCallback(() => {
    if (aiItems) {
      startFromAiItems(aiItems);
      return;
    }
    startExampleSession();
  }, [aiItems, startExampleSession, startFromAiItems]);

  useHotkeys("enter", (e) => {
    e.preventDefault();
    if (!revealed) check();
    else next();
  }, { enableOnFormTags: true }, [revealed, check, next]);

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;

  const aiBar = (
    <ExerciseAiBar
      generating={generating}
      hasSession={Boolean(aiItems)}
      level={level}
      disabled={filteredWords.length === 0}
      onLevelChange={setLevel}
      onGenerate={() => void generateQuestions()}
    />
  );

  if (filteredWords.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
        {aiBar}
        <VocabularyEmpty variant="no-filtered" />
      </div>
    );
  }

  if (!hasProAccess && exampleItems.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
        {aiBar}
        <VocabularyEmpty variant="no-examples" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
      {aiBar}

      {sessionComplete && hasSession ? (
        <SessionCompleteCard
          title={tSession("complete")}
          scoreLabel={tSession("score", { correct: score.correct, total })}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={tryAgain}
          extraAction={{
            label: tAi("generateMore"),
            onClick: () => void generateQuestions(),
            loading: generating,
            locked: !hasProAccess,
          }}
        />
      ) : current ? (
        <>
          <ExerciseProgressHeader
            progressLabel={t("progress", { current: index + 1, total })}
            scoreLabel={t("score", { correct: score.correct, answered: score.answered })}
            hint={t("keyboardHint")}
            progressValue={total ? ((index + 1) / total) * 100 : 0}
          />
          <FillBlankCard
            item={current}
            input={input}
            revealed={revealed}
            isCorrect={isCorrect}
            onInputChange={setInput}
            onCheck={check}
          />
          <ExerciseNav
            t={t}
            canPrev={index > 0}
            revealed={revealed}
            onPrev={() => setIndex((i) => i - 1)}
            onNext={next}
            onCheck={check}
            onTryAgain={tryAgain}
            tryAgainLabel={tSession("tryAgain")}
            canCheck={!!input.trim()}
            isLast={index >= total - 1}
          />
        </>
      ) : hasProAccess ? (
        <EmptyGenerateCard
          generating={generating}
          onGenerate={() => void generateQuestions()}
        />
      ) : null}
    </div>
  );
}

function EmptyGenerateCard({
  generating,
  onGenerate,
}: {
  generating: boolean;
  onGenerate: () => void;
}) {
  const tAi = useTranslations("exercises.ai");

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-hairline-cloud bg-card p-6 text-center shadow-xl shadow-ink/5 sm:p-10">
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-accent-lime/20 text-ink">
        {generating ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Sparkles className="size-5" />
        )}
      </div>
      <p className="text-lg font-medium text-ink">{tAi("emptyTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {tAi("emptyDescription")}
      </p>
      <Button
        type="button"
        className="mt-6"
        disabled={generating}
        onClick={onGenerate}
      >
        {generating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {generating ? tAi("generating") : tAi("generate")}
      </Button>
    </div>
  );
}

function FillBlankCard({
  item,
  input,
  revealed,
  isCorrect,
  onInputChange,
  onCheck,
}: {
  item: FillBlankItem;
  input: string;
  revealed: boolean;
  isCorrect: boolean;
  onInputChange: (v: string) => void;
  onCheck: () => void;
}) {
  const t = useTranslations("exercises.fillInBlank");
  const tAi = useTranslations("exercises.ai");
  const blankMinWidth = Math.max(item.word.length + 2, 6);
  const expected = expectedFillBlankAnswer(item);

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-hairline-cloud bg-card p-6 shadow-xl shadow-ink/5 sm:p-10 md:p-12">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-mid">
          {t("prompt")}
        </p>
        {item.aiGenerated ? (
          <p className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3" />
            {tAi("generated")}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCheck();
        }}
        className="mt-8 space-y-8"
      >
        <div className="rounded-2xl border border-hairline-cloud bg-muted/20 px-5 py-10 sm:px-8 sm:py-12 md:py-14">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 text-center leading-snug">
            {item.sentenceBefore && (
              <span className="text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                {item.sentenceBefore}
              </span>
            )}

            <span
              className="inline-flex shrink-0 items-center justify-center"
              style={{ minWidth: `${blankMinWidth}ch` }}
            >
              {revealed ? (
                <span
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xl font-semibold sm:text-2xl md:text-3xl",
                    isCorrect
                      ? "bg-[#f4fae0] text-[#4a6b0a] ring-2 ring-[#b8d96a]/60"
                      : "bg-[#fff1f6] text-destructive ring-2 ring-[#f3b8cc]/60",
                  )}
                >
                  {isCorrect ? input : expected}
                </span>
              ) : (
                <Input
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="?"
                  className={cn(
                    "h-12 min-w-full rounded-xl border-2 border-dashed border-accent-lime/50 bg-background/90 px-4",
                    "text-center text-xl font-semibold text-ink shadow-sm sm:h-14 sm:text-2xl md:text-3xl",
                    "placeholder:text-muted-foreground/40",
                    "focus-visible:border-accent-lime focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent-lime/20",
                  )}
                />
              )}
            </span>

            {item.sentenceAfter && (
              <span className="text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                {item.sentenceAfter}
              </span>
            )}
          </div>
        </div>

        {item.meanings[0] && (
          <ExerciseHint resetKey={item.id} answered={revealed}>
            {item.meanings.join(" · ")}
          </ExerciseHint>
        )}

        {revealed && (
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
            {isCorrect ? t("correct") : t("incorrect", { answer: expected })}
          </div>
        )}
      </form>
    </div>
  );
}

function ExerciseNav({
  t,
  canPrev,
  revealed,
  onPrev,
  onNext,
  onCheck,
  onTryAgain,
  tryAgainLabel,
  canCheck,
  isLast,
}: {
  t: (key: string) => string;
  canPrev: boolean;
  revealed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCheck: () => void;
  onTryAgain: () => void;
  tryAgainLabel: string;
  canCheck: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 pt-2 sm:gap-5">
      <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onPrev}
          disabled={!canPrev}
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          <ChevronLeft className="size-4" />
          {t("previous")}
        </Button>
        {revealed ? (
          <Button
            type="button"
            size="default"
            onClick={onNext}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {isLast ? t("finish") : t("next")}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="default"
            onClick={onCheck}
            disabled={!canCheck}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {t("check")}
          </Button>
        )}
      </div>
      <Button type="button" variant="ghost" onClick={onTryAgain}>
        <RotateCcw className="size-4" />
        {tryAgainLabel}
      </Button>
    </div>
  );
}
