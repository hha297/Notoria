"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import {
  VocabularyTable,
  type VocabularyWordRow,
} from "@/components/vocabulary/vocabulary-table";

type VocabularyViewProps = {
  words: VocabularyWordRow[];
  workspaceName: string;
};

export function VocabularyView({ words, workspaceName }: VocabularyViewProps) {
  const t = useTranslations("vocabulary");

  if (words.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("bank")}
          description={t("formDescription")}
        >
          <LinkButton href="/vocabulary/new">
            <Plus className="size-4" />
            {t("addWord")}
          </LinkButton>
        </PageHeader>

        <div className="empty-state">
          <p className="text-muted-foreground">{t("emptyTitle")}</p>
          <LinkButton href="/vocabulary/new" className="mt-4">
            {t("addFirst")}
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <VocabularyTable words={words} workspaceName={workspaceName} />
  );
}
