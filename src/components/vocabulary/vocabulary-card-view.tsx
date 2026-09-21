"use client";

import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import {
  VocabularyUpdatedAt,
  VocabularyWordLink,
} from "@/components/vocabulary/vocabulary-item-meta";
import { VocabularyMeaningPreview } from "@/components/vocabulary/vocabulary-meaning-preview";
import { VocabularyRowActions } from "@/components/vocabulary/vocabulary-row-actions";
import { VocabularyWordTags } from "@/components/vocabulary/vocabulary-word-tags";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyCardViewProps = {
  words: VocabularyWordRow[];
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
};

export function VocabularyCardView({
  words,
  workspaceId,
  onEditWord,
}: VocabularyCardViewProps) {
  return (
    <div className={mx(featureStyles, "vocab-card-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}>
      {words.map((word) => (
        <VocabularyCard
          key={word.id}
          word={word}
          workspaceId={workspaceId}
          onEditWord={onEditWord}
        />
      ))}
    </div>
  );
}

function VocabularyCard({
  word,
  workspaceId,
  onEditWord,
}: {
  word: VocabularyWordRow;
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
}) {
  return (
    <article
      data-vocab-pos={word.partOfSpeech || "none"}
      className={mx(featureStyles, "vocab-slip")}
    >
      <div className="min-w-0 flex-1">
        <VocabularyWordLink word={word} className="text-lg leading-snug" />
        <VocabularyMeaningPreview
          word={word}
          className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
        />
        {word.tags.length > 0 ? (
          <div className="mt-3">
            <VocabularyWordTags tags={word.tags} limit={word.tags.length} />
          </div>
        ) : null}
      </div>

      <div className={mx(featureStyles, "vocab-slip-foot")}>
        <VocabularyUpdatedAt updatedAt={word.updatedAt} />
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
