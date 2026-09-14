"use client";

import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ListPageLoading } from "@/components/layout/page-loading";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { LinkButton } from "@/components/ui/link-button";
import { VocabularyTable } from "@/components/vocabulary/vocabulary-table";
import { vocabularyListQueryOptions } from "@/lib/query/options";

type VocabularyViewProps = {
  workspaceId: string;
  workspaceName: string;
  language: string;
};

export function VocabularyView({
  workspaceId,
  workspaceName,
  language,
}: VocabularyViewProps) {
  const t = useTranslations("vocabulary");
  const { data: words, isPending } = useQuery(
    vocabularyListQueryOptions(workspaceId),
  );

  if (isPending || !words) {
    return <ListPageLoading />;
  }

  if (words.length === 0) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={workspaceName}
          title={t("title")}
          highlight={t("bank")}
          description={t("formDescription")}
        >
          <ShowTutorialButton section="vocabulary" />
          <LinkButton href="/vocabulary/new" data-tutorial="vocab-add-word">
            <Plus className="size-4" />
            {t("addWord")}
          </LinkButton>
        </PageHeader>

        <div className="empty-state">
          <p className="text-muted-foreground">{t("emptyTitle")}</p>
          <LinkButton href="/vocabulary/new" className="mt-4" data-tutorial="vocab-add-word">
            {t("addFirst")}
          </LinkButton>
        </div>
      </PageShell>
    );
  }

  return (
    <VocabularyTable
      words={words}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      language={language}
    />
  );
}
