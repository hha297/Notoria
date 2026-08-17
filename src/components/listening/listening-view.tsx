"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Headphones, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ListeningFiltersBar } from "@/components/listening/listening-filters-bar";
import { ListeningLessonCard } from "@/components/listening/listening-lesson-card";
import { UploadListeningDialog } from "@/components/listening/upload-listening-dialog";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LISTENING_LIST_QUERY,
  filterAndSortListeningLessons,
  type ListeningListQuery,
} from "@/lib/listening/filters";
import type { ListeningLessonListItem } from "@/lib/listening/types";
import { isKnownWritingTopic } from "@/lib/writing/meta";

const EASE = [0.25, 0.1, 0.25, 1] as const;

type ListeningViewProps = {
  lessons: ListeningLessonListItem[];
};

export function ListeningView({ lessons }: ListeningViewProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState<ListeningListQuery>(DEFAULT_LISTENING_LIST_QUERY);

  const filteredLessons = useMemo(
    () =>
      filterAndSortListeningLessons(lessons, query, {
        cefr: (level) => tMeta(`cefr.${level}`),
        topic: (topic) =>
          isKnownWritingTopic(topic) ? tMeta(`topics.${topic}`) : topic,
        formality: (formality) => tMeta(`formality.${formality}`),
      }),
    [lessons, query, tMeta],
  );

  return (
    <PageShell>
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
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            {t("upload")}
          </Button>
        </PageHeader>
      </motion.div>

      <AnimatePresence mode="wait">
        {lessons.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="empty-state"
          >
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
              <Headphones className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-ink">{t("emptyTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
            <Button className="mt-5" onClick={() => setUploadOpen(true)}>
              <Plus className="size-4" />
              {t("uploadFirst")}
            </Button>
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
            <ListeningFiltersBar
              lessons={lessons}
              query={query}
              onQueryChange={setQuery}
            />

            {filteredLessons.length === 0 ? (
              <div className="empty-state">
                <p className="font-medium text-ink">{t("noResults")}</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {t("noResultsDescription")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="heading-md text-ink">{t("myLessons")}</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredLessons.map((lesson) => (
                    <div key={lesson.id} className="transition-transform duration-200 hover:-translate-y-0.5">
                      <ListeningLessonCard lesson={lesson} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <UploadListeningDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        existingFilenames={lessons.flatMap((lesson) =>
          lesson.originalFilename ? [lesson.originalFilename] : [],
        )}
      />
    </PageShell>
  );
}
