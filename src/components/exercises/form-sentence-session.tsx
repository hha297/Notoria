"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { ExerciseDisplayModePicker } from "@/components/exercises/exercise-display-mode-picker";
import { ExerciseOneByOneBar } from "@/components/exercises/exercise-one-by-one-bar";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { ExerciseSetSubmitBar } from "@/components/exercises/exercise-set-submit-bar";
import {
  ExerciseSetReviewNav,
  exerciseReviewFocusClass,
} from "@/components/exercises/exercise-set-review-nav";
import { FormSentenceStage } from "@/components/exercises/form-sentence-stage";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useExerciseSetAttempt } from "@/hooks/use-exercise-set-attempt";
import { useExerciseSetUi } from "@/hooks/use-exercise-set-ui";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { appendVocabularyExample } from "@/lib/actions/vocabulary";
import { requestFormSentenceAi } from "@/lib/exercises/form-sentence-ai-client";
import type { FormSentenceAiResult } from "@/lib/exercises/form-sentence-ai-types";
import { FORM_SENTENCE_MAX_LENGTH } from "@/lib/exercises/form-sentence-ai-types";
import {
  buildFormSentenceItems,
  type FormSentenceItem,
} from "@/lib/exercises/form-sentence";
import { isNonEmptyAnswer, type SetQuestionResult } from "@/lib/exercises/set-attempt";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { cn } from "@/lib/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import {
  EMPTY_RECENT_PREFERENCES,
  type RecentSectionPreferences,
} from "@/lib/exercises/recent-outcomes";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type FormSentenceSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

type FeedbackState = FormSentenceAiResult & {
  sentence: string;
  saved: boolean;
};

function sampleItemIds(
  poolItems: FormSentenceItem[],
  createdAtByWordId: Map<string, string>,
  prefs: RecentSectionPreferences,
): string[] {
  return sampleSessionItems(poolItems, "form_sentence", {
    getWordId: (item) => item.wordId,
    getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
    softAvoidWordIds: prefs.softAvoidWordIds,
    softPreferWordIds: prefs.softPreferWordIds,
  }).map((item) => item.id);
}

