"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { WritingCollections } from "@/components/writing/writing-collections";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { Button } from "@/components/ui/button";
import { ListPageLoading } from "@/components/layout/page-loading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  useRegisterShortcutAction("createNew", () => {
    setUploadOpen(true);
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

  const actions = (
    <>
      <ShowTutorialButton section="listening" />
      <Button
        type="button"
        className="route-primary-cta"
        onClick={() => setUploadOpen(true)}
        data-tutorial="listening-upload"
      >
        <Plus className="size-4" />
        {t("upload")}
      </Button>
    </>
  );

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
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("eyebrow")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
            <div className="writing-hero-actions">
              {isEmptyRoot ? (
                <>
                  <ShowTutorialButton section="listening" />
                  <NewFolderButton variant="outline" size="sm" />
                  <Button
                    type="button"
                    className="route-primary-cta"
                    onClick={() => setUploadOpen(true)}
                    data-tutorial="listening-upload"
                  >
                    <Plus className="size-4" />
                    {t("uploadFirst")}
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
                    <Button
                      className="mt-5 route-primary-cta"
                      onClick={() => setUploadOpen(true)}
                      data-tutorial="listening-upload"
                    >
                      <Plus className="size-4" />
                      {t("upload")}
                    </Button>
                  </FolderEmptyState>
                ) : (
                  <div data-tutorial="listening-lessons">
                    <p className="writing-kicker mb-3">{t("myLessons")}</p>
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
                      <div className="writing-entry-list">
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
