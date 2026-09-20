"use client";

import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import {
  ExportFormatOptions,
  ExportOptionChip,
} from "@/components/export/export-format-options";
import { ExportSheet, ExportSheetSection } from "@/components/export/export-sheet";
import { Button } from "@/components/ui/button";
import { isPaidDocumentFormat } from "@/lib/auth/paid-access";
import {
  DOCUMENT_EXPORT_FORMATS,
  getDefaultExportFormat,
} from "@/lib/export/formats";
import {
  DEFAULT_EXPORT_OPTIONS,
  exportWritingExercise,
  writingEditorHasExportableContent,
  type ExportFormat,
  type ExportOptions,
} from "@/lib/writing/export";
import type { WritingEditorState } from "@/lib/writing/content";

type WritingExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | null;
  editorState: WritingEditorState;
};

export function WritingExportDialog({
  open,
  onOpenChange,
  title,
  description,
  editorState,
}: WritingExportDialogProps) {
  const t = useTranslations("writing.export");
  const tc = useTranslations("common");
  const { hasProAccess, openUpgrade } = useProAccess();
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const canExport = writingEditorHasExportableContent(editorState);
  const isQuestionSet = editorState.mode === "question_set";
  const pieceTitle = title.trim() || t("untitled");

  useEffect(() => {
    if (!open) return;
    setOptions((current) => ({
      ...current,
      format: getDefaultExportFormat(
        hasProAccess,
        DOCUMENT_EXPORT_FORMATS,
      ) as ExportFormat,
    }));
  }, [open, hasProAccess]);

  function setFormat(format: ExportFormat) {
    if (!hasProAccess && isPaidDocumentFormat(format)) {
      openUpgrade();
      return;
    }
    setOptions((current) => ({ ...current, format }));
  }

  async function handleExport() {
    if (!canExport) return;
    setIsExporting(true);
    try {
      await exportWritingExercise({
        title,
        description,
        state: editorState,
        options,
        labels: {
          documentHeading: t("documentHeading"),
          titleLabel: t("titleLabel"),
          descriptionLabel: t("descriptionLabel"),
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
    <ExportSheet
      open={open}
      onOpenChange={onOpenChange}
      surface="writing"
      writingKind={editorState.mode}
      preventClose={isExporting}
      kicker={t("kicker")}
      title={pieceTitle}
      description={
        isQuestionSet ? t("descriptionQuestionSet") : t("descriptionDocument")
      }
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
      <ExportSheetSection label={t("format")}>
        <ExportFormatOptions
          idPrefix="writing-export"
          name="writing-export-format"
          formats={DOCUMENT_EXPORT_FORMATS}
          value={options.format}
          onChange={(format) => setFormat(format as ExportFormat)}
          hasProAccess={hasProAccess}
          onLockedSelect={openUpgrade}
          labels={{
            pdf: t("formatPdf"),
            docx: t("formatDocx"),
          }}
          hints={{
            pdf: t("formatPdfHint"),
            docx: t("formatDocxHint"),
          }}
        />
      </ExportSheetSection>

      {isQuestionSet ? (
        <ExportSheetSection label={t("options")}>
          <div className="export-option-list">
            <ExportOptionChip
              checked={options.includeExampleAnswers}
              label={t("includeExamples")}
              onChange={(checked) =>
                setOptions((current) => ({
                  ...current,
                  includeExampleAnswers: checked,
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
        </ExportSheetSection>
      ) : null}
    </ExportSheet>
  );
}
