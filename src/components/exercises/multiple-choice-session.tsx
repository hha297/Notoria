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
import { MultipleChoiceStage } from "@/components/exercises/multiple-choice-stage";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
import { useExerciseSetUi } from "@/hooks/use-exercise-set-ui";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { cn } from "@/lib/utils";
import { isValidLocale } from "@/i18n/config";
import { requestContextualExerciseAi } from "@/lib/exercises/contextual-ai-client";
import {
  deleteExerciseDraft,
  loadExerciseDraft,
  saveExerciseDraft,
} from "@/lib/exercises/ai-draft-client";
import {
  CONTEXTUAL_AI_BATCH,
  CONTEXTUAL_DISTRACTOR_POOL_MAX,
} from "@/lib/exercises/contextual-ai-types";
import { pickDistinctContextualWords } from "@/lib/exercises/contextual-word-pick";
import { wordHasBlankMeaningHint } from "@/lib/exercises/blank-hint";
import {
  buildMultipleChoiceQuestions,
  contextualExerciseToQuestion,
  contextualSurfaceAnswer,
  displayContextualOption,
  type MultipleChoiceQuestion,
  type MultipleChoiceStudyMode,
} from "@/lib/exercises/multiple-choice";
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type MultipleChoiceSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

function promptLabelFor(
  question: MultipleChoiceQuestion,
  labels: {
    contextual: string;
    wordToMeaning: string;
    meaningToWord: string;
  },
) {
  if (question.direction === "CONTEXTUAL") return labels.contextual;
  if (question.direction === "WORD_TO_MEANING") return labels.wordToMeaning;
  return labels.meaningToWord;
}

