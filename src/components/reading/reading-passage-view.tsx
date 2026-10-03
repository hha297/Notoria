"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { DetailPageLoading } from "@/components/layout/page-loading";
import { GenerateReadingDialog } from "@/components/reading/generate-reading-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import {
  deleteReadingPassage,
  deleteReadingQuestionSet,
} from "@/lib/actions/reading";
import { isReadingErrorCode } from "@/lib/reading/errors";
import { readingDetailQueryOptions } from "@/lib/query/options";
import { queryKeys } from "@/lib/query/keys";
import { removeCachedListItem } from "@/hooks/use-invalidate-workspace-queries";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ReadingPassageViewProps = {
  workspaceId: string;
  passageId: string;
};

export function ReadingPassageView({
  workspaceId,
  passageId,
}: ReadingPassageViewProps) {
  const t = useTranslations("reading");
  const tc = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deletePassageOpen, setDeletePassageOpen] = useState(false);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data, isLoading, refetch } = useQuery(
    readingDetailQueryOptions(workspaceId, passageId),
  );

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isReadingErrorCode(code) ? t(`errors.${code}`) : t("errors.PROCESSING_FAILED");
  }

  function handleDeletePassage() {
    startTransition(async () => {
      try {
        await deleteReadingPassage(passageId);
        removeCachedListItem(queryClient, "reading", passageId);
        toast.success(t("deleted"));
        router.push("/reading");
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function handleDeleteSet() {
    if (!deleteSetId) return;
    const setId = deleteSetId;
    startTransition(async () => {
      try {
        await deleteReadingQuestionSet(setId);
        await refetch();
        await queryClient.invalidateQueries({
          queryKey: queryKeys.reading.all(workspaceId),
        });
        toast.success(t("deleted"));
        setDeleteSetId(null);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  if (isLoading || !data) {
    return <DetailPageLoading />;
  }

  return (
    <PageShell className="writing-atelier-shell reading-atelier-shell">
      <div className="writing-atelier reading-atelier flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/reading" className="writing-back">
            <ArrowLeft className="size-4 shrink-0" />
            {t("backToList")}
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="route-primary-cta" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="size-4" aria-hidden />
              {t("generateExercises")}
            </Button>
            {data.hasOriginalFile ? (
              <a
                href={`/api/reading/documents/${passageId}/download`}
                className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
              >
                <Download className="size-4" />
                {t("downloadOriginal")}
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletePassageOpen(true)}
            >
              <Trash2 className="size-4" />
              {tc("delete")}
            </Button>
          </div>
        </div>

        <header className="writing-hero !mb-0">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{data.title}</h1>
            <p className="writing-brand-lede">
              {t("wordCount", { count: data.wordCount })} ·{" "}
              {data.language.toUpperCase()}
            </p>
          </div>
        </header>

        <article className="whitespace-pre-wrap rounded-xl border border-hairline-cloud bg-surface-elevated/70 p-5 text-[0.98rem] leading-7">
          {data.body}
        </article>

        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <h2 className="writing-kicker writing-stage-kicker mb-0">
              {t("questionSets")}
            </h2>
          </div>
          {data.questionSets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline-cloud px-4 py-8 text-center">
              <p className="font-semibold">{t("noSetsYet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("noSetsDescription")}
              </p>
            </div>
          ) : (
            <div className="writing-entry-list">
              {data.questionSets.map((set) => (
                <div
                  key={set.id}
                  className="writing-entry-card flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {t(`modes.${set.exerciseMode}`)} ·{" "}
                      {t("questionCountValue", { count: set.questionCount })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`setStatus.${set.status}`)} ·{" "}
                      {formatDistanceToNow(new Date(set.createdAt), {
                        addSuffix: true,
                      })}
                      {set.passageContentVersion < data.contentVersion
                        ? ` · ${t("staleSet")}`
                        : null}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {set.status === "ready" ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/reading/${passageId}/practice?set=${set.id}`,
                          )
                        }
                      >
                        {t("startPractice")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteSetId(set.id)}
                      disabled={isPending}
                      aria-label={t("deleteSet")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <GenerateReadingDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        passageId={passageId}
        defaultLanguage={data.language}
        workspaceId={workspaceId}
      />

      <ConfirmDeleteDialog
        open={deletePassageOpen}
        onOpenChange={setDeletePassageOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", { title: data.title })}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        pending={isPending}
        onConfirm={handleDeletePassage}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteSetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteSetId(null);
        }}
        title={t("deleteSet")}
        description={t("deleteSetDescription")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        pending={isPending}
        onConfirm={handleDeleteSet}
      />
    </PageShell>
  );
}
