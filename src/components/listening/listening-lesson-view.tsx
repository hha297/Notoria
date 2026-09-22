"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ListeningAudioPlayer } from "@/components/listening/listening-audio-player";
import { ListeningPracticeSession } from "@/components/listening/listening-practice-session";
import { RenameListeningDialog } from "@/components/listening/rename-listening-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import exerciseStyles from "@/components/style/listening/exercise.module.css";
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
  const [renamePatch, setRenamePatch] = useState<Partial<ListeningLessonDetail>>(
    {},
  );
  const lesson = { ...initialLesson, ...renamePatch };

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

  const metaTags: { label: string; tone?: "danger" }[] = [];
  metaTags.push({
    label: t(`status.${lesson.status}`),
    tone: lesson.status === "FAILED" ? "danger" : undefined,
  });
  if (lesson.cefrLevel) {
    metaTags.push({
      label: tMeta(`cefr.${lesson.cefrLevel as WritingCefr}`),
    });
  }
  if (lesson.topic) {
    metaTags.push({
      label: resolveTopicLabel(lesson.topic, (key) => tTags(key)),
    });
  }
  if (lesson.formality) {
    metaTags.push({
      label: tMeta(`formality.${lesson.formality as WritingFormality}`),
    });
  }
  if (lesson.duration != null) {
    const duration = formatListeningDuration(lesson.duration);
    if (duration) metaTags.push({ label: duration });
  }

  return (
    <div className="writing-paper listening-paper listening-atelier">
      <div className={mx(exerciseStyles, "shell shellWide")}>
        <header className={mx(exerciseStyles, "header")}>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-ink no-underline [-webkit-font-smoothing:auto] hover:bg-[var(--module-listen-bg)] hover:text-[var(--module-listen-fg)] dark:text-white"
          >
            <ArrowLeft className="size-4 shrink-0" />
            {t("backToList")}
          </Link>
          <div className={mx(exerciseStyles, "headerActions")}>
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
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="size-4" />
              {tc("delete")}
            </Button>
          </div>
        </header>

        <section>
          <p className={mx(exerciseStyles, "eyebrow")}>{t("title")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <h1 className="font-heading text-[clamp(1.65rem,3vw,2.4rem)] font-bold leading-[1.12] tracking-[-0.035em] text-ink wrap-break-word">
              {lesson.title}
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground pl-2 hover:bg-[var(--module-listen-bg)] hover:text-[var(--module-listen-fg)]"
              onClick={() => setRenameOpen(true)}
              disabled={isPending}
              aria-label={t("renameFile")}
              title={t("renameFile")}
            >
              <Pencil className="size-5" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {metaTags.map((tag) => (
              <span
                key={tag.label}
                className={
                  tag.tone === "danger"
                    ? "inline-flex min-h-6 items-center rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-heading text-[0.7rem] font-semibold text-destructive"
                    : "inline-flex min-h-6 items-center rounded-md border border-[color-mix(in_oklab,var(--module-listen-fg)_38%,var(--module-listen-bg))] bg-[color-mix(in_oklab,var(--module-listen-bg)_88%,transparent)] px-2 py-0.5 font-heading text-[0.7rem] font-semibold text-ink"
                }
              >
                {tag.label}
              </span>
            ))}
          </div>
          {!ready ? (
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
              {t("lessonDescription")}
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          {lesson.status === "FAILED" && !ready ? (
            <div className={mx(exerciseStyles, "status")} data-tone="error">
              {lesson.errorCode && isListeningErrorCode(lesson.errorCode)
                ? t(`errors.${lesson.errorCode}`)
                : t("errors.PROCESSING_FAILED")}
            </div>
          ) : null}

          {processing ? (
            <div className={mx(exerciseStyles, "status")} role="status">
              <Loader2 className="size-4 animate-spin" />
              {t(`steps.${lesson.status.toLowerCase()}`)}
            </div>
          ) : null}

          {ready ? (
            <ListeningPracticeSession lesson={lesson} />
          ) : (
            <ListeningAudioPlayer
              key={lesson.cloudinaryUrl}
              src={lesson.cloudinaryUrl}
              mediaType={lesson.mediaType}
              label={t("title")}
            />
          )}
        </div>
      </div>

      <RenameListeningDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        lessonId={lesson.id}
        title={lesson.title}
        originalFilename={lesson.originalFilename}
        format={lesson.format}
        onRenamed={(patch) =>
          setRenamePatch((current) => ({ ...current, ...patch }))
        }
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          showCloseButton={!isPending && !isLeaving}
          className={mx(sheetStyles, "workspace-sheet sm:max-w-md")}
          data-sheet-route="listen"
        >
          <DialogHeader
            className={mx(
              sheetStyles,
              "workspace-sheet-header gap-2 space-y-0 pr-8 text-left",
            )}
          >
            <p className={mx(sheetStyles, "workspace-sheet-kicker")}>
              {t("title")}
            </p>
            <DialogTitle className={mx(sheetStyles, "workspace-sheet-title")}>
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription
              className={mx(sheetStyles, "workspace-sheet-lede")}
            >
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
