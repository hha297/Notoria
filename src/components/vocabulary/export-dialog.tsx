"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { CheckboxOption } from "@/components/export/checkbox-option";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isPaidDocumentFormat } from "@/lib/auth/paid-access";
import {
  getDefaultExportFormat,
  VOCABULARY_EXPORT_FORMATS,
} from "@/lib/export/formats";
import {
  DEFAULT_VOCABULARY_EXPORT_OPTIONS,
  exportVocabulary,
  type VocabularyExportFormat,
  type VocabularyExportOptions,
  type VocabularyExportProgress,
} from "@/lib/vocabulary/export";
import type { VocabularyExportSourceWord } from "@/lib/vocabulary/export/build-document";

type VocabularyExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  words: VocabularyExportSourceWord[];
};

function progressPercent(progress: VocabularyExportProgress | null) {
  if (!progress || progress.total <= 0) return 8;
  if (progress.phase === "preparing") {
    return Math.max(4, Math.round((progress.current / progress.total) * 18));
  }
  if (progress.phase === "generating") {
    return 18 + Math.round((progress.current / progress.total) * 72);
  }
  return 94;
}

export function VocabularyExportDialog({
  open,
  onOpenChange,
  workspaceName,
  words,
}: VocabularyExportDialogProps) {
  const t = useTranslations("vocabulary.export");
  const tVocab = useTranslations("vocabulary");
  const tc = useTranslations("common");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [options, setOptions] = useState<VocabularyExportOptions>(
    DEFAULT_VOCABULARY_EXPORT_OPTIONS,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<VocabularyExportProgress | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setOptions((current) => ({
      ...current,
      format: getDefaultExportFormat(
        hasProAccess,
        VOCABULARY_EXPORT_FORMATS,
      ) as VocabularyExportFormat,
    }));
  }, [open, hasProAccess]);

  useEffect(() => {
    if (open) return;
    setIsExporting(false);
    setProgress(null);
  }, [open]);

  const countLabel = useMemo(
    () => t("rowCount", { count: words.length }),
    [t, words.length],
  );

  const summary = options.includeNotes
    ? t("summaryWithNote", { count: words.length })
    : countLabel;

  function setFormat(format: VocabularyExportFormat) {
    if (!hasProAccess && isPaidDocumentFormat(format)) {
      openUpgrade();
      return;
    }
    setOptions((current) => ({ ...current, format }));
  }

  async function handleExport() {
    setIsExporting(true);
    setProgress({ phase: "preparing", current: 0, total: words.length });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      await exportVocabulary({
        workspaceName,
        words,
        options,
        labels: {
          documentHeading: t("documentHeading"),
          workspaceLabel: t("workspaceLabel"),
          notesHeading: t("columns.notes"),
          wordCount: countLabel,
          uncategorizedPos: tVocab("uncategorizedPos"),
          formatWordCount: (count) => t("rowCount", { count }),
          columns: {
            word: t("columns.word"),
            partOfSpeech: t("columns.partOfSpeech"),
            meanings: t("columns.meanings"),
            tags: t("columns.tags"),
            notes: t("columns.notes"),
            updated: t("columns.updated"),
          },
        },
        onProgress: setProgress,
      });
      toast.success(t("success"));
      onOpenChange(false);
    } catch (error) {
      console.error("[vocabulary-export]", error);
      if (error instanceof Error && error.message === "PRO_REQUIRED") {
        openUpgrade();
      } else if (error instanceof Error && error.message === "EMPTY_EXPORT") {
        toast.error(t("empty"));
      } else {
        toast.error(t("failed"));
      }
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }

  const progressLabel =
    progress?.phase === "preparing"
      ? t("preparing")
      : progress?.phase === "saving"
        ? t("writingFile")
        : t("generating");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isExporting && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!isExporting}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="font-heading text-lg">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              "space-y-4",
              isExporting && "pointer-events-none opacity-60",
            )}
          >
            <div className="space-y-2">
              <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("format")}
              </Label>
              <ExportFormatOptions
                compact
                idPrefix="vocab-export"
                name="vocab-export-format"
                formats={VOCABULARY_EXPORT_FORMATS}
                value={options.format}
                onChange={(format) => setFormat(format as VocabularyExportFormat)}
                hasProAccess={hasProAccess}
                onLockedSelect={openUpgrade}
                labels={{
                  pdf: t("formatPdf"),
                  docx: t("formatDocx"),
                  csv: t("formatCsv"),
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("content")}
              </Label>
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
              </div>
            </div>
          </div>

          {isExporting ? (
            <div className="space-y-2 rounded-lg border border-hairline-cloud bg-muted/20 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{progressLabel}</span>
                {progress ? (
                  <span>
                    {t("progressCount", {
                      current: progress.current,
                      total: progress.total,
                    })}
                  </span>
                ) : null}
              </div>
              <Progress value={progressPercent(progress)} />
            </div>
          ) : null}
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
