"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { MatchPairsStage } from "@/components/exercises/match-pairs-stage";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import {
  buildMatchPairItems,
  buildMatchPairRounds,
  progressionEventAfterPairMatch,
  type MatchPairItem,
} from "@/lib/exercises/match-pairs";
import { shuffleArray } from "@/lib/exercises/utils";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type MatchPairsSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
};

export function MatchPairsSession({ workspaceId, words }: MatchPairsSessionProps) {
  const t = useTranslations("exercises.matchPairs");
  const tSession = useTranslations("exercises.session");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FLASHCARD_FILTERS);
  const [rounds, setRounds] = useState<MatchPairItem[][]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const roundLockedRef = useRef(false);
  const wrongTimerRef = useRef<number | null>(null);
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();

  const clearWrongTimer = useCallback(() => {
    if (wrongTimerRef.current == null) return;
    window.clearTimeout(wrongTimerRef.current);
    wrongTimerRef.current = null;
  }, []);

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
    clearWrongTimer();
    roundLockedRef.current = false;
    setRounds(
      buildMatchPairRounds(poolItems, {
        getWordId: (item) => item.wordId,
        getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
        softAvoidWordIds: prefs.softAvoidWordIds,
        softPreferWordIds: prefs.softPreferWordIds,
      }),
    );
    setCurrentRoundIndex(0);
    setSelectedWordId(null);
    setMatchedIds(new Set());
    setWrongId(null);
    setSessionComplete(false);
  }, [clearWrongTimer, commitAndBeginNext, createdAtByWordId, poolItems]);

  useEffect(() => {
    startSession();
  }, [startSession, workspaceId]);

  useEffect(() => {
    roundLockedRef.current = false;
  }, [currentRoundIndex]);

  useEffect(() => () => clearWrongTimer(), [clearWrongTimer]);

  const currentItems = useMemo(
    () => rounds[currentRoundIndex] ?? [],
    [rounds, currentRoundIndex],
  );
  const totalRounds = rounds.length;
  const totalPairs = useMemo(
    () => rounds.reduce((sum, round) => sum + round.length, 0),
    [rounds],
  );

  const wordColumn = useMemo(() => shuffleArray(currentItems), [currentItems]);
  const meaningColumn = useMemo(
    () =>
      shuffleArray(
        currentItems.map((item) => ({ wordId: item.wordId, meaning: item.meaning })),
      ),
    [currentItems],
  );

  const handleWordClick = (wordId: string) => {
    if (matchedIds.has(wordId) || sessionComplete || roundLockedRef.current) return;
    setSelectedWordId(wordId);
    setWrongId(null);
  };

  const handleMeaningClick = (wordId: string) => {
    if (
      matchedIds.has(wordId) ||
      !selectedWordId ||
      sessionComplete ||
      roundLockedRef.current
    ) {
      return;
    }

    if (selectedWordId === wordId) {
      const next = new Set(matchedIds);
      next.add(wordId);
      setMatchedIds(next);
      setSelectedWordId(null);
      setWrongId(null);
      recordOutcome({ wordId, correct: true });

      const event = progressionEventAfterPairMatch({
        matchedCount: next.size,
        roundPairCount: currentItems.length,
        currentRoundIndex,
        totalRounds,
      });
      if (event === "stay") return;
      if (roundLockedRef.current) return;
      roundLockedRef.current = true;
      clearWrongTimer();

      if (event === "complete") {
        setSessionComplete(true);
        return;
      }

      setCurrentRoundIndex((index) =>
        index >= totalRounds - 1 ? index : index + 1,
      );
      setMatchedIds(new Set());
      setSelectedWordId(null);
      setWrongId(null);
      return;
    }

    recordOutcome({ wordId: selectedWordId, correct: false });
    setWrongId(wordId);
    clearWrongTimer();
    wrongTimerRef.current = window.setTimeout(() => {
      wrongTimerRef.current = null;
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
          questions={totalPairs}
          correct={totalPairs}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : (
        <>
          <ExerciseProgressHeader
            current={totalRounds ? currentRoundIndex + 1 : 0}
            total={totalRounds}
            progressLabel={t("roundProgress", {
              current: currentRoundIndex + 1,
              total: totalRounds,
            })}
          />
          <MatchPairsStage
            key={`${currentRoundIndex}-${currentItems.map((item) => item.wordId).join("-")}`}
            roundKey={`${currentRoundIndex}-${currentItems.map((item) => item.wordId).join("-")}`}
            wordColumn={wordColumn}
            meaningColumn={meaningColumn}
            selectedWordId={selectedWordId}
            matchedIds={matchedIds}
            wrongId={wrongId}
            onWordClick={handleWordClick}
            onMeaningClick={handleMeaningClick}
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startSession}
              className="text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              {tSession("tryAgain")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
