"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { MoveItemButton } from "@/components/folders/move-item-button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { TheoryExportDialog } from "@/components/theory/export-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useInvalidateWorkspaceQueries } from "@/hooks/use-invalidate-workspace-queries";
import { deleteTheoryNote, getTheoryNote } from "@/lib/actions/theory";
import {
  createEmptyTheoryDoc,
  parseTheoryContent,
} from "@/lib/theory/content";
import { cn } from "@/lib/utils";

type TheoryRowActionsProps = {
  id: string;
  title: string;
  description?: string | null;
  folderId?: string | null;
  workspaceId: string;
};

export function TheoryRowActions({
  id,
  title,
  description,
  folderId,
  workspaceId,
}: TheoryRowActionsProps) {
  const t = useTranslations("common");
  const tt = useTranslations("theory");
  const te = useTranslations("errors");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDoc, setExportDoc] = useState<JSONContent>(createEmptyTheoryDoc);
  const [exportDescription, setExportDescription] = useState(description ?? "");
  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { removeTheoryNote } = useInvalidateWorkspaceQueries(workspaceId);

  async function handleExportClick() {
    setIsLoadingExport(true);
    try {
      const note = await getTheoryNote(id);
      if (!note) {
        toast.error(te("generic"));
        return;
      }
      const parsed = parseTheoryContent(note.content);
      setExportDoc(parsed.doc);
      setExportDescription(parsed.description || description || "");
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
        await deleteTheoryNote(id);
        removeTheoryNote(id);
        toast.success(tt("deleted"));
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
          <span className="sr-only">{tt("export.button")}</span>
        </LockedFeatureButton>
        <Link
          href={`/theory/${id}/edit`}
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
        title={tt("deleteConfirmTitle")}
        description={tt("deleteConfirmDescription", { title })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={isPending}
        onConfirm={handleDelete}
      />

      <TheoryExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        description={exportDescription}
        doc={exportDoc}
      />
    </>
  );
}