export function MultipleChoiceSession({
  workspaceId,
  words,
  language,
}: MultipleChoiceSessionProps) {
  const t = useTranslations("exercises.multipleChoice");
  const tSession = useTranslations("exercises.session");
  const tAi = useTranslations("exercises.ai");
  const uiLocale = useLocale();
  const { openUpgrade } = useProAccess();
  const exerciseQuota = useQuotaLockMessage("ai_exercise");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] =
    useState<MultipleChoiceStudyMode>("word-to-meaning");
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [activeIds, setActiveIds] = useState<string[] | null>(null);
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();
  const { difficulty, setDifficulty } = useExerciseDifficulty("multiple_choice");
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
  const draftIdentity = useMemo(
    () => ({
      scope: `workspace:${workspaceId}:multiple_choice`,
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

  const practiceQuestions = useMemo(() => {
    if (!activeIds) return questions;
    const byId = new Map(questions.map((q) => [q.id, q]));
    return activeIds
      .map((id) => byId.get(id))
      .filter((q): q is MultipleChoiceQuestion => Boolean(q));
  }, [activeIds, questions]);

  const questionIds = useMemo(
    () => practiceQuestions.map((q) => q.id),
    [practiceQuestions],
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
    questionIdPrefix: "mc-q",
    setAnchorId: "mc-set-top",
  });

  const startDeterministicSession = useCallback(() => {
    const prefs = commitAndBeginNext();
    const built = sampleSessionItems(
      buildMultipleChoiceQuestions(
        filteredWords,
        studyMode === "meaning-to-word" ? "meaning-to-word" : "word-to-meaning",
      ),
      "multiple_choice",
      {
        getWordId: (item) => item.wordId,
        getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      },
    );
    setQuestions(built);
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

    const mayRestore = questions.length === 0;

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

    setQuestions([]);
    setActiveIds(null);
    resetAttempt();
    setStage("preparing");
    setStage("generating");

    try {
      if (mayRestore) {
        const restored = await loadExerciseDraft<MultipleChoiceQuestion>(
          draftIdentity,
        );
        const eligibleIds = new Set(filteredWords.map((word) => word.id));
        const valid = (restored ?? []).filter(
          (question) =>
            question?.id &&
            question.prompt &&
            question.options?.length === 4 &&
            question.options.includes(question.correctOption) &&
            eligibleIds.has(question.wordId),
        );
        if (valid.length > 0) {
          setQuestions(valid);
          completeProcessing();
          afterNewSet();
          window.setTimeout(() => resetProcessing(), 350);
          return;
        }
      }
      const distractorPool = [
        ...new Set(
          filteredWords
            .map((word) => word.word.trim())
            .filter(Boolean),
        ),
      ].slice(0, CONTEXTUAL_DISTRACTOR_POOL_MAX);
      const languageCode =
        language && language.trim().length >= 2
          ? language.trim().slice(0, 16)
          : null;
      const sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `mc-${Date.now()}`;

      const result = await requestContextualExerciseAi({
        exerciseType: "multiple-choice",
        language: languageCode,
        difficulty,
        uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
        additionalInstructions,
        words: sampledWords.map((word) => ({
          id: word.id,
          word: word.word.trim().slice(0, 120),
          meaning: word.meanings[0]?.trim() || null,
          partOfSpeech: word.partOfSpeech,
          distractorPool: distractorPool.filter(
            (candidate) =>
              candidate.toLowerCase() !== word.word.trim().toLowerCase(),
          ),
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
      const nextQuestions = result.exercises
        .filter((exercise) => exercise.type === "multiple-choice")
        .map((exercise, index) =>
          contextualExerciseToQuestion(
            exercise,
            sampledById.get(exercise.wordId),
            index,
          ),
        )
        .filter((question): question is MultipleChoiceQuestion => question != null)
        .filter((question) => question.options.length === 4);

      if (nextQuestions.length === 0) {
        fail(tAi("noneValid"));
        return;
      }

      setStage("saving");
      await saveExerciseDraft(draftIdentity, nextQuestions);
      setQuestions(nextQuestions);
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
    draftIdentity,
    exerciseQuota.message,
    exerciseQuota.refreshQuotas,
    fail,
    filteredWords,
    language,
    openUpgrade,
    questions.length,
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
        setQuestions([]);
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
    (question: MultipleChoiceQuestion, raw: unknown): SetQuestionResult => {
      const value = typeof raw === "string" ? raw : "";
      const unanswered = !isNonEmptyAnswer(value);
      const correct =
        !unanswered &&
        displayContextualOption(question, value) ===
          contextualSurfaceAnswer(question);
      recordOutcome({ wordId: question.wordId, correct });
      return { correct, unanswered };
    },
    [recordOutcome],
  );

  const handleSubmit = () => {
    if (isContextual) void deleteExerciseDraft(draftIdentity);
    void submit((currentAnswers) => {
      const graded: Record<string, SetQuestionResult> = {};
      for (const question of practiceQuestions) {
        graded[question.id] = gradeQuestion(question, currentAnswers[question.id]);
      }
      return graded;
    });
  };

  const handleCheckOne = () => {
    if (!currentQuestionId) return;
    const question = practiceQuestions.find((q) => q.id === currentQuestionId);
    if (!question) return;
    void checkOne(question.id, (raw) => gradeQuestion(question, raw));
  };

  const handleViewResults = () => {
    markSubmitted();
  };

  const questionsById = useMemo(
    () => new Map(practiceQuestions.map((q) => [q.id, q] as const)),
    [practiceQuestions],
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

  if (filteredWords.length < 2) {
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
    questions.length === 0
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

  if (questions.length === 0 && !isContextual) {
    return (
      <div className="space-y-6">
        {filtersBar}
        <VocabularyEmpty variant="no-meanings" />
      </div>
    );
  }

  if (questions.length === 0 && isContextual) {
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
      <div id="mc-set-top" className="scroll-mt-24" />
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
      practiceQuestions.length > 0 &&
      practiceQuestions.length < 20 ? (
        <p className="text-xs text-muted-foreground">
          {tSession("shortSetNote", { count: practiceQuestions.length })}
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
          questionDomId={(id) => `mc-q-${id}`}
          filter={reviewFilter}
          onFilterChange={setReviewFilter}
          focusedId={focusedReviewId}
          onFocusedIdChange={setFocusedReviewId}
        />
      ) : null}

      <div className="space-y-4" key={attemptKey}>
        {visibleQuestionIds.map((id) => {
          const question = questionsById.get(id);
          if (!question) return null;
          const selected =
            typeof answers[question.id] === "string"
              ? String(answers[question.id])
              : null;
          const result = results[question.id];
          const unanswered = Boolean(result?.unanswered);
          const isCorrect = Boolean(result?.correct);
          const revealed = submitted || Boolean(result);
          return (
            <div
              key={question.id}
              className={cn(
                exerciseReviewFocusClass(focusedReviewId === question.id),
              )}
            >
              <MultipleChoiceStage
                question={question}
                number={numbers[question.id]}
                promptLabel={promptLabelFor(question, {
                  contextual: t("questionContext"),
                  wordToMeaning: t("questionWord"),
                  meaningToWord: t("questionMeaning"),
                })}
                selected={selected}
                revealed={revealed}
                peeked={false}
                isCorrect={isCorrect}
                unanswered={unanswered}
                onPick={(option) => setAnswer(question.id, option)}
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
            const ids = practiceQuestions
              .filter((q) => {
                const row = results[q.id];
                return row && !row.correct && !row.unanswered;
              })
              .map((q) => q.id);
            setActiveIds(ids.length > 0 ? ids : null);
            resetAttempt();
            afterNewSet();
          }}
          onRetryUnanswered={() => {
            const ids = practiceQuestions
              .filter((q) => results[q.id]?.unanswered)
              .map((q) => q.id);
            setActiveIds(ids.length > 0 ? ids : null);
            resetAttempt();
            afterNewSet();
          }}
        />
      )}
    </div>
  );
}
