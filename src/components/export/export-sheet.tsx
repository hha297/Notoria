"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ExportSheetSurface = "writing" | "theory" | "vocabulary";

type ExportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kicker: string;
  title: string;
  description: string;
  surface: ExportSheetSurface;
  writingKind?: "rich_document" | "question_set";
  theoryCategory?: string;
  preventClose?: boolean;
  children: ReactNode;
  footer: ReactNode;
};

export function ExportSheet({
  open,
  onOpenChange,
  kicker,
  title,
  description,
  surface,
  writingKind,
  theoryCategory,
  preventClose = false,
  children,
  footer,
}: ExportSheetProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (preventClose && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!preventClose}
        className="export-sheet sm:max-w-lg"
        data-export-surface={surface}
        data-writing-kind={writingKind}
        data-theory-category={theoryCategory || undefined}
      >
        <DialogHeader className="export-sheet-header">
          <p className="export-sheet-kicker">{kicker}</p>
          <DialogTitle className="export-sheet-title">{title}</DialogTitle>
          <DialogDescription className="export-sheet-lede">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="export-sheet-body">{children}</div>
        <DialogFooter className="export-sheet-footer mx-0 mb-0 rounded-none border-t bg-transparent p-0 pt-3 sm:justify-end">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExportSheetSection({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("export-sheet-section", className)}>
      <p className="export-sheet-label">{label}</p>
      {children}
    </section>
  );
}
