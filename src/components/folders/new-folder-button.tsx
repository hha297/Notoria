"use client";

import { FolderPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFolderWorkspace } from "@/components/folders/folder-workspace";

type NewFolderButtonProps = {
  onClick?: () => void;
};

export function NewFolderButton({ onClick }: NewFolderButtonProps) {
  const t = useTranslations("folders");
  const workspace = useFolderWorkspace();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick ?? workspace?.openCreate}
      disabled={!onClick && !workspace}
      data-tutorial="folder-new"
    >
      <FolderPlus className="size-4" />
      {t("new")}
    </Button>
  );
}
