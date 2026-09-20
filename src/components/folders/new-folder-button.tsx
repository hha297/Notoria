"use client";

import { FolderPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFolderWorkspace } from "@/components/folders/folder-workspace";

type NewFolderButtonProps = {
  onClick?: () => void;
  className?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
};

export function NewFolderButton({
  onClick,
  className,
  variant = "outline",
  size = "default",
}: NewFolderButtonProps) {
  const t = useTranslations("folders");
  const workspace = useFolderWorkspace();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={onClick ?? workspace?.openCreate}
      disabled={!onClick && !workspace}
      data-tutorial="folder-new"
    >
      <FolderPlus className="size-4" />
      {t("new")}
    </Button>
  );
}
