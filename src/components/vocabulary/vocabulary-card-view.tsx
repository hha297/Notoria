"use client";

import {
  VocabularyPosRail,
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
    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
      className="flex min-w-0 overflow-hidden rounded-xl border border-hairline-cloud bg-background transition-colors hover:bg-surface-hover/60 focus-within:bg-surface-hover/60"
    >
      <VocabularyPosRail
        partOfSpeech={word.partOfSpeech}
        className="rounded-none"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-1 flex-col p-3.5">
          <VocabularyWordLink
            word={word}
            className="text-lg leading-snug"
          />
          <VocabularyMeaningPreview
            word={word}
            className="mt-1.5 text-sm leading-relaxed"
          />

          {word.tags.length > 0 ? (
            <div className="mt-auto pt-3">
              <VocabularyWordTags
                tags={word.tags}
                limit={word.tags.length}
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hairline-cloud px-3.5 py-2">
          <VocabularyUpdatedAt updatedAt={word.updatedAt} />
          <VocabularyRowActions
            wordId={word.id}
            word={word.word}
            workspaceId={workspaceId}
            onEdit={() => onEditWord(word)}
          />
        </div>
      </div>
    </article>
  );
}
