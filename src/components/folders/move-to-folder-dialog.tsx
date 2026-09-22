"use client";

import { useMemo, useState } from "react";
import { Folder, FolderOpen, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import moveStyles from "@/components/style/folders/move.module.css";
import { mx } from "@/lib/css-module";
import { childrenOf, wouldCreateCycle } from "@/lib/folders/tree";
import type {
  FolderListItem,
  FolderMoveItemType,
  FolderSection,
} from "@/lib/folders/types";

type MoveToFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderListItem[];
  section: FolderSection;
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
  const Icon = selected ? FolderOpen : Folder;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(folder.id)}
        data-selected={selected && !disabled ? "true" : undefined}
        className={mx(moveStyles, "option")}
        style={{ paddingLeft: `${0.65 + depth * 0.85}rem` }}
      >
        <Icon className={mx(moveStyles, "optionIcon size-4")} aria-hidden />
        <span className={mx(moveStyles, "optionLabel")}>{folder.name}</span>
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
  section,
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
  const unchanged = selectedId === currentFolderId;

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    if (next) setSelectedId(currentFolderId);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        data-move-section={section}
        className={mx(moveStyles, "sheet sm:max-w-md")}
      >
        <header className={mx(moveStyles, "header")}>
          <p className={mx(moveStyles, "kicker")}>{t("move")}</p>
          <DialogTitle className={mx(moveStyles, "title")}>
            {t("moveTitle")}
          </DialogTitle>
          <DialogDescription className={mx(moveStyles, "lede")}>
            {t("moveDescription")}
          </DialogDescription>
        </header>

        <div className={mx(moveStyles, "body")}>
          <div className={mx(moveStyles, "tree")} role="listbox">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              data-selected={selectedId === null ? "true" : undefined}
              className={mx(moveStyles, "option")}
            >
              <FolderOpen
                className={mx(moveStyles, "optionIcon size-4")}
                aria-hidden
              />
              <span className={mx(moveStyles, "optionLabel")}>{t("root")}</span>
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
        </div>

        <div className={mx(moveStyles, "footer")}>
          <Button
            type="button"
            variant="outline"
            className={mx(moveStyles, "cancel")}
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            className={mx(moveStyles, "cta")}
            onClick={() => onMove(selectedId)}
            disabled={pending || unchanged}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {t("moveHere")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
