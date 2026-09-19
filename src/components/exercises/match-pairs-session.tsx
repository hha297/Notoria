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
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
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
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const poolItems = useMemo(() => buildMatchPairItems(filteredWords), [filteredWords]);
  const createdAtByWordId = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word.createdAt] as const)),
    [filteredWords],
  );

  const startSession = useCallback(() => {
    const prefs = commitAndBeginNext();
    setSessionItems(
      sampleSessionItems(poolItems, "match_pairs", {
        getWordId: (item) => item.wordId,
        getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      }),
    );
    setRound((r) => r + 1);
    setSelectedWordId(null);
    setMatchedIds(new Set());
    setWrongId(null);
    setSessionComplete(false);
  }, [commitAndBeginNext, createdAtByWordId, poolItems]);

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
      recordOutcome({ wordId, correct: true });
      if (next.size === sessionItems.length) {
        setSessionComplete(true);
      }
      return;
    }

    recordOutcome({ wordId: selectedWordId, correct: false });
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
          questions={sessionItems.length}
          correct={sessionItems.length}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : (
        <>
          <ExerciseProgressHeader
            current={matchedIds.size}
            total={sessionItems.length}
            progressLabel={t("progress", { matched: matchedIds.size, total: sessionItems.length })}
            progressValue={sessionItems.length ? (matchedIds.size / sessionItems.length) * 100 : 0}
            hint={t("hint")}
          />
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <Column title={t("words")}>
              {wordColumn.map((item) => (
                <MatchButton
                  key={`w-${item.wordId}`}
                  label={item.word}
                  selected={selectedWordId === item.wordId}
                  matched={matchedIds.has(item.wordId)}
                  wrong={wrongId !== null && selectedWordId === item.wordId}
                  pairing={false}
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
                  pairing={Boolean(selectedWordId) && !matchedIds.has(item.wordId)}
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
    <div className="min-w-0 space-y-3">
      <p className="text-xs font-semibold tracking-[0.14em] text-(--exercise-accent) uppercase">
        {title}
      </p>
      <div className="max-h-[min(42vh,360px)] space-y-2 overflow-y-auto overscroll-contain sm:max-h-none sm:overflow-visible">
        {children}
      </div>
    </div>
  );
}

function MatchButton({
  label,
  selected,
  matched,
  wrong,
  pairing,
  onClick,
}: {
  label: string;
  selected: boolean;
  matched: boolean;
  wrong: boolean;
  pairing: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={matched}
      className={cn(
        "w-full min-h-12 min-w-0 cursor-pointer border px-4 py-3 text-left text-sm font-medium break-words [overflow-wrap:anywhere] transition-all sm:min-h-11",
        matched && "border-success-border bg-success-muted/50 text-muted-foreground opacity-50",
        !matched && selected && "border-(--exercise-accent) bg-(--exercise-accent-soft) text-ink",
        !matched && wrong && "feedback-error exercise-shake",
        !matched && pairing && !selected && !wrong && "border-(--exercise-accent)/40 bg-surface-elevated hover:border-(--exercise-accent)",
        !matched && !selected && !wrong && !pairing && "border-hairline-cloud bg-surface-elevated hover:border-(--exercise-accent) hover:bg-(--exercise-accent-soft)",
      )}
    >
      {label}
    </button>
  );
}
