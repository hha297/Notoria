"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { TypeAnswerActions } from "@/components/exercises/type-answer-actions";
import { TypeAnswerStage } from "@/components/exercises/type-answer-stage";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSessionController } from "@/hooks/use-exercise-session-controller";
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
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny } from "@/lib/exercises/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type TypeAnswerSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

export function TypeAnswerSession({
  workspaceId,
  words,
  language,
}: TypeAnswerSessionProps) {
  const t = useTranslations("exercises.typeAnswer");
  const tSession = useTranslations("exercises.session");
  const tAi = useTranslations("exercises.ai");
  const uiLocale = useLocale();
  const { hasProAccess, openUpgrade } = useProAccess();
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] =
    useState<TypeAnswerStudyMode>("word-to-meaning");
  const [items, setItems] = useState<TypeAnswerItem[]>([]);
  const [input, setInput] = useState("");
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
  const { difficulty, setDifficulty } = useExerciseDifficulty("type_answer");
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
    setInput("");
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
    setInput("");
    restart();
    setStage("generating");

    try {
      const languageCode =
        language && language.trim().length >= 2
          ? language.trim().slice(0, 16)
          : null;

      const result = await requestContextualExerciseAi({
        exerciseType: "type-answer",
        language: languageCode,
        difficulty,
        uiLocale: isValidLocale(uiLocale) ? uiLocale : "en",
        words: sampledWords.map((word) => ({
          id: word.id,
          word: word.word.trim().slice(0, 120),
          meaning: word.meanings[0]?.trim() || null,
          partOfSpeech: word.partOfSpeech,
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

  const current = items[currentIndex];
  const total = items.length;
  const revealed = answered || peeked;
  const isCorrect = current
    ? !peeked && answersMatchAny(input, current.acceptableAnswers)
    : false;

  const check = () => {
    if (!current || revealed || !input.trim()) return;
    const correct = answersMatchAny(input, current.acceptableAnswers);
    recordAnswer(correct);
    recordOutcome({ wordId: current.wordId, correct });
  };

  const revealAnswer = () => {
    if (!current || revealed) return;
    peek();
    recordOutcome({ wordId: current.wordId, correct: false });
  };

  useHotkeys(
    "enter",
    (e) => {
      e.preventDefault();
      if (sessionComplete) return;
      if (!revealed) check();
      else {
        setInput("");
        next(total);
      }
    },
    { enableOnFormTags: true },
    [revealed, sessionComplete, input, current, total, next],
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
      contextualPro={!hasProAccess}
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

  if (items.length === 0 && !sessionComplete && !isContextual) {
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
          onChange={setDifficulty}
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
          <TypeAnswerStage
            key={current.id}
            item={current}
            promptLabel={promptLabel}
            input={input}
            revealed={revealed}
            peeked={peeked}
            isCorrect={isCorrect}
            onInputChange={setInput}
            onCheck={check}
            onRevealAnswer={revealAnswer}
          />
          <TypeAnswerActions
            canPrev={currentIndex > 0}
            revealed={revealed}
            canCheck={Boolean(input.trim())}
            isLast={currentIndex >= total - 1}
            tryAgainLabel={tSession("tryAgain")}
            onPrev={() => {
              setInput("");
              goPrev();
            }}
            onNext={() => {
              setInput("");
              next(total);
            }}
            onCheck={check}
            onTryAgain={startSession}
          />
        </>
      ) : isContextual ? (
        <div className="border border-hairline-cloud bg-background p-8 text-center">
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
