"use client";

import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(words.length / VOCABULARY_GROUP_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageWords = useMemo(() => {
    const start = (currentPage - 1) * VOCABULARY_GROUP_PAGE_SIZE;
    return words.slice(start, start + VOCABULARY_GROUP_PAGE_SIZE);
  }, [currentPage, words]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting);
      },
      {
        // Match sticky top offset (studio chrome h-14 = 56px)
        rootMargin: "-56px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const showPagination = words.length > VOCABULARY_GROUP_PAGE_SIZE;
  const rangeStart = (currentPage - 1) * VOCABULARY_GROUP_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * VOCABULARY_GROUP_PAGE_SIZE, words.length);
  const indexOffset = (currentPage - 1) * VOCABULARY_GROUP_PAGE_SIZE;

  return (
    <section
      data-vocab-pos={posKey || "none"}
      className={mx(featureStyles, "vocab-group")}
    >
      {/* Sentinel sits above the sticky head; leaving the chrome band marks "stuck". */}
      <div
        ref={sentinelRef}
        className={mx(featureStyles, "vocab-group-sticky-sentinel")}
        aria-hidden
      />
      <header
        className={cn(
          mx(featureStyles, "vocab-group-head"),
          "backdrop-blur-[14px]",
        )}
        data-stuck={stuck ? "" : undefined}
      >
        <div className={mx(featureStyles, "vocab-group-copy")}>
          <h2 className={mx(featureStyles, "vocab-group-title")}>{title}</h2>
        </div>
        <p className={mx(featureStyles, "vocab-group-count")}>
          {showPagination
            ? t("groupPageRange", {
                start: rangeStart,
                end: rangeEnd,
                count: words.length,
              })
            : t("groupCount", { count: words.length })}
        </p>
      </header>

      {viewMode === "cards" ? (
        <VocabularyCardView
          words={pageWords}
          workspaceId={workspaceId}
          onEditWord={onEditWord}
          indexOffset={indexOffset}
        />
      ) : (
        <VocabularyListView
          words={pageWords}
          workspaceId={workspaceId}
          onEditWord={onEditWord}
          indexOffset={indexOffset}
        />
      )}

      {showPagination ? (
        <VocabularyPagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}
