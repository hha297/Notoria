"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSessionController } from "@/hooks/use-exercise-session-controller";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { requestContextualExerciseAi } from "@/lib/exercises/contextual-ai-client";
import {
  CONTEXTUAL_AI_BATCH,
  CONTEXTUAL_DISTRACTOR_POOL_MAX,
} from "@/lib/exercises/contextual-ai-types";
import { pickDistinctContextualWords } from "@/lib/exercises/contextual-word-pick";
import {
  buildMultipleChoiceQuestions,
  contextualExerciseToQuestion,
  fillContextualBlank,
  type MultipleChoiceQuestion,
  type MultipleChoiceStudyMode,
} from "@/lib/exercises/multiple-choice";
import { hintInitialLetter } from "@/lib/exercises/hint";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

type MultipleChoiceSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

export function MultipleChoiceSession({
  workspaceId,
  words,
  language,
}: MultipleChoiceSessionProps) {
  const t = useTranslations("exercises.multipleChoice");
  const tHint = useTranslations("exercises.timedHint");
  const tSession = useTranslations("exercises.session");
  const tAi = useTranslations("exercises.ai");
  const uiLocale = useLocale();
  const { hasProAccess, openUpgrade } = useProAccess();
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] =
    useState<MultipleChoiceStudyMode>("word-to-meaning");
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const {
    currentIndex,
    score,
    answered,
    peeked,
    complete: sessionComplete,
    restart,
    next,
    goPrev,
    recordAnswer,
    peek,
  } = useExerciseSessionController();
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();
  const { difficulty, setDifficulty } = useExerciseDifficulty("multiple_choice");
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
    setSelected(null);
    restart();
    resetProcessing();
  }, [
    commitAndBeginNext,
    createdAtByWordId,
    filteredWords,
    resetProcessing,
    restart,
    studyMode,
  ]);

  const startContextualSession = useCallback(async () => {
    if (!hasProAccess) {
      openUpgrade();
      return;
    }
    if (filteredWords.length < 2) return;

    const prefs = commitAndBeginNext();
    const sampledWords = pickDistinctContextualWords(
      filteredWords,
      CONTEXTUAL_AI_BATCH,
      {
        getWordId: (word) => word.id,
        getWordForm: (word) => word.word,
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      },
    );

    if (sampledWords.length === 0) return;

    setQuestions([]);
    setSelected(null);
    restart();
    setStage("generating");

    try {
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

      const result = await requestContextualExerciseAi({
        exerciseType: "multiple-choice",
        language: languageCode,
        difficulty,
        uiLocale:
          uiLocale === "en" || uiLocale === "fi" || uiLocale === "vi"
            ? uiLocale
            : "en",
        words: sampledWords.map((word) => ({
          id: word.id,
          word: word.word.trim().slice(0, 120),
          meaning: word.meanings[0]?.trim() || null,
          partOfSpeech: word.partOfSpeech,
          distractorPool: distractorPool.filter(
            (candidate) => candidate.toLowerCase() !== word.word.trim().toLowerCase(),
          ),
        })),
      });

      if (!result.ok) {
        if (result.code === "AI_FORBIDDEN") {
          fail(tAi("forbidden"));
          openUpgrade();
          return;
        }
        fail(tAi("unavailable"));
        return;
      }

      const nextQuestions = result.exercises
        .filter((exercise) => exercise.type === "multiple-choice")
        .map((exercise, index) => contextualExerciseToQuestion(exercise, index))
        .filter((question): question is MultipleChoiceQuestion => question != null)
        .filter((question) => question.options.length === 4);

      if (nextQuestions.length === 0) {
        fail(tAi("noneValid"));
        return;
      }

      setStage("saving");
      setQuestions(nextQuestions);
      completeProcessing();
      resetProcessing();
    } catch {
      fail(tAi("unavailable"));
    }
  }, [
    commitAndBeginNext,
    completeProcessing,
    difficulty,
    fail,
    filteredWords,
    hasProAccess,
    language,
    openUpgrade,
    resetProcessing,
    restart,
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

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) startSession();
    });
    return () => {
      cancelled = true;
    };
  }, [startSession, workspaceId]);

  const handleStudyModeChange = (mode: string) => {
    if (mode === "contextual" && !hasProAccess) {
      openUpgrade();
      return;
    }
    if (
      mode === "word-to-meaning" ||
      mode === "meaning-to-word" ||
      mode === "contextual"
    ) {
      setStudyMode(mode);
    }
  };

  const current = questions[currentIndex];
  const total = questions.length;
  const revealed = answered || peeked;
  const isCorrect = Boolean(
    current && !peeked && selected === current.correctOption,
  );

  const pick = (option: string) => {
    if (!current || revealed) return;
    setSelected(option);
    const correct = option === current.correctOption;
    recordAnswer(correct);
    recordOutcome({ wordId: current.wordId, correct });
  };

  const revealAnswer = () => {
    if (!current || revealed) return;
    peek();
    recordOutcome({ wordId: current.wordId, correct: false });
  };

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
      contextualPro={!hasProAccess}
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

  if (questions.length === 0 && !sessionComplete && !isContextual) {
    return (
      <div className="space-y-6">
        {filtersBar}
        <VocabularyEmpty variant="no-meanings" />
      </div>
    );
  }

  const promptLabel =
    current?.direction === "CONTEXTUAL"
      ? t("questionContext")
      : current?.direction === "WORD_TO_MEANING"
        ? t("questionWord")
        : t("questionMeaning");

  const displayPrompt =
    current &&
    revealed &&
    current.direction === "CONTEXTUAL"
      ? fillContextualBlank(
          current.prompt,
          current.answerForm ?? current.correctOption,
        )
      : current?.prompt;

  const feedbackAnswer =
    current?.direction === "CONTEXTUAL"
      ? (current.answerForm ?? current.correctOption)
      : current?.correctOption;

  return (
    <div className="space-y-6">
      {filtersBar}

      {isContextual ? (
        <ExerciseDifficultySelect
          value={difficulty}
          onChange={(next) => {
            setDifficulty(next);
          }}
          disabled={generating}
          compact
        />
      ) : null}

      {sessionComplete ? (
        <SessionCompleteCard
          title={tSession("complete")}
          scoreLabel={tSession("score", { correct: score.correct, total })}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : current ? (
        <>
          <ExerciseProgressHeader
            progressLabel={t("progress", { current: currentIndex + 1, total })}
            scoreLabel={t("score", {
              correct: score.correct,
              answered: score.answered,
            })}
            progressValue={total ? ((currentIndex + 1) / total) * 100 : 0}
          />
          <div className="mx-auto w-full min-w-0 max-w-2xl rounded-2xl border border-hairline-cloud bg-card p-5 shadow-xl shadow-ink/5 sm:rounded-3xl sm:p-8">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {promptLabel}
              </p>
              {current.aiGenerated ? (
                <p className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="size-3" />
                  {tAi("generated")}
                </p>
              ) : null}
            </div>
            <p className="mt-4 break-words font-heading text-2xl font-medium text-ink [overflow-wrap:anywhere] sm:mt-6 sm:text-3xl md:text-4xl">
              {displayPrompt}
            </p>
            {revealed && current.sentenceMeaning ? (
              <p className="mt-3 text-sm text-muted-foreground">
                ({current.sentenceMeaning})
              </p>
            ) : null}
            <div className="mt-6">
              <ExerciseHint
                resetKey={current.id}
                answered={revealed}
                correctAnswer={
                  current.direction === "CONTEXTUAL"
                    ? (current.answerForm ?? current.correctOption)
                    : current.correctOption
                }
                onRevealAnswer={revealAnswer}
              >
                {tHint("startsWith", {
                  letter: hintInitialLetter(
                    current.direction === "CONTEXTUAL"
                      ? (current.answerForm ?? current.correctOption)
                      : current.correctOption,
                  ),
                })}
              </ExerciseHint>
            </div>
            <div className="mt-8 grid min-w-0 gap-2 sm:grid-cols-2">
              {current.options.map((option) => {
                const isSelected = selected === option;
                const isAnswer = option === current.correctOption;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={revealed && !isSelected && !isAnswer}
                    onClick={() => pick(option)}
                    className={cn(
                      "min-h-11 min-w-0 cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium break-words [overflow-wrap:anywhere] transition-all",
                      !revealed &&
                        "border-hairline-cloud bg-background hover:border-accent-lime/50 hover:bg-accent-lime/10",
                      revealed &&
                        isAnswer &&
                        "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                      revealed &&
                        isSelected &&
                        !isAnswer &&
                        "border-[#f3b8cc] bg-[#fff1f6] text-[#c7366a]",
                      revealed && !isSelected && !isAnswer && "opacity-40",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <p
                className={cn(
                  "mt-6 text-sm font-medium",
                  isCorrect ? "text-[#4a6b0a]" : "text-[#c7366a]",
                )}
              >
                {isCorrect
                  ? t("correct")
                  : t("incorrect", { answer: feedbackAnswer })}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => {
                  setSelected(null);
                  goPrev();
                }}
                className="h-11 w-full sm:h-8 sm:w-auto"
              >
                <ChevronLeft className="size-4" />
                {t("previous")}
              </Button>
              {revealed && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                    next(total);
                  }}
                  className="h-11 w-full sm:h-8 sm:w-auto"
                >
                  {currentIndex >= total - 1 ? t("finish") : t("next")}
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={startSession}>
              <RotateCcw className="size-4" />
              {tSession("tryAgain")}
            </Button>
          </div>
        </>
      ) : isContextual ? (
        <div className="rounded-2xl border border-hairline-cloud bg-card p-8 text-center">
          <p className="font-heading text-lg font-medium text-ink">
            {t("contextualEmptyTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {hasProAccess
              ? t("contextualEmptyDescription")
              : t("contextualProDescription")}
          </p>
          <Button
            type="button"
            className="mt-6"
            onClick={() => void startContextualSession()}
            disabled={generating}
          >
            <Sparkles className="size-4" />
            {hasProAccess ? tAi("generate") : t("unlockContextual")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
