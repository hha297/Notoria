"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  exportWritingExercise,
  type ExportFormat,
  type ExportOptions,
} from "@/lib/writing/export";
import type { WritingEditorState } from "@/lib/writing/content";
import { cn } from "@/lib/utils";

type WritingExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  editorState: WritingEditorState;
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

function CheckboxOption({
  id,
  checked,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-input accent-[var(--accent-lime)]"
      />
      <span>{label}</span>
    </label>
  );
}

export function WritingExportDialog({
  open,
  onOpenChange,
  title,
  editorState,
}: WritingExportDialogProps) {
  const t = useTranslations("exercises.writing.export");
  const tc = useTranslations("common");
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);

  function setFormat(format: ExportFormat) {
    setOptions((current) => ({ ...current, format }));
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportWritingExercise({
        title,
        state: editorState,
        options,
        labels: {
          documentHeading: t("documentHeading"),
          titleLabel: t("titleLabel"),
          sectionLabel: t("sectionLabel"),
          questionLabel: t("questionLabel"),
          exampleAnswerLabel: t("exampleAnswerLabel"),
          notesLabel: t("notesLabel"),
        },
      });
      toast.success(t("success"));
      onOpenChange(false);
    } catch (error) {
      console.error("[writing-export]", error);
      if (error instanceof Error && error.message === "EMPTY_EXPORT") {
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
                id="export-pdf"
                name="export-format"
                value="pdf"
                checked={options.format === "pdf"}
                label={t("formatPdf")}
                onChange={() => setFormat("pdf")}
              />
              <RadioOption
                id="export-docx"
                name="export-format"
                value="docx"
                checked={options.format === "docx"}
                label={t("formatDocx")}
                onChange={() => setFormat("docx")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("options")}</Label>
            <div className="rounded-lg border border-hairline-cloud bg-muted/20 px-2 py-1">
              <CheckboxOption
                id="export-examples"
                checked={options.includeExampleAnswers}
                label={t("includeExamples")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    includeExampleAnswers: checked,
                  }))
                }
              />
              <CheckboxOption
                id="export-notes"
                checked={options.includeNotes}
                label={t("includeNotes")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    includeNotes: checked,
                  }))
                }
              />
              <CheckboxOption
                id="export-blank"
                checked={options.leaveBlankSpace}
                label={t("leaveBlankSpace")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    leaveBlankSpace: checked,
                  }))
                }
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
