"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/page-shell";
import { ListPageLoading } from "@/components/layout/page-loading";
import {
  FolderEmptyState,
  FolderWorkspace,
} from "@/components/folders/folder-workspace";
import { FolderBreadcrumbs } from "@/components/folders/folder-breadcrumbs";
import { ImportReadingDialog } from "@/components/reading/import-reading-dialog";
import { ReadingPassageCard } from "@/components/reading/reading-passage-card";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { CollectionViewModeToggle } from "@/components/shared/collection-view-mode-toggle";
import { WritingCollections } from "@/components/writing/writing-collections";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollectionViewMode } from "@/hooks/use-collection-view-mode";
import {
  folderListQueryOptions,
  readingListQueryOptions,
} from "@/lib/query/options";
import { childrenOf } from "@/lib/folders/tree";
import { sameFolderId } from "@/lib/folders/types";
import { onTutorialPrepare } from "@/lib/onboarding/tutorial-prepare";
import type { ReadingPassageListItem } from "@/lib/reading/types";
import { cn } from "@/lib/utils";

const EMPTY: ReadingPassageListItem[] = [];

type ReadingViewProps = {
  workspaceId: string;
  workspaceLanguage: string;
  currentFolderId?: string | null;
};

export function ReadingView({
  workspaceId,
  workspaceLanguage,
  currentFolderId = null,
}: ReadingViewProps) {
  const t = useTranslations("reading");
  const tFolders = useTranslations("folders");
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useCollectionViewMode("reading");
  const passagesQuery = useQuery(readingListQueryOptions(workspaceId));
  const foldersQuery = useQuery(folderListQueryOptions(workspaceId, "reading"));
  const passages = passagesQuery.data ?? EMPTY;
  const folders = foldersQuery.data ?? [];

  useRegisterShortcutAction("createNew", () => {
    setImportOpen(true);
  });

  useEffect(() => {
    return onTutorialPrepare((action) => {
      if (action === "open-reading-import") {
        setImportOpen(true);
      }
      if (action === "close-reading-import") {
        setImportOpen(false);
      }
    });
  }, []);

  const folderItems = useMemo(
    () =>
      passages.map((passage) => ({
        id: passage.id,
        title: passage.title,
        folderId: passage.folderId,
      })),
    [passages],
  );

  const inFolder = useMemo(
    () =>
      passages.filter((passage) =>
        sameFolderId(passage.folderId, currentFolderId),
      ),
    [passages, currentFolderId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    if (!q) return inFolder;
    return inFolder.filter(
      (item) =>
        item.title.toLocaleLowerCase().includes(q) ||
        (item.sourceFilename ?? "").toLocaleLowerCase().includes(q),
    );
  }, [inFolder, search]);

  const childFolders = childrenOf(folders, currentFolderId);
  const isEmptyRoot =
    !currentFolderId && passages.length === 0 && folders.length === 0;
  const isEmptyFolder =
    !search.trim() &&
    childFolders.length === 0 &&
    inFolder.length === 0 &&
    Boolean(currentFolderId);

  if (passagesQuery.isPending || foldersQuery.isPending) {
    return (
      <PageShell className="writing-atelier-shell reading-atelier-shell">
        <ListPageLoading />
      </PageShell>
    );
  }

  const actions = (
    <>
      <ShowTutorialButton section="reading" />
      <Button
        type="button"
        className="route-primary-cta"
        onClick={() => setImportOpen(true)}
        data-tutorial="reading-import"
      >
        <Plus className="size-4" />
        {t("import")}
      </Button>
    </>
  );

  return (
    <PageShell className="writing-atelier-shell reading-atelier-shell">
      <FolderWorkspace
        workspaceId={workspaceId}
        section="reading"
        folders={folders}
        currentFolderId={currentFolderId}
        items={folderItems}
        search={search}
        showBreadcrumbs={false}
      >
        <div className="writing-atelier reading-atelier flex flex-col gap-10 lg:gap-12">
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("eyebrow")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
            <div className="writing-hero-actions">
              {isEmptyRoot ? (
                <>
                  <ShowTutorialButton section="reading" />
                  <Button
                    type="button"
                    className="route-primary-cta"
                    onClick={() => setImportOpen(true)}
                    data-tutorial="reading-import"
                  >
                    <Plus className="size-4" />
                    {t("import")}
                  </Button>
                </>
              ) : (
                actions
              )}
            </div>
          </header>

          {isEmptyRoot ? (
            <div className="writing-empty-desk">
              <p className="writing-empty-title">{t("emptyTitle")}</p>
              <p className="writing-brand-lede">{t("emptyDescription")}</p>
            </div>
          ) : (
            <section className="writing-workspace">
              {currentFolderId ? (
                <FolderBreadcrumbs
                  section="reading"
                  folders={folders}
                  currentFolderId={currentFolderId}
                />
              ) : null}

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-48 flex-1 sm:max-w-sm">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="pl-9"
                    data-tutorial="reading-search"
                  />
                </div>
                <CollectionViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  route="read"
                />
              </div>

              <WritingCollections currentFolderId={currentFolderId} />

              {isEmptyFolder ? (
                <FolderEmptyState
                  title={tFolders("emptyFolder")}
                  description={tFolders("emptyFolderDescription")}
                >
                  <Button
                    className="mt-5 route-primary-cta"
                    onClick={() => setImportOpen(true)}
                    data-tutorial="reading-import"
                  >
                    <Plus className="size-4" />
                    {t("import")}
                  </Button>
                </FolderEmptyState>
              ) : (
                <div data-tutorial="reading-passages">
                  <p className="writing-kicker writing-stage-kicker">
                    {t("myPassages")}
                  </p>
                  {filtered.length === 0 ? (
                    <div className="writing-empty-desk">
                      <p className="writing-empty-title">{t("noResults")}</p>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        viewMode === "cards"
                          ? "writing-entry-grid"
                          : "writing-entry-list",
                      )}
                    >
                      {filtered.map((passage) => (
                        <ReadingPassageCard
                          key={passage.id}
                          passage={passage}
                          workspaceId={workspaceId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </FolderWorkspace>

      <ImportReadingDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workspaceId={workspaceId}
        defaultLanguage={workspaceLanguage}
        folderId={currentFolderId}
      />
    </PageShell>
  );
}
