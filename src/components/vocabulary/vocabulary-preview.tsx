"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
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
  }>;
  examples: Array<{
    id: string;
    sentence: string;
    meaning?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>;
  tags: Array<{ tag: string }>;
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
}: VocabularyPreviewProps) {
  const router = useRouter();
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const tTags = useTranslations("tags");

  useRegisterShortcutAction("quickEdit", () => {
    router.push(`/vocabulary/${id}/edit`);
  });

  const sortedMeanings = [...meanings].sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryMeanings = sortedMeanings.filter(
    (meaning) => meaning.isPrimary !== false,
  );
  const otherMeanings = sortedMeanings.filter(
    (meaning) => meaning.isPrimary === false,
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
    opts?: { muted?: boolean; showStar?: boolean },
  ) {
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
              {String(index + 1).padStart(2, "0")}
            </span>
            {opts?.showStar ? (
              <Star
                className={mx(lexiconStyles, "vocab-preview-star")}
                aria-hidden
              />
            ) : null}
            <span className={mx(lexiconStyles, "vocab-preview-copy")}>
              {meaning.meaning}
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
              <span key={item.tag} className={mx(detailStyles, "tag")}>
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
              {renderMeaningList(otherMeanings, { muted: true })}
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
