"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import { VocabularyWordTags } from "@/components/vocabulary/vocabulary-word-tags";
import {
  findDifficultyTag,
  visibleTags,
} from "@/lib/vocabulary/display";
import { getTagLabel } from "@/lib/vocabulary-tags";
import { cn } from "@/lib/utils";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

export function VocabularyPosRail({
  partOfSpeech,
  className,
}: {
  partOfSpeech: string | null;
  className?: string;
}) {
  return (
    <span
      data-vocab-pos={partOfSpeech || "none"}
      className={cn("vocab-pos-rail", className)}
      aria-hidden
    />
  );
}

export function VocabularyWordLink({
  word,
  className,
}: {
  word: VocabularyWordRow;
  className?: string;
}) {
  return (
    <Link
      href={`/vocabulary/${word.id}`}
      title={word.word}
      className={cn(
        "min-w-0 font-heading font-semibold wrap-break-word text-ink underline-offset-4 hover:underline",
        className,
      )}
    >
      {word.word}
    </Link>
  );
}

export function VocabularyUpdatedAt({
  updatedAt,
  className,
}: {
  updatedAt: string;
  className?: string;
}) {
  const t = useTranslations("vocabulary");
  const relative = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      {t("updatedAgo", { time: relative })}
    </p>
  );
}

export function useVocabularyItemLabels(word: VocabularyWordRow) {
  const tTags = useTranslations("tags");
  const difficulty = findDifficultyTag(word.tags);
  const difficultyLabel = difficulty
    ? getTagLabel(difficulty.tag, (key) => tTags(key))
    : null;
  const remainingTags = visibleTags(word.tags, {
    excludeTag: difficulty?.tag,
    limit: 3,
  });

  return { difficulty, difficultyLabel, remainingTags };
}

export function VocabularyCardTags({ word }: { word: VocabularyWordRow }) {
  const { difficulty, remainingTags } = useVocabularyItemLabels(word);

  if (remainingTags.all.length === 0) {
    return null;
  }

  return (
    <VocabularyWordTags
      tags={difficulty ? word.tags.filter((tag) => tag.tag !== difficulty.tag) : word.tags}
      limit={2}
    />
  );
}
