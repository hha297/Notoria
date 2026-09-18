"use client";

import {
  VocabularyPosRail,
  VocabularyUpdatedAt,
  VocabularyWordLink,
  useVocabularyItemLabels,
} from "@/components/vocabulary/vocabulary-item-meta";
import { VocabularyMeaningPreview } from "@/components/vocabulary/vocabulary-meaning-preview";
import { VocabularyRowActions } from "@/components/vocabulary/vocabulary-row-actions";
import { VocabularyWordTags } from "@/components/vocabulary/vocabulary-word-tags";
import { Badge } from "@/components/ui/badge";
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
  const { difficulty, difficultyLabel, remainingTags } = useVocabularyItemLabels(word);

  return (
    <li>
      <article
        data-vocab-pos={word.partOfSpeech || "none"}
        className="flex gap-3 px-3 py-3.5 transition-colors hover:bg-surface-hover/70 focus-within:bg-surface-hover/70 sm:gap-4 sm:px-4"
      >
        <VocabularyPosRail partOfSpeech={word.partOfSpeech} />
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <VocabularyWordLink word={word} className="text-[1.05rem] leading-snug" />
              {difficultyLabel ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 rounded-md px-1.5 text-[11px] font-semibold uppercase tracking-wide lg:hidden"
                >
                  {difficultyLabel}
                </Badge>
              ) : null}
            </div>
            <VocabularyMeaningPreview
              word={word}
              className="mt-1 text-[13.5px] leading-relaxed"
            />
            {remainingTags.all.length > 0 ? (
              <VocabularyWordTags
                tags={
                  difficulty
                    ? word.tags.filter((tag) => tag.tag !== difficulty.tag)
                    : word.tags
                }
                limit={3}
                className="mt-2 flex flex-wrap gap-1"
              />
            ) : null}
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 lg:shrink-0 lg:flex-col lg:items-end">
            {difficultyLabel ? (
              <Badge
                variant="secondary"
                className="hidden h-5 rounded-md px-1.5 text-[11px] font-semibold uppercase tracking-wide lg:inline-flex"
              >
                {difficultyLabel}
              </Badge>
            ) : (
              <span className="hidden lg:block" />
            )}
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:gap-2 lg:flex-none lg:justify-end">
              <VocabularyUpdatedAt updatedAt={word.updatedAt} />
              <VocabularyRowActions
                wordId={word.id}
                word={word.word}
                workspaceId={workspaceId}
                onEdit={() => onEditWord(word)}
              />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}
