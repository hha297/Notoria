"use client";

import { useRouter } from "next/navigation";
import { Folder, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFolderDnd } from "@/components/folders/folder-dnd";
import { useFolderWorkspace } from "@/components/folders/folder-workspace";
import { folderDragId, folderDropId } from "@/lib/folders/dnd-ids";
import { folderHref } from "@/lib/folders/paths";
import { countItemsInFolders, descendantIds, wouldCreateCycle } from "@/lib/folders/tree";
import type { FolderListItem } from "@/lib/folders/types";
import { cn } from "@/lib/utils";

function WritingCollectionItem({
  folder,
  current,
}: {
  folder: FolderListItem;
  current: boolean;
}) {
  const t = useTranslations("folders");
  const router = useRouter();
  const workspace = useFolderWorkspace();
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
  const nestedIds = workspace
    ? [folder.id, ...descendantIds(workspace.folders, folder.id)]
    : [folder.id];
  const itemCount = workspace
    ? countItemsInFolders(workspace.items, nestedIds)
    : 0;

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
    if (!workspace) return;
    router.push(folderHref(workspace.section, folder.id));
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "writing-collection-item group",
        current && "is-current",
        isDragging && "opacity-40",
        isOver && !dropDisabled && "is-over",
      )}
    >
      <button
        type="button"
        className="writing-collection-open"
        onClick={handleOpen}
      >
        <span className="writing-collection-icon" aria-hidden="true">
          <Folder className="size-5" fill="currentColor" />
        </span>
        <span className="writing-collection-copy">
          <span className="writing-collection-name">{folder.name}</span>
          <span className="writing-collection-count">
            {t("itemCount", { count: itemCount })}
          </span>
        </span>
      </button>
      {workspace ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("folderActions")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-xs" }),
              "shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={handleOpen}>{t("open")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => workspace.onRenameFolder(folder)}>
              {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => workspace.onMoveFolder(folder)}>
              {t("move")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => workspace.onDeleteFolder(folder)}
            >
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function WritingCollections({
  currentFolderId,
}: {
  currentFolderId: string | null;
}) {
  const workspace = useFolderWorkspace();
  const section =
    workspace?.section === "theory"
      ? "theory"
      : workspace?.section === "listening"
        ? "listening"
        : "writing";
  const t = useTranslations(section);
  const tFolders = useTranslations("folders");
  const folders = workspace?.visibleFolders ?? [];

  return (
    <nav className="writing-collections" aria-label={t("collections")}>
      <div className="writing-collections-head">
        <p className="writing-kicker">{t("collections")}</p>
        <NewFolderButton
          variant="outline"
          size="sm"
          className="writing-spine-folder"
        />
      </div>
      <div className="writing-collection-list">
        {folders.map((folder) => (
          <WritingCollectionItem
            key={folder.id}
            folder={folder}
            current={folder.id === currentFolderId}
          />
        ))}
        {workspace?.searchQuery && folders.length === 0 ? (
          <p className="text-xs text-muted-foreground">{tFolders("foldersHeading")}</p>
        ) : null}
      </div>
    </nav>
  );
}
