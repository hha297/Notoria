"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { VocabularyMeaningPreview } from "@/components/vocabulary/vocabulary-meaning-preview";
import { VocabularyRowActions } from "@/components/vocabulary/vocabulary-row-actions";
import { VocabularyWordTags } from "@/components/vocabulary/vocabulary-word-tags";
import { isKnownPartOfSpeech } from "@/lib/vocabulary/display";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyCardViewProps = {
  words: VocabularyWordRow[];
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
  indexOffset?: number;
};

export function VocabularyCardView({
  words,
  workspaceId,
  onEditWord,
  indexOffset = 0,
}: VocabularyCardViewProps) {
  return (
    <div className={mx(featureStyles, "vocab-card-grid")}>
      {words.map((word, index) => (
        <VocabularyCard
          key={word.id}
          word={word}
          index={indexOffset + index}
          workspaceId={workspaceId}
          onEditWord={onEditWord}
        />
      ))}
    </div>
  );
}

function VocabularyCard({
  word,
  index,
  workspaceId,
  onEditWord,
}: {
  word: VocabularyWordRow;
  index: number;
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
}) {
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const tCommon = useTranslations("common");
  const pos = word.partOfSpeech;
  const posLabel = !pos
    ? t("uncategorizedPos")
    : isKnownPartOfSpeech(pos)
      ? tPos(pos)
      : pos;
  const href = `/vocabulary/${word.id}`;
  const updated = formatDistanceToNow(new Date(word.updatedAt), {
    addSuffix: true,
  });

  return (
    <article
      data-vocab-pos={pos || "none"}
      className={mx(featureStyles, "vocab-module-card group")}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={mx(featureStyles, "vocab-module-index vocab-module-index-sm")} aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </p>
        <Link href={href} className={mx(featureStyles, "vocab-module-cta vocab-module-cta-sm")}>
          {tCommon("open")}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </Link>
      </div>

      <p className={mx(featureStyles, "vocab-module-kicker")}>{posLabel}</p>
      <h3 className={mx(featureStyles, "vocab-module-title vocab-module-title-card")}>
        <Link
          href={href}
          className="rounded-sm text-ink transition-colors group-hover:text-(--vocab-pos-accent) hover:text-(--vocab-pos-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vocab-pos-accent)/40"
        >
          {word.word}
        </Link>
      </h3>
      <VocabularyMeaningPreview
        word={word}
        className="mt-2 text-sm leading-relaxed text-muted-foreground"
      />
      {word.tags.length > 0 ? (
        <div className="mt-3">
          <VocabularyWordTags tags={word.tags} limit={3} />
        </div>
      ) : null}

      <div className={mx(featureStyles, "vocab-module-card-foot")}>
        <p className="text-xs text-muted-foreground">
          {t("updatedAgo", { time: updated })}
        </p>
        <VocabularyRowActions
          wordId={word.id}
          word={word.word}
          workspaceId={workspaceId}
          onEdit={() => onEditWord(word)}
        />
      </div>
    </article>
  );
}
