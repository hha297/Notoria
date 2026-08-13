"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
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
import type { Workspace } from "@/db/schema";
import { deleteWorkspace } from "@/lib/actions/workspaces";

type DeleteWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  isLastWorkspace: boolean;
};

export function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  isLastWorkspace,
}: DeleteWorkspaceDialogProps) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteWorkspace(workspace.id);
        toast.success(t("deleted"));
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {isLastWorkspace
              ? t("deleteLastDescription", { name: workspace.name })
              : t("deleteDescription", { name: workspace.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
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
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
