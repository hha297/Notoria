"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DeleteWorkspaceDialog } from "@/components/workspace/delete-workspace-dialog";
import { EditWorkspaceDialog } from "@/components/workspace/edit-workspace-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/db/schema";

type WorkspaceActionsMenuProps = {
  workspace: Workspace;
  workspaces: Workspace[];
};

export function WorkspaceActionsMenu({
  workspace,
  workspaces,
}: WorkspaceActionsMenuProps) {
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const occupiedLanguages = workspaces
    .filter((item) => item.id !== workspace.id)
    .map((item) => item.language);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "shrink-0",
          )}
          aria-label={t("manage")}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {tc("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {tc("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditWorkspaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspace={workspace}
        occupiedLanguages={occupiedLanguages}
      />
      <DeleteWorkspaceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspace={workspace}
        isLastWorkspace={workspaces.length <= 1}
      />
    </>
  );
}
