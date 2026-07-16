"use client";

import { BookOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";

type VocabularyEmptyProps = {
  variant: "no-words" | "no-meanings" | "no-examples" | "no-filtered" | "need-more-words";
  minWords?: number;
};

export function VocabularyEmpty({ variant, minWords = 2 }: VocabularyEmptyProps) {
  const t = useTranslations("exercises.empty");

  if (variant === "no-filtered") {
    return (
      <div className="empty-state">
        <p className="max-w-md text-muted-foreground">{t("noFiltered")}</p>
      </div>
    );
  }

  const content = {
    "no-words": {
      title: t("noWordsTitle"),
      description: t("noWordsDescription"),
      href: "/vocabulary/new",
      label: t("addWords"),
      showPlus: true,
    },
    "no-meanings": {
      title: t("noMeaningsTitle"),
      description: t("noMeaningsDescription"),
      href: "/vocabulary",
      label: t("editVocabulary"),
      showPlus: false,
    },
    "no-examples": {
      title: t("noExamplesTitle"),
      description: t("noExamplesDescription"),
      href: "/vocabulary",
      label: t("editVocabulary"),
      showPlus: false,
    },
    "need-more-words": {
      title: t("needMoreWordsTitle"),
      description: t("needMoreWordsDescription", { count: minWords }),
      href: "/vocabulary/new",
      label: t("addWords"),
      showPlus: true,
    },
  }[variant];

  return (
    <div className="empty-state">
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-accent-lime/20 text-ink">
        <BookOpen className="size-5" strokeWidth={2} />
      </div>
      <p className="text-lg font-medium text-ink">{content.title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {content.description}
      </p>
      <LinkButton href={content.href} className="mt-6">
        {content.showPlus ? <Plus className="size-4" /> : null}
        {content.label}
      </LinkButton>
    </div>
  );
}
