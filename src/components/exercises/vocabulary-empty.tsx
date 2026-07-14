"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";

type VocabularyEmptyProps = {
  variant: "no-words" | "no-meanings" | "no-examples" | "no-filtered" | "need-more-words";
  minWords?: number;
};

export function VocabularyEmpty({ variant, minWords = 2 }: VocabularyEmptyProps) {
  const t = useTranslations("exercises.empty");

  if (variant === "no-words") {
    return (
      <div className="empty-state">
        <p className="text-lg font-medium text-ink">{t("noWordsTitle")}</p>
        <p className="mt-2 max-w-md text-muted-foreground">{t("noWordsDescription")}</p>
        <LinkButton href="/vocabulary/new" className="mt-6">
          <Plus className="size-4" />
          {t("addWords")}
        </LinkButton>
      </div>
    );
  }

  if (variant === "no-meanings") {
    return (
      <div className="empty-state">
        <p className="text-lg font-medium text-ink">{t("noMeaningsTitle")}</p>
        <p className="mt-2 max-w-md text-muted-foreground">{t("noMeaningsDescription")}</p>
        <LinkButton href="/vocabulary" className="mt-6">
          {t("editVocabulary")}
        </LinkButton>
      </div>
    );
  }

  if (variant === "no-examples") {
    return (
      <div className="empty-state">
        <p className="text-lg font-medium text-ink">{t("noExamplesTitle")}</p>
        <p className="mt-2 max-w-md text-muted-foreground">{t("noExamplesDescription")}</p>
        <LinkButton href="/vocabulary" className="mt-6">
          {t("editVocabulary")}
        </LinkButton>
      </div>
    );
  }

  if (variant === "need-more-words") {
    return (
      <div className="empty-state">
        <p className="text-lg font-medium text-ink">{t("needMoreWordsTitle")}</p>
        <p className="mt-2 max-w-md text-muted-foreground">
          {t("needMoreWordsDescription", { count: minWords })}
        </p>
        <LinkButton href="/vocabulary/new" className="mt-6">
          <Plus className="size-4" />
          {t("addWords")}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <p className="text-muted-foreground">{t("noFiltered")}</p>
    </div>
  );
}
