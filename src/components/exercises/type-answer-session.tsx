"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { ExerciseAdditionalInstructions } from "@/components/exercises/exercise-additional-instructions";
import { ExerciseDisplayModePicker } from "@/components/exercises/exercise-display-mode-picker";
import { ExerciseOneByOneBar } from "@/components/exercises/exercise-one-by-one-bar";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { ExerciseSetSubmitBar } from "@/components/exercises/exercise-set-submit-bar";
import {
  ExerciseSetReviewNav,
  exerciseReviewFocusClass,
} from "@/components/exercises/exercise-set-review-nav";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { TypeAnswerStage } from "@/components/exercises/type-answer-stage";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
import { useExerciseSetUi } from "@/hooks/use-exercise-set-ui";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { isValidLocale } from "@/i18n/config";
import { requestContextualExerciseAi } from "@/lib/exercises/contextual-ai-client";
import { CONTEXTUAL_AI_BATCH } from "@/lib/exercises/contextual-ai-types";
import { pickDistinctContextualWords } from "@/lib/exercises/contextual-word-pick";
import { wordHasBlankMeaningHint } from "@/lib/exercises/blank-hint";
import {
  buildTypeAnswerItems,
  contextualExerciseToTypeAnswerItem,
  type TypeAnswerItem,
  type TypeAnswerStudyMode,
} from "@/lib/exercises/type-answer";
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny } from "@/lib/exercises/utils";
import { cn } from "@/lib/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type TypeAnswerSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

function promptLabelFor(
  item: TypeAnswerItem,
  t: ReturnType<typeof useTranslations<"exercises.typeAnswer">>,
) {
  if (item.direction === "CONTEXTUAL") return t("questionContext");
  if (item.direction === "WORD_TO_MEANING") return t("questionWord");
  return t("questionMeaning");
}

