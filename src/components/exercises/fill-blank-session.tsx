"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseAiBar } from "@/components/exercises/exercise-ai-bar";
import { FillBlankActions } from "@/components/exercises/fill-blank-actions";
import { FillBlankStage } from "@/components/exercises/fill-blank-stage";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { requestExerciseAi } from "@/lib/exercises/ai-client";
import {
  fillBlankExerciseToItem,
  fillBlankItemSentence,
} from "@/lib/exercises/ai-validate";
import { pickFillBlankAiWords, toExerciseAiWord } from "@/lib/exercises/ai-words";
import { wordHasBlankMeaningHint } from "@/lib/exercises/blank-hint";
import {
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
          <FillBlankStage
            key={current.id}
            item={current}
            input={input}
            revealed={revealed}
            peeked={peeked}
            isCorrect={isCorrect}
            onInputChange={setInput}
            onCheck={check}
            onRevealAnswer={revealAnswer}
          />
          <FillBlankActions
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
    <div className="relative mx-auto max-w-lg overflow-hidden px-4 py-10 text-center sm:px-8 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,var(--exercise-accent-soft),transparent_70%)]"
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center border border-(--exercise-accent)/25 bg-(--exercise-accent-soft) text-(--exercise-accent)">
          <Sparkles className="size-5" />
        </div>
        <p className="font-heading text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {tAi("emptyTitle")}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {tAi("emptyDescription")}
        </p>
        <Button type="button" size="lg" className="mt-7 h-12 sm:h-11" onClick={onGenerate}>
          <Sparkles className="size-4" />
          {tAi("generate")}
        </Button>
      </div>
    </div>
  );
}
