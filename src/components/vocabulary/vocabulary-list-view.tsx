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
    <ul className="m-0 list-none p-0">
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
        className="vocab-entry"
      >
        <VocabularyPosRail partOfSpeech={word.partOfSpeech} />
        <div className="vocab-entry-body">
          <div className="vocab-entry-top">
            <div className="vocab-entry-copy">
              <VocabularyWordLink
                word={word}
                className="text-[1.15rem] leading-snug sm:text-[1.25rem]"
              />
              <VocabularyMeaningPreview
                word={word}
                className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground"
              />
            </div>
            <div className="vocab-entry-meta">
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
