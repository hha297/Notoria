import { PenLine, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderWorkspace } from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { LinkButton } from "@/components/ui/link-button";
import {
  WritingTable,
  type WritingListItem,
} from "@/components/writing/writing-table";
import { sectionCreateHref } from "@/lib/folders/paths";
import type { FolderListItem } from "@/lib/folders/types";

type WritingViewProps = {
  documents: WritingListItem[];
  folders: FolderListItem[];
  currentFolderId: string | null;
};

export function WritingView({
  documents,
  folders,
  currentFolderId,
}: WritingViewProps) {
  const t = useTranslations("writing");
  const createHref = sectionCreateHref("writing", currentFolderId);

  if (!currentFolderId && documents.length === 0 && folders.length === 0) {
    return (
      <PageShell>
        <FolderWorkspace
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
    />
  );
}
