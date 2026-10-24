"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { PageShell } from "@/components/layout/page-shell";
import { FolderBreadcrumbs } from "@/components/folders/folder-breadcrumbs";
import {
  FolderEmptyState,
  FolderWorkspace,
} from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { ListeningFiltersBar } from "@/components/listening/listening-filters-bar";
import { ListeningLessonCard } from "@/components/listening/listening-lesson-card";
import { UploadListeningDialog } from "@/components/listening/upload-listening-dialog";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { CollectionViewModeToggle } from "@/components/shared/collection-view-mode-toggle";
import { WritingCollections } from "@/components/writing/writing-collections";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { ListPageLoading } from "@/components/layout/page-loading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCollectionViewMode } from "@/hooks/use-collection-view-mode";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import { childrenOf, itemsInFolder } from "@/lib/folders/tree";
import {
  DEFAULT_LISTENING_LIST_QUERY,
  filterAndSortListeningLessons,
  isListeningListQueryFiltered,
  type ListeningListQuery,
} from "@/lib/listening/filters";
import type { ListeningLessonListItem } from "@/lib/listening/types";
import {
  folderListQueryOptions,
  listeningListQueryOptions,
} from "@/lib/query/options";
import { queryKeys } from "@/lib/query/keys";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";
import { onTutorialPrepare } from "@/lib/onboarding/tutorial-prepare";
import { cn } from "@/lib/utils";

const EMPTY_LESSONS: ListeningLessonListItem[] = [];

type ListeningViewProps = {
  currentFolderId: string | null;
  workspaceId: string;
};

