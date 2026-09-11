"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { RenameListeningDialog } from "@/components/listening/rename-listening-dialog";
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
  isKnownWritingTopic,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";

type ListeningLessonCardProps = {
  lesson: ListeningLessonListItem;
  onDeleted?: (id: string) => void;
  onRenamed?: (id: string, patch: { title: string; originalFilename: string }) => void;
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
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const duration = formatListeningDuration(lesson.duration);
  const processing = lesson.status !== "COMPLETED" && lesson.status !== "FAILED";
  const filenameStem = lesson.originalFilename
    ? splitListeningFilename(lesson.originalFilename).stem
    : "";

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
        // Status transition still needs RSC refresh until listening is on TanStack.
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

  return (
    <>
      <Card className="relative h-full cursor-pointer border-hairline-cloud bg-card ring-hairline-cloud transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(31,22,51,0.18)] hover:ring-accent-lime/40">
        <Link
          href={`/listening/${lesson.id}`}
          className="absolute inset-0 z-0"
          aria-label={lesson.title}
        />
        <CardHeader className="relative z-10 gap-3 pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-hairline-cloud bg-muted/40">
              <Headphones className="size-5 text-ink" />
            </div>
            <Badge variant={statusVariant(lesson.status)}>
              {t(`status.${lesson.status}`)}
            </Badge>
          </div>
          <div className="group/title flex min-w-0 items-center gap-1">
            <CardTitle className="min-w-0 truncate text-lg text-ink">
              {lesson.title}
            </CardTitle>
            <div className="pointer-events-auto flex shrink-0 items-center opacity-0 transition-opacity group-focus-within/title:opacity-100 group-hover/title:opacity-100 max-sm:opacity-100">
              <MoveItemButton
                id={lesson.id}
                title={lesson.title}
                folderId={lesson.folderId}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-ink"
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
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">{tc("delete")}</span>
              </Button>
            </div>
          </div>
          {filenameStem ? (
            <p className="truncate text-xs text-muted-foreground">{filenameStem}</p>
          ) : null}
          <CardDescription className="flex flex-wrap items-center gap-1.5 text-sm">
            {lesson.topic ? (
              <span>
                {isKnownWritingTopic(lesson.topic)
                  ? tMeta(`topics.${lesson.topic}`)
                  : lesson.topic}
              </span>
            ) : null}
            {lesson.topic && lesson.cefrLevel ? <span aria-hidden="true">·</span> : null}
            {lesson.cefrLevel ? (
              <span>{tMeta(`cefr.${lesson.cefrLevel as WritingCefr}`)}</span>
            ) : null}
            {lesson.formality ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {tMeta(`formality.${lesson.formality as WritingFormality}`)}
                </span>
              </>
            ) : null}
            {lesson.exerciseType ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{t(`types.${lesson.exerciseType}`)}</span>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 pb-1 pointer-events-none">
          <p className="text-sm text-muted-foreground">{duration ?? "—"}</p>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {lesson.status === "FAILED" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleRetry}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                {t("retry")}
              </Button>
            ) : lesson.status === "COMPLETED" ? (
              <LinkButton href={`/listening/${lesson.id}`} size="sm">
                {t("continue")}
              </LinkButton>
            ) : (
              <LinkButton href={`/listening/${lesson.id}`} size="sm" variant="outline">
                {processing ? t("viewProgress") : t("open")}
              </LinkButton>
            )}
          </div>
        </CardContent>
      </Card>

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
