import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
import { getVocabularyWords } from "@/lib/actions/vocabulary";
import { getActiveWorkspaceCustomTags } from "@/lib/actions/workspaces";
import { serializeVocabularyListWords } from "@/lib/vocabulary/serialize-list";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const t = await getTranslations("vocabulary");
  const [workspace, vocabulary, existingCustomTags] = await Promise.all([
    getActiveWorkspace(),
    getVocabularyWords(),
    getActiveWorkspaceCustomTags(),
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

  const { words, synonymOptions } = vocabulary;

  return (
    <VocabularyView
      words={serializeVocabularyListWords(words)}
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      language={workspace.language}
      existingCustomTags={existingCustomTags}
      synonymOptions={synonymOptions}
    />
  );
}
