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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/db/schema";

type WorkspaceActionsMenuProps = {
  workspace: Workspace;
  workspaces: Workspace[];
  className?: string;
};

export function WorkspaceActionsMenu({
  workspace,
  workspaces,
  className,
}: WorkspaceActionsMenuProps) {
  const t = useTranslations("workspace");
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
            buttonVariants({ variant: "ghost" }),
            "size-10 shrink-0 rounded-none px-0 text-muted-foreground hover:bg-transparent hover:text-ink",
            className,
          )}
          aria-label={t("manageNamed", { name: workspace.name })}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {t("manageNamed", { name: workspace.name })}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {t("editAction")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("deleteAction")}
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
