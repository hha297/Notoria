"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FlashcardCard } from "@/components/flashcards/flashcard-card";
import { FlashcardControls } from "@/components/flashcards/flashcard-controls";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { FlashcardRatingBar } from "@/components/flashcards/flashcard-rating-bar";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { Progress } from "@/components/ui/progress";
import { recordFlashcardReview } from "@/lib/actions/flashcards";
import {
  canRestoreSession,
  clearSessionState,
  createSessionState,
  filterFlashcardWords,
  getFiltersKey,
  loadSessionState,
  resolveCardDirection,
  saveSessionState,
} from "@/lib/flashcards/session";
import type {
  FlashcardFilters,
  FlashcardRating,
  FlashcardSessionState,
  FlashcardStudyMode,
  FlashcardWord,
} from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS as DEFAULT_FILTERS } from "@/types/flashcards";

type FlashcardSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
};

export function FlashcardSession({ workspaceId, words }: FlashcardSessionProps) {
  const router = useRouter();
  const t = useTranslations("flashcards");
  const [filters, setFilters] = useState<FlashcardFilters>(DEFAULT_FILTERS);
  const [studyMode, setStudyMode] = useState<FlashcardStudyMode>("word-to-meaning");
  const [session, setSession] = useState<FlashcardSessionState | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );

  const wordMap = useMemo(
    () => new Map(words.map((word) => [word.id, word])),
    [words],
  );

  const filtersKey = getFiltersKey(filters, studyMode);
  const availableIds = useMemo(
    () => new Set(filteredWords.map((word) => word.id)),
    [filteredWords],
  );

  const filteredWordIdsKey = useMemo(
    () =>
      filteredWords
        .map((word) => word.id)
        .sort()
        .join(","),
    [filteredWords],
  );

  useEffect(() => {
    if (filteredWords.length === 0) {
      setSession(null);
      setSessionComplete(false);
      clearSessionState(workspaceId);
      return;
    }

    setSessionComplete(false);

    const saved = loadSessionState(workspaceId);
    if (canRestoreSession(saved, workspaceId, filtersKey, availableIds)) {
      setSession(saved);
      return;
    }

    const nextSession = createSessionState({
      workspaceId,
      words: filteredWords,
      filters,
      studyMode,
    });

    setSession(nextSession);
    saveSessionState(nextSession);
  }, [workspaceId, filtersKey, filteredWordIdsKey, availableIds, filteredWords, filters, studyMode]);

  useEffect(() => {
    if (session) {
      saveSessionState(session);
    }
  }, [session]);

  const currentWord = session
    ? wordMap.get(session.cardIds[session.currentIndex] ?? "")
    : undefined;

  const currentDirection =
    session && currentWord
      ? resolveCardDirection(studyMode, currentWord.id, session.directions)
      : "WORD_TO_MEANING";

  const totalCards = session?.cardIds.length ?? 0;
  const currentNumber = totalCards > 0 ? session!.currentIndex + 1 : 0;
  const progressValue = totalCards > 0 ? (currentNumber / totalCards) * 100 : 0;

  const updateSession = useCallback(
    (updater: (current: FlashcardSessionState) => FlashcardSessionState) => {
      setSession((current) => {
        if (!current) {
          return current;
        }

        const next = updater(current);
        saveSessionState(next);
        return next;
      });
    },
    [],
  );

  const handleFlip = useCallback(() => {
    updateSession((current) => ({
      ...current,
      isFlipped: !current.isFlipped,
    }));
  }, [updateSession]);

  const handlePrevious = useCallback(() => {
    updateSession((current) => ({
      ...current,
      currentIndex: Math.max(0, current.currentIndex - 1),
      isFlipped: false,
    }));
  }, [updateSession]);

  const handleNext = useCallback(() => {
    updateSession((current) => ({
      ...current,
      currentIndex: Math.min(current.cardIds.length - 1, current.currentIndex + 1),
      isFlipped: false,
    }));
  }, [updateSession]);

  const handleShuffle = useCallback(() => {
    if (filteredWords.length === 0) {
      return;
    }

    const nextSession = createSessionState({
      workspaceId,
      words: filteredWords,
      filters,
      studyMode,
    });

    setSessionComplete(false);
    setSession(nextSession);
    saveSessionState(nextSession);
  }, [filteredWords, filters, studyMode, workspaceId]);

  const handleRestart = useCallback(() => {
    if (filteredWords.length === 0) {
      return;
    }

    const nextSession = createSessionState({
      workspaceId,
      words: filteredWords,
      filters,
      studyMode,
      currentIndex: 0,
      isFlipped: false,
    });

    setSessionComplete(false);
    setSession(nextSession);
    saveSessionState(nextSession);
  }, [filteredWords, filters, studyMode, workspaceId]);

  const handleRate = useCallback(
    (rating: FlashcardRating) => {
      if (!session || !currentWord) {
        return;
      }

      startTransition(async () => {
        try {
          await recordFlashcardReview({
            wordId: currentWord.id,
            rating,
            direction: currentDirection,
          });

          if (session.currentIndex < session.cardIds.length - 1) {
            updateSession((current) => ({
              ...current,
              currentIndex: current.currentIndex + 1,
              isFlipped: false,
            }));
          } else {
            setSessionComplete(true);
          }

          router.refresh();
        } catch {
          toast.error(t("ratingFailed"));
        }
      });
    },
    [
      currentDirection,
      currentWord,
      router,
      session,
      updateSession,
    ],
  );

  useHotkeys("space", (event) => {
    event.preventDefault();
    handleFlip();
  });

  useHotkeys("arrowleft", (event) => {
    event.preventDefault();
    handlePrevious();
  });

  useHotkeys("arrowright", (event) => {
    event.preventDefault();
    handleNext();
  });

  if (words.length === 0) {
    return <VocabularyEmpty variant="no-words" />;
  }

  if (filteredWords.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar
          words={words}
          filters={filters}
          studyMode={studyMode}
          onFiltersChange={setFilters}
          onStudyModeChange={setStudyMode}
          showStudyMode
        />
        <VocabularyEmpty variant="no-filtered" />
      </div>
    );
  }

  if (!session || (!currentWord && !sessionComplete)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <VocabularyFiltersBar
        words={words}
        filters={filters}
        studyMode={studyMode}
        onFiltersChange={setFilters}
        onStudyModeChange={setStudyMode}
        showStudyMode
      />

      {sessionComplete ? (
        <SessionCompleteCard
          title={t("sessionComplete")}
          scoreLabel={t("progress", {
            current: totalCards,
            total: totalCards,
          })}
          tryAgainLabel={t("tryAgain")}
          onTryAgain={handleShuffle}
        />
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 text-sm">
              <p className="font-medium text-ink">
                {t("progress", { current: currentNumber, total: totalCards })}
              </p>
              <p className="text-muted-foreground">{t("keyboardHint")}</p>
            </div>
            <Progress value={progressValue} />
          </div>

          <FlashcardCard
            word={currentWord!}
            direction={currentDirection}
            isFlipped={session.isFlipped}
            onFlip={handleFlip}
          />

          {session.isFlipped ? (
            <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
              <FlashcardRatingBar onRate={handleRate} isSubmitting={isPending} />
              <FlashcardControls
                canGoPrevious={session.currentIndex > 0}
                canGoNext={session.currentIndex < session.cardIds.length - 1}
                isFlipped={session.isFlipped}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onFlip={handleFlip}
                onShuffle={handleShuffle}
                onRestart={handleRestart}
              />
            </div>
          ) : (
            <FlashcardControls
              canGoPrevious={session.currentIndex > 0}
              canGoNext={session.currentIndex < session.cardIds.length - 1}
              isFlipped={session.isFlipped}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onFlip={handleFlip}
              onShuffle={handleShuffle}
              onRestart={handleRestart}
            />
          )}
        </>
      )}
    </div>
  );
}
