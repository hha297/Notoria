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
import styles from "@/components/style/export/export.module.css";
import { mx } from "@/lib/css-module";

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
        className={mx(styles, "export-sheet sm:max-w-lg")}
        data-export-surface={surface}
        data-writing-kind={writingKind}
        data-theory-category={theoryCategory || undefined}
      >
        <DialogHeader className={mx(styles, "export-sheet-header")}>
          <p className={mx(styles, "export-sheet-kicker")}>{kicker}</p>
          <DialogTitle className={mx(styles, "export-sheet-title")}>
            {title}
          </DialogTitle>
          <DialogDescription className={mx(styles, "export-sheet-lede")}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className={mx(styles, "export-sheet-body")}>{children}</div>
        <DialogFooter
          className={mx(
            styles,
            "export-sheet-footer mx-0 mb-0 rounded-none border-t bg-transparent p-0 pt-3 sm:justify-end",
          )}
        >
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
    <section className={mx(styles, "export-sheet-section", className)}>
      <p className={mx(styles, "export-sheet-label")}>{label}</p>
      {children}
    </section>
  );
}
