"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Headphones, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import {
  FolderEmptyState,
  FolderGrid,
  FolderWorkspace,
} from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { ListeningFiltersBar } from "@/components/listening/listening-filters-bar";
import { ListeningLessonCard } from "@/components/listening/listening-lesson-card";
import { UploadListeningDialog } from "@/components/listening/upload-listening-dialog";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import { childrenOf, itemsInFolder } from "@/lib/folders/tree";
import type { FolderListItem } from "@/lib/folders/types";
import {
  DEFAULT_LISTENING_LIST_QUERY,
  filterAndSortListeningLessons,
  isListeningListQueryFiltered,
  type ListeningListQuery,
} from "@/lib/listening/filters";
import type { ListeningLessonListItem } from "@/lib/listening/types";
import { isKnownWritingTopic } from "@/lib/writing/meta";
import { onTutorialPrepare } from "@/lib/onboarding/tutorial-prepare";

const EASE = [0.25, 0.1, 0.25, 1] as const;

type ListeningViewProps = {
  lessons: ListeningLessonListItem[];
  folders: FolderListItem[];
  currentFolderId: string | null;
};

export function ListeningView({
  lessons,
  folders,
  currentFolderId,
}: ListeningViewProps) {
  const t = useTranslations("listening");
  const tFolders = useTranslations("folders");
  const tMeta = useTranslations("listening.meta");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState<ListeningListQuery>(DEFAULT_LISTENING_LIST_QUERY);

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
          isKnownWritingTopic(topic) ? tMeta(`topics.${topic}`) : topic,
        formality: (formality) => tMeta(`formality.${formality}`),
      }),
    [scopedLessons, query, tMeta],
  );

  const childFolders = childrenOf(folders, currentFolderId);
  const isEmptyRoot =
    !currentFolderId && lessons.length === 0 && folders.length === 0;
  const isEmptyFolder =
    !isListeningListQueryFiltered(query) &&
    childFolders.length === 0 &&
    itemsInFolder(lessons, currentFolderId).length === 0;

  return (
    <PageShell>
      <FolderWorkspace
        section="listening"
        folders={folders}
        currentFolderId={currentFolderId}
        items={lessons}
        search={query.search}
        header={
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <PageHeader
              eyebrow={t("eyebrow")}
              title={t("title")}
              highlight={t("highlight")}
              description={t("description")}
            >
              <ShowTutorialButton section="listening" />
              <NewFolderButton />
              <Button onClick={() => setUploadOpen(true)} data-tutorial="listening-upload">
                <Plus className="size-4" />
                {t("upload")}
              </Button>
            </PageHeader>
          </motion.div>
        }
      >
        <AnimatePresence mode="wait">
          {isEmptyRoot || isEmptyFolder ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
            >
              {currentFolderId ? (
                <FolderEmptyState
                  title={tFolders("emptyFolder")}
                  description={tFolders("emptyFolderDescription")}
                >
                  <Button className="mt-5" onClick={() => setUploadOpen(true)} data-tutorial="listening-upload">
                    <Plus className="size-4" />
                    {t("upload")}
                  </Button>
                </FolderEmptyState>
              ) : (
                <div className="empty-state">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
                    <Headphones className="size-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-ink">{t("emptyTitle")}</p>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {t("emptyDescription")}
                  </p>
                  <Button className="mt-5" onClick={() => setUploadOpen(true)} data-tutorial="listening-upload">
                    <Plus className="size-4" />
                    {t("uploadFirst")}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
            className="space-y-4"
          >
            {lessons.length > 0 || folders.length > 0 ? (
              <div data-tutorial="listening-filters">
                <ListeningFiltersBar
                  lessons={lessons}
                  query={query}
                  onQueryChange={setQuery}
                />
              </div>
            ) : null}

            <div className="space-y-4" data-tutorial="listening-lessons">
              <h2 className="heading-md text-ink">{t("myLessons")}</h2>
              <FolderGrid />
              {filteredLessons.length === 0 ? (
                isListeningListQueryFiltered(query) &&
                childFolders.length === 0 ? (
                  <div className="empty-state">
                    <p className="font-medium text-ink">{t("noResults")}</p>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      {t("noResultsDescription")}
                    </p>
                  </div>
                ) : null
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredLessons.map((lesson) => (
                    <FolderItemDrag
                      key={lesson.id}
                      id={lesson.id}
                      className="transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <ListeningLessonCard lesson={lesson} />
                    </FolderItemDrag>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
          )}
        </AnimatePresence>
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
