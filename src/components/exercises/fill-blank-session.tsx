"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseAiBar } from "@/components/exercises/exercise-ai-bar";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { requestExerciseAi } from "@/lib/exercises/ai-client";
import {
  fillBlankExerciseToItem,
  fillBlankItemSentence,
} from "@/lib/exercises/ai-validate";
import { pickFillBlankAiWords, toExerciseAiWord } from "@/lib/exercises/ai-words";
import { blankMeaningHintFromItem, wordHasBlankMeaningHint } from "@/lib/exercises/blank-hint";
import {
  expectedFillBlankAnswer,
  buildFillBlankItems,
  type FillBlankItem,
} from "@/lib/exercises/fill-blank";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny, shuffleArray } from "@/lib/exercises/utils";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
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
  const uiLocale = useLocale();
  const { hasProAccess, openUpgrade } = useProAccess();
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [aiItems, setAiItems] = useState<FillBlankItem[] | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const { difficulty, setDifficulty } = useExerciseDifficulty("fill_blank");
  const [usedWordIds, setUsedWordIds] = useState<string[]>([]);
  const avoidByWord = useRef<Record<string, string[]>>({});
  const batchRef = useRef(0);
  const { recordOutcome, commitAndBeginNext, clearPreferences } =
    useRecentSectionPreferences();
  const {
    state: processing,
    setStage,
    reset: resetProcessing,
    fail,
    complete: completeProcessing,
    isActive: generating,
  } = useAiProcessing();

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const exampleItems = useMemo(
    () => buildFillBlankItems(filteredWords),
    [filteredWords],
  );
  const createdAtByWordId = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word.createdAt] as const)),
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
    setPeeked(false);
  }, []);

  const startExampleSession = useCallback(() => {
    const prefs = commitAndBeginNext();
    const sampled = sampleSessionItems(exampleItems, "fill_blank", {
      getWordId: (item) => item.wordId,
      getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
      getItemKey: (item) => fillBlankItemSentence(item),
      softAvoidWordIds: prefs.softAvoidWordIds,
      softPreferWordIds: prefs.softPreferWordIds,
      softAvoidItemKeys: prefs.softAvoidItemKeys,
    });
    setAiItems(null);
    resetRound(sampled.map((item) => item.id));
  }, [commitAndBeginNext, createdAtByWordId, exampleItems, resetRound]);

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
    clearPreferences();
    resetRound([]);
  }, [clearPreferences, hasProAccess, workspaceId, resetRound]);

  useEffect(() => {
    setInput("");
    setRevealed(false);
    setPeeked(false);
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

    const prefs = commitAndBeginNext();
    setStage("generating");
    try {
      const eligibleWords = filteredWords.filter(wordHasBlankMeaningHint);
      if (eligibleWords.length === 0) {
        fail(tAi("emptyWords"));
        return;
      }
      const picked = pickFillBlankAiWords(eligibleWords, 10, {
        recentlyUsedIds: usedWordIds,
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      });
      const payloadWords = picked.map((word) =>
        toExerciseAiWord(word, [
          ...(avoidByWord.current[word.id] ?? []),
          ...prefs.softAvoidItemKeys,
        ]),
      );
      const result = await requestExerciseAi({
        exerciseType: "fill-in-blank",
        language: language ?? null,
        difficulty,
        uiLocale: uiLocale === "en" || uiLocale === "fi" || uiLocale === "vi" ? uiLocale : "en",
        words: payloadWords,
      });

      if (!result.ok) {
        if (result.code === "AI_FORBIDDEN") {
          fail(tAi("forbidden"));
          openUpgrade();
          return;
        }
        fail(
          result.code === "AI_EMPTY" ? tAi("emptyWords") : tAi("unavailable"),
        );
        return;
      }

      setStage("saving");

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
        fail(tAi("noneValid"));
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
      completeProcessing();
      window.setTimeout(() => resetProcessing(), 350);
    } catch {
      fail(tAi("unavailable"));
    }
  }, [
    commitAndBeginNext,
    completeProcessing,
    difficulty,
    fail,
    hasProAccess,
    openUpgrade,
    filteredWords,
    language,
    resetProcessing,
    setStage,
    startFromAiItems,
    tAi,
    uiLocale,
    usedWordIds,
  ]);

  const current = itemMap.get(itemIds[index] ?? "");
  const total = itemIds.length;
  const isCorrect = current
    ? !peeked && answersMatchAny(input, current.acceptableAnswers)
    : false;
  const hasSession = total > 0;

  const check = useCallback(() => {
    if (!current || revealed || !input.trim()) return;
    const correct = answersMatchAny(input, current.acceptableAnswers);
    setRevealed(true);
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      answered: s.answered + 1,
    }));
    recordOutcome({
      wordId: current.wordId,
      correct,
      itemKey: fillBlankItemSentence(current),
    });
  }, [current, input, recordOutcome, revealed]);

  const revealAnswer = useCallback(() => {
    if (!current || revealed) return;
    setPeeked(true);
    setRevealed(true);
    setScore((s) => ({
      correct: s.correct,
      answered: s.answered + 1,
    }));
    recordOutcome({
      wordId: current.wordId,
      correct: false,
      itemKey: fillBlankItemSentence(current),
    });
  }, [current, recordOutcome, revealed]);

  const next = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setSessionComplete(true);
  }, [index, total]);

  const tryAgain = useCallback(() => {
    if (aiItems) {
      void generateQuestions();
      return;
    }
    startExampleSession();
  }, [aiItems, generateQuestions, startExampleSession]);

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
      difficulty={difficulty}
      disabled={filteredWords.length === 0}
      onDifficultyChange={setDifficulty}
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

      {generating ||
        processing.stage === "error" ||
        processing.stage === "completed" ? (
        <AiProcessingProgress
          state={processing}
          pipeline="aiGenerate"
          onRetry={
            processing.stage === "error"
              ? () => void generateQuestions()
              : undefined
          }
          onDismissError={
            processing.stage === "error"
              ? () => resetProcessing()
              : undefined
          }
        />
      ) : sessionComplete && hasSession ? (
        <SessionCompleteCard
          title={tSession("complete")}
          questions={total}
          correct={score.correct}
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
            current={index + 1}
            total={total}
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
            onRevealAnswer={revealAnswer}
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
        <EmptyGenerateCard onGenerate={() => void generateQuestions()} />
      ) : null}
    </div>
  );
}

