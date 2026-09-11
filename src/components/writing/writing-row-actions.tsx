"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { MoveItemButton } from "@/components/folders/move-item-button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useInvalidateWorkspaceQueries } from "@/hooks/use-invalidate-workspace-queries";
import {
  deleteWritingDocument,
  getWritingDocument,
} from "@/lib/actions/writing";
import {
  createDefaultEditorState,
  parseWritingContent,
  writingContentToEditorState,
  type WritingEditorState,
} from "@/lib/writing/content";
import { cn } from "@/lib/utils";

type WritingRowActionsProps = {
  id: string;
  title: string;
  description?: string | null;
  folderId?: string | null;
  workspaceId: string;
};

export function WritingRowActions({
  id,
  title,
  description,
  folderId,
  workspaceId,
}: WritingRowActionsProps) {
  const t = useTranslations("common");
  const tw = useTranslations("writing");
  const te = useTranslations("errors");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editorState, setEditorState] = useState<WritingEditorState>(
    createDefaultEditorState(),
  );
  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { removeWritingDocument } = useInvalidateWorkspaceQueries(workspaceId);

  async function handleExportClick() {
    setIsLoadingExport(true);
    try {
      const document = await getWritingDocument(id);
      if (!document) {
        toast.error(te("generic"));
        return;
      }
      setEditorState(
        writingContentToEditorState(parseWritingContent(document.content)),
      );
      setExportOpen(true);
    } catch {
      toast.error(te("generic"));
    } finally {
      setIsLoadingExport(false);
    }
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteWritingDocument(id);
        removeWritingDocument(id);
        toast.success(tw("deleted"));
        setDeleteOpen(false);
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
          icon={
            isLoadingExport ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )
          }
          onClick={() => {
            void handleExportClick();
          }}
          disabled={isPending || isLoadingExport}
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

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={tw("deleteConfirmTitle")}
        description={tw("deleteConfirmDescription", { title })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={isPending}
        onConfirm={handleDelete}
      />

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
