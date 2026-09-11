"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { SessionCompleteCard } from "@/components/exercises/session-complete-card";
import { VocabularyEmpty } from "@/components/exercises/vocabulary-empty";
import { VocabularyFiltersBar } from "@/components/exercises/vocabulary-filters-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";

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
          scoreLabel={tSession("score", {
            correct: round.score.correct,
            total: round.score.answered,
          })}
          tryAgainLabel={tSession("tryAgain")}
          onTryAgain={startSession}
        />
      ) : (
        <>
          <ExerciseProgressHeader
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
          {current && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-hairline-cloud bg-card p-5 shadow-xl shadow-ink/5 sm:rounded-3xl sm:p-8 md:p-10">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {t("vocabularyLabel")}
              </p>
              <p className="mt-4 break-words font-heading text-2xl font-medium text-ink sm:mt-6 sm:text-3xl md:text-4xl">
                {current.word}
              </p>
              <div className="mt-4 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("meaningLabel")}
                </p>
                <p className="text-base text-ink sm:text-lg">{current.meaning}</p>
              </div>

              <div className="mt-8 space-y-4">
                <p className="text-sm font-medium text-ink">{t("prompt")}</p>
                {!round.feedback ? (
                  <Textarea
                    value={round.input}
                    onChange={(event) =>
                      setRound((currentRound) => ({
                        ...currentRound,
                        input: event.target.value,
                      }))
                    }
                    placeholder={t("placeholder")}
                    className="min-h-28 resize-y text-base"
                    maxLength={FORM_SENTENCE_MAX_LENGTH}
                    disabled={round.evaluating}
                    autoComplete="off"
                  />
                ) : (
                  <div className="min-w-0 space-y-3 rounded-xl border border-hairline-cloud bg-muted/30 p-4 text-sm">
                    <p className="break-words [overflow-wrap:anywhere]">
                      <span className="font-semibold text-ink">
                        {t("yourSentence")}:
                      </span>{" "}
                      {round.feedback.sentence}
                    </p>
                    {round.feedback.correctedSentence &&
                    !round.feedback.isCorrect ? (
                      <p className="break-words [overflow-wrap:anywhere]">
                        <span className="font-semibold text-ink">
                          {t("corrected")}:
                        </span>{" "}
                        {round.feedback.correctedSentence}
                      </p>
                    ) : null}
                    {round.feedback.betterSuggestion ? (
                      <p className="break-words [overflow-wrap:anywhere]">
                        <span className="font-semibold text-ink">
                          {t("betterSuggestion")}:
                        </span>{" "}
                        {round.feedback.betterSuggestion}
                      </p>
                    ) : null}
                    {round.feedback.sentenceMeaning ? (
                      <p className="break-words [overflow-wrap:anywhere]">
                        <span className="font-semibold text-ink">
                          {t("sentenceMeaning")}:
                        </span>{" "}
                        {round.feedback.sentenceMeaning}
                      </p>
                    ) : null}
                    {round.feedback.grammarExplanation ? (
                      <p className="break-words text-muted-foreground [overflow-wrap:anywhere]">
                        {round.feedback.grammarExplanation}
                      </p>
                    ) : null}
                  </div>
                )}

                {round.evaluating ? (
                  <div className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                    {t("evaluating")}
                  </div>
                ) : null}

                {round.feedback ? (
                  <div
                    className={cn(
                      "flex min-w-0 items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                      round.feedback.isCorrect
                        ? "bg-[#f4fae0] text-[#4a6b0a]"
                        : "bg-[#fff1f6] text-[#c7366a]",
                    )}
                  >
                    {round.feedback.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      {round.feedback.isCorrect ? t("correct") : t("incorrect")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
              {!round.feedback ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void submit()}
                  disabled={!canSubmit && hasProAccess}
                  aria-disabled={!hasProAccess || undefined}
                  className={cn(
                    "h-11 w-full sm:h-8 sm:w-auto",
                    !hasProAccess && lockedFeatureClassName,
                  )}
                >
                  {round.evaluating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {hasProAccess ? t("submit") : t("unlockSubmit")}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveExample}
                    disabled={round.feedback.saved || saving}
                    className="h-11 w-full sm:h-8 sm:w-auto"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {round.feedback.saved ? t("saved") : t("saveExample")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={next}
                    className="h-11 w-full sm:h-8 sm:w-auto"
                  >
                    {round.index >= total - 1 ? t("finish") : t("continue")}
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={startSession}>
              <RotateCcw className="size-4" />
              {tSession("tryAgain")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
