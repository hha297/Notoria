"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import { useExerciseDifficulty } from "@/hooks/use-exercise-difficulty";
import { useExerciseSessionController } from "@/hooks/use-exercise-session-controller";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { requestContextualExerciseAi } from "@/lib/exercises/contextual-ai-client";
import { CONTEXTUAL_AI_BATCH } from "@/lib/exercises/contextual-ai-types";
import { pickDistinctContextualWords } from "@/lib/exercises/contextual-word-pick";
import {
  buildTypeAnswerItems,
  contextualExerciseToTypeAnswerItem,
  typeAnswerPromptWithMeaningHint,
  typeAnswerRevealPrompt,
  type TypeAnswerItem,
  type TypeAnswerStudyMode,
} from "@/lib/exercises/type-answer";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { hintInitialLetter } from "@/lib/exercises/hint";
import { answersMatchAny } from "@/lib/exercises/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

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
  const tHint = useTranslations("exercises.timedHint");
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
  const wordById = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word] as const)),
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
        uiLocale:
          uiLocale === "en" || uiLocale === "fi" || uiLocale === "vi"
            ? uiLocale
            : "en",
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
            wordById.get(exercise.wordId),
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
    wordById,
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
  const correctDisplay = current?.answerDisplay ?? "";
  const displayPrompt = !current
    ? undefined
    : current.direction === "CONTEXTUAL"
      ? revealed
        ? typeAnswerRevealPrompt(current)
        : typeAnswerPromptWithMeaningHint(current)
      : current.prompt;

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
      else next(total);
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
            hint={t("keyboardHint")}
            progressValue={total ? ((currentIndex + 1) / total) * 100 : 0}
          />
          <div className="mx-auto max-w-2xl rounded-2xl border border-hairline-cloud bg-card p-5 shadow-xl shadow-ink/5 sm:rounded-3xl sm:p-8 md:p-10">
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
            <p className="mt-4 break-words font-heading text-2xl font-medium text-ink sm:mt-6 sm:text-3xl md:text-4xl">
              {displayPrompt}
            </p>
            {revealed && current.sentenceMeaning ? (
              <p className="mt-3 text-sm text-muted-foreground">
                ({current.sentenceMeaning})
              </p>
            ) : null}
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!revealed) check();
              }}
            >
              <Input
                value={revealed ? (isCorrect ? input : correctDisplay) : input}
                onChange={(e) => setInput(e.target.value)}
                disabled={revealed}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={t("placeholder")}
                className={cn(
                  "h-12 text-center text-lg font-medium sm:h-14 sm:text-xl",
                  revealed &&
                    (isCorrect
                      ? "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]"
                      : "border-[#f3b8cc] bg-[#fff1f6] text-[#c7366a]"),
                )}
              />
              <ExerciseHint
                resetKey={current.id}
                answered={revealed}
                correctAnswer={correctDisplay}
                onRevealAnswer={revealAnswer}
              >
                {tHint("startsWith", {
                  letter: hintInitialLetter(correctDisplay),
                })}
              </ExerciseHint>
              {revealed && (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                    isCorrect
                      ? "bg-[#f4fae0] text-[#4a6b0a]"
                      : "bg-[#fff1f6] text-[#c7366a]",
                  )}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0" />
                  )}
                  <span>
                    {isCorrect
                      ? t("correct")
                      : t("incorrect", { answer: correctDisplay })}
                  </span>
                </div>
              )}
            </form>
          </div>
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => {
                  setInput("");
                  goPrev();
                }}
                className="h-11 w-full sm:h-8 sm:w-auto"
              >
                <ChevronLeft className="size-4" />
                {t("previous")}
              </Button>
              {revealed ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setInput("");
                    next(total);
                  }}
                  className="h-11 w-full sm:h-8 sm:w-auto"
                >
                  {currentIndex >= total - 1 ? t("finish") : t("next")}
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={check}
                  disabled={!input.trim()}
                  className="h-11 w-full sm:h-8 sm:w-auto"
                >
                  {t("check")}
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
