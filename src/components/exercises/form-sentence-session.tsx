"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { FormSentenceActions } from "@/components/exercises/form-sentence-actions";
import { FormSentenceStage } from "@/components/exercises/form-sentence-stage";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { appendVocabularyExample } from "@/lib/actions/vocabulary";
import { requestFormSentenceAi } from "@/lib/exercises/form-sentence-ai-client";
import type { FormSentenceAiResult } from "@/lib/exercises/form-sentence-ai-types";
import { FORM_SENTENCE_MAX_LENGTH } from "@/lib/exercises/form-sentence-ai-types";
import {
  buildFormSentenceItems,
  type FormSentenceItem,
} from "@/lib/exercises/form-sentence";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import { filterFlashcardWords } from "@/lib/flashcards/session";
import { useRecentSectionPreferences } from "@/hooks/use-recent-section-preferences";
import {
  EMPTY_RECENT_PREFERENCES,
  type RecentSectionPreferences,
} from "@/lib/exercises/recent-outcomes";
import type { FlashcardFilters, FlashcardWord } from "@/types/flashcards";
import { DEFAULT_FLASHCARD_FILTERS } from "@/types/flashcards";

type FormSentenceSessionProps = {
  workspaceId: string;
  words: FlashcardWord[];
  language?: string;
};

type FeedbackState = FormSentenceAiResult & {
  sentence: string;
  saved: boolean;
};

type RoundState = {
  itemIds: string[];
  index: number;
  input: string;
  feedback: FeedbackState | null;
  evaluating: boolean;
  sessionComplete: boolean;
  score: { correct: number; answered: number };
};

function createRound(
  poolItems: FormSentenceItem[],
  createdAtByWordId: Map<string, string>,
  prefs: RecentSectionPreferences,
): RoundState {
  const sampled = sampleSessionItems(poolItems, "form_sentence", {
    getWordId: (item) => item.wordId,
    getCreatedAt: (item) => createdAtByWordId.get(item.wordId),
    softAvoidWordIds: prefs.softAvoidWordIds,
    softPreferWordIds: prefs.softPreferWordIds,
  });
  return {
    itemIds: sampled.map((item) => item.id),
    index: 0,
    input: "",
    feedback: null,
    evaluating: false,
    sessionComplete: false,
    score: { correct: 0, answered: 0 },
  };
}

