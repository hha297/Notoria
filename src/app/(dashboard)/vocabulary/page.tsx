import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
import {
  getVocabularyWords,
  listVocabularySynonymOptions,
} from "@/lib/actions/vocabulary";
import { getActiveWorkspaceCustomTags } from "@/lib/actions/workspaces";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const t = await getTranslations("vocabulary");
  const [workspace, words, existingCustomTags, synonymOptions] =
    await Promise.all([
      getActiveWorkspace(),
      getVocabularyWords(),
      getActiveWorkspaceCustomTags(),
      listVocabularySynonymOptions(),
    ]);

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("bank")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  const serializedWords = words.map((word) => ({
    id: word.id,
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    notes: word.notes,
    updatedAt: word.updatedAt.toISOString(),
    createdAt: word.createdAt.toISOString(),
    meanings: word.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      isPrimary: meaning.isPrimary,
      sortOrder: meaning.sortOrder,
    })),
    examples: word.examples.map((example) => ({
      id: example.id,
      sentence: example.sentence,
      meaning: example.meaning,
      notes: example.notes,
      sortOrder: example.sortOrder,
    })),
    synonymRefs: word.synonymRefs,
    tags: word.tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
  }));

  return (
    <VocabularyView
      words={serializedWords}
      workspaceName={workspace.name}
      language={workspace.language}
      existingCustomTags={existingCustomTags}
      synonymOptions={synonymOptions}
    />
  );
}
