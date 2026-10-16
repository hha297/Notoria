"use client";

import { FolderPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFolderWorkspace } from "@/components/folders/folder-workspace";
import { cn } from "@/lib/utils";
import type { FolderSection } from "@/lib/folders/types";

type NewFolderButtonProps = {
  onClick?: () => void;
  className?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
  /** Accent for quiet-action hover when used outside FolderWorkspace. */
  routeAction?: string;
};

const SECTION_ROUTE_ACTION: Record<FolderSection, string> = {
  writing: "writing",
  theory: "theory",
  listening: "listen",
  reading: "read",
  inbox: "home",
};

export function NewFolderButton({
  onClick,
  className,
  variant = "outline",
  size = "default",
  routeAction: routeActionProp,
}: NewFolderButtonProps) {
  const t = useTranslations("folders");
  const workspace = useFolderWorkspace();
  const routeAction =
    routeActionProp ??
    (workspace ? SECTION_ROUTE_ACTION[workspace.section] : "writing");

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("route-quiet-action", className)}
      data-route-action={routeAction}
      onClick={onClick ?? workspace?.openCreate}
      disabled={!onClick && !workspace}
      data-tutorial="folder-new"
    >
      <FolderPlus className="size-4" />
      {t("new")}
    </Button>
  );
}
