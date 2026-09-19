"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { VocabularyCardView } from "@/components/vocabulary/vocabulary-card-view";
import { VocabularyListView } from "@/components/vocabulary/vocabulary-list-view";
import { VocabularyPagination } from "@/components/vocabulary/vocabulary-pagination";
import { VOCABULARY_GROUP_PAGE_SIZE } from "@/lib/vocabulary/display";
import type { VocabularyViewMode, VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyGroupProps = {
  title: string;
  posKey?: string;
  words: VocabularyWordRow[];
  viewMode: VocabularyViewMode;
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
};

export function VocabularyGroup({
  title,
  posKey,
  words,
  viewMode,
  workspaceId,
  onEditWord,
}: VocabularyGroupProps) {
  const t = useTranslations("vocabulary");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(words.length / VOCABULARY_GROUP_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageWords = useMemo(() => {
    const start = (currentPage - 1) * VOCABULARY_GROUP_PAGE_SIZE;
    return words.slice(start, start + VOCABULARY_GROUP_PAGE_SIZE);
  }, [currentPage, words]);

  const showPagination = words.length > VOCABULARY_GROUP_PAGE_SIZE;
  const rangeStart = (currentPage - 1) * VOCABULARY_GROUP_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * VOCABULARY_GROUP_PAGE_SIZE, words.length);

  return (
    <section
      data-vocab-pos={posKey || "none"}
      className="vocab-group rounded-xl border border-hairline-cloud"
    >
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-t-xl border-b border-hairline-cloud bg-muted/70 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-(--vocab-pos-accent)"
            aria-hidden
          />
          <h2 className="font-heading text-lg font-medium tracking-tight text-ink sm:text-xl">
            {title}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {showPagination
            ? t("groupPageRange", {
                start: rangeStart,
                end: rangeEnd,
                count: words.length,
              })
            : t("groupCount", { count: words.length })}
        </p>
      </header>

      <div className="overflow-hidden rounded-b-xl">
        {viewMode === "cards" ? (
          <VocabularyCardView
            words={pageWords}
            workspaceId={workspaceId}
            onEditWord={onEditWord}
          />
        ) : (
          <VocabularyListView
            words={pageWords}
            workspaceId={workspaceId}
            onEditWord={onEditWord}
          />
        )}

        {showPagination ? (
          <VocabularyPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </section>
  );
}