function EmptyGenerateCard({ onGenerate }: { onGenerate: () => void }) {
  const tAi = useTranslations("exercises.ai");

  return (
    <div className="mx-auto max-w-lg border border-hairline-cloud bg-background p-6 text-center sm:p-10">
      <div className="mx-auto mb-5 flex size-12 items-center justify-center bg-(--exercise-accent-soft) text-(--exercise-accent)">
        <Sparkles className="size-5" />
      </div>
      <p className="text-lg font-medium text-ink">{tAi("emptyTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {tAi("emptyDescription")}
      </p>
      <Button type="button" className="mt-6" onClick={onGenerate}>
        <Sparkles className="size-4" />
        {tAi("generate")}
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
  onRevealAnswer,
}: {
  item: FillBlankItem;
  input: string;
  revealed: boolean;
  isCorrect: boolean;
  onInputChange: (v: string) => void;
  onCheck: () => void;
  onRevealAnswer: () => void;
}) {
  const t = useTranslations("exercises.fillInBlank");
  const tAi = useTranslations("exercises.ai");
  const expected = expectedFillBlankAnswer(item);
  const cue = blankMeaningHintFromItem(item);
  const sentenceMeaning = item.sentenceMeaning?.trim() || "";
  const afterText = item.sentenceAfter?.trim() || "";
  const trailingPunctuation = /^[.!?…]+$/.test(afterText) ? afterText : "";
  const bodyAfter = trailingPunctuation ? "" : item.sentenceAfter;

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold tracking-[0.14em] text-(--exercise-accent) uppercase">
          {t("prompt")}
        </p>
        {item.aiGenerated ? (
          <p className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-3" />
            {tAi("generated")}
          </p>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink">
        {item.instruction?.trim() || t("instruction")}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCheck();
        }}
        className="mt-8 space-y-6"
      >
        <p className="font-heading text-[1.65rem] leading-snug font-semibold text-pretty text-ink sm:text-3xl md:text-[2.15rem]">
          {item.sentenceBefore ? <>{item.sentenceBefore} </> : null}
          <span
            className={cn(
              "inline-block min-w-[5.5rem] border-b-2 px-1 text-center font-medium",
              revealed
                ? isCorrect
                  ? "border-success text-success"
                  : "border-error text-error"
                : "border-(--exercise-accent) text-(--exercise-accent)",
            )}
          >
            {revealed ? (isCorrect ? input : expected) : "\u00a0"}
          </span>
          {cue ? (
            <span className="font-medium text-muted-foreground"> ({cue})</span>
          ) : null}
          {bodyAfter ? <> {bodyAfter}</> : null}
          {trailingPunctuation}
        </p>

        {revealed && item.aiGenerated && sentenceMeaning ? (
          <p className="break-words text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {sentenceMeaning}
          </p>
        ) : null}

        {!revealed ? (
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t("placeholder")}
            className="h-12 max-w-xl text-lg font-medium sm:h-14"
          />
        ) : (
          <div
            className={cn(
              "flex min-w-0 max-w-xl items-start gap-3 px-4 py-3 text-sm font-medium sm:text-base",
              isCorrect ? "feedback-success" : "feedback-error",
            )}
          >
            {isCorrect ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0" />
            )}
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {isCorrect ? t("correct") : t("incorrect", { answer: expected })}
            </span>
          </div>
        )}

        <ExerciseHint
          resetKey={item.id}
          answered={revealed}
          correctAnswer={expected}
          onRevealAnswer={onRevealAnswer}
        />
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
