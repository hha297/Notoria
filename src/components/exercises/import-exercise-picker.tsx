"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const {
    state: processing,
    setStage,
    reset: resetProcessing,
    fail,
    complete,
    isActive: isRetrying,
  } = useAiProcessing();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = query
      ? imports.filter((item) => item.title.toLowerCase().includes(query))
      : imports;

    return [...matched].sort((a, b) => {
      const rank = (item: ExerciseImportListItem) => {
        if (
          item.status === "UPLOADING" ||
          item.status === "EXTRACTING" ||
          item.status === "ANALYZING" ||
          item.status === "GENERATING"
        ) {
          return 0;
        }
        if (item.status === "COMPLETED" && item.exerciseCount > 0) return 1;
        return 2;
      };
      return rank(a) - rank(b);
    });
  }, [imports, search]);

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
        router.push(`/exercises/import/${item.id}`);
        toast.success(t("ready"));
        resetProcessing();
        setRetryId(null);
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
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-[0.68rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {t("myImports")}
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 pl-9 sm:h-9"
            />
          </div>
        </div>

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

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </p>
        ) : (
          <ol className="border-t border-hairline-cloud">
            {filtered.map((item, index) => {
              const ready = item.status === "COMPLETED" && item.exerciseCount > 0;
              const failed = item.status === "FAILED";
              const incomplete =
                item.status === "COMPLETED" && item.exerciseCount === 0;
              const processingStatus =
                item.status === "UPLOADING" ||
                item.status === "EXTRACTING" ||
                item.status === "ANALYZING" ||
                item.status === "GENERATING";

              const detail = ready
                ? t("exerciseCount", { count: item.exerciseCount })
                : failed &&
                    item.errorCode &&
                    isExerciseImportErrorCode(item.errorCode)
                  ? t(`errors.${item.errorCode}`)
                  : incomplete
                    ? t("errors.GENERATION_FAILED")
                    : t(`status.${item.status}`);

              const statusLabel = processingStatus
                ? t(`status.${item.status}`)
                : incomplete
                  ? t("status.FAILED")
                  : t(`status.${item.status}`);

              const featured = index === 0 && search.trim() === "";

              return (
                <li key={item.id}>
                  <article
                    data-import-source={item.sourceType}
                    data-featured={featured ? "" : undefined}
                    className={cn(
                      "import-row group relative grid gap-4 px-1 py-7 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:items-start sm:gap-x-5 sm:px-2 sm:py-8",
                    )}
                  >
                    {ready ? (
                      <Link
                        href={`/exercises/import/${item.id}`}
                        className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--import-mode-fg)/40"
                        aria-label={`${t("practice")}: ${item.title}`}
                      />
                    ) : null}

                    <p
                      className="font-mono text-[1.7rem] leading-none font-semibold tabular-nums text-(--import-mode-fg) sm:pt-1 sm:text-[2rem]"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, "0")}
                    </p>

                    <div className="relative z-10 min-w-0 pointer-events-none">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-[0.16em] text-(--import-mode-fg) uppercase">
                        <span className="inline-flex items-center gap-1">
                          <SourceIcon type={item.sourceType} />
                          {t(`sourceTypes.${item.sourceType}`)}
                        </span>
                        <span className="font-medium tracking-normal text-muted-foreground normal-case">
                          ·
                        </span>
                        <span
                          className={cn(
                            "font-medium tracking-normal normal-case",
                            failed || incomplete
                              ? "text-destructive"
                              : ready
                                ? "text-ink"
                                : "text-muted-foreground",
                          )}
                        >
                          {processingStatus ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" />
                              {statusLabel}
                            </span>
                          ) : (
                            statusLabel
                          )}
                        </span>
                      </p>
                      <h3
                        className={cn(
                          "mt-2 font-heading font-bold tracking-tight text-pretty wrap-anywhere text-ink",
                          featured
                            ? "text-[1.65rem] sm:text-[1.95rem]"
                            : "text-2xl",
                        )}
                      >
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        {detail}
                        <span aria-hidden> · </span>
                        {t("importedAgo", {
                          time: formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          }),
                        })}
                      </p>
                    </div>

                    <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-1 pointer-events-auto sm:flex-col sm:items-end sm:gap-2 sm:pt-7">
                      {ready ? (
                        <LinkButton
                          href={`/exercises/import/${item.id}`}
                          size="sm"
                          className="border-transparent bg-(--import-mode-fg) text-background hover:opacity-90"
                        >
                          {t("practice")}
                          <ArrowRight className="size-3.5" />
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
                  </article>
                </li>
              );
            })}
          </ol>
        )}
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
