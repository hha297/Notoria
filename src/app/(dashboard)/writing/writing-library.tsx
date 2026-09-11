import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { WritingView } from "@/components/writing/writing-view";
import { getFolder, getFolders } from "@/lib/actions/folders";
import { getWritingDocuments } from "@/lib/actions/writing";
import { serializeWritingListDocuments } from "@/lib/writing/serialize-list";
import { getActiveWorkspace } from "@/lib/workspace";

export async function WritingLibrary({ folderId }: { folderId?: string }) {
  const [t, workspace] = await Promise.all([
    getTranslations("writing"),
    getActiveWorkspace(),
  ]);

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

  const folderPromise = folderId
    ? getFolder(folderId, "writing")
    : Promise.resolve(null);
  const [folder, documents, folders] = await Promise.all([
    folderPromise,
    getWritingDocuments(),
    getFolders("writing"),
  ]);

  if (folderId && !folder) {
    notFound();
  }

  return (
    <WritingView
      currentFolderId={folderId ?? null}
      folders={folders}
      workspaceId={workspace.id}
      documents={serializeWritingListDocuments(documents)}
    />
  );
}
