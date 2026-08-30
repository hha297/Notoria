"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { ExportFormatOptions } from "@/components/export/export-format-options";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { isPaidDocumentFormat } from "@/lib/auth/paid-access";
import {
  DOCUMENT_EXPORT_FORMATS,
  getDefaultExportFormat,
} from "@/lib/export/formats";
import {
  DEFAULT_EXPORT_OPTIONS,
  exportTheoryNote,
  type ExportFormat,
} from "@/lib/writing/export";
import type { JSONContent } from "@tiptap/react";

type TheoryExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | null;
  doc: JSONContent;
};

export function TheoryExportDialog({
  open,
  onOpenChange,
  title,
  description,
  doc,
}: TheoryExportDialogProps) {
  const t = useTranslations("theory.export");
  const tc = useTranslations("common");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_OPTIONS.format);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormat(
      getDefaultExportFormat(hasProAccess, DOCUMENT_EXPORT_FORMATS) as ExportFormat,
    );
  }, [open, hasProAccess]);

  function handleFormatChange(nextFormat: ExportFormat) {
    if (!hasProAccess && isPaidDocumentFormat(nextFormat)) {
      openUpgrade();
      return;
    }
    setFormat(nextFormat);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportTheoryNote({
        title,
        description,
        doc,
        options: { format },
        labels: {
          documentHeading: t("documentHeading"),
          titleLabel: t("titleLabel"),
          descriptionLabel: t("descriptionLabel"),
          sectionLabel: "",
          questionLabel: "",
          exampleAnswerLabel: "",
          notesLabel: "",
        },
      });
      toast.success(t("success"));
      onOpenChange(false);
    } catch (error) {
      console.error("[theory-export]", error);
      if (error instanceof Error && error.message === "PRO_REQUIRED") {
        openUpgrade();
      } else if (error instanceof Error && error.message === "EMPTY_EXPORT") {
        toast.error(t("empty"));
      } else {
        toast.error(t("failed"));
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isExporting}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>{t("format")}</Label>
            <ExportFormatOptions
              idPrefix="theory-export"
              name="theory-export-format"
              formats={DOCUMENT_EXPORT_FORMATS}
              value={format}
              onChange={(nextFormat) => handleFormatChange(nextFormat as ExportFormat)}
              hasProAccess={hasProAccess}
              onLockedSelect={openUpgrade}
              labels={{
                pdf: t("formatPdf"),
                docx: t("formatDocx"),
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
