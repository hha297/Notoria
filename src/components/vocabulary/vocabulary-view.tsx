"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { LinkButton } from "@/components/ui/link-button";
import {
  VocabularyTable,
  type VocabularyWordRow,
} from "@/components/vocabulary/vocabulary-table";
import { useHydratedQuery } from "@/hooks/use-workspace-list-query";
import { getVocabularyWords } from "@/lib/actions/vocabulary";
import { queryKeys } from "@/lib/query/keys";
import { serializeVocabularyListWords } from "@/lib/vocabulary/serialize-list";
import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";

type VocabularyViewProps = {
  words: VocabularyWordRow[];
  workspaceId: string;
  workspaceName: string;
  language: string;
  existingCustomTags: string[];
  synonymOptions: VocabularySynonymRef[];
};

export function VocabularyView({
  words: initialWords,
  workspaceId,
  workspaceName,
  language,
  existingCustomTags,
  synonymOptions,
}: VocabularyViewProps) {
  const t = useTranslations("vocabulary");
  const { data: words = initialWords } = useHydratedQuery({
    queryKey: queryKeys.vocabulary.list(workspaceId),
    initialData: initialWords,
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const result = await getVocabularyWords();
      return serializeVocabularyListWords(result.words);
    },
  });

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
      existingCustomTags={existingCustomTags}
      synonymOptions={synonymOptions}
    />
  );
}
