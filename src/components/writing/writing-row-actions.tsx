"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { MoveItemButton } from "@/components/folders/move-item-button";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteWritingDocument } from "@/lib/actions/writing";
import {
  parseWritingContent,
  writingContentToEditorState,
} from "@/lib/writing/content";
import { cn } from "@/lib/utils";

type WritingRowActionsProps = {
  id: string;
  title: string;
  description?: string | null;
  content: unknown;
  folderId?: string | null;
};

export function WritingRowActions({
  id,
  title,
  description,
  content,
  folderId,
}: WritingRowActionsProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tw = useTranslations("writing");
  const te = useTranslations("errors");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const editorState = writingContentToEditorState(parseWritingContent(content));

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteWritingDocument(id);
        toast.success(tw("deleted"));
        setDeleteOpen(false);
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <>
      <div
        className="flex justify-end gap-1"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <MoveItemButton id={id} title={title} folderId={folderId} />
        <LockedFeatureButton
          variant="ghost"
          size="icon-sm"
          icon={<Download className="size-4" />}
          onClick={() => setExportOpen(true)}
          disabled={isPending}
        >
          <span className="sr-only">{tw("export.button")}</span>
        </LockedFeatureButton>
        <Link
          href={`/writing/${id}/edit`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <Pencil className="size-4" />
          <span className="sr-only">{t("edit")}</span>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">{t("delete")}</span>
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{tw("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {tw("deleteConfirmDescription", { title })}
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

      <WritingExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        description={description}
        editorState={editorState}
      />
    </>
  );
}