export function TypeAnswerSession({
  workspaceId,
  words,
  language,
}: TypeAnswerSessionProps) {
  const t = useTranslations("exercises.typeAnswer");
  const tSession = useTranslations("exercises.session");
  const tAi = useTranslations("exercises.ai");
  const uiLocale = useLocale();
  const { openUpgrade } = useProAccess();
  const exerciseQuota = useQuotaLockMessage("ai_exercise");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] =
    useState<TypeAnswerStudyMode>("word-to-meaning");
  const [items, setItems] = useState<TypeAnswerItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[] | null>(null);
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();
  const { difficulty, setDifficulty } = useExerciseDifficulty("type_answer");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
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
  const createdAtByWordId = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word.createdAt] as const)),
    [filteredWords],
  );
  const isContextual = studyMode === "contextual";

  const practiceItems = useMemo(() => {
    if (!activeIds) return items;
    const byId = new Map(items.map((item) => [item.id, item]));
    return activeIds
      .map((id) => byId.get(id))
      .filter((item): item is TypeAnswerItem => Boolean(item));
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
    checkedCount,
    setAnswer,
    resetAttempt,
    submit,
    checkOne,
    markSubmitted,
  } = useExerciseSetAttempt({ questionIds });

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
    questionIdPrefix: "ta-q",
    setAnchorId: "ta-set-top",
  });

  const startDeterministicSession = useCallback(() => {
    const prefs = commitAndBeginNext();
    const built = sampleSessionItems(
      buildTypeAnswerItems(
        filteredWords,
        studyMode === "meaning-to-word" ? "meaning-to-word" : "word-to-meaning",
      ),
      "type_answer",
      {
        getWordId: (item) => item.wordId,
        getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      },
    );
    setItems(built);
    setActiveIds(null);
    resetAttempt();
    resetProcessing();
    afterNewSet();
  }, [
    afterNewSet,
    commitAndBeginNext,
    createdAtByWordId,
    filteredWords,
    resetAttempt,
    resetProcessing,
    studyMode,
  ]);

  const startContextualSession = useCallback(async () => {
    if (filteredWords.length < 2) return;

    const prefs = commitAndBeginNext();
    const eligibleWords = filteredWords.filter(wordHasBlankMeaningHint);
    const sampledWords = pickDistinctContextualWords(
      eligibleWords,
      CONTEXTUAL_AI_BATCH,
      {
        getWordId: (word) => word.id,
        getWordForm: (word) => word.word,
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      },
    );
    if (sampledWords.length === 0) return;

    const sampledById = new Map(
      sampledWords.map((word) => [word.id, word] as const),
    );

    setItems([]);
    setActiveIds(null);
    resetAttempt();
    setStage("preparing");
    setStage("generating");

    try {
      const languageCode =
        language && language.trim().length >= 2
          ? language.trim().slice(0, 16)
          : null;
      const sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `ta-${Date.now()}`;

      const result = await requestContextualExerciseAi({
        exerciseType: "type-answer",
        language: languageCode,
        difficulty,
        uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
        additionalInstructions,
        words: sampledWords.map((word) => ({
          id: word.id,
          word: word.word.trim().slice(0, 120),
          meaning: word.meanings[0]?.trim() || null,
          partOfSpeech: word.partOfSpeech,
        })),
        nextSet: { sessionId, sequence: 0 },
      });

      if (!result.ok) {
        if (result.code === "AI_QUOTA_EXCEEDED") {
          fail(exerciseQuota.message);
          await exerciseQuota.refreshQuotas();
          return;
        }
        if (result.code === "AI_FORBIDDEN" || result.code === "PREMIUM_REQUIRED") {
          fail(result.code === "PREMIUM_REQUIRED" ? tAi("premiumRequired") : tAi("forbidden"));
          openUpgrade();
          return;
        }
        if (result.code === "AI_DISABLED") {
          fail(tAi("disabled"));
          return;
        }
        fail(tAi("unavailable"));
        return;
      }

      setStage("validating");
      const nextItems = result.exercises
        .filter((exercise) => exercise.type === "type-answer")
        .map((exercise, index) =>
          contextualExerciseToTypeAnswerItem(
            exercise,
            sampledById.get(exercise.wordId),
            index,
          ),
        )
        .filter((item): item is TypeAnswerItem => item != null);

      if (nextItems.length === 0) {
        fail(tAi("noneValid"));
        return;
      }

      setStage("saving");
      setItems(nextItems);
      completeProcessing();
      afterNewSet();
      window.setTimeout(() => resetProcessing(), 350);
    } catch {
      fail(tAi("unavailable"));
    }
  }, [
    additionalInstructions,
    afterNewSet,
    commitAndBeginNext,
    completeProcessing,
    difficulty,
    exerciseQuota.message,
    exerciseQuota.refreshQuotas,
    fail,
    filteredWords,
    language,
    openUpgrade,
    resetAttempt,
    resetProcessing,
    setStage,
    tAi,
    uiLocale,
  ]);

  const startSession = useCallback(() => {
    if (isContextual) {
      void startContextualSession();
      return;
    }
    startDeterministicSession();
  }, [isContextual, startContextualSession, startDeterministicSession]);

  // Deterministic modes reshuffle when the practice source changes.
  // Contextual waits for an explicit Generate click so the learner can edit
  // additional instructions first.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (isContextual) {
        setItems([]);
        setActiveIds(null);
        resetAttempt();
        resetProcessing();
        return;
      }
      startDeterministicSession();
    });
    return () => {
      cancelled = true;
    };
    // intentionally omit session starters from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid infinite reshuffle
  }, [workspaceId, studyMode, filters, isContextual, difficulty]);

  const handleStudyModeChange = (mode: string) => {
    if (
      mode === "word-to-meaning" ||
      mode === "meaning-to-word" ||
      mode === "contextual"
    ) {
      setStudyMode(mode);
    }
  };

  const gradeQuestion = useCallback(
    (item: TypeAnswerItem, raw: unknown): SetQuestionResult => {
      const value = typeof raw === "string" ? raw : "";
      const unanswered = !isNonEmptyAnswer(value);
      const correct =
        !unanswered && answersMatchAny(value, item.acceptableAnswers);
      recordOutcome({ wordId: item.wordId, correct });
      return { correct, unanswered };
    },
    [recordOutcome],
  );

  const handleSubmit = () => {
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

  const filtersBar = (
    <VocabularyFiltersBar
      words={words}
      filters={filters}
      onFiltersChange={setFilters}
      studyMode={studyMode}
      onStudyModeChange={handleStudyModeChange}
      showStudyMode
      studyModeVariant="with-contextual"
      contextualPro={false}
    />
  );

  if (filteredWords.length < 2 && isContextual) {
    return (
      <div className="space-y-6">
        {filtersBar}
        <VocabularyEmpty variant="need-more-words" minWords={2} />
      </div>
    );
  }

  if (
    isContextual &&
    (generating ||
      processing.stage === "error" ||
      processing.stage === "completed") &&
    items.length === 0
  ) {
    return (
      <div className="space-y-6">
        {filtersBar}
        <ExerciseAdditionalInstructions
          scope="vocabulary"
          value={additionalInstructions}
          onChange={setAdditionalInstructions}
          settings={{ difficulty }}
          onSettingsChange={(next) => {
            if (next.difficulty) setDifficulty(next.difficulty);
          }}
          disabled={generating}
        />
        <ExerciseDifficultySelect
          value={difficulty}
          onChange={setDifficulty}
          disabled={generating}
          compact
        />
        <AiProcessingProgress
          state={processing}
          pipeline="aiGenerate"
          onRetry={
            processing.stage === "error"
              ? () => void startContextualSession()
              : undefined
          }
          onDismissError={
            processing.stage === "error" ? () => resetProcessing() : undefined
          }
        />
      </div>
    );
  }

  if (items.length === 0 && !isContextual) {
    return (
      <div className="space-y-6">
        {filtersBar}
        <VocabularyEmpty variant="no-meanings" />
      </div>
    );
  }

  if (items.length === 0 && isContextual) {
    return (
      <div className="space-y-6">
        {filtersBar}
        <ExerciseAdditionalInstructions
          scope="vocabulary"
          value={additionalInstructions}
          onChange={setAdditionalInstructions}
          settings={{ difficulty }}
          onSettingsChange={(next) => {
            if (next.difficulty) setDifficulty(next.difficulty);
          }}
          disabled={generating}
        />
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
              {t("contextualEmptyTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("contextualEmptyDescription")}
            </p>
            <QuotaLockButton
              type="button"
              size="lg"
              className="mt-7 h-12 sm:h-11"
              locked={exerciseQuota.locked}
              lockMessage={exerciseQuota.message}
              pending={generating}
              icon={<Sparkles className="size-4" />}
              onClick={() => void startContextualSession()}
            >
              {tAi("generate")}
            </QuotaLockButton>
          </div>
        </div>
      </div>
    );
  }

  const oneByOne = displayMode === "one_by_one";
  const progressCurrent = submitted
    ? score.correct
    : oneByOne
      ? Math.min(checkedCount + (currentChecked ? 0 : 1), totalQuestionCount)
      : answeredCount;
  const progressTotal = submitted ? score.total : totalQuestionCount;

  return (
    <div className="space-y-6">
      <div id="ta-set-top" className="scroll-mt-24" />
      {filtersBar}

      <ExerciseDisplayModePicker
        value={displayMode}
        onChange={setDisplayMode}
        disabled={displayModeLocked}
      />

      {isContextual ? (
        <ExerciseAdditionalInstructions
          scope="vocabulary"
          value={additionalInstructions}
          onChange={setAdditionalInstructions}
          settings={{ difficulty }}
          onSettingsChange={(next) => {
            if (next.difficulty) setDifficulty(next.difficulty);
          }}
          disabled={generating || submitted}
        />
      ) : null}

      {isContextual ? (
        <ExerciseDifficultySelect
          value={difficulty}
          onChange={setDifficulty}
          disabled={generating || submitted}
          compact
        />
      ) : null}

      {!isContextual &&
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
          questionDomId={(id) => `ta-q-${id}`}
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
            typeof answers[item.id] === "string" ? String(answers[item.id]) : "";
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
              <TypeAnswerStage
                item={item}
                number={numbers[item.id]}
                promptLabel={promptLabelFor(item, t)}
                input={input}
                revealed={revealed}
                peeked={false}
                isCorrect={isCorrect}
                unanswered={unanswered}
                onInputChange={(value) => setAnswer(item.id, value)}
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
          onTryAgain={startSession}
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
        />
      )}
    </div>
  );
}
