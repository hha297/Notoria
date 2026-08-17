"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
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
import {
  DEFAULT_EXPORT_OPTIONS,
  exportTheoryNote,
  type ExportFormat,
} from "@/lib/writing/export";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";

type TheoryExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | null;
  doc: JSONContent;
};

function RadioOption({
  id,
  name,
  value,
  checked,
  label,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        checked
          ? "border-accent-lime/50 bg-accent-lime/10 text-ink"
          : "border-hairline-cloud hover:bg-muted/40",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-[var(--accent-lime)]"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

export function TheoryExportDialog({
  open,
  onOpenChange,
  title,
  description,
  doc,
}: TheoryExportDialogProps) {
  const t = useTranslations("theory.export");
  const tc = useTranslations("common");
  const { openUpgrade } = useProAccess();
  const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_OPTIONS.format);
  const [isExporting, setIsExporting] = useState(false);

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
            <div className="grid gap-2">
              <RadioOption
                id="theory-export-pdf"
                name="theory-export-format"
                value="pdf"
                checked={format === "pdf"}
                label={t("formatPdf")}
                onChange={() => setFormat("pdf")}
              />
              <RadioOption
                id="theory-export-docx"
                name="theory-export-format"
                value="docx"
                checked={format === "docx"}
                label={t("formatDocx")}
                onChange={() => setFormat("docx")}
              />
            </div>
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
