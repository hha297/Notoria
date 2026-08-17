"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ListeningAudioPlayer } from "@/components/listening/listening-audio-player";
import { ListeningPracticeSession } from "@/components/listening/listening-practice-session";
import { RenameListeningDialog } from "@/components/listening/rename-listening-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteListeningLesson,
  processListeningLesson,
} from "@/lib/actions/listening";
import { isListeningErrorCode } from "@/lib/listening/errors";
import type { ListeningLessonDetail } from "@/lib/listening/types";
import { formatListeningDuration } from "@/lib/listening/utils";
import {
  isKnownWritingTopic,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";

type ListeningLessonViewProps = {
  lesson: ListeningLessonDetail;
};

export function ListeningLessonView({ lesson }: ListeningLessonViewProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const processing =
    lesson.status === "TRANSCRIBING" ||
    lesson.status === "UPLOADING" ||
    (lesson.status === "GENERATING" && !lesson.transcript);
  const ready = Boolean(lesson.transcript?.trim()) && !processing;
  const canRetry = lesson.status === "FAILED" && !lesson.transcript?.trim();

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
        router.refresh();
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteListeningLesson(lesson.id);
        toast.success(t("deleted"));
        router.push("/listening");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={lesson.status === "FAILED" ? "destructive" : "outline"}>
            {t(`status.${lesson.status}`)}
          </Badge>
          {lesson.cefrLevel ? (
            <Badge variant="outline">
              {tMeta(`cefr.${lesson.cefrLevel as WritingCefr}`)}
            </Badge>
          ) : null}
          {lesson.topic ? (
            <Badge variant="outline">
              {isKnownWritingTopic(lesson.topic)
                ? tMeta(`topics.${lesson.topic}`)
                : lesson.topic}
            </Badge>
          ) : null}
          {lesson.formality ? (
            <Badge variant="outline">
              {tMeta(`formality.${lesson.formality as WritingFormality}`)}
            </Badge>
          ) : null}
          {lesson.duration != null ? (
            <Badge variant="secondary">
              {formatListeningDuration(lesson.duration)}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canRetry ? (
            <Button onClick={handleRetry} disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {t("retry")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => setRenameOpen(true)}
            disabled={isPending}
          >
            <Pencil className="size-4" />
            {t("renameFile")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      {lesson.status === "FAILED" && !ready ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {lesson.errorCode && isListeningErrorCode(lesson.errorCode)
            ? t(`errors.${lesson.errorCode}`)
            : t("errors.PROCESSING_FAILED")}
        </div>
      ) : null}

      {processing ? (
        <div className="flex items-center gap-3 rounded-xl border border-hairline-cloud bg-muted/40 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t(`steps.${lesson.status.toLowerCase()}`)}
        </div>
      ) : null}

      {ready ? (
        <ListeningPracticeSession lesson={lesson} />
      ) : (
        <ListeningAudioPlayer src={lesson.cloudinaryUrl} mediaType={lesson.mediaType} />
      )}

      <RenameListeningDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        lessonId={lesson.id}
        title={lesson.title}
        originalFilename={lesson.originalFilename}
        format={lesson.format}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", { title: lesson.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
