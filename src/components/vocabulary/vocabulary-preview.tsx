"use client";

import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReviewLaterButton } from "@/components/review-later/review-later-button";
import { Button } from "@/components/ui/button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { VocabularyMeaningPreview } from "@/components/vocabulary/vocabulary-meaning-preview";
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

  const sortedMeanings = [...meanings].sort((a, b) => a.sortOrder - b.sortOrder);
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
              <span
                data-tag-tone="card"
                className={mx(detailStyles, "tag")}
              >
                {partOfSpeechLabel}
              </span>
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
          {sortedMeanings.length > 0 ? (
            <section
              className={mx(lexiconStyles, "vocab-preview-stage")}
              data-vocab-section="meanings"
            >
              <p className="writing-kicker writing-stage-kicker">
                {t("meanings")}
              </p>
              <VocabularyMeaningPreview
                word={{ meanings: sortedMeanings }}
                variant="list"
                limit={sortedMeanings.length}
                clamp={false}
              />
            </section>
          ) : null}

          {sortedExamples.length > 0 ? (
            <section
              className={mx(lexiconStyles, "vocab-preview-stage")}
              data-vocab-section="examples"
            >
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
                          <span className={mx(lexiconStyles, "vocab-preview-aside-copy")}>
                            {example.meaning.trim()}
                          </span>
                        </p>
                      ) : null}
                      {example.notes?.trim() ? (
                        <p className={mx(lexiconStyles, "vocab-preview-aside")}>
                          <span className={mx(lexiconStyles, "vocab-preview-aside-label")}>
                            {t("exampleNotes")}
                          </span>
                          <span className={mx(lexiconStyles, "vocab-preview-aside-copy")}>
                            {example.notes.trim()}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {notes && !isNotesDocEmpty(parseVocabularyNotes(notes)) ? (
            <section
              className={mx(lexiconStyles, "vocab-preview-stage")}
              data-vocab-section="notes"
            >
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
