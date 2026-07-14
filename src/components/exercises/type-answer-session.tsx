"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Shuffle, CheckCircle2, XCircle } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildTypeAnswerItems } from "@/lib/exercises/type-answer";
import { answersMatchAny, shuffleArray } from "@/lib/exercises/utils";
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
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [studyMode, setStudyMode] = useState<FlashcardStudyMode>("mixed");
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const items = useMemo(
    () => buildTypeAnswerItems(filteredWords, studyMode),
    [filteredWords, studyMode],
  );
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const rebuild = useCallback(() => {
    const built = buildTypeAnswerItems(filteredWords, studyMode);
    setItemIds(shuffleArray(built).map((i) => i.id));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
  }, [filteredWords, studyMode]);

  useEffect(() => {
    rebuild();
  }, [rebuild, workspaceId]);

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
    if (index < total - 1) setIndex((i) => i + 1);
    else rebuild();
  };

  useHotkeys("enter", (e) => {
    e.preventDefault();
    if (!revealed) check();
    else next();
  }, { enableOnFormTags: true }, [revealed, input, current]);

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;
  if (items.length === 0) {
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

  if (!current) return null;

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
      <ExerciseProgressHeader
        progressLabel={t("progress", { current: index + 1, total })}
        scoreLabel={t("score", { correct: score.correct, answered: score.answered })}
        hint={t("keyboardHint")}
        progressValue={total ? ((index + 1) / total) * 100 : 0}
      />
      <div className="mx-auto max-w-2xl rounded-3xl border border-hairline-cloud bg-card p-8 shadow-xl shadow-ink/5 sm:p-10">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {current.direction === "WORD_TO_MEANING" ? t("questionWord") : t("questionMeaning")}
        </p>
        <p className="mt-6 font-heading text-3xl font-medium text-ink sm:text-4xl">{current.prompt}</p>
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
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ChevronLeft className="size-4" />{t("previous")}
          </Button>
          {!revealed ? (
            <Button type="button" size="sm" onClick={check} disabled={!input.trim()}>{t("check")}</Button>
          ) : (
            <Button type="button" size="sm" onClick={next}>
              {index >= total - 1 ? t("finish") : t("next")}<ChevronRight className="size-4" />
            </Button>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={rebuild}>
          <Shuffle className="size-4" />{t("shuffle")}
        </Button>
      </div>
    </div>
  );
}