export function FormSentenceSession({
  workspaceId,
  words,
  language,
}: FormSentenceSessionProps) {
  const t = useTranslations("exercises.formSentence");
  const tSession = useTranslations("exercises.session");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [filters, setFilters] = useState<FlashcardFilters>(
    DEFAULT_FLASHCARD_FILTERS,
  );
  const [saving, startSaveTransition] = useTransition();
  const { recordOutcome, commitAndBeginNext } = useRecentSectionPreferences();

  const filteredWords = useMemo(
    () => filterFlashcardWords(words, filters),
    [words, filters],
  );
  const poolItems = useMemo(
    () => buildFormSentenceItems(filteredWords),
    [filteredWords],
  );
  const itemMap = useMemo(
    () => new Map(poolItems.map((item) => [item.id, item])),
    [poolItems],
  );
  const createdAtByWordId = useMemo(
    () => new Map(filteredWords.map((word) => [word.id, word.createdAt] as const)),
    [filteredWords],
  );

  const [sessionSource, setSessionSource] = useState({
    workspaceId,
    poolKey: poolItems.map((item) => item.id).join("|"),
  });
  const [round, setRound] = useState<RoundState>(() =>
    createRound(poolItems, createdAtByWordId, EMPTY_RECENT_PREFERENCES),
  );

  const poolKey = poolItems.map((item) => item.id).join("|");
  if (
    sessionSource.workspaceId !== workspaceId ||
    sessionSource.poolKey !== poolKey
  ) {
    setSessionSource({ workspaceId, poolKey });
    setRound(createRound(poolItems, createdAtByWordId, commitAndBeginNext()));
  }

  const startSession = useCallback(() => {
    setRound(createRound(poolItems, createdAtByWordId, commitAndBeginNext()));
  }, [commitAndBeginNext, createdAtByWordId, poolItems]);

  const current = itemMap.get(round.itemIds[round.index] ?? "") as
    | FormSentenceItem
    | undefined;
  const total = round.itemIds.length;
  const canSubmit =
    Boolean(round.input.trim()) && !round.evaluating && !round.feedback;

  const insertCurrentWord = () => {
    if (!current || round.feedback || round.evaluating) return;
    const token = current.word;
    setRound((currentRound) => {
      const value = currentRound.input.trim();
      return {
        ...currentRound,
        input: value ? `${value} ${token}` : token,
      };
    });
  };

  const submit = async () => {
    if (!current || round.evaluating || round.feedback) return;
    const sentence = round.input.trim();
    if (!sentence) {
      toast.error(t("errors.empty"));
      return;
    }
    if (sentence.length > FORM_SENTENCE_MAX_LENGTH) {
      toast.error(t("errors.tooLong"));
      return;
    }
    if (!hasProAccess) {
      openUpgrade();
      return;
    }

    setRound((currentRound) => ({ ...currentRound, evaluating: true }));
    try {
      const result = await requestFormSentenceAi({
        wordId: current.wordId,
        word: current.word,
        meaning: current.meaning,
        sentence,
        language: language ?? null,
        partOfSpeech: current.partOfSpeech,
      });

      if (!result.ok) {
        setRound((currentRound) => ({ ...currentRound, evaluating: false }));
        if (result.code === "AI_FORBIDDEN") {
          toast.error(t("errors.forbidden"));
          openUpgrade();
          return;
        }
        if (result.code === "AI_EMPTY") {
          toast.error(t("errors.empty"));
          return;
        }
        toast.error(t("errors.unavailable"));
        return;
      }

      setRound((currentRound) => ({
        ...currentRound,
        evaluating: false,
        feedback: {
          isCorrect: result.isCorrect,
          grammarExplanation: result.grammarExplanation,
          correctedSentence: result.correctedSentence,
          betterSuggestion: result.betterSuggestion,
          sentenceMeaning: result.sentenceMeaning,
          sentence,
          saved: false,
        },
        score: {
          correct: currentRound.score.correct + (result.isCorrect ? 1 : 0),
          answered: currentRound.score.answered + 1,
        },
      }));
      recordOutcome({
        wordId: current.wordId,
        correct: result.isCorrect,
        itemKey: sentence,
      });
    } catch {
      setRound((currentRound) => ({ ...currentRound, evaluating: false }));
      toast.error(t("errors.unavailable"));
    }
  };

  const next = () => {
    if (!round.feedback) return;
    if (round.index < total - 1) {
      setRound((currentRound) => ({
        ...currentRound,
        index: currentRound.index + 1,
        input: "",
        feedback: null,
        evaluating: false,
      }));
      return;
    }
    setRound((currentRound) => ({
      ...currentRound,
      sessionComplete: true,
    }));
  };

  const saveExample = () => {
    if (!current || !round.feedback || round.feedback.saved || saving) return;

    const feedback = round.feedback;
    const sentenceToSave =
      !feedback.isCorrect && feedback.correctedSentence
        ? feedback.correctedSentence
        : feedback.sentence;

    startSaveTransition(async () => {
      const result = await appendVocabularyExample({
        wordId: current.wordId,
        sentence: sentenceToSave,
        meaning: feedback.sentenceMeaning,
      });

      if (!result.ok) {
        if (result.code === "WORD_NOT_FOUND") {
          toast.error(t("errors.wordMissing"));
          return;
        }
        toast.error(t("errors.saveFailed"));
        return;
      }

      setRound((currentRound) =>
        currentRound.feedback
          ? {
            ...currentRound,
            feedback: { ...currentRound.feedback, saved: true },
          }
          : currentRound,
      );
      toast.success(
        result.alreadyExists ? t("alreadySaved") : t("savedExample"),
      );
    });
  };

  useHotkeys(
    "mod+enter",
    (event) => {
      event.preventDefault();
      if (round.sessionComplete || round.evaluating) return;
      if (!round.feedback) {
        void submit();
        return;
      }
      next();
    },
    { enableOnFormTags: true },
    [round, current, hasProAccess],
  );

  if (words.length === 0) return <VocabularyEmpty variant="no-words" />;
  if (poolItems.length === 0) {
    return (
      <div className="space-y-6">
        <VocabularyFiltersBar
          words={words}
          filters={filters}
          onFiltersChange={setFilters}
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
      />
      {round.sessionComplete ? (
        <SessionCompleteCard
          title={tSession("complete")}
          questions={round.score.answered}
          correct={round.score.correct}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : (
        <>
          <ExerciseProgressHeader
            current={round.index + 1}
            total={total}
            progressLabel={t("progress", {
              current: round.index + 1,
              total,
            })}
            scoreLabel={t("score", {
              correct: round.score.correct,
              answered: round.score.answered,
            })}
            hint={t("keyboardHint")}
            progressValue={total ? ((round.index + 1) / total) * 100 : 0}
          />
          {current ? (
            <FormSentenceStage
              key={current.id}
              item={current}
              input={round.input}
              feedback={round.feedback}
              evaluating={round.evaluating}
              onInputChange={(value) =>
                setRound((currentRound) => ({
                  ...currentRound,
                  input: value,
                }))
              }
              onInsertWord={insertCurrentWord}
            />
          ) : null}

          <FormSentenceActions
            hasFeedback={Boolean(round.feedback)}
            canSubmit={canSubmit}
            evaluating={round.evaluating}
            hasProAccess={hasProAccess}
            isLast={round.index >= total - 1}
            saved={Boolean(round.feedback?.saved)}
            saving={saving}
            tryAgainLabel={tSession("tryAgain")}
            onSubmit={() => void submit()}
            onNext={next}
            onSave={saveExample}
            onTryAgain={startSession}
          />
        </>
      )}
    </div>
  );
}
