import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function VocabularyPage() {
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();

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

  return (
    <VocabularyView
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      language={workspace.language}
    />
  );
}
