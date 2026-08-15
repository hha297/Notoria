"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Headphones, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ListeningLessonCard } from "@/components/listening/listening-lesson-card";
import { UploadListeningDialog } from "@/components/listening/upload-listening-dialog";
import { Button } from "@/components/ui/button";
import type { ListeningLessonListItem } from "@/lib/listening/types";

const EASE = [0.25, 0.1, 0.25, 1] as const;

type ListeningViewProps = {
  lessons: ListeningLessonListItem[];
};

export function ListeningView({ lessons }: ListeningViewProps) {
  const t = useTranslations("listening");
  const [uploadOpen, setUploadOpen] = useState(false);

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
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.045, delayChildren: 0.04 },
              },
            }}
            className="space-y-4"
          >
            <h2 className="heading-md text-ink">{t("myLessons")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lessons.map((lesson) => (
                <motion.div
                  key={lesson.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.2, ease: EASE },
                    },
                  }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18, ease: EASE }}
                >
                  <ListeningLessonCard lesson={lesson} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UploadListeningDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </PageShell>
  );
}
