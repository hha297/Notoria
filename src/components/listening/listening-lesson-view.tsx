"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import featureStyles from "@/components/style/speaking/session.module.css";
import sheetStyles from "@/components/style/workspace/sheet.module.css";
import {
  deleteListeningLesson,
  processListeningLesson,
} from "@/lib/actions/listening";
import { mx } from "@/lib/css-module";
import { isListeningErrorCode } from "@/lib/listening/errors";
import type { ListeningLessonDetail } from "@/lib/listening/types";
import { formatListeningDuration } from "@/lib/listening/utils";
import {
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

type ListeningLessonViewProps = {
  lesson: ListeningLessonDetail;
  backHref: string;
};

export function ListeningLessonView({
  lesson: initialLesson,
  backHref,
}: ListeningLessonViewProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLeaving, setIsLeaving] = useState(false);
  const [lesson, setLesson] = useState(initialLesson);

  useEffect(() => {
    setLesson(initialLesson);
  }, [initialLesson]);

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
    if (isLeaving) return;
    startTransition(async () => {
      try {
        await deleteListeningLesson(lesson.id);
        setIsLeaving(true);
        setDeleteOpen(false);
        router.push("/listening");
        toast.success(t("deleted"));
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <div className="writing-paper listening-paper">
      <div className="writing-paper-chrome">
        <Link href={backHref} className="writing-back">
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <div className="writing-paper-actions">
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
            className="route-quiet-action"
            data-route-action="listen"
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

      <article className="writing-paper-page">
        <p className="writing-kicker">{t("title")}</p>
        <h1 className="writing-paper-title wrap-break-word">{lesson.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant={lesson.status === "FAILED" ? "destructive" : "outline"}
          >
            {t(`status.${lesson.status}`)}
          </Badge>
          {lesson.cefrLevel ? (
            <Badge variant="outline">
              {tMeta(`cefr.${lesson.cefrLevel as WritingCefr}`)}
            </Badge>
          ) : null}
          {lesson.topic ? (
            <Badge variant="outline">
              {resolveTopicLabel(lesson.topic, (key) => tTags(key))}
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
        <p className="writing-brand-lede mt-3">{t("lessonDescription")}</p>

        <div className="mt-8 flex flex-col gap-4">
          {lesson.status === "FAILED" && !ready ? (
            <div className={mx(featureStyles, "listening-status-strip is-error")}>
              {lesson.errorCode && isListeningErrorCode(lesson.errorCode)
                ? t(`errors.${lesson.errorCode}`)
                : t("errors.PROCESSING_FAILED")}
            </div>
          ) : null}

          {processing ? (
            <div className={mx(featureStyles, "listening-status-strip")}>
              <Loader2 className="size-4 animate-spin" />
              {t(`steps.${lesson.status.toLowerCase()}`)}
            </div>
          ) : null}

          {ready ? (
            <div className={mx(featureStyles, "listening-practice-stage")}>
              <ListeningPracticeSession lesson={lesson} />
            </div>
          ) : (
            <ListeningAudioPlayer
              src={lesson.cloudinaryUrl}
              mediaType={lesson.mediaType}
            />
          )}
        </div>
      </article>

      <RenameListeningDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        lessonId={lesson.id}
        title={lesson.title}
        originalFilename={lesson.originalFilename}
        format={lesson.format}
        onRenamed={(patch) => setLesson((current) => ({ ...current, ...patch }))}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          showCloseButton={!isPending && !isLeaving}
          className={mx(sheetStyles, "workspace-sheet sm:max-w-md")}
          data-sheet-route="listen"
        >
          <DialogHeader className={mx(sheetStyles, "workspace-sheet-header gap-2 space-y-0 pr-8 text-left")}>
            <p className={mx(sheetStyles, "workspace-sheet-kicker")}>{t("title")}</p>
            <DialogTitle className={mx(sheetStyles, "workspace-sheet-title")}>
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className={mx(sheetStyles, "workspace-sheet-lede")}>
              {t("deleteConfirmDescription", { title: lesson.title })}
            </DialogDescription>
          </DialogHeader>
          <div className={mx(sheetStyles, "workspace-sheet-footer")}>
            <Button
              type="button"
              variant="outline"
              className={mx(sheetStyles, "workspace-sheet-cancel")}
              onClick={() => setDeleteOpen(false)}
              disabled={isPending || isLeaving}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={mx(sheetStyles, "workspace-sheet-cta")}
              onClick={handleDelete}
              disabled={isPending || isLeaving}
            >
              {isPending || isLeaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
