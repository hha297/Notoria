"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { buildMatchPairItems, type MatchPairItem } from "@/lib/exercises/match-pairs";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { shuffleArray } from "@/lib/exercises/utils";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";
import { cn } from "@/lib/utils";

type MatchPairsSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
};

export function MatchPairsSession({ workspaceId, words }: MatchPairsSessionProps) {
  const t = useTranslations("exercises.matchPairs");
  const tSession = useTranslations("exercises.session");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [sessionItems, setSessionItems] = useState<MatchPairItem[]>([]);
  const [round, setRound] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const poolItems = useMemo(() => buildMatchPairItems(filteredWords), [filteredWords]);

  const startSession = useCallback(() => {
    setSessionItems(sampleSessionItems(poolItems));
    setRound((r) => r + 1);
    setSelectedWordId(null);
    setMatchedIds(new Set());
    setWrongId(null);
    setSessionComplete(false);
  }, [poolItems]);

  useEffect(() => {
    startSession();
  }, [startSession, workspaceId]);

  const wordColumn = useMemo(
    () => shuffleArray(sessionItems.map((i) => i)),
    [sessionItems, round],
  );
  const meaningColumn = useMemo(
    () => shuffleArray(sessionItems.map((i) => ({ wordId: i.wordId, meaning: i.meaning }))),
    [sessionItems, round],
  );

  const handleWordClick = (wordId: string) => {
    if (matchedIds.has(wordId) || sessionComplete) return;
    setSelectedWordId(wordId);
    setWrongId(null);
  };

  const handleMeaningClick = (wordId: string) => {
    if (matchedIds.has(wordId) || !selectedWordId || sessionComplete) return;

    if (selectedWordId === wordId) {
      const next = new Set(matchedIds);
      next.add(wordId);
      setMatchedIds(next);
      setSelectedWordId(null);
      setWrongId(null);
      if (next.size === sessionItems.length) {
        setSessionComplete(true);
      }
      return;
    }

    setWrongId(wordId);
    window.setTimeout(() => {
      setWrongId(null);
      setSelectedWordId(null);
    }, 700);
  };

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;
  if (poolItems.length < 2) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
        <VocabularyEmpty variant="need-more-words" minWords={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VocabularyFiltersBar words={words} filters={filters} onFiltersChange={setFilters} />
      {sessionComplete ? (
        <SessionCompleteCard
          title={t("complete")}
          scoreLabel={tSession("pairsMatched", { count: sessionItems.length })}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : (
        <>
          <ExerciseProgressHeader
            progressLabel={t("progress", { matched: matchedIds.size, total: sessionItems.length })}
            progressValue={sessionItems.length ? (matchedIds.size / sessionItems.length) * 100 : 0}
            hint={t("hint")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Column title={t("words")}>
              {wordColumn.map((item) => (
                <MatchButton
                  key={`w-${item.wordId}`}
                  label={item.word}
                  selected={selectedWordId === item.wordId}
                  matched={matchedIds.has(item.wordId)}
                  wrong={wrongId !== null && selectedWordId === item.wordId}
                  onClick={() => handleWordClick(item.wordId)}
                />
              ))}
            </Column>
            <Column title={t("meanings")}>
              {meaningColumn.map((item) => (
                <MatchButton
                  key={`m-${item.wordId}-${item.meaning}`}
                  label={item.meaning}
                  selected={false}
                  matched={matchedIds.has(item.wordId)}
                  wrong={wrongId === item.wordId}
                  onClick={() => handleMeaningClick(item.wordId)}
                />
              ))}
            </Column>
          </div>
          <div className="flex justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={startSession}>
              <RotateCcw className="size-4" />{tSession("tryAgain")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl border border-hairline-cloud bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MatchButton({
  label,
  selected,
  matched,
  wrong,
  onClick,
}: {
  label: string;
  selected: boolean;
  matched: boolean;
  wrong: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={matched}
      className={cn(
        "w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
        matched && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a] opacity-80",
        !matched && selected && "border-accent-lime bg-accent-lime/15 text-ink",
        !matched && wrong && "border-[#f3b8cc] bg-[#fff1f6] text-[#c7366a] animate-pulse",
        !matched && !selected && !wrong && "border-hairline-cloud bg-background hover:border-accent-lime/50 hover:bg-accent-lime/10",
      )}
    >
      {label}
    </button>
  );
}
