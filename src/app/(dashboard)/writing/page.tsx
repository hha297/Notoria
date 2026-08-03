import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { WritingView } from "@/components/writing/writing-view";
import { getWritingDocuments } from "@/lib/actions/writing";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function WritingPage() {
  const t = await getTranslations("writing");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("studio")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  const documents = await getWritingDocuments();

  return (
    <WritingView
      documents={documents.map((document) => ({
        id: document.id,
        title: document.title,
        description: document.description,
        content: document.content,
        updatedAt: document.updatedAt.toISOString(),
      }))}
    />
  );
}
