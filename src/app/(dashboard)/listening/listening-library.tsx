import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ListeningView } from "@/components/listening/listening-view";
import { ListeningLockedPage } from "@/components/listening/listening-locked";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFolder, getFolders } from "@/lib/actions/folders";
import { getListeningLessons } from "@/lib/actions/listening";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getActiveWorkspace } from "@/lib/workspace";

export async function ListeningLibrary({ folderId }: { folderId?: string }) {
  const [t, workspace, proAccess] = await Promise.all([
    getTranslations("listening"),
    getActiveWorkspace(),
    getCurrentProAccess(),
  ]);

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          highlight={t("highlight")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  if (!proAccess.hasProAccess) {
    return <ListeningLockedPage />;
  }

  const folderPromise = folderId
    ? getFolder(folderId, "listening")
    : Promise.resolve(null);
  const [folder, lessons, folders] = await Promise.all([
    folderPromise,
    getListeningLessons(),
    getFolders("listening"),
  ]);

  if (folderId && !folder) {
    notFound();
  }

  return (
    <ListeningView
      lessons={lessons}
      folders={folders}
      currentFolderId={folderId ?? null}
    />
  );
}
