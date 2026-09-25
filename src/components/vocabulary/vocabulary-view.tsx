"use client";

import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { Plus, Upload } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { ContentImportDialog } from "@/components/content-import/content-import-dialog";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { VocabularyBank } from "@/components/vocabulary/vocabulary-bank";
import { VocabularyPageLoading } from "@/components/vocabulary/vocabulary-page-loading";
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
  const tImport = useTranslations("contentImport");
  const [importOpen, setImportOpen] = useState(false);
  const { data: words, isPending, isError, refetch, isFetching } = useQuery(
    vocabularyListQueryOptions(workspaceId),
  );

  if (isPending || (!words && isFetching)) {
    return (
      <PageShell className="vocab-lexicon-shell">
        <VocabularyPageLoading />
      </PageShell>
    );
  }

  if (isError && !words) {
    return (
      <PageShell className="vocab-lexicon-shell">
        <div className={mx(featureStyles, "vocab-lexicon writing-atelier flex flex-col gap-10")}>
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{workspaceName}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
            </div>
            <div className="writing-hero-actions">
              <ShowTutorialButton section="vocabulary" />
            </div>
          </header>
          <div className="writing-empty-desk">
            <p className="writing-empty-title">{t("loadError")}</p>
            <p className="writing-brand-lede">{t("loadErrorDescription")}</p>
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
        </div>
      </PageShell>
    );
  }

  if (!words || words.length === 0) {
    return (
      <PageShell className="vocab-lexicon-shell">
        <div className={mx(featureStyles, "vocab-lexicon writing-atelier writing-atelier-empty flex flex-col gap-10")}>
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{workspaceName}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
            <div className="writing-hero-actions">
              <ShowTutorialButton section="vocabulary" />
              <LockedFeatureButton
                type="button"
                variant="outline"
                className="route-quiet-action"
                data-route-action="vocab"
                feature="content_import"
                icon={<Upload className="size-4" />}
                onClick={() => setImportOpen(true)}
              >
                {tImport("button")}
              </LockedFeatureButton>
              <LinkButton href="/vocabulary/new" data-tutorial="vocab-add-word">
                <Plus className="size-4" />
                {t("addWord")}
              </LinkButton>
            </div>
          </header>

          <div className="writing-empty-desk">
            <p className="writing-empty-title">{t("emptyTitle")}</p>
            <p className="writing-brand-lede">{t("emptyDescription")}</p>
            <LinkButton
              href="/vocabulary/new"
              className="mt-4"
              data-tutorial="vocab-add-word"
            >
              {t("addFirst")}
            </LinkButton>
          </div>
        </div>
        <ContentImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          target="vocabulary"
          workspaceId={workspaceId}
        />
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
