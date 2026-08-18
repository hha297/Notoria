import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { WritingView } from "@/components/writing/writing-view";
import { getFolder, getFolders } from "@/lib/actions/folders";
import { getWritingDocuments } from "@/lib/actions/writing";
import { getActiveWorkspace } from "@/lib/workspace";

export async function WritingLibrary({ folderId }: { folderId?: string }) {
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

  if (folderId) {
    const folder = await getFolder(folderId, "writing");
    if (!folder) notFound();
  }

  const [documents, folders] = await Promise.all([
    getWritingDocuments(),
    getFolders("writing"),
  ]);

  return (
    <WritingView
      currentFolderId={folderId ?? null}
      folders={folders}
      documents={documents.map((document) => ({
        id: document.id,
        title: document.title,
        description: document.description,
        content: document.content,
        folderId: document.folderId ?? null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      }))}
    />
  );
}
