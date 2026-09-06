"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteVocabularyWord } from "@/lib/actions/vocabulary";

type VocabularyRowActionsProps = {
  wordId: string;
  word: string;
  onEdit: () => void;
};

export function VocabularyRowActions({
  wordId,
  word,
  onEdit,
}: VocabularyRowActionsProps) {
  const t = useTranslations("common");
  const tv = useTranslations("vocabulary");
  const te = useTranslations("errors");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteVocabularyWord(wordId);
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{tv("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {tv("deleteConfirmDescription", { word })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
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
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
