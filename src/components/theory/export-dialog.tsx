"use client";

import formatStyles from "@/components/style/export/export-format.module.css";
import { mx } from "@/lib/css-module";
import { Download, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { ExportAppearanceOptions } from "@/components/export/export-appearance-options";
import { ExportFormatOptions } from "@/components/export/export-format-options";
import { ExportSheet, ExportSheetSection } from "@/components/export/export-sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isPaidDocumentFormat } from "@/lib/auth/paid-access";
import {
  DOCUMENT_EXPORT_FORMATS,
  getDefaultExportFormat,
} from "@/lib/export/formats";
import {
  DEFAULT_EXPORT_APPEARANCE,
  type ExportAppearance,
} from "@/lib/export/print-theme";
import {
  exportTheoryNote,
  theoryDocHasExportableContent,
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
  category?: string;
};

export function TheoryExportDialog({
  open,
  onOpenChange,
  title,
  description,
  doc,
  category,
}: TheoryExportDialogProps) {
  const t = useTranslations("theory.export");
  const tc = useTranslations("common");
  const tAppearance = useTranslations("common.exportAppearance");
  const { resolvedTheme } = useTheme();
  const { hasProAccess, openUpgrade } = useProAccess();
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [appearance, setAppearance] = useState<ExportAppearance>(
    DEFAULT_EXPORT_APPEARANCE,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canExport = theoryDocHasExportableContent(doc);
  const pieceTitle = title.trim() || t("untitled");

  useEffect(() => {
    if (!open) return;
    setFormat(
      getDefaultExportFormat(hasProAccess, DOCUMENT_EXPORT_FORMATS) as ExportFormat,
    );
    setAppearance(DEFAULT_EXPORT_APPEARANCE);
  }, [open, hasProAccess]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function handleFormatChange(nextFormat: ExportFormat) {
    if (!hasProAccess && isPaidDocumentFormat(nextFormat)) {
      openUpgrade();
      return;
    }
    setFormat(nextFormat);
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
      await exportTheoryNote({
        title,
        description,
        doc,
        options: {
          format,
          appearance,
          themeMode: resolvedTheme === "dark" ? "dark" : "light",
        },
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
      setProgressValue(100);
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
      surface="theory"
      theoryCategory={category}
      preventClose={isExporting}
      kicker={t("kicker")}
      title={pieceTitle}
      description={t("description")}
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
            hints={{
              pdf: t("formatPdfHint"),
              docx: t("formatDocxHint"),
            }}
          />
        </ExportSheetSection>
        <ExportSheetSection label={tAppearance("label")}>
          <ExportAppearanceOptions
            idPrefix="theory-export-appearance"
            value={appearance}
            onChange={setAppearance}
            surface="theory"
            showDocxNote={format === "docx"}
          />
        </ExportSheetSection>
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
