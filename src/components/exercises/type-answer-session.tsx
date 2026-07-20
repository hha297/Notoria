"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildTypeAnswerItems } from "@/lib/exercises/type-answer";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { answersMatchAny } from "@/lib/exercises/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardStudyMode, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

type TypeAnswerSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
};

export function TypeAnswerSession({ workspaceId, words }: TypeAnswerSessionProps) {
  const t = useTranslations("exercises.typeAnswer");
  const tSession = useTranslations("exercises.session");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] = useState<FlashcardStudyMode>("mixed");
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const poolItems = useMemo(
    () => buildTypeAnswerItems(filteredWords, studyMode),
    [filteredWords, studyMode],
  );
  const itemMap = useMemo(() => new Map(poolItems.map((i) => [i.id, i])), [poolItems]);

  const startSession = useCallback(() => {
    const sampled = sampleSessionItems(poolItems);
    setItemIds(sampled.map((i) => i.id));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
    setSessionComplete(false);
    setInput("");
    setRevealed(false);
  }, [poolItems]);

  useEffect(() => {
    startSession();
  }, [startSession, workspaceId]);

  useEffect(() => {
    setInput("");
    setRevealed(false);
  }, [index, itemIds]);

  const current = itemMap.get(itemIds[index] ?? "");
  const total = itemIds.length;
  const isCorrect = current ? answersMatchAny(input, current.acceptableAnswers) : false;
  const correctDisplay =
    current?.direction === "WORD_TO_MEANING"
      ? current.meanings.join(" · ")
      : current?.word ?? "";

  const check = () => {
    if (!current || revealed || !input.trim()) return;
    setRevealed(true);
    setScore((s) => ({
      correct: s.correct + (answersMatchAny(input, current.acceptableAnswers) ? 1 : 0),
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

  useHotkeys("enter", (e) => {
    e.preventDefault();
    if (sessionComplete) return;
    if (!revealed) check();
    else next();
  }, { enableOnFormTags: true }, [revealed, sessionComplete, input, current]);

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;
  if (poolItems.length === 0) {
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
            hint={t("keyboardHint")}
            progressValue={total ? ((index + 1) / total) * 100 : 0}
          />
          {current && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-hairline-cloud bg-card p-5 shadow-xl shadow-ink/5 sm:rounded-3xl sm:p-8 md:p-10">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {current.direction === "WORD_TO_MEANING" ? t("questionWord") : t("questionMeaning")}
              </p>
              <p className="mt-4 break-words font-heading text-2xl font-medium text-ink sm:mt-6 sm:text-3xl md:text-4xl">
                {current.prompt}
              </p>
              <div className="mt-8 space-y-4">
                {!revealed ? (
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("placeholder")}
                    className="h-12 text-lg"
                    autoComplete="off"
                  />
                ) : (
                  <div className="space-y-3 rounded-xl border border-hairline-cloud bg-muted/30 p-4 text-sm">
                    <p><span className="font-semibold text-ink">{t("yourAnswer")}:</span> {input || "—"}</p>
                    <p><span className="font-semibold text-ink">{t("correctAnswer")}:</span> {correctDisplay}</p>
                  </div>
                )}
                {revealed && (
                  <div className={cn("flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", isCorrect ? "bg-[#f4fae0] text-[#4a6b0a]" : "bg-[#fff1f6] text-[#c7366a]")}>
                    {isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    {isCorrect ? t("correct") : t("incorrect")}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                className="h-11 w-full sm:h-8 sm:w-auto"
              >
                <ChevronLeft className="size-4" />{t("previous")}
              </Button>
              {!revealed ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={check}
                  disabled={!input.trim()}
                  className="h-11 w-full sm:h-8 sm:w-auto"
                >
                  {t("check")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={next}
                  className="h-11 w-full sm:h-8 sm:w-auto"
                >
                  {index >= total - 1 ? t("finish") : t("next")}
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
