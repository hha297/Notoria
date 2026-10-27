"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseAiBar } from "@/components/exercises/exercise-ai-bar";
import { ExerciseDisplayModePicker } from "@/components/exercises/exercise-display-mode-picker";
import { ExerciseOneByOneBar } from "@/components/exercises/exercise-one-by-one-bar";
import { FillBlankSourcePicker } from "@/components/exercises/fill-blank-source-picker";
import { FillBlankStage } from "@/components/exercises/fill-blank-stage";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { ExerciseSetSubmitBar } from "@/components/exercises/exercise-set-submit-bar";
import {
  ExerciseSetReviewNav,
  exerciseReviewFocusClass,
} from "@/components/exercises/exercise-set-review-nav";
import { NextSetStatusChip } from "@/components/exercises/next-set-status";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseNextSet } from "@/hooks/use-exercise-next-set";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { isValidLocale } from "@/i18n/config";
import { requestExerciseAi } from "@/lib/exercises/ai-client";
import {
  deleteExerciseDraft,
  loadExerciseDraft,
  saveExerciseDraft,
} from "@/lib/exercises/ai-draft-client";
import type { ExerciseAiFillBlank, ExerciseAiWordInput } from "@/lib/exercises/ai-types";
import {
  fillBlankExerciseToItem,
  fillBlankItemSentence,
} from "@/lib/exercises/ai-validate";
import { pickFillBlankAiWords, toExerciseAiWord } from "@/lib/exercises/ai-words";
import { wordHasBlankMeaningHint } from "@/lib/exercises/blank-hint";
import { isSlotAnswerComplete } from "@/lib/exercises/character-slots";
import {
  buildFillBlankItems,
  type FillBlankItem,
  type FillBlankSource,
} from "@/lib/exercises/fill-blank";
import { DEFAULT_NEXT_SET_COUNT } from "@/lib/exercises/next-set-fingerprint";
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny, shuffleArray } from "@/lib/exercises/utils";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
import { useExerciseSetUi } from "@/hooks/use-exercise-set-ui";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { cn } from "@/lib/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type FillBlankNextPayload = {
  picked: FlashcardWord[];
  words: ExerciseAiWordInput[];
};

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
  const [questionSource, setQuestionSource] =
    useState<FillBlankSource>("saved-examples");
  const [aiItems, setAiItems] = useState<FillBlankItem[] | null>(null);
  const [items, setItems] = useState<FillBlankItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[] | null>(null);
  const usingSavedExamples = questionSource === "saved-examples";
  const usingAiGenerated = questionSource === "ai-generated";
  const { difficulty, setDifficulty } = useExerciseDifficulty("fill_blank");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
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

  const isCompleteAnswer = useCallback(
    (questionId: string, value: unknown) => {
      const item = practiceItems.find((candidate) => candidate.id === questionId);
      return Boolean(item && isSlotAnswerComplete(value, item.acceptableAnswers));
    },
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
    checkedCount,
    setAnswer,
    resetAttempt,
    submit,
    checkOne,
    markSubmitted,
  } = useExerciseSetAttempt({ questionIds, isAnswered: isCompleteAnswer });

  const {
    displayMode,
    setDisplayMode,
    displayModeLocked,
    currentQuestionId,
    currentChecked,
    currentCanCheck,
    isLastQuestion,
    goNextQuestion,
    visibleQuestionIds,
    numbers,
    reviewFilter,
    setReviewFilter,
    focusedReviewId,
    setFocusedReviewId,
    afterNewSet,
    jumpToUnanswered,
    openWrongReview,
    submitted,
  } = useExerciseSetUi({
    questionIds,
    results,
    answers,
    attemptPhase,
    answeredCount,
    checkedCount,
    questionIdPrefix: "fb-q",
    setAnchorId: "fb-set-top",
    isAnswered: isCompleteAnswer,
  });

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
    afterNewSet();
  }, [
    afterNewSet,
    commitAndBeginNext,
    createdAtByWordId,
    exampleItems,
    resetAttempt,
  ]);

  const restartSet = useCallback(() => {
    if (usingAiGenerated && aiItems && aiItems.length > 0) {
      setItems(shuffleArray(aiItems));
      setActiveIds(null);
      resetAttempt();
      afterNewSet();
      return;
    }
    startExampleSession();
  }, [
    afterNewSet,
    aiItems,
    resetAttempt,
    startExampleSession,
    usingAiGenerated,
  ]);

  const handleQuestionSourceChange = useCallback(
    (next: FillBlankSource) => {
      if (next === "ai-generated" && !hasProAccess) {
        openUpgrade();
        return;
      }
      if (next === questionSource) return;
      setQuestionSource(next);
      resetProcessing();
      setAiItems(null);
      setUsedWordIds([]);
      avoidByWord.current = {};
      clearPreferences();
      setActiveIds(null);
      resetAttempt();
      if (next === "ai-generated") {
        setItems([]);
      }
    },
    [
      clearPreferences,
      hasProAccess,
      openUpgrade,
      questionSource,
      resetAttempt,
      resetProcessing,
    ],
  );

  useEffect(() => {
    if (!usingSavedExamples) return;
    startExampleSession();
  }, [startExampleSession, usingSavedExamples, workspaceId]);

  // Reset the AI bank when the workspace changes while AI source is active.
  // Source switches clear state in handleQuestionSourceChange instead.
  useEffect(() => {
    if (!usingAiGenerated) return;
    setAiItems(null);
    setItems([]);
    setUsedWordIds([]);
    avoidByWord.current = {};
    clearPreferences();
    setActiveIds(null);
    resetAttempt();
    resetProcessing();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- workspace switch only
  }, [workspaceId]);

  const mapExercisesToItems = useCallback(
    (exercises: ExerciseAiFillBlank[], picked: FlashcardWord[]) => {
      batchRef.current += 1;
      const batchId = `${Date.now()}-${batchRef.current}`;
      const remaining = [...picked];
      const nextItems: FillBlankItem[] = [];

      for (const [itemIndex, exercise] of exercises.entries()) {
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
      return nextItems;
    },
    [],
  );

  const applyGeneratedItems = useCallback(
    (nextItems: FillBlankItem[]) => {
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
      afterNewSet();
    },
    [afterNewSet, resetAttempt],
  );

  const draftIdentity = useMemo(
    () => ({
      scope: `workspace:${workspaceId}:fill_blank`,
      config: JSON.stringify({
        difficulty,
        uiLocale,
        language: language ?? null,
        filters,
        additionalInstructions: additionalInstructions.trim(),
      }),
    }),
    [additionalInstructions, difficulty, filters, language, uiLocale, workspaceId],
  );

  const buildNextPayload = useCallback((): FillBlankNextPayload | null => {
    const prefs = commitAndBeginNext();
    const eligibleWords = filteredWords.filter(wordHasBlankMeaningHint);
    if (eligibleWords.length === 0) return null;
    const picked = pickFillBlankAiWords(eligibleWords, DEFAULT_NEXT_SET_COUNT, {
      recentlyUsedIds: usedWordIds,
      softAvoidWordIds: prefs.softAvoidWordIds,
      softPreferWordIds: prefs.softPreferWordIds,
    });
    if (picked.length === 0) return null;
    return {
      picked,
      words: picked.map((word) =>
        toExerciseAiWord(word, [
          ...(avoidByWord.current[word.id] ?? []),
          ...prefs.softAvoidItemKeys,
        ]),
      ),
    };
  }, [commitAndBeginNext, filteredWords, usedWordIds]);

  const {
    sessionId,
    sequence,
    status: nextSetStatus,
    notifyAnswerInteraction,
    openNextSet,
    retryPrefetch,
    markGeneratedSequence,
    resetForNewActiveSet,
  } = useExerciseNextSet<FillBlankNextPayload, FillBlankItem[]>({
    enabled: hasProAccess && usingAiGenerated && Boolean(aiItems),
    buildPayload: () => buildNextPayload(),
    generate: async (payload, meta) => {
      const result = await requestExerciseAi(
        {
          exerciseType: "fill-in-blank",
          language: language ?? null,
          difficulty,
          uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
          additionalInstructions,
          words: payload.words,
          nextSet: {
            sessionId: meta.sessionId,
            sequence: meta.sequence,
            regenerate: meta.regenerate,
          },
        },
        { signal: meta.signal },
      );
      if (!result.ok) {
        return {
          ok: false,
          retryable:
            result.code === "AI_UNAVAILABLE" ||
            result.code === "AI_JOB_IN_PROGRESS",
        };
      }
      const nextItems = mapExercisesToItems(result.exercises, payload.picked);
      if (nextItems.length === 0) return { ok: false, retryable: false };
      return { ok: true, result: nextItems };
    },
    applyResult: (items) => {
      void saveExerciseDraft(draftIdentity, items);
      applyGeneratedItems(items);
    },
  });

  const generateQuestions = useCallback(
    async (options?: {
      sequence?: number;
      regenerate?: boolean;
      showProgress?: boolean;
      signal?: AbortSignal;
    }) => {
      if (filteredWords.length === 0) {
        toast.error(tAi("emptyWords"));
        return false;
      }

      const showProgress = options?.showProgress !== false;
      const targetSequence =
        options?.sequence ?? (aiItems ? sequence + 1 : sequence);
      const payload = buildNextPayload();
      if (!payload) {
        if (showProgress) fail(tAi("emptyWords"));
        return false;
      }

      if (showProgress) {
        setStage("preparing");
        setStage("generating");
      }
      try {
        if (!options?.regenerate && targetSequence === 0 && !aiItems) {
          const restored = await loadExerciseDraft<FillBlankItem>(draftIdentity);
          const eligibleIds = new Set(filteredWords.map((word) => word.id));
          const valid = (restored ?? []).filter(
            (item) =>
              item?.id &&
              item.word &&
              Array.isArray(item.acceptableAnswers) &&
              item.acceptableAnswers.length > 0 &&
              eligibleIds.has(item.wordId),
          );
          if (valid.length > 0) {
            applyGeneratedItems(valid);
            markGeneratedSequence(targetSequence);
            if (showProgress) {
              completeProcessing();
              window.setTimeout(() => resetProcessing(), 350);
            }
            return true;
          }
        }
        const result = await requestExerciseAi(
          {
            exerciseType: "fill-in-blank",
            language: language ?? null,
            difficulty,
            uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
            additionalInstructions,
            words: payload.words,
            nextSet: {
              sessionId,
              sequence: targetSequence,
              regenerate: options?.regenerate,
            },
          },
          { signal: options?.signal },
        );

        if (!result.ok) {
          if (!showProgress) return false;
          if (result.code === "AI_QUOTA_EXCEEDED") {
            fail(exerciseQuota.message);
            await exerciseQuota.refreshQuotas();
            return false;
          }
          if (result.code === "AI_FORBIDDEN" || result.code === "PREMIUM_REQUIRED") {
            fail(
              result.code === "PREMIUM_REQUIRED"
                ? tAi("premiumRequired")
                : tAi("forbidden"),
            );
            openUpgrade();
            return false;
          }
          if (result.code === "AI_DISABLED") {
            fail(tAi("disabled"));
            return false;
          }
          fail(
            result.code === "AI_EMPTY" ? tAi("emptyWords") : tAi("unavailable"),
          );
          return false;
        }

        if (showProgress) setStage("validating");
        const nextItems = mapExercisesToItems(result.exercises, payload.picked);
        if (nextItems.length === 0) {
          if (showProgress) fail(tAi("noneValid"));
          return false;
        }

        if (showProgress) setStage("saving");
        await saveExerciseDraft(draftIdentity, nextItems);
        applyGeneratedItems(nextItems);
        markGeneratedSequence(targetSequence);
        if (showProgress) {
          completeProcessing();
          window.setTimeout(() => resetProcessing(), 350);
        }
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return false;
        }
        if (showProgress) fail(tAi("unavailable"));
        return false;
      }
    },
    [
      additionalInstructions,
      aiItems,
      applyGeneratedItems,
      buildNextPayload,
      completeProcessing,
      difficulty,
      draftIdentity,
      exerciseQuota,
      fail,
      filteredWords,
      language,
      mapExercisesToItems,
      markGeneratedSequence,
      openUpgrade,
      resetProcessing,
      sequence,
      sessionId,
      setStage,
      tAi,
      uiLocale,
    ],
  );

  const handleNewSet = useCallback(async () => {
    const outcome = await openNextSet();
    if (outcome.mode === "applied") return;
    if (outcome.mode === "attached") {
      setStage("generating");
      const ok = await outcome.promise;
      if (ok) {
        completeProcessing();
        window.setTimeout(() => resetProcessing(), 350);
      } else {
        fail(tAi("unavailable"));
      }
      return;
    }
    await generateQuestions({ sequence: outcome.sequence, showProgress: true });
  }, [
    completeProcessing,
    fail,
    generateQuestions,
    openNextSet,
    resetProcessing,
    setStage,
    tAi,
  ]);

  // Drop a prepared set when generation config changes mid-session.
  useEffect(() => {
    if (!aiItems) return;
    resetForNewActiveSet(sequence);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only invalidate on config
  }, [difficulty, additionalInstructions]);

  const gradeQuestion = useCallback(
    (item: FillBlankItem, raw: unknown): SetQuestionResult => {
      const value = typeof raw === "string" ? raw : "";
      const unanswered = !isNonEmptyAnswer(value);
      const correct =
        !unanswered && answersMatchAny(value, item.acceptableAnswers);
      recordOutcome({
        wordId: item.wordId,
        correct,
        itemKey: fillBlankItemSentence(item),
      });
      return { correct, unanswered };
    },
    [recordOutcome],
  );

  const handleSubmit = () => {
    if (usingAiGenerated) void deleteExerciseDraft(draftIdentity);
    void submit((currentAnswers) => {
      const graded: Record<string, SetQuestionResult> = {};
      for (const item of practiceItems) {
        graded[item.id] = gradeQuestion(item, currentAnswers[item.id]);
      }
      return graded;
    });
  };

  const handleCheckOne = () => {
    if (!currentQuestionId) return;
    const item = practiceItems.find((row) => row.id === currentQuestionId);
    if (!item) return;
    void checkOne(item.id, (raw) => gradeQuestion(item, raw));
  };

  const handleViewResults = () => {
    markSubmitted();
  };

  const itemsById = useMemo(
    () => new Map(practiceItems.map((item) => [item.id, item] as const)),
    [practiceItems],
  );

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;

  const aiBar = (
    <ExerciseAiBar
      generating={generating}
      hasSession={Boolean(aiItems)}
      difficulty={difficulty}
      disabled={filteredWords.length === 0 || submitted}
      onDifficultyChange={setDifficulty}
      onGenerate={() =>
        void (aiItems ? handleNewSet() : generateQuestions({ sequence: 0 }))
      }
      additionalInstructions={additionalInstructions}
      onAdditionalInstructionsChange={setAdditionalInstructions}
    />
  );

  const sourcePicker = (
    <FillBlankSourcePicker
      value={questionSource}
      onChange={handleQuestionSourceChange}
      aiLocked={!hasProAccess}
      disabled={submitted || generating}
    />
  );

  if (filteredWords.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
        {sourcePicker}
        {usingAiGenerated ? aiBar : null}
        <VocabularyEmpty variant="no-filtered" />
      </div>
    );
  }

  if (usingSavedExamples && exampleItems.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
        {sourcePicker}
        <EmptySavedExamplesCard
          canUseAi={hasProAccess}
          onChooseAi={() => handleQuestionSourceChange("ai-generated")}
        />
      </div>
    );
  }

  const showAiProgress =
    usingAiGenerated &&
    (generating ||
      processing.stage === "error" ||
      processing.stage === "completed");

  const oneByOne = displayMode === "one_by_one";
  const progressCurrent = submitted
    ? score.correct
    : oneByOne
      ? Math.min(checkedCount + (currentChecked ? 0 : 1), totalQuestionCount)
      : answeredCount;
  const progressTotal = submitted ? score.total : totalQuestionCount;

  return (
    <div className="space-y-6">
      <div id="fb-set-top" className="scroll-mt-24" />
      <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
      {sourcePicker}
      {usingAiGenerated ? aiBar : null}

      {hasSession && usingAiGenerated && hasProAccess && !showAiProgress ? (
        <NextSetStatusChip
          status={nextSetStatus}
          onRetry={() => retryPrefetch()}
          onOpen={() => void handleNewSet()}
          className="mx-auto w-fit"
        />
      ) : null}

      {showAiProgress ? (
        <AiProcessingProgress
          state={processing}
          pipeline="aiGenerate"
          onRetry={
            processing.stage === "error"
              ? () =>
                  void (aiItems
                    ? handleNewSet()
                    : generateQuestions({ sequence: 0, regenerate: true }))
              : undefined
          }
          onDismissError={
            processing.stage === "error" ? () => resetProcessing() : undefined
          }
        />
      ) : !hasSession && usingAiGenerated ? (
        <EmptyGenerateCard
          locked={exerciseQuota.locked}
          lockMessage={exerciseQuota.message}
          onGenerate={() => void generateQuestions({ sequence: 0 })}
        />
      ) : hasSession ? (
        <>
          <ExerciseDisplayModePicker
            value={displayMode}
            onChange={setDisplayMode}
            disabled={displayModeLocked}
          />

          {usingSavedExamples &&
          practiceItems.length > 0 &&
          practiceItems.length < 20 ? (
            <p className="text-xs text-muted-foreground">
              {tSession("shortSetNote", { count: practiceItems.length })}
            </p>
          ) : null}

          {submitted ? (
            <ExerciseProgressHeader
              current={progressCurrent}
              total={progressTotal}
              progressLabel={tSession("score", {
                correct: score.correct,
                total: score.total,
              })}
              scoreLabel={t("score", {
                correct: score.correct,
                answered: score.total,
              })}
              progressValue={
                score.total ? (score.correct / score.total) * 100 : 0
              }
            />
          ) : null}

          {submitted ? (
            <ExerciseSetReviewNav
              questionIds={questionIds}
              results={results}
              questionDomId={(id) => `fb-q-${id}`}
              filter={reviewFilter}
              onFilterChange={setReviewFilter}
              focusedId={focusedReviewId}
              onFocusedIdChange={setFocusedReviewId}
            />
          ) : null}

          <div className="space-y-4" key={attemptKey}>
            {visibleQuestionIds.map((id) => {
              const item = itemsById.get(id);
              if (!item) return null;
              const input =
                typeof answers[item.id] === "string"
                  ? String(answers[item.id])
                  : "";
              const result = results[item.id];
              const unanswered = Boolean(result?.unanswered);
              const isCorrect = Boolean(result?.correct);
              const revealed = submitted || Boolean(result);
              return (
                <div
                  key={item.id}
                  className={cn(
                    exerciseReviewFocusClass(focusedReviewId === item.id),
                  )}
                >
                  <FillBlankStage
                    item={item}
                    number={numbers[item.id]}
                    input={input}
                    revealed={revealed}
                    peeked={false}
                    isCorrect={isCorrect}
                    unanswered={unanswered}
                    onInputChange={(value) => {
                      setAnswer(item.id, value);
                      if (value.trim()) notifyAnswerInteraction();
                    }}
                  />
                </div>
              );
            })}
          </div>

          {!submitted ? (
            oneByOne ? (
              <ExerciseOneByOneBar
                checked={currentChecked}
                isLast={isLastQuestion}
                canCheck={currentCanCheck}
                submitting={submitting}
                progressCurrent={progressCurrent}
                progressTotal={progressTotal}
                onCheck={handleCheckOne}
                onNext={goNextQuestion}
                onViewResults={handleViewResults}
              />
            ) : (
              <ExerciseSetSubmitBar
                answeredCount={answeredCount}
                totalQuestionCount={totalQuestionCount}
                unansweredCount={unansweredIds.length}
                submitting={submitting}
                disabled={unansweredIds.length > 0}
                onSubmit={handleSubmit}
                onJumpToUnanswered={() => jumpToUnanswered(unansweredIds)}
              />
            )
          ) : (
            <SessionCompleteCard
              title={tSession("complete")}
              questions={score.total}
              correct={score.correct}
              incorrect={score.incorrect}
              unanswered={score.unanswered}
              tryAgainLabel={tSession("restartSet")}
              onTryAgain={restartSet}
              onViewWrong={openWrongReview}
              onRetryIncorrect={() => {
                const ids = practiceItems
                  .filter((item) => {
                    const row = results[item.id];
                    return row && !row.correct && !row.unanswered;
                  })
                  .map((item) => item.id);
                setActiveIds(ids.length > 0 ? ids : null);
                resetAttempt();
                afterNewSet();
              }}
              onRetryUnanswered={() => {
                const ids = practiceItems
                  .filter((item) => results[item.id]?.unanswered)
                  .map((item) => item.id);
                setActiveIds(ids.length > 0 ? ids : null);
                resetAttempt();
                afterNewSet();
              }}
              extraAction={
                usingAiGenerated && hasProAccess
                  ? {
                      label: tAi("generateMore"),
                      onClick: () => void handleNewSet(),
                      loading: generating,
                      locked: exerciseQuota.locked,
                      lockMessage: exerciseQuota.message,
                    }
                  : undefined
              }
            />
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

function EmptySavedExamplesCard({
  canUseAi,
  onChooseAi,
}: {
  canUseAi: boolean;
  onChooseAi: () => void;
}) {
  const t = useTranslations("exercises.fillInBlank.source");
  const tEmpty = useTranslations("exercises.empty");

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center sm:px-8 sm:py-14">
      <p className="font-heading text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {t("emptyTitle")}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t("emptyDescription")}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <LinkButton href="/vocabulary">{tEmpty("editVocabulary")}</LinkButton>
        {canUseAi ? (
          <Button type="button" variant="outline" onClick={onChooseAi}>
            {t("chooseAi")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
