import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
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
    notes: word.notes,
    updatedAt: word.updatedAt.toISOString(),
    meanings: word.meanings.map((meaning) => ({ meaning: meaning.meaning })),
    tags: word.tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
  }));

  return (
    <VocabularyView words={serializedWords} workspaceName={workspace.name} />
  );
}
