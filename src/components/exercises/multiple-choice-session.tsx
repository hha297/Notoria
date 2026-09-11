"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { useExerciseSessionController } from "@/hooks/use-exercise-session-controller";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import {
  buildMultipleChoiceQuestions,
  type MultipleChoiceQuestion,
} from "@/lib/exercises/multiple-choice";
import { hintInitialLetter } from "@/lib/exercises/hint";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardStudyMode, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

type MultipleChoiceSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
};

export function MultipleChoiceSession({ workspaceId, words }: MultipleChoiceSessionProps) {
  const t = useTranslations("exercises.multipleChoice");
  const tHint = useTranslations("exercises.timedHint");
  const tSession = useTranslations("exercises.session");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] = useState<FlashcardStudyMode>("mixed");
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

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const createdAtByWordId = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word.createdAt] as const)),
    [filteredWords],
  );

  const startSession = useCallback(() => {
    const prefs = commitAndBeginNext();
    const built = sampleSessionItems(
      buildMultipleChoiceQuestions(filteredWords, studyMode),
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
  }, [commitAndBeginNext, createdAtByWordId, filteredWords, restart, studyMode]);

  useEffect(() => {
    startSession();
  }, [startSession, workspaceId]);

  useEffect(() => {
    setSelected(null);
  }, [currentIndex, questions]);

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
  if (filteredWords.length < 2) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar
          words={words}
          filters={filters}
          onFiltersChange={setFilters}
          studyMode={studyMode}
          onStudyModeChange={setStudyMode}
          showStudyMode
        />
        <VocabularyEmpty variant="need-more-words" minWords={2} />
      </div>
    );
  }
  if (questions.length === 0 && !sessionComplete) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar
          words={words}
          filters={filters}
          onFiltersChange={setFilters}
          studyMode={studyMode}
          onStudyModeChange={setStudyMode}
          showStudyMode
        />
        <VocabularyEmpty variant="no-meanings" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VocabularyFiltersBar
        words={words}
        filters={filters}
        onFiltersChange={setFilters}
        studyMode={studyMode}
        onStudyModeChange={setStudyMode}
        showStudyMode
      />
      {sessionComplete ? (
        <SessionCompleteCard
          title={tSession("complete")}
          scoreLabel={tSession("score", { correct: score.correct, total })}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : (
        <>
          <ExerciseProgressHeader
            progressLabel={t("progress", { current: currentIndex + 1, total })}
            scoreLabel={t("score", { correct: score.correct, answered: score.answered })}
            progressValue={total ? ((currentIndex + 1) / total) * 100 : 0}
          />
          {current && (
            <div className="mx-auto w-full min-w-0 max-w-2xl rounded-2xl border border-hairline-cloud bg-card p-5 shadow-xl shadow-ink/5 sm:rounded-3xl sm:p-8">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {current.direction === "WORD_TO_MEANING" ? t("questionWord") : t("questionMeaning")}
              </p>
              <p className="mt-4 break-words font-heading text-2xl font-medium text-ink [overflow-wrap:anywhere] sm:mt-6 sm:text-3xl md:text-4xl">
                {current.prompt}
              </p>
              <div className="mt-6">
                <ExerciseHint
                  resetKey={current.id}
                  answered={revealed}
                  correctAnswer={current.correctOption}
                  onRevealAnswer={revealAnswer}
                >
                  {tHint("startsWith", { letter: hintInitialLetter(current.correctOption) })}
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
                        !revealed && "border-hairline-cloud bg-background hover:border-accent-lime/50 hover:bg-accent-lime/10",
                        revealed && isAnswer && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                        revealed && isSelected && !isAnswer && "border-[#f3b8cc] bg-[#fff1f6] text-[#c7366a]",
                        revealed && !isSelected && !isAnswer && "opacity-40",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <p className={cn("mt-6 text-sm font-medium", isCorrect ? "text-[#4a6b0a]" : "text-[#c7366a]")}>
                  {isCorrect ? t("correct") : t("incorrect", { answer: current.correctOption })}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={goPrev}
                className="h-11 w-full sm:h-8 sm:w-auto"
              >
                <ChevronLeft className="size-4" />{t("previous")}
              </Button>
              {revealed && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => next(total)}
                  className="h-11 w-full sm:h-8 sm:w-auto"
                >
                  {currentIndex >= total - 1 ? t("finish") : t("next")}
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={startSession}>
              <RotateCcw className="size-4" />{tSession("tryAgain")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
