"use client";

import { PenLine, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ListPageLoading } from "@/components/layout/page-loading";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderWorkspace } from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { LinkButton } from "@/components/ui/link-button";
import { WritingTable } from "@/components/writing/writing-table";
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
    return <ListPageLoading />;
  }

  if (!currentFolderId && documents.length === 0 && folders.length === 0) {
    return (
      <PageShell>
        <FolderWorkspace
          workspaceId={workspaceId}
          section="writing"
          folders={folders}
          currentFolderId={currentFolderId}
          items={documents}
          header={
            <PageHeader
              eyebrow={t("title")}
              title={t("title")}
              highlight={t("studio")}
              description={t("description")}
            >
              <ShowTutorialButton section="writing" />
              <NewFolderButton />
              <LinkButton href={createHref}>
                <Plus className="size-4" />
                {t("create")}
              </LinkButton>
            </PageHeader>
          }
        >
          <div className="empty-state">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
              <PenLine className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-ink">{t("emptyTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
            <LinkButton href={createHref} className="mt-5">
              <Plus className="size-4" />
              {t("createFirst")}
            </LinkButton>
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
