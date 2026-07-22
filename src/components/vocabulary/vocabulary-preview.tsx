"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { getTagLabel, PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";

type VocabularyPreviewProps = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
  notes?: string | null;
  meanings: Array<{
    id: string;
    meaning: string;
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
  notes,
  meanings,
  examples,
  tags,
}: VocabularyPreviewProps) {
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const tTags = useTranslations("tags");

  const sortedMeanings = [...meanings].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedExamples = [...examples].sort((a, b) => a.sortOrder - b.sortOrder);

  const partOfSpeechLabel =
    partOfSpeech &&
    PARTS_OF_SPEECH.includes(partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
      ? tPos(partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
      : partOfSpeech;

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
        </header>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
            {t("meanings")}
          </h3>
          <ol className="space-y-2">
            {sortedMeanings.map((meaning, index) => (
              <li key={meaning.id} className="text-sm text-ink sm:text-base">
                <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                {meaning.meaning}
              </li>
            ))}
          </ol>
        </section>

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

        {notes?.trim() ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
              {t("notes")}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink sm:text-base">
              {notes.trim()}
            </p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
