"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FlashcardCard } from "@/components/flashcards/flashcard-card";
import { FlashcardControls } from "@/components/flashcards/flashcard-controls";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { FlashcardProgress } from "@/components/flashcards/flashcard-progress";
import { FlashcardRatingBar } from "@/components/flashcards/flashcard-rating-bar";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { recordFlashcardReview } from "@/lib/actions/flashcards";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
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
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [isPending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();

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

    const saved = loadSessionState(workspaceId);
    if (canRestoreSession(saved, workspaceId, filtersKey, availableIds)) {
      setSession(saved);
      return;
    }

    setSessionComplete(false);
    const nextSession = createSessionState({
      workspaceId,
      words: filteredWords,
      filters,
      studyMode,
    });

    setSession(nextSession);
    saveSessionState(nextSession);
  }, [
    workspaceId,
    filtersKey,
    filteredWordIdsKey,
    availableIds,
    filteredWords,
    filters,
    studyMode,
  ]);

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
    setNavDirection(-1);
    updateSession((current) => ({
      ...current,
      currentIndex: Math.max(0, current.currentIndex - 1),
      isFlipped: false,
    }));
  }, [updateSession]);

  const handleNext = useCallback(() => {
    setNavDirection(1);
    updateSession((current) => ({
      ...current,
      currentIndex: Math.min(current.cardIds.length - 1, current.currentIndex + 1),
      isFlipped: false,
    }));
  }, [updateSession]);

  const rebuildSession = useCallback(() => {
    if (filteredWords.length === 0) {
      return;
    }

    const prefs = commitAndBeginNext();
    const nextSession = createSessionState({
      workspaceId,
      words: filteredWords,
      filters,
      studyMode,
      softAvoidWordIds: prefs.softAvoidWordIds,
      softPreferWordIds: prefs.softPreferWordIds,
    });

    setSessionComplete(false);
    setSession(nextSession);
    saveSessionState(nextSession);
  }, [commitAndBeginNext, filteredWords, filters, studyMode, workspaceId]);

  const handleShuffle = useCallback(() => {
    rebuildSession();
  }, [rebuildSession]);

  const handleRestart = useCallback(() => {
    rebuildSession();
  }, [rebuildSession]);

  const handleRate = useCallback(
    (rating: FlashcardRating) => {
      if (!session || !currentWord) {
        return;
      }

      const feltCorrect = rating === "GOOD" || rating === "EASY";
      recordOutcome({ wordId: currentWord.id, correct: feltCorrect });

      startTransition(async () => {
        try {
          await recordFlashcardReview({
            wordId: currentWord.id,
            rating,
            direction: currentDirection,
          });

          if (session.currentIndex < session.cardIds.length - 1) {
            setNavDirection(1);
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
      recordOutcome,
      router,
      session,
      t,
      updateSession,
    ],
  );

  useHotkeys(
    "space",
    (event) => {
      if (sessionComplete) return;
      event.preventDefault();
      handleFlip();
    },
    [sessionComplete, handleFlip],
  );

  useHotkeys(
    "arrowleft",
    (event) => {
      if (sessionComplete) return;
      event.preventDefault();
      handlePrevious();
    },
    [sessionComplete, handlePrevious],
  );

  useHotkeys(
    "arrowright",
    (event) => {
      if (sessionComplete) return;
      event.preventDefault();
      handleNext();
    },
    [sessionComplete, handleNext],
  );

  useHotkeys(
    "1,2,3,4",
    (event) => {
      if (sessionComplete || !session?.isFlipped || isPending) return;
      const ratings = {
        "1": "AGAIN",
        "2": "HARD",
        "3": "GOOD",
        "4": "EASY",
      } as const;
      const rating = ratings[event.key as keyof typeof ratings];
      if (!rating) return;
      event.preventDefault();
      handleRate(rating);
    },
    [sessionComplete, session?.isFlipped, isPending, handleRate],
  );

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
          onStudyModeChange={(mode) => {
            if (
              mode === "word-to-meaning" ||
              mode === "meaning-to-word" ||
              mode === "mixed"
            ) {
              setStudyMode(mode);
            }
          }}
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
    <div className="flex flex-col gap-5 sm:gap-6">
      <VocabularyFiltersBar
        words={words}
        filters={filters}
        studyMode={studyMode}
        onFiltersChange={setFilters}
        onStudyModeChange={(mode) => {
          if (
            mode === "word-to-meaning" ||
            mode === "meaning-to-word" ||
            mode === "mixed"
          ) {
            setStudyMode(mode);
          }
        }}
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
          <FlashcardProgress
            current={currentNumber}
            total={totalCards}
            progressLabel={t("progress", {
              current: currentNumber,
              total: totalCards,
            })}
            shuffleLabel={t("shuffle")}
            restartLabel={t("restart")}
            onShuffle={handleShuffle}
            onRestart={handleRestart}
          />

          <div className="relative min-h-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentWord!.id}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: navDirection * 28 }
                }
                animate={
                  reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }
                }
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: navDirection * -18 }
                }
                transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-visible"
              >
                <FlashcardCard
                  word={currentWord!}
                  direction={currentDirection}
                  isFlipped={session.isFlipped}
                  onFlip={handleFlip}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="space-y-3 pt-2">
            {session.isFlipped ? (
              <FlashcardRatingBar onRate={handleRate} isSubmitting={isPending} />
            ) : null}
            <FlashcardControls
              canGoPrevious={session.currentIndex > 0}
              canGoNext={session.currentIndex < session.cardIds.length - 1}
              isFlipped={session.isFlipped}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onFlip={handleFlip}
            />
            <p className="hidden text-center text-[0.7rem] text-muted-foreground sm:block">
              {t("keyboardHint")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
