"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
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
import { LinkButton } from "@/components/ui/link-button";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import {
  deleteExerciseImport,
  retryExerciseImport,
} from "@/lib/actions/exercise-import";
import { isExerciseImportErrorCode } from "@/lib/exercise-import/errors";
import type { ExerciseImportListItem } from "@/lib/exercise-import/types";
import { cn } from "@/lib/utils";

type ImportPickerProps = {
  imports: ExerciseImportListItem[];
};

function SourceIcon({ type }: { type: ExerciseImportListItem["sourceType"] }) {
  if (type === "image") return <ImageIcon className="size-3.5" />;
  if (type === "url") return <Link2 className="size-3.5" />;
  return <FileText className="size-3.5" />;
}

export function ImportExercisePicker({ imports }: ImportPickerProps) {
  const t = useTranslations("exercises.import");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] =
    useState<ExerciseImportListItem | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const {
    state: processing,
    setStage,
    reset: resetProcessing,
    fail,
    complete,
    isActive: isRetrying,
  } = useAiProcessing();

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isExerciseImportErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      try {
        await deleteExerciseImport(id);
        toast.success(t("deleted"));
        setDeleteTarget(null);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function handleRetry(item: ExerciseImportListItem) {
    setRetryId(item.id);
    setStage("extracting", { title: item.title });
    startTransition(async () => {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        setStage("analyzing", { title: item.title });
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        setStage("generating", { title: item.title });
        await retryExerciseImport(item.id);
        setStage("saving", { title: item.title });
        complete();
        toast.success(t("ready"));
        router.refresh();
        router.push(`/exercises/import/${item.id}`);
        window.setTimeout(() => {
          resetProcessing();
          setRetryId(null);
        }, 400);
      } catch (error) {
        fail(errorMessage(error));
        router.refresh();
      }
    });
  }

  if (imports.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink">{t("myImports")}</h3>

        {isRetrying ||
        processing.stage === "error" ||
        processing.stage === "completed" ? (
          <AiProcessingProgress
            state={processing}
            pipeline="import"
            onRetry={
              processing.stage === "error" && retryId
                ? () => {
                    const item = imports.find((row) => row.id === retryId);
                    if (item) handleRetry(item);
                  }
                : undefined
            }
            onDismissError={
              processing.stage === "error"
                ? () => {
                    resetProcessing();
                    setRetryId(null);
                  }
                : undefined
            }
          />
        ) : null}

        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imports.map((item) => {
            const ready = item.status === "COMPLETED" && item.exerciseCount > 0;
            const failed = item.status === "FAILED";
            const incomplete =
              item.status === "COMPLETED" && item.exerciseCount === 0;
            const processingStatus =
              item.status === "UPLOADING" ||
              item.status === "EXTRACTING" ||
              item.status === "ANALYZING" ||
              item.status === "GENERATING";

            return (
              <article
                key={item.id}
                className={cn(
                  "group relative flex h-full min-h-55 flex-col overflow-hidden rounded-xl border border-hairline-cloud bg-card p-5 transition-all",
                  ready &&
                    "hover:border-accent-lime/50 hover:shadow-[0_0_0_1px_rgba(194,239,78,0.35)]",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1.5"
                  >
                    <SourceIcon type={item.sourceType} />
                    {t(`sourceTypes.${item.sourceType}`)}
                  </Badge>
                  <Badge
                    variant={
                      failed || incomplete
                        ? "destructive"
                        : ready
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {processingStatus ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        {t(`status.${item.status}`)}
                      </span>
                    ) : incomplete ? (
                      t("status.FAILED")
                    ) : (
                      t(`status.${item.status}`)
                    )}
                  </Badge>
                </div>

                <h3 className="line-clamp-2 font-heading text-lg font-medium leading-snug text-ink">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  {ready
                    ? t("exerciseCount", { count: item.exerciseCount })
                    : failed &&
                        item.errorCode &&
                        isExerciseImportErrorCode(item.errorCode)
                      ? t(`errors.${item.errorCode}`)
                      : incomplete
                        ? t("errors.GENERATION_FAILED")
                        : t(`status.${item.status}`)}
                </p>

                <p className="mt-auto pt-4 text-xs text-muted-foreground">
                  {t("importedAgo", {
                    time: formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    }),
                  })}
                </p>

                <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                  {ready ? (
                    <LinkButton href={`/exercises/import/${item.id}`} size="sm">
                      <Play className="size-3.5" />
                      {t("practice")}
                    </LinkButton>
                  ) : null}
                  {failed || incomplete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending || isRetrying}
                      onClick={() => handleRetry(item)}
                    >
                      <RotateCcw className="size-3.5" />
                      {t("retry")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPending || isRetrying || processingStatus}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="size-3.5" />
                    {t("delete")}
                  </Button>
                </div>
                {ready ? (
                  <Link
                    href={`/exercises/import/${item.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={t("practice")}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                title: deleteTarget?.title ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
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
    </>
  );
}
