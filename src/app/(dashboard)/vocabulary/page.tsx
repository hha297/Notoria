import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { VocabularyTable } from "@/components/vocabulary/vocabulary-table";
import { getVocabularyWords } from "@/lib/actions/vocabulary";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("bank")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </div>
    );
  }

  const words = await getVocabularyWords();

  const serializedWords = words.map((word) => ({
    id: word.id,
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    updatedAt: word.updatedAt.toISOString(),
    meanings: word.meanings.map((meaning) => ({ meaning: meaning.meaning })),
    tags: word.tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
  }));

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

      {words.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted-foreground">{t("emptyTitle")}</p>
          <LinkButton href="/vocabulary/new" className="mt-4">
            {t("addFirst")}
          </LinkButton>
        </div>
      ) : (
        <VocabularyTable words={serializedWords} />
      )}
    </div>
  );
}
