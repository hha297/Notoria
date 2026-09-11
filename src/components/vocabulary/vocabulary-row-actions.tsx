"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { useInvalidateWorkspaceQueries } from "@/hooks/use-invalidate-workspace-queries";
import { deleteVocabularyWord } from "@/lib/actions/vocabulary";

type VocabularyRowActionsProps = {
  wordId: string;
  word: string;
  workspaceId: string;
  onEdit: () => void;
};

export function VocabularyRowActions({
  wordId,
  word,
  workspaceId,
  onEdit,
}: VocabularyRowActionsProps) {
  const t = useTranslations("common");
  const tv = useTranslations("vocabulary");
  const te = useTranslations("errors");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { removeVocabularyWord } = useInvalidateWorkspaceQueries(workspaceId);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteVocabularyWord(wordId);
        removeVocabularyWord(wordId);
        toast.success(tv("deleted"));
        setDeleteOpen(false);
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <>
      <div className="flex justify-end gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-ink"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit();
          }}
          disabled={isPending}
        >
          <Pencil className="size-3.5" />
          <span className="sr-only">{t("edit")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-ink"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDeleteOpen(true);
          }}
          disabled={isPending}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">{t("delete")}</span>
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={tv("deleteConfirmTitle")}
        description={tv("deleteConfirmDescription", { word })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
