"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { RenameListeningDialog } from "@/components/listening/rename-listening-dialog";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import { MoveItemButton } from "@/components/folders/move-item-button";
import {
  deleteListeningLesson,
  processListeningLesson,
} from "@/lib/actions/listening";
import { isListeningErrorCode } from "@/lib/listening/errors";
import type { ListeningLessonListItem } from "@/lib/listening/types";
import {
  formatListeningDuration,
  splitListeningFilename,
} from "@/lib/listening/utils";
import {
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

type ListeningLessonCardProps = {
  lesson: ListeningLessonListItem;
  onDeleted?: (id: string) => void;
  onRenamed?: (
    id: string,
    patch: { title: string; originalFilename: string },
  ) => void;
};

function statusVariant(status: ListeningLessonListItem["status"]) {
  if (status === "COMPLETED") return "outline" as const;
  if (status === "FAILED") return "destructive" as const;
  return "secondary" as const;
}

export function ListeningLessonCard({
  lesson,
  onDeleted,
  onRenamed,
}: ListeningLessonCardProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const duration = formatListeningDuration(lesson.duration);
  const processing =
    lesson.status !== "COMPLETED" && lesson.status !== "FAILED";
  const filenameStem = lesson.originalFilename
    ? splitListeningFilename(lesson.originalFilename).stem
    : "";
  const href = `/listening/${lesson.id}`;

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isListeningErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  function handleRetry() {
    startTransition(async () => {
      try {
        await processListeningLesson(lesson.id);
        toast.success(t("created"));
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteListeningLesson(lesson.id);
        toast.success(t("deleted"));
        setDeleteOpen(false);
        onDeleted?.(lesson.id);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const metaBits = [
    lesson.topic
      ? resolveTopicLabel(lesson.topic, (key) => tTags(key))
      : null,
    lesson.cefrLevel
      ? tMeta(`cefr.${lesson.cefrLevel as WritingCefr}`)
      : null,
    lesson.formality
      ? tMeta(`formality.${lesson.formality as WritingFormality}`)
      : null,
    lesson.exerciseType ? t(`types.${lesson.exerciseType}`) : null,
    duration,
  ].filter(Boolean);

  return (
    <>
      <FolderItemDrag id={lesson.id} className="writing-entry-wrap">
        <article className="writing-entry">
          <div className="writing-entry-body">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(lesson.status)}>
                {t(`status.${lesson.status}`)}
              </Badge>
            </div>
            <h3 className="writing-entry-title">
              <Link
                href={href}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {lesson.title}
              </Link>
            </h3>
            {filenameStem ? (
              <p className="writing-entry-excerpt truncate">{filenameStem}</p>
            ) : null}
            {metaBits.length > 0 ? (
              <p className="writing-kind-facts">
                {metaBits.map((bit, index) => (
                  <span key={`${bit}-${index}`}>
                    {index > 0 ? (
                      <span aria-hidden="true"> · </span>
                    ) : null}
                    <span>{bit}</span>
                  </span>
                ))}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {lesson.status === "FAILED" ? (
                <Button
                  type="button"
                  size="sm"
                  className="route-primary-cta"
                  onClick={handleRetry}
                  disabled={isPending}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  {t("retry")}
                </Button>
              ) : lesson.status === "COMPLETED" ? (
                <LinkButton
                  href={href}
                  size="sm"
                  className="route-primary-cta"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  {t("continue")}
                </LinkButton>
              ) : (
                <LinkButton
                  href={href}
                  size="sm"
                  variant="outline"
                  className="route-quiet-action"
                  data-route-action="listen"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  {processing ? t("viewProgress") : t("open")}
                </LinkButton>
              )}
            </div>
          </div>
          <div className="writing-entry-actions">
            <MoveItemButton
              id={lesson.id}
              title={lesson.title}
              folderId={lesson.folderId}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-ink"
              onClick={() => setRenameOpen(true)}
              disabled={isPending}
            >
              <Pencil className="size-3.5" />
              <span className="sr-only">{t("renameFile")}</span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">{tc("delete")}</span>
            </Button>
          </div>
        </article>
      </FolderItemDrag>

      <RenameListeningDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        lessonId={lesson.id}
        title={lesson.title}
        originalFilename={lesson.originalFilename}
        format={lesson.format}
        onRenamed={(patch) => onRenamed?.(lesson.id, patch)}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", { title: lesson.title })}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
