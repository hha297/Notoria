"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";
import { cn } from "@/lib/utils";

type SynonymLinksProps = {
  synonyms: VocabularySynonymRef[];
  unmatched?: string[];
  className?: string;
};

export function SynonymLinks({
  synonyms,
  unmatched = [],
  className,
}: SynonymLinksProps) {
  const t = useTranslations("vocabulary");

  if (synonyms.length === 0 && unmatched.length === 0) {
    return null;
  }

  return (
    <p className={cn("text-sm text-muted-foreground sm:text-base", className)}>
      <span className="font-medium text-ink/70">{t("synonyms")}: </span>
      {synonyms.map((synonym, index) => (
        <span key={synonym.id}>
          {index > 0 ? ", " : null}
          <Link
            href={`/vocabulary/${synonym.id}`}
            className="font-medium text-ink underline-offset-4 hover:text-ink hover:underline"
          >
            {synonym.word}
          </Link>
        </span>
      ))}
      {unmatched.map((name, index) => (
        <span key={`unmatched-${name}-${index}`}>
          {synonyms.length > 0 || index > 0 ? ", " : null}
          {name}
        </span>
      ))}
    </p>
  );
}
