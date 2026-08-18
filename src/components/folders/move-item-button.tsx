"use client";

import { FolderInput } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFolderWorkspace } from "@/components/folders/folder-workspace";

type MoveItemButtonProps = {
  id: string;
  title: string;
  folderId?: string | null;
};

export function MoveItemButton({ id, title, folderId }: MoveItemButtonProps) {
  const t = useTranslations("folders");
  const workspace = useFolderWorkspace();

  if (!workspace) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        workspace.openMoveItem({ id, title, folderId });
      }}
    >
      <FolderInput className="size-4" />
      <span className="sr-only">{t("move")}</span>
    </Button>
  );
}
