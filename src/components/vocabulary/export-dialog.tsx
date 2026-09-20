"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import {
  ExportFormatOptions,
  ExportOptionChip,
} from "@/components/export/export-format-options";
import { ExportSheet, ExportSheetSection } from "@/components/export/export-sheet";
import { Button } from "@/components/ui/button";
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
  const canExport = words.length > 0;

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
    if (!canExport) return;
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
    <ExportSheet
      open={open}
      onOpenChange={onOpenChange}
      surface="vocabulary"
      preventClose={isExporting}
      kicker={t("kicker")}
      title={workspaceName.trim() || t("title")}
      description={summary}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting || !canExport}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t("confirm")}
          </Button>
        </>
      }
    >
      <div
        className={cn(
          "space-y-5",
          isExporting && "pointer-events-none opacity-55",
        )}
      >
        <ExportSheetSection label={t("format")}>
          <ExportFormatOptions
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
            hints={{
              pdf: t("formatPdfHint"),
              docx: t("formatDocxHint"),
              csv: t("formatCsvHint"),
            }}
          />
        </ExportSheetSection>

        <ExportSheetSection label={t("content")}>
          <div className="export-option-list">
            <ExportOptionChip
              checked={options.includePartOfSpeech}
              label={t("includePartOfSpeech")}
              onChange={(checked) =>
                setOptions((current) => ({
                  ...current,
                  includePartOfSpeech: checked,
                }))
              }
            />
            <ExportOptionChip
              checked={options.includeTags}
              label={t("includeTags")}
              onChange={(checked) =>
                setOptions((current) => ({
                  ...current,
                  includeTags: checked,
                }))
              }
            />
            <ExportOptionChip
              checked={options.includeNotes}
              label={t("includeNotes")}
              onChange={(checked) =>
                setOptions((current) => ({
                  ...current,
                  includeNotes: checked,
                }))
              }
            />
            <ExportOptionChip
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
        </ExportSheetSection>
      </div>

      {isExporting ? (
        <div className="export-progress">
          <div className="export-progress-meta">
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
    </ExportSheet>
  );
}
