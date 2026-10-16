"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseAiBar } from "@/components/exercises/exercise-ai-bar";
import { FillBlankStage } from "@/components/exercises/fill-blank-stage";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { ExerciseSetSubmitBar } from "@/components/exercises/exercise-set-submit-bar";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { isValidLocale } from "@/i18n/config";
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
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny, shuffleArray } from "@/lib/exercises/utils";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
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
  const exerciseQuota = useQuotaLockMessage("ai_exercise");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [aiItems, setAiItems] = useState<FillBlankItem[] | null>(null);
  const [items, setItems] = useState<FillBlankItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[] | null>(null);
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

  const practiceItems = useMemo(() => {
    if (!activeIds) return items;
    const byId = new Map(items.map((item) => [item.id, item]));
    return activeIds
      .map((id) => byId.get(id))
      .filter((item): item is FillBlankItem => Boolean(item));
  }, [activeIds, items]);

  const questionIds = useMemo(
    () => practiceItems.map((item) => item.id),
    [practiceItems],
  );

  const {
    answers,
    phase: attemptPhase,
    results,
    submitting,
    attemptKey,
    answeredCount,
    totalQuestionCount,
    unansweredIds,
    score,
    setAnswer,
    resetAttempt,
    submit,
  } = useExerciseSetAttempt({ questionIds });

  const submitted = attemptPhase === "submitted";
  const hasSession = items.length > 0;

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
    setItems(sampled);
    setActiveIds(null);
    resetAttempt();
  }, [commitAndBeginNext, createdAtByWordId, exampleItems, resetAttempt]);

  const restartSet = useCallback(() => {
    if (aiItems && aiItems.length > 0) {
      setItems(shuffleArray(aiItems));
      setActiveIds(null);
      resetAttempt();
      return;
    }
    startExampleSession();
  }, [aiItems, resetAttempt, startExampleSession]);

  useEffect(() => {
    if (!hasProAccess) startExampleSession();
  }, [hasProAccess, startExampleSession]);

  useEffect(() => {
    if (!hasProAccess) return;
    setAiItems(null);
    setItems([]);
    setUsedWordIds([]);
    avoidByWord.current = {};
    clearPreferences();
    setActiveIds(null);
    resetAttempt();
  }, [clearPreferences, hasProAccess, workspaceId, resetAttempt]);

  const generateQuestions = useCallback(async () => {
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
        uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
        words: payloadWords,
      });

      if (!result.ok) {
        if (result.code === "AI_QUOTA_EXCEEDED") {
          fail(exerciseQuota.message);
          await exerciseQuota.refreshQuotas();
          return;
        }
        if (result.code === "AI_FORBIDDEN") {
          fail(tAi("forbidden"));
          openUpgrade();
          return;
        }
        if (result.code === "AI_DISABLED") {
          fail(tAi("disabled"));
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
      setItems(shuffleArray(nextItems));
      setActiveIds(null);
      resetAttempt();
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
    filteredWords,
    language,
    openUpgrade,
    resetAttempt,
    resetProcessing,
    setStage,
    tAi,
    exerciseQuota,
    uiLocale,
    usedWordIds,
  ]);

  const handleSubmit = () => {
    void submit((currentAnswers) => {
      const graded: Record<string, SetQuestionResult> = {};
      for (const item of practiceItems) {
        const raw = currentAnswers[item.id];
        const value = typeof raw === "string" ? raw : "";
        const unanswered = !isNonEmptyAnswer(value);
        const correct =
          !unanswered && answersMatchAny(value, item.acceptableAnswers);
        graded[item.id] = { correct, unanswered };
        recordOutcome({
          wordId: item.wordId,
          correct,
          itemKey: fillBlankItemSentence(item),
        });
      }
      return graded;
    });
  };

  const jumpToUnanswered = () => {
    const first = unansweredIds[0];
    if (!first) return;
    document
      .getElementById(`fb-q-${first}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;

  const aiBar = (
    <ExerciseAiBar
      generating={generating}
      hasSession={Boolean(aiItems)}
      difficulty={difficulty}
      disabled={filteredWords.length === 0 || submitted}
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

  const showAiProgress =
    generating ||
    processing.stage === "error" ||
    processing.stage === "completed";

  return (
    <div className="space-y-6">
      <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
      {aiBar}

      {showAiProgress ? (
        <AiProcessingProgress
          state={processing}
          pipeline="aiGenerate"
          onRetry={
            processing.stage === "error"
              ? () => void generateQuestions()
              : undefined
          }
          onDismissError={
            processing.stage === "error" ? () => resetProcessing() : undefined
          }
        />
      ) : !hasSession && hasProAccess ? (
        <EmptyGenerateCard
          locked={exerciseQuota.locked}
          lockMessage={exerciseQuota.message}
          onGenerate={() => void generateQuestions()}
        />
      ) : hasSession ? (
        <>
          <ExerciseProgressHeader
            current={submitted ? score.correct : answeredCount}
            total={submitted ? score.total : totalQuestionCount}
            progressLabel={
              submitted
                ? tSession("score", {
                    correct: score.correct,
                    total: score.total,
                  })
                : tSession("answeredProgress", {
                    answered: answeredCount,
                    total: totalQuestionCount,
                  })
            }
            scoreLabel={
              submitted
                ? t("score", {
                    correct: score.correct,
                    answered: score.total,
                  })
                : undefined
            }
            progressValue={
              submitted
                ? score.total
                  ? (score.correct / score.total) * 100
                  : 0
                : totalQuestionCount
                  ? (answeredCount / totalQuestionCount) * 100
                  : 0
            }
          />

          <div className="space-y-4" key={attemptKey}>
            {practiceItems.map((item, index) => {
              const input =
                typeof answers[item.id] === "string"
                  ? String(answers[item.id])
                  : "";
              const result = results[item.id];
              const unanswered = Boolean(result?.unanswered);
              const isCorrect = Boolean(result?.correct);
              return (
                <FillBlankStage
                  key={item.id}
                  item={item}
                  number={index + 1}
                  input={input}
                  revealed={submitted}
                  peeked={false}
                  isCorrect={isCorrect}
                  unanswered={unanswered}
                  onInputChange={(value) => setAnswer(item.id, value)}
                />
              );
            })}
          </div>

          {!submitted ? (
            <ExerciseSetSubmitBar
              answeredCount={answeredCount}
              totalQuestionCount={totalQuestionCount}
              unansweredCount={unansweredIds.length}
              submitting={submitting}
              onSubmit={handleSubmit}
              onJumpToUnanswered={jumpToUnanswered}
            />
          ) : (
            <div className="space-y-4">
              <SessionCompleteCard
                title={tSession("complete")}
                questions={score.total}
                correct={score.correct}
                tryAgainLabel={tSession("restartSet")}
                onTryAgain={restartSet}
                extraAction={
                  hasProAccess
                    ? {
                        label: tAi("generateMore"),
                        onClick: () => void generateQuestions(),
                        loading: generating,
                        locked: exerciseQuota.locked,
                        lockMessage: exerciseQuota.message,
                      }
                    : undefined
                }
              />
              <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
                {practiceItems.some(
                  (item) =>
                    results[item.id] &&
                    !results[item.id]!.correct &&
                    !results[item.id]!.unanswered,
                ) ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const ids = practiceItems
                        .filter((item) => {
                          const row = results[item.id];
                          return row && !row.correct && !row.unanswered;
                        })
                        .map((item) => item.id);
                      setActiveIds(ids.length > 0 ? ids : null);
                      resetAttempt();
                    }}
                  >
                    {tSession("retryIncorrect")}
                  </Button>
                ) : null}
                {Object.values(results).some((row) => row.unanswered) ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const ids = practiceItems
                        .filter((item) => results[item.id]?.unanswered)
                        .map((item) => item.id);
                      setActiveIds(ids.length > 0 ? ids : null);
                      resetAttempt();
                    }}
                  >
                    {tSession("retryUnanswered")}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function EmptyGenerateCard({
  onGenerate,
  locked,
  lockMessage,
}: {
  onGenerate: () => void;
  locked: boolean;
  lockMessage: string;
}) {
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
        <QuotaLockButton
          type="button"
          size="lg"
          className="mt-7 h-12 sm:h-11"
          locked={locked}
          lockMessage={lockMessage}
          icon={<Sparkles className="size-4" />}
          onClick={onGenerate}
        >
          {tAi("generate")}
        </QuotaLockButton>
      </div>
    </div>
  );
}
