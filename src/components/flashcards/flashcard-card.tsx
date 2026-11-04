"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { VocabularyNotesContent } from "@/components/vocabulary/vocabulary-notes-content";
import { highlightLemmaInSentence } from "@/lib/flashcards/highlight-lemma";
import {
  getTagLabel,
  isBuiltinTag,
  PARTS_OF_SPEECH,
} from "@/lib/vocabulary-tags";
import {
  isNotesDocEmpty,
  parseVocabularyNotes,
} from "@/lib/vocabulary/notes-content";
import { cn } from "@/lib/utils";
import type { FlashcardCardDirection, FlashcardWord } from "@/types/flashcards";

type FlashcardCardProps = {
  word: FlashcardWord;
  direction: FlashcardCardDirection;
  isFlipped: boolean;
  onFlip: () => void;
};

const FACE =
  "absolute inset-0 flex flex-col overflow-hidden rounded-xl border p-5 sm:p-7";

export function FlashcardCard({
  word,
  direction,
  isFlipped,
  onFlip,
}: FlashcardCardProps) {
  const t = useTranslations("flashcards");
  const tVocab = useTranslations("vocabulary");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const reduceMotion = useReducedMotion();

  const isWordFront = direction === "WORD_TO_MEANING";
  const primaryMeanings = word.meanings.filter((item) => item.trim());
  const secondaryMeanings = (word.secondaryMeanings ?? []).filter((item) =>
    item.trim(),
  );
  const primaryMeaning = primaryMeanings[0] ?? t("noMeaning");
  const exampleEntries =
    word.exampleEntries && word.exampleEntries.length > 0
      ? word.exampleEntries
      : word.examples.map((sentence) => ({
          sentence,
          meaning: null as string | null,
        }));
  const prompt = isWordFront ? word.word : primaryMeaning;
  const partOfSpeech = formatPartOfSpeech(word.partOfSpeech, tPos);
  const hasNotes =
    Boolean(word.notes) && !isNotesDocEmpty(parseVocabularyNotes(word.notes));
  const tagLabels = word.tags.map((tag) =>
    isBuiltinTag(tag)
      ? getTagLabel(tag, (key) => tTags(key))
      : tag.replace(/^custom:/, ""),
  );

  return (
    <div className="mx-auto w-full max-w-lg px-1 sm:max-w-xl">
      <div className="relative" style={{ perspective: "1400px" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -bottom-3 h-8 rounded-full bg-ink/12 blur-xl dark:bg-black/50"
        />

        <motion.div
          role="button"
          tabIndex={0}
          aria-pressed={isFlipped}
          aria-label={isFlipped ? t("hideAnswer") : t("showAnswer")}
          onClick={onFlip}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onFlip();
            }
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
          }
          className="relative h-[min(38dvh,17rem)] w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-[min(52dvh,26rem)] md:h-[min(56dvh,30rem)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            aria-hidden={isFlipped}
            className={cn(
              FACE,
              "border-(--exercise-panel-border,var(--page-accent-border)) bg-linear-to-br from-(--exercise-panel-bg,var(--surface)) via-surface to-surface-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_16px_36px_-18px_rgba(35,37,29,0.32)] dark:from-(--exercise-panel-bg,var(--surface)) dark:via-surface dark:to-surface-muted dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_40px_-16px_rgba(0,0,0,0.55)]",
            )}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />
            <span className="pointer-events-none absolute inset-y-5 left-0 w-px bg-linear-to-b from-transparent via-(--exercise-accent)/35 to-transparent" />

            <p className="text-center text-[0.68rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {isWordFront ? t("questionWord") : t("questionMeaning")}
            </p>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="max-w-full font-heading text-3xl leading-[1.12] font-semibold tracking-tight wrap-break-word text-ink sm:text-4xl md:text-5xl">
                {prompt}
              </p>
              {!isWordFront && primaryMeanings.length > 1 ? (
                <div className="mt-3 max-w-md space-y-1">
                  {primaryMeanings.slice(1).map((meaning) => (
                    <p
                      key={meaning}
                      className="text-sm leading-relaxed text-muted-foreground sm:text-base"
                    >
                      {meaning}
                    </p>
                  ))}
                </div>
              ) : null}
              {!isWordFront && secondaryMeanings.length > 0 ? (
                <div className="mt-3 max-w-md space-y-1 border-t border-hairline-cloud pt-3">
                  <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {tVocab("otherMeanings")}
                  </p>
                  {secondaryMeanings.map((meaning) => (
                    <p
                      key={meaning}
                      className="text-sm leading-relaxed text-muted-foreground/90"
                    >
                      {meaning}
                    </p>
                  ))}
                </div>
              ) : null}
              {partOfSpeech ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {partOfSpeech}
                </p>
              ) : null}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t("tapToFlip")}
            </p>
          </div>

          <div
            aria-hidden={!isFlipped}
            className={cn(
              FACE,
              "border-(--exercise-accent)/25 bg-linear-to-br from-[color-mix(in_srgb,var(--exercise-accent-soft)_72%,var(--surface-elevated))] via-surface-elevated to-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_16px_36px_-18px_rgba(35,37,29,0.32)] dark:from-[color-mix(in_srgb,var(--exercise-accent-soft)_45%,var(--surface-elevated))] dark:via-surface dark:to-surface-muted dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_40px_-16px_rgba(0,0,0,0.55)]",
            )}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-(--exercise-accent)" />
            <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-(--exercise-accent)/12 to-transparent" />

            <p className="relative text-center text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {t("answer")}
            </p>

            <div
              aria-live="polite"
              className="relative mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <p className="mb-3 text-center text-xs text-muted-foreground wrap-break-word">
                {prompt}
              </p>

              {isWordFront ? (
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-(--exercise-accent)/25 bg-background/55 px-3 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:bg-background/35">
                    <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.16em] text-(--exercise-accent) uppercase">
                      {tVocab(
                        primaryMeanings.length > 1
                          ? "primaryMeanings"
                          : "primaryMeaning",
                      )}
                    </p>
                    {primaryMeanings.length > 0 ? (
                      <ul className="space-y-2">
                        {primaryMeanings.map((meaning, index) => (
                          <li
                            key={meaning}
                            className={cn(
                              "font-heading leading-tight tracking-tight wrap-break-word text-ink",
                              index === 0
                                ? "text-2xl font-semibold sm:text-3xl"
                                : "border-t border-(--exercise-accent)/12 pt-2 text-lg font-medium text-ink/85 sm:text-xl",
                            )}
                          >
                            {meaning}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-heading text-2xl font-semibold text-ink">
                        {t("noMeaning")}
                      </p>
                    )}
                  </div>

                  {secondaryMeanings.length > 0 ? (
                    <div className="rounded-lg border border-dashed border-(--exercise-accent)/18 bg-background/30 px-3 py-3 text-left dark:bg-background/20">
                      <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        {tVocab("otherMeanings")}
                      </p>
                      <ul className="space-y-2">
                        {secondaryMeanings.map((meaning) => (
                          <li
                            key={meaning}
                            className="border-l-2 border-(--exercise-accent)/35 pl-2.5 text-sm leading-snug text-muted-foreground sm:text-[0.95rem]"
                          >
                            {meaning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-(--exercise-accent)/15 bg-background/50 px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:bg-background/35">
                  <p className="font-heading text-2xl leading-tight font-semibold tracking-tight wrap-break-word text-ink sm:text-3xl md:text-4xl">
                    {word.word}
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-3 text-left">
                {exampleEntries.length > 0 ? (
                  <ul className="space-y-2.5">
                    {exampleEntries.map((example, index) => (
                      <li
                        key={`${example.sentence}-${index}`}
                        className="rounded-md border border-hairline-cloud/80 bg-background/25 px-2.5 py-2"
                      >
                        <p className="text-sm leading-relaxed text-pretty text-ink/85 italic sm:text-[0.95rem]">
                          {highlightLemmaInSentence(
                            example.sentence,
                            word.word,
                          )}
                        </p>
                        {example.meaning ? (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground not-italic sm:text-sm">
                            {example.meaning}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {word.synonyms ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-ink/70">
                      {t("synonyms")}:{" "}
                    </span>
                    {word.synonyms}
                  </p>
                ) : null}

                {hasNotes ? (
                  <div
                    className="text-sm leading-relaxed text-muted-foreground"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <p className="mb-1 font-medium text-ink/70">{t("notes")}</p>
                    <VocabularyNotesContent notes={word.notes} />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {partOfSpeech ? <span>{partOfSpeech}</span> : null}
                  {tagLabels.length > 0 ? (
                    <span>{tagLabels.join(" · ")}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function formatPartOfSpeech(
  pos: string | null,
  tPos: (key: (typeof PARTS_OF_SPEECH)[number]) => string,
) {
  if (!pos) return null;
  if (PARTS_OF_SPEECH.includes(pos as (typeof PARTS_OF_SPEECH)[number])) {
    return tPos(pos as (typeof PARTS_OF_SPEECH)[number]);
  }
  return pos;
}