export function FormSentenceSession({
  workspaceId,
  words,
  language,
}: FormSentenceSessionProps) {
  const t = useTranslations("exercises.formSentence");
  const tSession = useTranslations("exercises.session");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();
  const [filters, setFilters] = useState<FlashcardFilters>(
    DEFAULT_FLASHCARD_FILTERS,
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startSaveTransition] = useTransition();
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();
  const [feedbackById, setFeedbackById] = useState<
    Record<string, FeedbackState>
  >({});
  const [activeIds, setActiveIds] = useState<string[] | null>(null);

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const poolItems = useMemo(
    () => buildFormSentenceItems(filteredWords),
    [filteredWords],
  );
  const itemMap = useMemo(
    () => new Map(poolItems.map((item) => [item.id, item])),
    [poolItems],
  );
  const createdAtByWordId = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word.createdAt] as const)),
    [filteredWords],
  );

  const [itemIds, setItemIds] = useState<string[]>(() =>
    sampleItemIds(poolItems, createdAtByWordId, EMPTY_RECENT_PREFERENCES),
  );

  const [sessionSource, setSessionSource] = useState({
    workspaceId,
    poolKey: poolItems.map((item) => item.id).join("|"),
  });

  const poolKey = poolItems.map((item) => item.id).join("|");
  if (
    sessionSource.workspaceId !== workspaceId ||
    sessionSource.poolKey !== poolKey
  ) {
    setSessionSource({ workspaceId, poolKey });
    setItemIds(sampleItemIds(poolItems, createdAtByWordId, commitAndBeginNext()));
    setActiveIds(null);
    setFeedbackById({});
  }

  const practiceIds = activeIds ?? itemIds;
  const practiceItems = useMemo(
    () =>
      practiceIds
        .map((id) => itemMap.get(id))
        .filter((item): item is FormSentenceItem => Boolean(item)),
    [itemMap, practiceIds],
  );
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
    questionIdPrefix: "fs-q",
    setAnchorId: "fs-set-top",
  });

  const startSession = useCallback(() => {
    setItemIds(sampleItemIds(poolItems, createdAtByWordId, commitAndBeginNext()));
    setActiveIds(null);
    setFeedbackById({});
    resetAttempt();
    afterNewSet();
  }, [
    afterNewSet,
    commitAndBeginNext,
    createdAtByWordId,
    poolItems,
    resetAttempt,
  ]);

  const gradeOneItem = useCallback(
    async (
      item: FormSentenceItem,
      raw: unknown,
    ): Promise<{
      result: SetQuestionResult;
      feedback: FeedbackState | null;
    }> => {
      const sentence = typeof raw === "string" ? raw.trim() : "";
      if (!isNonEmptyAnswer(sentence)) {
        return {
          result: { correct: false, unanswered: true },
          feedback: null,
        };
      }
      if (sentence.length > FORM_SENTENCE_MAX_LENGTH) {
        return {
          result: { correct: false, unanswered: false },
          feedback: {
            isCorrect: false,
            grammarExplanation: t("errors.tooLong"),
            correctedSentence: null,
            betterSuggestion: null,
            sentenceMeaning: null,
            sentence,
            saved: false,
          },
        };
      }

      const aiResult = await requestFormSentenceAi({
        wordId: item.wordId,
        word: item.word,
        meaning: item.meaning,
        sentence,
        language: language ?? null,
        partOfSpeech: item.partOfSpeech,
      });

      if (!aiResult.ok) {
        if (aiResult.code === "AI_QUOTA_EXCEEDED") {
          toast.error(tBilling("quotaExceeded"));
        } else if (aiResult.code === "AI_FORBIDDEN") {
          toast.error(t("errors.forbidden"));
          openUpgrade();
        } else if (aiResult.code === "AI_DISABLED") {
          toast.error(t("errors.disabled"));
        } else {
          toast.error(t("errors.unavailable"));
        }
        return {
          result: { correct: false, unanswered: false },
          feedback: null,
        };
      }

      recordOutcome({
        wordId: item.wordId,
        correct: aiResult.isCorrect,
        itemKey: sentence,
      });

      return {
        result: {
          correct: aiResult.isCorrect,
          unanswered: false,
        },
        feedback: {
          isCorrect: aiResult.isCorrect,
          grammarExplanation: aiResult.grammarExplanation,
          correctedSentence: aiResult.correctedSentence,
          betterSuggestion: aiResult.betterSuggestion,
          sentenceMeaning: aiResult.sentenceMeaning,
          sentence,
          saved: false,
        },
      };
    },
    [language, openUpgrade, recordOutcome, t, tBilling],
  );

  const handleSubmit = () => {
    void submit(async (currentAnswers) => {
      const graded: Record<string, SetQuestionResult> = {};
      const nextFeedback: Record<string, FeedbackState> = {};

      const tasks = practiceItems.map(async (item) => {
        const { result, feedback } = await gradeOneItem(
          item,
          currentAnswers[item.id],
        );
        graded[item.id] = result;
        if (feedback) nextFeedback[item.id] = feedback;
      });

      await Promise.all(tasks);
      setFeedbackById(nextFeedback);
      return graded;
    });
  };

  const handleCheckOne = () => {
    if (!currentQuestionId) return;
    const item = practiceItems.find((row) => row.id === currentQuestionId);
    if (!item) return;
    void checkOne(item.id, async (raw) => {
      const { result, feedback } = await gradeOneItem(item, raw);
      if (feedback) {
        setFeedbackById((prev) => ({ ...prev, [item.id]: feedback }));
      }
      return result;
    });
  };

  const handleViewResults = () => {
    markSubmitted();
  };

  const itemsById = useMemo(
    () => new Map(practiceItems.map((item) => [item.id, item] as const)),
    [practiceItems],
  );

  const saveExample = (item: FormSentenceItem) => {
    const feedback = feedbackById[item.id];
    if (!feedback || feedback.saved || savingId) return;

    const sentenceToSave =
      !feedback.isCorrect && feedback.correctedSentence
        ? feedback.correctedSentence
        : feedback.sentence;

    setSavingId(item.id);
    startSaveTransition(async () => {
      try {
        const result = await appendVocabularyExample({
          wordId: item.wordId,
          sentence: sentenceToSave,
          meaning: feedback.sentenceMeaning,
        });

        if (!result.ok) {
          if (result.code === "WORD_NOT_FOUND") {
            toast.error(t("errors.wordMissing"));
            return;
          }
          toast.error(t("errors.saveFailed"));
          return;
        }

        setFeedbackById((prev) => ({
          ...prev,
          [item.id]: { ...feedback, saved: true },
        }));
        toast.success(
          result.alreadyExists ? t("alreadySaved") : t("savedExample"),
        );
      } finally {
        setSavingId(null);
      }
    });
  };

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;
  if (poolItems.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar
          words={words}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <VocabularyEmpty variant="no-meanings" />
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
      <div id="fs-set-top" className="scroll-mt-24" />
      <VocabularyFiltersBar
        words={words}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <ExerciseDisplayModePicker
        value={displayMode}
        onChange={setDisplayMode}
        disabled={displayModeLocked}
      />

      {practiceItems.length > 0 && practiceItems.length < 20 ? (
        <p className="text-xs text-muted-foreground">
          {tSession("shortSetNote", { count: practiceItems.length })}
        </p>
      ) : null}

      <ExerciseProgressHeader
        current={progressCurrent}
        total={progressTotal}
        progressLabel={
          submitted
            ? tSession("score", {
                correct: score.correct,
                total: score.total,
              })
            : oneByOne
              ? tSession("questionProgress", {
                  current: Math.min(
                    checkedCount + 1,
                    Math.max(totalQuestionCount, 1),
                  ),
                  total: totalQuestionCount,
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
            : oneByOne
              ? totalQuestionCount
                ? (checkedCount / totalQuestionCount) * 100
                : 0
              : totalQuestionCount
                ? (answeredCount / totalQuestionCount) * 100
                : 0
        }
      />

      {submitted ? (
        <ExerciseSetReviewNav
          questionIds={questionIds}
          results={results}
          questionDomId={(id) => `fs-q-${id}`}
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
          const value =
            typeof answers[item.id] === "string" ? String(answers[item.id]) : "";
          const revealed = submitted || Boolean(results[item.id]);
          const showFeedback = revealed ? feedbackById[item.id] ?? null : null;
          return (
            <div
              key={item.id}
              className={cn(
                "space-y-3",
                exerciseReviewFocusClass(focusedReviewId === item.id),
              )}
            >
              <FormSentenceStage
                item={item}
                number={numbers[item.id]}
                autoFocus={false}
                input={value}
                feedback={showFeedback}
                evaluating={
                  submitting &&
                  !results[item.id] &&
                  isNonEmptyAnswer(value) &&
                  (!oneByOne || item.id === currentQuestionId)
                }
                onInputChange={(next) => setAnswer(item.id, next)}
                onInsertWord={() => {
                  if (revealed || submitting) return;
                  const token = item.word;
                  const next = value.trim() ? `${value.trim()} ${token}` : token;
                  setAnswer(item.id, next);
                }}
              />
              {revealed &&
              feedbackById[item.id] &&
              !feedbackById[item.id]!.saved ? (
                <div className="mx-auto flex w-full max-w-3xl justify-end px-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingId === item.id}
                    onClick={() => saveExample(item)}
                  >
                    {t("saveExample")}
                  </Button>
                </div>
              ) : null}
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
        <div className="space-y-4">
          <SessionCompleteCard
            title={tSession("complete")}
            questions={score.total}
            correct={score.correct}
            incorrect={score.incorrect}
            unanswered={score.unanswered}
            tryAgainLabel={tSession("restartSet")}
            onTryAgain={startSession}
            onViewWrong={openWrongReview}
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
                  setFeedbackById({});
                  resetAttempt();
                  afterNewSet();
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
                  setFeedbackById({});
                  resetAttempt();
                  afterNewSet();
                }}
              >
                {tSession("retryUnanswered")}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
