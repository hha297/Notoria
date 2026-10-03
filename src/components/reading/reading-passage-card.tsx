"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import { MoveItemButton } from "@/components/folders/move-item-button";
import { deleteReadingPassage } from "@/lib/actions/reading";
import { isReadingErrorCode } from "@/lib/reading/errors";
import type { ReadingPassageListItem } from "@/lib/reading/types";
import { getLanguageName } from "@/lib/languages";
import { queryKeys } from "@/lib/query/keys";

type ReadingPassageCardProps = {
  passage: ReadingPassageListItem;
  workspaceId: string;
  onDeleted?: (id: string) => void;
};

export function ReadingPassageCard({
  passage,
  workspaceId,
  onDeleted,
}: ReadingPassageCardProps) {
  const t = useTranslations("reading");
  const tc = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const href = `/reading/${passage.id}`;

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "generic";
    if (isReadingErrorCode(code)) {
      return t(`errors.${code}` as "errors.generic");
    }
    return t("errors.generic");
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteReadingPassage(passage.id);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.reading.all(workspaceId),
        });
        toast.success(t("deleted"));
        setDeleteOpen(false);
        onDeleted?.(passage.id);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const metaBits = [
    getLanguageName(passage.language),
    t("wordCount", { count: passage.wordCount }),
    t("setCount", { count: passage.questionSetCount }),
  ];

  return (
    <>
      <FolderItemDrag id={passage.id} className="writing-entry-wrap">
        <article className="writing-entry">
          <div className="writing-entry-body">
            {passage.latestSetStatus ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    passage.latestSetStatus === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {t(`status.${passage.latestSetStatus}`)}
                </Badge>
              </div>
            ) : null}
            <h3 className="writing-entry-title">
              <Link
                href={href}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {passage.title}
              </Link>
            </h3>
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
            <div className="writing-entry-cta mt-2 flex flex-wrap items-center gap-2">
              <LinkButton
                href={href}
                size="sm"
                variant="outline"
                className="route-quiet-action"
                data-route-action="read"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {t("openPassage")}
                <ArrowRight className="size-3.5" />
              </LinkButton>
            </div>
          </div>
          <div className="writing-entry-actions">
            <MoveItemButton
              id={passage.id}
              title={passage.title}
              folderId={passage.folderId}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="size-[1.15rem]" />
              <span className="sr-only">{tc("delete")}</span>
            </Button>
          </div>
        </article>
      </FolderItemDrag>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", { title: passage.title })}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}