export function ListeningView({
  currentFolderId,
  workspaceId,
}: ListeningViewProps) {
  const t = useTranslations("listening");
  const tFolders = useTranslations("folders");
  const tMeta = useTranslations("listening.meta");
  const tTags = useTranslations("tags");
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState<ListeningListQuery>(
    DEFAULT_LISTENING_LIST_QUERY,
  );
  const [viewMode, setViewMode] = useCollectionViewMode("listening");
  const listeningQuota = useQuotaLockMessage("ai_listening_transcript");

  function openUpload() {
    if (listeningQuota.locked) return;
    setUploadOpen(true);
  }

  useRegisterShortcutAction("createNew", () => {
    openUpload();
  });

  const lessonsQuery = useQuery(listeningListQueryOptions(workspaceId));
  const foldersQuery = useQuery(
    folderListQueryOptions(workspaceId, "listening"),
  );
  const folders = foldersQuery.data ?? [];
  const lessons = lessonsQuery.data ?? EMPTY_LESSONS;

  useEffect(() => {
    return onTutorialPrepare((action) => {
      if (action === "open-listening-upload") {
        setUploadOpen(true);
      }
      if (action === "close-listening-upload") {
        setUploadOpen(false);
      }
    });
  }, []);

  const scopedLessons = useMemo(
    () =>
      query.search.trim()
        ? lessons
        : itemsInFolder(lessons, currentFolderId),
    [lessons, currentFolderId, query.search],
  );

  const filteredLessons = useMemo(
    () =>
      filterAndSortListeningLessons(scopedLessons, query, {
        cefr: (level) => tMeta(`cefr.${level}`),
        topic: (topic) =>
          topic ? resolveTopicLabel(topic, (key) => tTags(key)) : topic,
        formality: (formality) => tMeta(`formality.${formality}`),
      }),
    [scopedLessons, query, tMeta, tTags],
  );

  const childFolders = childrenOf(folders, currentFolderId);
  const isEmptyRoot =
    !currentFolderId && lessons.length === 0 && folders.length === 0;
  const isEmptyFolder =
    !isListeningListQueryFiltered(query) &&
    childFolders.length === 0 &&
    itemsInFolder(lessons, currentFolderId).length === 0;

  if (lessonsQuery.isPending || foldersQuery.isPending) {
    return (
      <PageShell className="writing-atelier-shell listening-atelier-shell">
        <ListPageLoading />
      </PageShell>
    );
  }

  return (
    <PageShell className="writing-atelier-shell listening-atelier-shell">
      <FolderWorkspace
        workspaceId={workspaceId}
        section="listening"
        folders={folders}
        currentFolderId={currentFolderId}
        items={lessons}
        search={query.search}
        showBreadcrumbs={false}
      >
        <div className="writing-atelier listening-atelier flex flex-col gap-10 lg:gap-12">
          <header className="writing-hero">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <div className="writing-hero-primary">
              <QuotaLockButton
                type="button"
                className="route-primary-cta"
                locked={listeningQuota.locked}
                lockMessage={listeningQuota.message}
                icon={<Plus className="size-4" />}
                onClick={openUpload}
                data-tutorial="listening-upload"
              >
                {isEmptyRoot ? t("uploadFirst") : t("upload")}
              </QuotaLockButton>
            </div>
            <p className="writing-brand-lede">{t("description")}</p>
            <div className="writing-hero-secondary">
              <ShowTutorialButton section="listening" />
              {isEmptyRoot ? (
                <NewFolderButton variant="outline" size="sm" />
              ) : null}
            </div>
          </header>

          {isEmptyRoot ? (
            <div className="writing-empty-desk">
              <p className="writing-empty-title">{t("emptyTitle")}</p>
              <p className="writing-brand-lede">{t("emptyDescription")}</p>
            </div>
          ) : (
            <>
              <section className="writing-workspace">
                {currentFolderId ? (
                  <FolderBreadcrumbs
                    section="listening"
                    folders={folders}
                    currentFolderId={currentFolderId}
                  />
                ) : null}

                <ListeningFiltersBar
                  lessons={lessons}
                  query={query}
                  onQueryChange={setQuery}
                />

                <WritingCollections currentFolderId={currentFolderId} />

                {isEmptyFolder ? (
                  <FolderEmptyState
                    title={tFolders("emptyFolder")}
                    description={tFolders("emptyFolderDescription")}
                  >
                    <QuotaLockButton
                      className="mt-5 route-primary-cta"
                      locked={listeningQuota.locked}
                      lockMessage={listeningQuota.message}
                      icon={<Plus className="size-4" />}
                      onClick={openUpload}
                      data-tutorial="listening-upload"
                    >
                      {t("upload")}
                    </QuotaLockButton>
                  </FolderEmptyState>
                ) : (
                  <div data-tutorial="listening-lessons">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="writing-kicker writing-stage-kicker mb-0">
                        {t("myLessons")}
                      </p>
                      <CollectionViewModeToggle
                        value={viewMode}
                        onChange={setViewMode}
                        route="listen"
                      />
                    </div>
                    {filteredLessons.length === 0 ? (
                      isListeningListQueryFiltered(query) &&
                      childFolders.length === 0 ? (
                        <div className="writing-empty-desk">
                          <p className="writing-empty-title">{t("noResults")}</p>
                          <p className="writing-brand-lede">
                            {t("noResultsDescription")}
                          </p>
                        </div>
                      ) : null
                    ) : (
                      <div
                        className={cn(
                          viewMode === "cards"
                            ? "writing-entry-grid"
                            : "writing-entry-list",
                        )}
                      >
                        {filteredLessons.map((lesson) => (
                          <ListeningLessonCard
                            key={lesson.id}
                            lesson={lesson}
                            onDeleted={(id) =>
                              queryClient.setQueryData(
                                queryKeys.listening.list(workspaceId),
                                (
                                  current: ListeningLessonListItem[] | undefined,
                                ) => current?.filter((item) => item.id !== id),
                              )
                            }
                            onRenamed={(id, patch) =>
                              queryClient.setQueryData(
                                queryKeys.listening.list(workspaceId),
                                (
                                  current: ListeningLessonListItem[] | undefined,
                                ) =>
                                  current?.map((item) =>
                                    item.id === id
                                      ? { ...item, ...patch }
                                      : item,
                                  ),
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </FolderWorkspace>

      <UploadListeningDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folderId={currentFolderId}
        existingFilenames={lessons.flatMap((lesson) =>
          lesson.originalFilename ? [lesson.originalFilename] : [],
        )}
      />
    </PageShell>
  );
}
