"use client";

import { useRouter } from "next/navigation";
import { Folder, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFolderDnd } from "@/components/folders/folder-dnd";
import { folderDragId, folderDropId } from "@/lib/folders/dnd-ids";
import { folderHref } from "@/lib/folders/paths";
import { wouldCreateCycle } from "@/lib/folders/tree";
import type { FolderListItem, FolderSection } from "@/lib/folders/types";
import { cn } from "@/lib/utils";

type FolderCardProps = {
  folder: FolderListItem;
  section: FolderSection;
  itemCount: number;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
};

export function FolderCard({
  folder,
  section,
  itemCount,
  onRename,
  onDelete,
  onMove,
}: FolderCardProps) {
  const t = useTranslations("folders");
  const router = useRouter();
  const dnd = useFolderDnd();
  const active = dnd?.activeId ? dnd.activeId : null;
  const draggingFolderId = active?.startsWith("folder:")
    ? active.slice("folder:".length)
    : null;
  const dropDisabled = Boolean(
    draggingFolderId &&
      dnd &&
      wouldCreateCycle(dnd.folders, draggingFolderId, folder.id),
  );

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: folderDragId(folder.id),
    data: { type: "folder", id: folder.id },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: folderDropId(folder.id),
    disabled: dropDisabled,
    data: { folderId: folder.id },
  });

  function setNodeRef(node: HTMLElement | null) {
    setDragRef(node);
    setDropRef(node);
  }

  function handleOpen() {
    if (dnd?.skipNextClick()) return;
    router.push(folderHref(section, folder.id));
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-xl border border-hairline-cloud bg-card px-3 py-3 ring-hairline-cloud transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(31,22,51,0.18)] hover:ring-1 hover:ring-accent-lime/40",
        isDragging && "opacity-40",
        isOver && !dropDisabled && "ring-2 ring-accent-lime",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={handleOpen}
      >
        <div className="flex size-10 items-center justify-center rounded-xl border border-hairline-cloud bg-amber-50">
          <Folder className="size-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{folder.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("itemCount", { count: itemCount })}
          </p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("folderActions")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={handleOpen}>{t("open")}</DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>{t("rename")}</DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}>{t("move")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
