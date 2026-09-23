"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { MultipleChoiceActions } from "@/components/exercises/multiple-choice-actions";
import { MultipleChoiceStage } from "@/components/exercises/multiple-choice-stage";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSessionController } from "@/hooks/use-exercise-session-controller";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { isValidLocale } from "@/i18n/config";
import { requestContextualExerciseAi } from "@/lib/exercises/contextual-ai-client";
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
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

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
  const tSession = useTranslations("exercises.session");
  const tAi = useTranslations("exercises.ai");
  const tBilling = useTranslations("billing");
  const uiLocale = useLocale();
  const { openUpgrade } = useProAccess();
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
        uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
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
        if (result.code === "AI_QUOTA_EXCEEDED") {
          fail(tBilling("quotaExceeded"));
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
        fail(tAi("unavailable"));
        return;
      }

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
    language,
    openUpgrade,
    resetProcessing,
    restart,
    setStage,
    tAi,
    tBilling,
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
    current &&
      !peeked &&
      selected !== null &&
      displayContextualOption(current, selected) ===
        contextualSurfaceAnswer(current),
  );

  const pick = (option: string) => {
    if (!current || revealed) return;
    setSelected(option);
    const correct =
      displayContextualOption(current, option) ===
      contextualSurfaceAnswer(current);
    recordAnswer(correct);
    recordOutcome({ wordId: current.wordId, correct });
  };

  const revealAnswer = () => {
    if (!current || revealed) return;
    peek();
    recordOutcome({ wordId: current.wordId, correct: false });
  };

  useHotkeys(
    "1,2,3,4",
    (event) => {
      if (!current || revealed) return;
      const optionIndex = Number(event.key) - 1;
      const option = current.options[optionIndex];
      if (!option) return;
      event.preventDefault();
      pick(option);
    },
    [current, revealed, pick],
  );

  useHotkeys(
    "enter",
    (event) => {
      if (!current || !revealed) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, [role='button']")) return;
      event.preventDefault();
      setSelected(null);
      next(total);
    },
    [current, revealed, total, next],
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
          questions={total}
          correct={score.correct}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : current ? (
        <>
          <ExerciseProgressHeader
            current={currentIndex + 1}
            total={total}
            progressLabel={t("progress", { current: currentIndex + 1, total })}
            scoreLabel={t("score", {
              correct: score.correct,
              answered: score.answered,
            })}
            hint={t("keyboardHint")}
            progressValue={total ? ((currentIndex + 1) / total) * 100 : 0}
          />
          <MultipleChoiceStage
            question={current}
            promptLabel={promptLabel}
            selected={selected}
            revealed={revealed}
            peeked={peeked}
            isCorrect={isCorrect}
            onPick={pick}
            onRevealAnswer={revealAnswer}
          />
          <MultipleChoiceActions
            canPrev={currentIndex > 0}
            revealed={revealed}
            isLast={currentIndex >= total - 1}
            tryAgainLabel={tSession("tryAgain")}
            onPrev={() => {
              setSelected(null);
              goPrev();
            }}
            onNext={() => {
              setSelected(null);
              next(total);
            }}
            onTryAgain={startSession}
          />
        </>
      ) : isContextual ? (
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
            <Button
              type="button"
              size="lg"
              className="mt-7 h-12 sm:h-11"
              onClick={() => void startContextualSession()}
              disabled={generating}
            >
              <Sparkles className="size-4" />
              {tAi("generate")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
