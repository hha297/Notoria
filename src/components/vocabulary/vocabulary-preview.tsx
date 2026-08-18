"use client";

import { Pencil, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { SynonymLinks } from "@/components/vocabulary/synonym-links";
import { VocabularyNotesContent } from "@/components/vocabulary/vocabulary-notes-content";
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
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const tTags = useTranslations("tags");

  const sortedMeanings = [...meanings].sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryMeanings = sortedMeanings.filter(
    (meaning) => meaning.isPrimary !== false,
  );
  const otherMeanings = sortedMeanings.filter(
    (meaning) => meaning.isPrimary === false,
  );
  const sortedExamples = [...examples].sort((a, b) => a.sortOrder - b.sortOrder);

  const partOfSpeechLabel =
    partOfSpeech &&
    PARTS_OF_SPEECH.includes(partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
      ? tPos(partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
      : partOfSpeech;

  function renderMeaningList(
    items: typeof sortedMeanings,
    opts?: { muted?: boolean; showStar?: boolean },
  ) {
    return (
      <ol className="space-y-2">
        {items.map((meaning, index) => (
          <li
            key={meaning.id}
            className={cn(
              "flex items-start gap-2 text-sm sm:text-base",
              opts?.muted ? "text-muted-foreground" : "text-ink",
            )}
          >
            <span className="mt-0.5 w-5 shrink-0 text-muted-foreground">
              {index + 1}.
            </span>
            {opts?.showStar ? (
              <Star className="mt-0.5 size-3.5 shrink-0 fill-current text-accent-lime" />
            ) : null}
            <span>{meaning.meaning}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex justify-stretch sm:justify-end">
        <LinkButton
          href={`/vocabulary/${id}/edit`}
          size="lg"
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          <Pencil className="size-4" />
          {t("edit")}
        </LinkButton>
      </div>

      <article className="card-surface space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-8">
        <header className="space-y-3 border-b border-hairline-cloud pb-5">
          <div className="flex flex-wrap items-center gap-2">
            {partOfSpeechLabel ? (
              <Badge variant="secondary">{partOfSpeechLabel}</Badge>
            ) : null}
            {tags.map((item) => (
              <Badge key={item.tag} variant="outline">
                {getTagLabel(item.tag, (key) => tTags(key))}
              </Badge>
            ))}
          </div>
          <h2 className="heading-md text-ink">{word}</h2>
          <SynonymLinks
            synonyms={synonyms}
            unmatched={unmatchedSynonyms}
          />
        </header>

        {primaryMeanings.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
              {t("primaryMeanings")}
            </h3>
            {renderMeaningList(primaryMeanings, { showStar: true })}
          </section>
        ) : null}

        {otherMeanings.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
              {t("otherMeanings")}
            </h3>
            {renderMeaningList(otherMeanings, { muted: true })}
          </section>
        ) : null}

        {sortedExamples.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
              {t("examples")}
            </h3>
            <ol className="space-y-4">
              {sortedExamples.map((example, index) => (
                <li key={example.id} className="space-y-1.5">
                  <p className="text-sm font-medium text-ink sm:text-base">
                    <span className="mr-2 text-muted-foreground">
                      {index + 1}.
                    </span>
                    {example.sentence}
                  </p>
                  {example.meaning?.trim() ? (
                    <p className="pl-5 text-sm text-muted-foreground sm:pl-6">
                      <span className="font-medium text-ink/70">
                        {t("exampleMeaning")}:{" "}
                      </span>
                      {example.meaning.trim()}
                    </p>
                  ) : null}
                  {example.notes?.trim() ? (
                    <p className="pl-5 text-sm text-muted-foreground sm:pl-6">
                      <span className="font-medium text-ink/70">
                        {t("exampleNotes")}:{" "}
                      </span>
                      {example.notes.trim()}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {notes && !isNotesDocEmpty(parseVocabularyNotes(notes)) ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
              {t("notes")}
            </h3>
            <VocabularyNotesContent notes={notes} />
          </section>
        ) : null}
      </article>
    </div>
  );
}
