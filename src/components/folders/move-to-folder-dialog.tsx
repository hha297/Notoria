"use client";

import { useMemo, useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { childrenOf, wouldCreateCycle } from "@/lib/folders/tree";
import type { FolderListItem, FolderMoveItemType } from "@/lib/folders/types";
import { cn } from "@/lib/utils";

type MoveToFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderListItem[];
  itemType: FolderMoveItemType;
  itemId: string;
  currentFolderId: string | null;
  pending?: boolean;
  onMove: (folderId: string | null) => void;
};

function FolderOption({
  folders,
  folder,
  depth,
  selectedId,
  disabledIds,
  onSelect,
}: {
  folders: FolderListItem[];
  folder: FolderListItem;
  depth: number;
  selectedId: string | null;
  disabledIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const disabled = disabledIds.has(folder.id);
  const selected = selectedId === folder.id;
  const children = childrenOf(folders, folder.id);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(folder.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
          disabled
            ? "cursor-not-allowed text-muted-foreground/50"
            : "cursor-pointer hover:bg-muted",
          selected && !disabled && "bg-accent-lime/20 font-medium text-ink",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {selected ? (
          <FolderOpen className="size-4 text-amber-500" />
        ) : (
          <Folder className="size-4 text-amber-500" />
        )}
        <span className="truncate">{folder.name}</span>
      </button>
      {children.map((child) => (
        <FolderOption
          key={child.id}
          folders={folders}
          folder={child}
          depth={depth + 1}
          selectedId={selectedId}
          disabledIds={disabledIds}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  itemType,
  itemId,
  currentFolderId,
  pending = false,
  onMove,
}: MoveToFolderDialogProps) {
  const t = useTranslations("folders");
  const tc = useTranslations("common");
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);

  const disabledIds = useMemo(() => {
    const ids = new Set<string>();
    if (itemType === "folder") {
      ids.add(itemId);
      for (const folder of folders) {
        if (wouldCreateCycle(folders, itemId, folder.id)) {
          ids.add(folder.id);
        }
      }
    }
    return ids;
  }, [folders, itemId, itemType]);

  const roots = childrenOf(folders, null);

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    if (next) setSelectedId(currentFolderId);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{t("moveTitle")}</DialogTitle>
          <DialogDescription>{t("moveDescription")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-hairline-cloud py-1">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted",
              selectedId === null && "bg-accent-lime/20 font-medium text-ink",
            )}
          >
            <FolderOpen className="size-4 text-amber-500" />
            {t("root")}
          </button>
          {roots.map((folder) => (
            <FolderOption
              key={folder.id}
              folders={folders}
              folder={folder}
              depth={1}
              selectedId={selectedId}
              disabledIds={disabledIds}
              onSelect={setSelectedId}
            />
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onMove(selectedId)}
            disabled={pending || selectedId === currentFolderId}
          >
            {t("moveHere")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
