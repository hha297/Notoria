"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReviewLaterButton } from "@/components/review-later/review-later-button";
import { Button } from "@/components/ui/button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { MeaningUsageBadges } from "@/components/vocabulary/meaning-usage-badges";
import { SynonymLinks } from "@/components/vocabulary/synonym-links";
import { VocabularyNotesContent } from "@/components/vocabulary/vocabulary-notes-content";
import detailStyles from "@/components/style/workspace/detail.module.css";
import lexiconStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import {
  isNotesDocEmpty,
  parseVocabularyNotes,
} from "@/lib/vocabulary/notes-content";
import { getTagLabel, PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";
import { cn } from "@/lib/utils";

const OTHER_MEANINGS_PAGE_SIZE = 5;

type VocabularyPreviewProps = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
  synonyms?: VocabularySynonymRef[];
  unmatchedSynonyms?: string[];
  notes?: string | null;
  meanings: Array<{
    id: string;
    meaning: string;
    isPrimary?: boolean;
    sortOrder: number;
    usageLabels?: string[];
  }>;
  examples: Array<{
    id: string;
    sentence: string;
    meaning?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>;
  tags: Array<{ tag: string }>;
  reviewLaterMarked?: boolean;
};

export function VocabularyPreview({
  id,
  word,
  partOfSpeech,
  synonyms = [],
  unmatchedSynonyms = [],
  notes,
  meanings,
  examples,
  tags,
  reviewLaterMarked = false,
}: VocabularyPreviewProps) {
  const router = useRouter();
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const tTags = useTranslations("tags");

  useRegisterShortcutAction("quickEdit", () => {
    router.push(`/vocabulary/${id}/edit`);
  });

  const [otherPage, setOtherPage] = useState(1);

  const sortedMeanings = [...meanings].sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryMeanings = sortedMeanings.filter(
    (meaning) => meaning.isPrimary !== false,
  );
  const otherMeanings = sortedMeanings.filter(
    (meaning) => meaning.isPrimary === false,
  );
  const otherTotalPages = Math.max(
    1,
    Math.ceil(otherMeanings.length / OTHER_MEANINGS_PAGE_SIZE),
  );
  const safeOtherPage = Math.min(otherPage, otherTotalPages);
  const otherPageStart = (safeOtherPage - 1) * OTHER_MEANINGS_PAGE_SIZE;
  const pagedOtherMeanings = otherMeanings.slice(
    otherPageStart,
    otherPageStart + OTHER_MEANINGS_PAGE_SIZE,
  );
  const sortedExamples = [...examples].sort((a, b) => a.sortOrder - b.sortOrder);

  const knownPos =
    partOfSpeech &&
    PARTS_OF_SPEECH.includes(partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
      ? (partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
      : null;
  const partOfSpeechLabel = knownPos
    ? tPos(knownPos)
    : partOfSpeech?.trim() || null;
  const posKey = knownPos ?? "other";

  function renderMeaningList(
    items: typeof sortedMeanings,
    opts?: { muted?: boolean; showStar?: boolean; indexOffset?: number },
  ) {
    const indexOffset = opts?.indexOffset ?? 0;
    return (
      <ol className={mx(lexiconStyles, "vocab-preview-list")}>
        {items.map((meaning, index) => (
          <li
            key={meaning.id}
            className={cn(
              mx(lexiconStyles, "vocab-preview-item"),
              opts?.muted && mx(lexiconStyles, "vocab-preview-item-muted"),
            )}
          >
            <span className={mx(lexiconStyles, "vocab-preview-index")} aria-hidden>
              {String(indexOffset + index + 1).padStart(2, "0")}
            </span>
            {opts?.showStar ? (
              <Star
                className={mx(lexiconStyles, "vocab-preview-star")}
                aria-hidden
              />
            ) : null}
            <span className={mx(lexiconStyles, "vocab-preview-copy")}>
              <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <span>{meaning.meaning}</span>
                <MeaningUsageBadges labels={meaning.usageLabels} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div
      className={mx(detailStyles, "shell")}
      data-detail="vocab"
      data-vocab-pos={posKey}
    >
      <header className={mx(detailStyles, "header")}>
        <Link href="/vocabulary" className={mx(detailStyles, "back writing-back")}>
          <ArrowLeft className="size-4 shrink-0" />
          {t("backToList")}
        </Link>
        <div className={mx(detailStyles, "actions")}>
          <ReviewLaterButton
            entityType="vocabulary"
            entityId={id}
            titleSnapshot={word}
            marked={reviewLaterMarked}
          />
          <Button
            type="button"
            onClick={() => router.push(`/vocabulary/${id}/edit`)}
          >
            <Pencil className="size-4" />
            {t("edit")}
          </Button>
        </div>
      </header>

      <section className={mx(detailStyles, "hero")}>
        <p className={mx(detailStyles, "kicker")}>{t("title")}</p>
        <div className={mx(detailStyles, "titleRow")}>
          <h1 className={mx(detailStyles, "title wrap-break-word")}>{word}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={mx(detailStyles, "titleEdit")}
            onClick={() => router.push(`/vocabulary/${id}/edit`)}
            aria-label={t("edit")}
            title={t("edit")}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
        {partOfSpeechLabel || tags.length > 0 ? (
          <div className={mx(detailStyles, "meta")}>
            {partOfSpeechLabel ? (
              <span className={mx(detailStyles, "tag")}>{partOfSpeechLabel}</span>
            ) : null}
            {tags.map((item) => (
              <span
                key={item.tag}
                data-tag-tone="card"
                className={mx(detailStyles, "tag")}
              >
                {getTagLabel(item.tag, (key) => tTags(key))}
              </span>
            ))}
          </div>
        ) : null}
        {synonyms.length > 0 || unmatchedSynonyms.length > 0 ? (
          <div className={mx(lexiconStyles, "vocab-preview-synonyms")}>
            <SynonymLinks synonyms={synonyms} unmatched={unmatchedSynonyms} />
          </div>
        ) : null}
      </section>

      <div className={mx(detailStyles, "body")}>
        <div className={mx(lexiconStyles, "vocab-preview-stages")}>
          {primaryMeanings.length > 0 ? (
            <section className={mx(lexiconStyles, "vocab-preview-stage")}>
              <p className="writing-kicker writing-stage-kicker">
                {t("primaryMeanings")}
              </p>
              {renderMeaningList(primaryMeanings, { showStar: true })}
            </section>
          ) : null}

          {otherMeanings.length > 0 ? (
            <section className={mx(lexiconStyles, "vocab-preview-stage")}>
              <p className="writing-kicker writing-stage-kicker">
                {t("otherMeanings")}
              </p>
              {renderMeaningList(pagedOtherMeanings, {
                muted: true,
                indexOffset: (safeOtherPage - 1) * OTHER_MEANINGS_PAGE_SIZE,
              })}
              {otherMeanings.length > OTHER_MEANINGS_PAGE_SIZE ? (
                <div className={mx(lexiconStyles, "vocab-preview-pager")}>
                  <p className={mx(lexiconStyles, "vocab-preview-pager-meta")}>
                    {t("otherMeaningsPage", {
                      page: safeOtherPage,
                      totalPages: otherTotalPages,
                      total: otherMeanings.length,
                    })}
                  </p>
                  <div className={mx(lexiconStyles, "vocab-preview-pager-controls")}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeOtherPage <= 1}
                      onClick={() =>
                        setOtherPage((page) => Math.max(1, page - 1))
                      }
                    >
                      {t("otherMeaningsPrev")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeOtherPage >= otherTotalPages}
                      onClick={() =>
                        setOtherPage((page) =>
                          Math.min(otherTotalPages, page + 1),
                        )
                      }
                    >
                      {t("otherMeaningsNext")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {sortedExamples.length > 0 ? (
            <section className={mx(lexiconStyles, "vocab-preview-stage")}>
              <p className="writing-kicker writing-stage-kicker">{t("examples")}</p>
              <ol className={mx(lexiconStyles, "vocab-preview-list")}>
                {sortedExamples.map((example, index) => (
                  <li
                    key={example.id}
                    className={mx(lexiconStyles, "vocab-preview-example")}
                  >
                    <span
                      className={mx(lexiconStyles, "vocab-preview-index")}
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className={mx(lexiconStyles, "vocab-preview-example-body")}>
                      <p className={mx(lexiconStyles, "vocab-preview-copy")}>
                        {example.sentence}
                      </p>
                      {example.meaning?.trim() ? (
                        <p className={mx(lexiconStyles, "vocab-preview-aside")}>
                          <span className={mx(lexiconStyles, "vocab-preview-aside-label")}>
                            {t("exampleMeaning")}
                          </span>
                          {example.meaning.trim()}
                        </p>
                      ) : null}
                      {example.notes?.trim() ? (
                        <p className={mx(lexiconStyles, "vocab-preview-aside")}>
                          <span className={mx(lexiconStyles, "vocab-preview-aside-label")}>
                            {t("exampleNotes")}
                          </span>
                          {example.notes.trim()}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {notes && !isNotesDocEmpty(parseVocabularyNotes(notes)) ? (
            <section className={mx(lexiconStyles, "vocab-preview-stage")}>
              <p className="writing-kicker writing-stage-kicker">{t("notes")}</p>
              <div className={mx(lexiconStyles, "vocab-preview-notes")}>
                <VocabularyNotesContent notes={notes} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
