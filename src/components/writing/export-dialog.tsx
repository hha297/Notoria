"use client";

import formatStyles from "@/components/style/export/export-format.module.css";
import { mx } from "@/lib/css-module";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

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
  const [progressValue, setProgressValue] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

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
    setProgressValue(8);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setProgressValue((value) => (value >= 90 ? value : value + 4));
    }, 180);

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
      setProgressValue(100);
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
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      setIsExporting(false);
      setProgressValue(0);
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
      <div
        className={cn(
          "space-y-5",
          isExporting && "pointer-events-none opacity-55",
        )}
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
            <div className={mx(formatStyles, "export-option-list")}>
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
      </div>

      {isExporting ? (
        <div className={mx(formatStyles, "export-progress")}>
          <div className={mx(formatStyles, "export-progress-meta")}>
            <span>
              {progressValue >= 90 ? t("writingFile") : t("preparing")}
            </span>
            <span>
              {t("progressCount", {
                current: Math.min(Math.round(progressValue / 10), 10),
                total: 10,
              })}
            </span>
          </div>
          <Progress value={progressValue} />
        </div>
      ) : null}
    </ExportSheet>
  );
}
