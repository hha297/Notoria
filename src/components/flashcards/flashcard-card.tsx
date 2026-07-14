"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  getTagLabel,
  isBuiltinTag,
  PARTS_OF_SPEECH,
} from "@/lib/vocabulary-tags";
import { cn } from "@/lib/utils";
import type { FlashcardCardDirection, FlashcardWord } from "@/types/flashcards";

type FlashcardCardProps = {
  word: FlashcardWord;
  direction: FlashcardCardDirection;
  isFlipped: boolean;
  onFlip: () => void;
};

function FlashcardFace({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col rounded-3xl border border-hairline-cloud bg-card p-8 shadow-xl shadow-ink/5",
        className,
      )}
      style={{ backfaceVisibility: "hidden" }}
    >
      {children}
    </div>
  );
}

export function FlashcardCard({
  word,
  direction,
  isFlipped,
  onFlip,
}: FlashcardCardProps) {
  const t = useTranslations("flashcards");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");

  const isWordFront = direction === "WORD_TO_MEANING";
  const primaryMeaning = word.meanings[0] ?? t("noMeaning");

  function formatPartOfSpeech(pos: string | null) {
    if (!pos) {
      return null;
    }

    if (PARTS_OF_SPEECH.includes(pos as (typeof PARTS_OF_SPEECH)[number])) {
      return tPos(pos as (typeof PARTS_OF_SPEECH)[number]);
    }

    return pos;
  }

  function renderTags() {
    if (word.tags.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {word.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {isBuiltinTag(tag)
              ? getTagLabel(tag, (key) => tTags(key))
              : tag.replace(/^custom:/, "")}
          </Badge>
        ))}
      </div>
    );
  }

  function renderDetails({ includeMeanings = true }: { includeMeanings?: boolean }) {
    const partOfSpeech = formatPartOfSpeech(word.partOfSpeech);

    return (
      <div className="mt-auto space-y-4 text-left">
        {includeMeanings && word.meanings.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("meanings")}
            </p>
            <ul className="mt-2 space-y-1">
              {word.meanings.map((meaning, index) => (
                <li key={`${meaning}-${index}`} className="text-base text-ink">
                  {meaning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {word.examples.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("examples")}
            </p>
            <ul className="mt-2 space-y-1">
              {word.examples.map((example, index) => (
                <li
                  key={`${example}-${index}`}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>
        )}

        {word.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("notes")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {word.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {partOfSpeech && (
            <Badge variant="outline">{partOfSpeech}</Badge>
          )}
          {renderTags()}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-2">
      <motion.button
        type="button"
        onClick={onFlip}
        className="relative h-[min(70vh,520px)] w-full cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ perspective: 1200 }}
        aria-label={isFlipped ? t("hideAnswer") : t("showAnswer")}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          <FlashcardFace>
            <p className="text-sm font-medium uppercase tracking-[0.2px] text-muted-foreground">
              {isWordFront ? t("questionWord") : t("questionMeaning")}
            </p>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-heading text-4xl font-medium tracking-tight text-ink sm:text-5xl">
                {isWordFront ? word.word : primaryMeaning}
              </p>
              {!isWordFront && word.meanings.length > 1 && (
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  {word.meanings.slice(1).join(" · ")}
                </p>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {t("tapToFlip")}
            </p>
          </FlashcardFace>

          <FlashcardFace className="[transform:rotateY(180deg)]">
            <p className="text-sm font-medium uppercase tracking-[0.2px] text-accent-lime">
              {t("answer")}
            </p>
            <div className="flex flex-1 flex-col justify-center overflow-y-auto text-center">
              {isWordFront ? (
                <ul className="space-y-2">
                  {word.meanings.map((meaning, index) => (
                    <li
                      key={`${meaning}-${index}`}
                      className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl"
                    >
                      {meaning}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-heading text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                  {word.word}
                </p>
              )}
            </div>
            {renderDetails({ includeMeanings: false })}
          </FlashcardFace>
        </motion.div>
      </motion.button>
    </div>
  );
}
