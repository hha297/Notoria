"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { useDateFnsLocale } from "@/hooks/use-date-fns-locale";
import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { VocabularyMeaningPreview } from "@/components/vocabulary/vocabulary-meaning-preview";
import { VocabularyRowActions } from "@/components/vocabulary/vocabulary-row-actions";
import { VocabularyWordTags } from "@/components/vocabulary/vocabulary-word-tags";
import { isKnownPartOfSpeech } from "@/lib/vocabulary/display";
import { cn } from "@/lib/utils";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyListViewProps = {
  words: VocabularyWordRow[];
  workspaceId: string;
  onEditWord: (word: VocabularyWordRow) => void;
  /** 0-based offset for mono indices across pages/groups. */
  indexOffset?: number;
};

export function VocabularyListView({
  words,
  workspaceId,
  onEditWord,
  indexOffset = 0,
}: VocabularyListViewProps) {
  return (
    <ul className={mx(featureStyles, "vocab-module-list")}>
      {words.map((word, index) => (
        <VocabularyListItem
          key={word.id}
          word={word}
          index={indexOffset + index}
          workspaceId={workspaceId}
          onEditWord={onEditWord}
        />
      ))}
    </ul>
  );
}

function VocabularyListItem({
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
  const dateLocale = useDateFnsLocale();
  const pos = word.partOfSpeech;
  const posLabel = !pos
    ? t("uncategorizedPos")
    : isKnownPartOfSpeech(pos)
      ? tPos(pos)
      : pos;
  const updated = formatDistanceToNow(new Date(word.updatedAt), {
    addSuffix: true,
    locale: dateLocale,
  });
  const href = `/vocabulary/${word.id}`;

  return (
    <li>
      <article
        data-vocab-pos={pos || "none"}
        className={mx(
          featureStyles,
          "vocab-module group grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 px-3 pt-3.5 pb-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-4 sm:px-3.5 sm:pt-4 sm:pb-3",
        )}
      >
        <p
          className={mx(featureStyles, "vocab-module-index self-start pt-0.5")}
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </p>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={mx(featureStyles, "vocab-module-kicker")}>
                {posLabel}
              </p>
              <h3 className={mx(featureStyles, "vocab-module-title")}>
                <Link
                  href={href}
                  className={cn(
                    "rounded-sm text-ink transition-colors",
                    "group-hover:text-(--vocab-pos-accent) hover:text-(--vocab-pos-accent)",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vocab-pos-accent)/40",
                  )}
                >
                  {word.word}
                </Link>
              </h3>
            </div>
            <Link
              href={href}
              className={mx(
                featureStyles,
                "vocab-module-cta vocab-module-cta-desktop shrink-0",
              )}
            >
              {tCommon("open")}
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </Link>
          </div>

          <VocabularyMeaningPreview
            word={word}
            variant="list"
            className="mt-2.5 max-w-2xl"
          />
          {word.tags.length > 0 ? (
            <div className="mt-2 min-w-0">
              <VocabularyWordTags tags={word.tags} limit={4} matchCardAccent />
            </div>
          ) : null}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="min-w-0 text-[11px] leading-4 text-muted-foreground">
              {t("updatedAgo", { time: updated })}
            </p>
            <VocabularyRowActions
              wordId={word.id}
              word={word.word}
              workspaceId={workspaceId}
              onEdit={() => onEditWord(word)}
            />
          </div>
        </div>

        <Link
          href={href}
          className={mx(
            featureStyles,
            "vocab-module-cta vocab-module-cta-mobile col-span-full",
          )}
        >
          {tCommon("open")}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </Link>
      </article>
    </li>
  );
}
