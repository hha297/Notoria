"use client";

import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderWorkspace } from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { LinkButton } from "@/components/ui/link-button";
import { WritingTable } from "@/components/writing/writing-table";
import { WritingListLoading } from "@/components/writing/writing-loading";
import { sectionCreateHref } from "@/lib/folders/paths";
import {
  folderListQueryOptions,
  writingListQueryOptions,
} from "@/lib/query/options";

type WritingViewProps = {
  currentFolderId: string | null;
  workspaceId: string;
};

export function WritingView({
  currentFolderId,
  workspaceId,
}: WritingViewProps) {
  const t = useTranslations("writing");
  const createHref = sectionCreateHref("writing", currentFolderId);
  const documentsQuery = useQuery(writingListQueryOptions(workspaceId));
  const foldersQuery = useQuery(folderListQueryOptions(workspaceId, "writing"));
  const documents = documentsQuery.data ?? [];
  const folders = foldersQuery.data ?? [];

  if (documentsQuery.isPending || foldersQuery.isPending) {
    return <WritingListLoading />;
  }

  if (!currentFolderId && documents.length === 0 && folders.length === 0) {
    return (
      <PageShell className="writing-atelier-shell">
        <FolderWorkspace
          workspaceId={workspaceId}
          section="writing"
          folders={folders}
          currentFolderId={currentFolderId}
          items={documents}
          showBreadcrumbs={false}
        >
          <div className="writing-atelier writing-atelier-empty flex flex-col gap-10">
            <header className="writing-hero">
              <div className="writing-hero-copy">
                <p className="writing-kicker">{t("title")}</p>
                <h1 className="writing-brand-title">{t("title")}</h1>
                <p className="writing-brand-lede">{t("description")}</p>
              </div>
              <div className="writing-hero-actions">
                <ShowTutorialButton section="writing" />
                <NewFolderButton variant="outline" size="sm" />
                <LinkButton href={createHref}>
                  <Plus className="size-4" />
                  {t("createFirst")}
                </LinkButton>
              </div>
            </header>
            <div className="writing-empty-desk">
              <p className="writing-empty-title">{t("emptyTitle")}</p>
              <p className="writing-brand-lede">{t("emptyDescription")}</p>
            </div>
          </div>
        </FolderWorkspace>
      </PageShell>
    );
  }

  return (
    <WritingTable
      documents={documents}
      folders={folders}
      currentFolderId={currentFolderId}
      workspaceId={workspaceId}
    />
  );
}
