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

type VocabularyListViewProps = {
  words: VocabularyWordRow[];
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
};

export function VocabularyListView({
  words,
  workspaceId,
  onEditWord,
}: VocabularyListViewProps) {
  return (
    <ul className="divide-y divide-hairline-cloud">
      {words.map((word) => (
        <VocabularyListItem
          key={word.id}
          word={word}
          workspaceId={workspaceId}
          onEditWord={onEditWord}
        />
      ))}
    </ul>
  );
}

function VocabularyListItem({
  word,
  workspaceId,
  onEditWord,
}: {
  word: VocabularyWordRow;
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
}) {
  return (
    <li>
      <article
        data-vocab-pos={word.partOfSpeech || "none"}
        className="vocab-row flex gap-3 px-3 py-3.5 transition-colors sm:gap-4 sm:px-4"
      >
        <VocabularyPosRail partOfSpeech={word.partOfSpeech} />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-6">
            <div className="min-w-0 flex-1">
              <VocabularyWordLink word={word} className="text-[1.05rem] leading-snug" />
              <VocabularyMeaningPreview
                word={word}
                className="mt-1 text-[13.5px] leading-relaxed"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <VocabularyUpdatedAt
                updatedAt={word.updatedAt}
                className="hidden text-right sm:block"
              />
              <VocabularyRowActions
                wordId={word.id}
                word={word.word}
                workspaceId={workspaceId}
                onEdit={() => onEditWord(word)}
              />
            </div>
          </div>
          {word.tags.length > 0 ? (
            <VocabularyWordTags
              tags={word.tags}
              limit={word.tags.length}
              className="flex flex-wrap gap-1"
            />
          ) : null}
          <VocabularyUpdatedAt
            updatedAt={word.updatedAt}
            className="sm:hidden"
          />
        </div>
      </article>
    </li>
  );
}
