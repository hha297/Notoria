"use client";

import { FolderInput, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type FolderDragDemoProps = {
  className?: string;
};

/** Compact looping demo of drag-to-folder (used in Show tutorial). */
export function FolderDragDemo({ className }: FolderDragDemoProps) {
  const t = useTranslations("folders");
  return (
    <div
      className={cn(
        "folder-drag-demo relative mx-auto flex h-16 w-full max-w-[13.5rem] items-center justify-center rounded-lg border border-dashed border-border/80 bg-background/70",
        className,
      )}
      aria-hidden
      title={t("dragTipDemo")}
    >
      <div className="folder-drag-demo-folder absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-md bg-page-accent-soft text-page-accent">
        <FolderInput className="size-3.5" />
      </div>
      <div className="folder-drag-demo-card absolute bottom-2.5 left-2.5 flex h-8 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-[0.65rem] font-medium text-ink shadow-sm">
        <GripVertical className="size-3 text-muted-foreground" />
        <span className="max-w-12 truncate">{t("dragTipCard")}</span>
      </div>
    </div>
  );
}
