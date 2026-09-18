"use client";

import { BookOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { VocabularyPageLoading } from "@/components/vocabulary/vocabulary-page-loading";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { VocabularyBank } from "@/components/vocabulary/vocabulary-bank";
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
  const { data: words, isPending, isError, refetch, isFetching } = useQuery(
    vocabularyListQueryOptions(workspaceId),
  );

  if (isPending || (!words && isFetching)) {
    return <VocabularyPageLoading />;
  }

  if (isError && !words) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={workspaceName}
          title={t("title")}
          highlight={t("bank")}
        >
          <ShowTutorialButton section="vocabulary" />
        </PageHeader>
        <div className="empty-state">
          <p className="font-medium text-ink">{t("loadError")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("loadErrorDescription")}
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => {
              void refetch();
            }}
          >
            {t("retry")}
          </Button>
        </div>
      </PageShell>
    );
  }

  if (!words || words.length === 0) {
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
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
            <BookOpen className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-ink">{t("emptyTitle")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <LinkButton href="/vocabulary/new" className="mt-4" data-tutorial="vocab-add-word">
            {t("addWord")}
          </LinkButton>
        </div>
      </PageShell>
    );
  }

  return (
    <VocabularyBank
      words={words}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      language={language}
    />
  );
}
