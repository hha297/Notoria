"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Lightbulb, Shuffle } from "lucide-react";
import { CheckCircle2, XCircle } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFillBlankItems, type FillBlankItem } from "@/lib/exercises/fill-blank";
import { answersMatchAny, shuffleArray } from "@/lib/exercises/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

type FillBlankSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
};

export function FillBlankSession({ workspaceId, words }: FillBlankSessionProps) {
  const t = useTranslations("exercises.fillInBlank");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const items = useMemo(() => buildFillBlankItems(filteredWords), [filteredWords]);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  useEffect(() => {
    setItemIds(shuffleArray(items).map((i) => i.id));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
  }, [items, workspaceId]);

  useEffect(() => {
    setInput("");
    setRevealed(false);
  }, [index, itemIds]);

  const current = itemMap.get(itemIds[index] ?? "");
  const total = itemIds.length;
  const isCorrect = current
    ? answersMatchAny(input, current.acceptableAnswers)
    : false;

  const restart = useCallback(() => {
    setItemIds(shuffleArray(items).map((i) => i.id));
    setIndex(0);
    setScore({ correct: 0, answered: 0 });
  }, [items]);

  const check = useCallback(() => {
    if (!current || revealed || !input.trim()) return;
    setRevealed(true);
    setScore((s) => ({
      correct: s.correct + (answersMatchAny(input, current.acceptableAnswers) ? 1 : 0),
      answered: s.answered + 1,
    }));
  }, [current, input, revealed]);

  const next = useCallback(() => {
    if (index < total - 1) setIndex((i) => i + 1);
    else restart();
  }, [index, total, restart]);

  useHotkeys("enter", (e) => {
    e.preventDefault();
    if (!revealed) check();
    else next();
  }, { enableOnFormTags: true }, [revealed, check, next]);

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
        <VocabularyEmpty variant="no-examples" />
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-6">
      <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
      <ExerciseProgressHeader
        progressLabel={t("progress", { current: index + 1, total })}
        scoreLabel={t("score", { correct: score.correct, answered: score.answered })}
        hint={t("keyboardHint")}
        progressValue={total ? ((index + 1) / total) * 100 : 0}
      />
      <FillBlankCard
        item={current}
        input={input}
        revealed={revealed}
        isCorrect={isCorrect}
        onInputChange={setInput}
        onCheck={check}
      />
      <ExerciseNav
        t={t}
        canPrev={index > 0}
        revealed={revealed}
        onPrev={() => setIndex((i) => i - 1)}
        onNext={next}
        onCheck={check}
        onShuffle={restart}
        canCheck={!!input.trim()}
        isLast={index >= total - 1}
      />
    </div>
  );
}

function FillBlankCard({
  item,
  input,
  revealed,
  isCorrect,
  onInputChange,
  onCheck,
}: {
  item: FillBlankItem;
  input: string;
  revealed: boolean;
  isCorrect: boolean;
  onInputChange: (v: string) => void;
  onCheck: () => void;
}) {
  const t = useTranslations("exercises.fillInBlank");
  const blankMinWidth = Math.max(item.word.length + 2, 6);

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-hairline-cloud bg-card p-6 shadow-xl shadow-ink/5 sm:p-10 md:p-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet-mid">
        {t("prompt")}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCheck();
        }}
        className="mt-8 space-y-8"
      >
        <div className="rounded-2xl border border-hairline-cloud bg-muted/20 px-5 py-10 sm:px-8 sm:py-12 md:py-14">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 text-center leading-snug">
            {item.sentenceBefore && (
              <span className="text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                {item.sentenceBefore}
              </span>
            )}

            <span
              className="inline-flex shrink-0 items-center justify-center"
              style={{ minWidth: `${blankMinWidth}ch` }}
            >
              {revealed ? (
                <span
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xl font-semibold sm:text-2xl md:text-3xl",
                    isCorrect
                      ? "bg-[#f4fae0] text-[#4a6b0a] ring-2 ring-[#b8d96a]/60"
                      : "bg-[#fff1f6] text-destructive ring-2 ring-[#f3b8cc]/60",
                  )}
                >
                  {isCorrect ? input : item.word}
                </span>
              ) : (
                <Input
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="?"
                  className={cn(
                    "h-12 min-w-full rounded-xl border-2 border-dashed border-accent-lime/50 bg-background/90 px-4",
                    "text-center text-xl font-semibold text-ink shadow-sm sm:h-14 sm:text-2xl md:text-3xl",
                    "placeholder:text-muted-foreground/40",
                    "focus-visible:border-accent-lime focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-accent-lime/20",
                  )}
                />
              )}
            </span>

            {item.sentenceAfter && (
              <span className="text-xl font-medium text-ink sm:text-2xl md:text-3xl">
                {item.sentenceAfter}
              </span>
            )}
          </div>
        </div>

        {item.meanings[0] && (
          <div className="flex items-start gap-3 rounded-xl border border-hairline-cloud bg-muted/25 px-4 py-3 sm:px-5 sm:py-4">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-accent-violet-mid" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("hint")}
              </p>
              <p className="mt-1 text-sm text-ink sm:text-base">
                {item.meanings.join(" · ")}
              </p>
            </div>
          </div>
        )}

        {revealed && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium sm:text-base",
              isCorrect ? "bg-[#f4fae0] text-[#4a6b0a]" : "bg-[#fff1f6] text-[#c7366a]",
            )}
          >
            {isCorrect ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <XCircle className="size-5 shrink-0" />
            )}
            {isCorrect ? t("correct") : t("incorrect", { answer: item.word })}
          </div>
        )}
      </form>
    </div>
  );
}

function ExerciseNav({
  t,
  canPrev,
  revealed,
  onPrev,
  onNext,
  onCheck,
  onShuffle,
  canCheck,
  isLast,
}: {
  t: (key: string) => string;
  canPrev: boolean;
  revealed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCheck: () => void;
  onShuffle: () => void;
  canCheck: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 pt-2">
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" variant="outline" size="default" onClick={onPrev} disabled={!canPrev}>
          <ChevronLeft className="size-4" />
          {t("previous")}
        </Button>
        {revealed ? (
          <Button type="button" size="default" onClick={onNext}>
            {isLast ? t("finish") : t("next")}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" size="default" onClick={onCheck} disabled={!canCheck}>
            {t("check")}
          </Button>
        )}
      </div>
      <Button type="button" variant="ghost" onClick={onShuffle}>
        <Shuffle className="size-4" />
        {t("shuffle")}
      </Button>
    </div>
  );
}
