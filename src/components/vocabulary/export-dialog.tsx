"use client";

import { useMemo, useState } from "react";
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
  DEFAULT_VOCABULARY_EXPORT_OPTIONS,
  exportVocabulary,
  type VocabularyExportFormat,
  type VocabularyExportOptions,
} from "@/lib/vocabulary/export";
import type { VocabularyExportSourceWord } from "@/lib/vocabulary/export/build-document";
import { cn } from "@/lib/utils";

type VocabularyExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  words: VocabularyExportSourceWord[];
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

export function VocabularyExportDialog({
  open,
  onOpenChange,
  workspaceName,
  words,
}: VocabularyExportDialogProps) {
  const t = useTranslations("vocabulary.export");
  const tc = useTranslations("common");
  const [options, setOptions] = useState<VocabularyExportOptions>(
    DEFAULT_VOCABULARY_EXPORT_OPTIONS,
  );
  const [isExporting, setIsExporting] = useState(false);

  const countLabel = useMemo(
    () => t("rowCount", { count: words.length }),
    [t, words.length],
  );

  function setFormat(format: VocabularyExportFormat) {
    setOptions((current) => ({ ...current, format }));
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportVocabulary({
        workspaceName,
        words,
        options,
        labels: {
          documentHeading: t("documentHeading"),
          workspaceLabel: t("workspaceLabel"),
          columns: {
            word: t("columns.word"),
            partOfSpeech: t("columns.partOfSpeech"),
            meanings: t("columns.meanings"),
            tags: t("columns.tags"),
            notes: t("columns.notes"),
            updated: t("columns.updated"),
          },
        },
      });
      toast.success(t("success"));
      onOpenChange(false);
    } catch (error) {
      console.error("[vocabulary-export]", error);
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
          <DialogDescription>
            {t("description")} {countLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>{t("format")}</Label>
            <div className="grid gap-2">
              <RadioOption
                id="vocab-export-pdf"
                name="vocab-export-format"
                value="pdf"
                checked={options.format === "pdf"}
                label={t("formatPdf")}
                onChange={() => setFormat("pdf")}
              />
              <RadioOption
                id="vocab-export-csv"
                name="vocab-export-format"
                value="csv"
                checked={options.format === "csv"}
                label={t("formatCsv")}
                onChange={() => setFormat("csv")}
              />
              <RadioOption
                id="vocab-export-docx"
                name="vocab-export-format"
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
                id="vocab-export-pos"
                checked={options.includePartOfSpeech}
                label={t("includePartOfSpeech")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    includePartOfSpeech: checked,
                  }))
                }
              />
              <CheckboxOption
                id="vocab-export-tags"
                checked={options.includeTags}
                label={t("includeTags")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    includeTags: checked,
                  }))
                }
              />
              <CheckboxOption
                id="vocab-export-updated"
                checked={options.includeLastUpdated}
                label={t("includeLastUpdated")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    includeLastUpdated: checked,
                  }))
                }
              />
              <CheckboxOption
                id="vocab-export-notes"
                checked={options.includeNotes}
                label={t("includeNotes")}
                onChange={(checked) =>
                  setOptions((current) => ({
                    ...current,
                    includeNotes: checked,
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
