"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import {
  buildMultipleChoiceQuestions,
  type MultipleChoiceQuestion,
} from "@/lib/exercises/multiple-choice";
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
  const tSession = useTranslations("exercises.session");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] = useState<FlashcardStudyMode>("mixed");
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );

  const startSession = useCallback(() => {
    const built = sampleSessionItems(
      buildMultipleChoiceQuestions(filteredWords, studyMode),
    );
    setQuestions(built);
    setIndex(0);
    setSelected(null);
    setSessionComplete(false);
    setScore({ correct: 0, answered: 0 });
  }, [filteredWords, studyMode]);

  useEffect(() => {
    startSession();
  }, [startSession, workspaceId]);

  useEffect(() => {
    setSelected(null);
  }, [index, questions]);

  const current = questions[index];
  const total = questions.length;
  const revealed = selected !== null;
  const isCorrect = current ? selected === current.correctOption : false;

  const pick = (option: string) => {
    if (!current || revealed) return;
    setSelected(option);
    setScore((s) => ({
      correct: s.correct + (option === current.correctOption ? 1 : 0),
      answered: s.answered + 1,
    }));
  };

  const next = () => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setSessionComplete(true);
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
            progressLabel={t("progress", { current: index + 1, total })}
            scoreLabel={t("score", { correct: score.correct, answered: score.answered })}
            progressValue={total ? ((index + 1) / total) * 100 : 0}
          />
          {current && (
            <div className="mx-auto max-w-2xl rounded-3xl border border-hairline-cloud bg-card p-8 shadow-xl shadow-ink/5">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {current.direction === "WORD_TO_MEANING" ? t("questionWord") : t("questionMeaning")}
              </p>
              <p className="mt-6 font-heading text-3xl font-medium text-ink sm:text-4xl">{current.prompt}</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
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
                        "cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
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
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                <ChevronLeft className="size-4" />{t("previous")}
              </Button>
              {revealed && (
                <Button type="button" size="sm" onClick={next}>
                  {index >= total - 1 ? t("finish") : t("next")}<ChevronRight className="size-4" />
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
