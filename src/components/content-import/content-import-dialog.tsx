"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Download, Loader2, Upload } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import formatStyles from "@/components/style/export/export-format.module.css";
import {
  analyzeContentImport,
  confirmContentImport,
  reanalyzeContentImportMapping,
} from "@/lib/actions/content-import";
import {
  csvTemplateFilename,
  csvTemplateForTarget,
  fieldsForTarget,
  MAX_CONTENT_IMPORT_FILE_BYTES,
  type AnalyzeContentImportResult,
  type ConfirmContentImportResult,
  type ContentImportTarget,
  type ImportFieldId,
} from "@/lib/content-import";
import { useInvalidateWorkspaceQueries } from "@/hooks/use-invalidate-workspace-queries";
import { mx } from "@/lib/css-module";
import { planGrantsFeature } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "done";

type ImportProgress = {
  phase: "reading" | "analyzing" | "mapping" | "importing" | "finishing";
  current: number;
  total: number;
};

type ContentImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ContentImportTarget;
  workspaceId: string;
};

function downloadTemplate(target: ContentImportTarget) {
  const csv = csvTemplateForTarget(target);
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvTemplateFilename(target);
  a.click();
  URL.revokeObjectURL(url);
}

function progressPercent(progress: ImportProgress | null) {
  if (!progress || progress.total <= 0) return 8;
  if (progress.phase === "reading") return 6;
  if (progress.phase === "analyzing") {
    return 10 + Math.round((progress.current / progress.total) * 28);
  }
  if (progress.phase === "mapping") {
    return 40 + Math.round((progress.current / progress.total) * 10);
  }
  if (progress.phase === "importing") {
    return 52 + Math.round((progress.current / progress.total) * 42);
  }
  return 100;
}

function friendlyError(
  code: string,
  t: ReturnType<typeof useTranslations<"contentImport">>,
  message?: string,
) {
  switch (code) {
    case "PRO_REQUIRED":
      return t("errors.proRequired");
    case "QUOTA_EXCEEDED":
      return t("errors.quotaExceeded");
    case "FILE_TOO_LARGE":
      return t("errors.fileTooLarge");
    case "UNSUPPORTED_FORMAT":
      return message || t("errors.unsupportedFormat");
    case "EMPTY_FILE":
      return message || t("errors.emptyFile");
    case "PARSE_FAILED":
      return message || t("errors.parseFailed");
    default:
      return t("errors.generic");
  }
}

export function ContentImportDialog({
  open,
  onOpenChange,
  target,
  workspaceId,
}: ContentImportDialogProps) {
  const t = useTranslations("contentImport");
  const tc = useTranslations("common");
  const { openUpgrade, plan } = useProAccess();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [analysis, setAnalysis] = useState<AnalyzeContentImportResult | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] =
    useState<ConfirmContentImportResult | null>(null);
  const { invalidateVocabulary, invalidateWriting, invalidateTheory } =
    useInvalidateWorkspaceQueries(workspaceId);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fieldOptions = useMemo(() => {
    const fields = fieldsForTarget(target);
    return [
      ...fields.map((f) => ({ id: f.id, label: t(`fields.${f.id}`) })),
      { id: "ignore" as const, label: t("fields.ignore") },
    ];
  }, [t, target]);

  function clearTicker() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function startTicker(total: number, phase: ImportProgress["phase"]) {
    clearTicker();
    setProgress({ phase, current: 0, total: Math.max(total, 1) });
    const stepMs = Math.max(60, Math.min(350, 7000 / Math.max(total, 1)));
    tickRef.current = setInterval(() => {
      setProgress((current) => {
        if (!current || current.phase !== phase) return current;
        if (current.current >= current.total - 1) return current;
        return { ...current, current: current.current + 1 };
      });
    }, stepMs);
  }

  useEffect(() => {
    if (!open) {
      clearTicker();
      setProgress(null);
    }
    return () => clearTicker();
  }, [open]);

  function reset() {
    clearTicker();
    setStep("upload");
    setAnalysis(null);
    setImportResult(null);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    onOpenChange(next);
    if (!next) reset();
  }

  function ensureAccess(): boolean {
    if (!planGrantsFeature(plan, "content_import")) {
      openUpgrade();
      return false;
    }
    return true;
  }

  function onPickFile(file: File | null) {
    if (!file) return;
    if (!ensureAccess()) return;
    if (file.size > MAX_CONTENT_IMPORT_FILE_BYTES) {
      toast.error(t("errors.fileTooLarge"));
      return;
    }

    const formData = new FormData();
    formData.set("target", target);
    formData.set("file", file);

    setProgress({ phase: "reading", current: 0, total: 1 });
    startTransition(async () => {
      startTicker(8, "analyzing");
      const result = await analyzeContentImport(formData);
      clearTicker();
      if (!result.ok) {
        setProgress(null);
        if (result.error.code === "PRO_REQUIRED") {
          openUpgrade();
          return;
        }
        toast.error(
          friendlyError(
            result.error.code,
            t,
            "message" in result.error ? result.error.message : undefined,
          ),
        );
        return;
      }
      setProgress({ phase: "finishing", current: 1, total: 1 });
      setAnalysis(result.analysis);
      setStep("preview");
      setProgress(null);
    });
  }

  function updateMapping(sourceIndex: number, field: ImportFieldId) {
    if (!analysis) return;
    const mappings = analysis.mappings.map((m) => {
      if (m.sourceIndex === sourceIndex) return { ...m, field };
      if (field !== "ignore" && m.field === field) {
        return { ...m, field: "ignore" as const };
      }
      return m;
    });

    startTransition(async () => {
      startTicker(4, "mapping");
      const result = await reanalyzeContentImportMapping({
        target,
        format: analysis.format,
        fileName: analysis.fileName,
        headers: analysis.headers,
        rows: analysis.rows,
        mappings,
      });
      clearTicker();
      setProgress(null);
      if (result.ok) {
        setAnalysis(result.analysis);
      }
    });
  }

  function confirmImport() {
    if (!analysis || !ensureAccess()) return;
    const total = Math.max(analysis.readyCount, 1);

    startTransition(async () => {
      startTicker(total, "importing");
      const result = await confirmContentImport({
        target,
        mappings: analysis.mappings,
        headers: analysis.headers,
        rows: analysis.rows,
        vocabItems: analysis.vocabItems,
        documents: analysis.documents,
        skipIssueRows: true,
      });
      clearTicker();

      if (!result.ok) {
        setProgress(null);
        if (result.error.code === "PRO_REQUIRED") {
          openUpgrade();
          return;
        }
        toast.error(friendlyError(result.error.code, t));
        return;
      }

      setProgress({ phase: "finishing", current: total, total });
      setImportResult(result.result);
      setStep("done");
      setProgress(null);
      if (target === "vocabulary") invalidateVocabulary();
      if (target === "writing") invalidateWriting();
      if (target === "theory") invalidateTheory();
      if (result.result.imported > 0) {
        toast.success(t("done.toast", { count: result.result.imported }));
      } else if (result.result.skippedAlreadyExists > 0) {
        toast.message(
          t("done.toastAllExist", {
            count: result.result.skippedAlreadyExists,
          }),
        );
      } else {
        toast.message(t("done.toastNone"));
      }
    });
  }

  const readyCount = analysis?.readyCount ?? 0;
  const issueCount = analysis?.issueCount ?? 0;
  const quotaHint =
    plan === "pro"
      ? t("quota.pro")
      : plan === "premium"
        ? t("quota.premium")
        : t("quota.free");

  const progressLabel =
    progress?.phase === "reading"
      ? t("progress.reading")
      : progress?.phase === "analyzing"
        ? t("progress.analyzing")
        : progress?.phase === "mapping"
          ? t("progress.mapping")
          : progress?.phase === "importing"
            ? t("progress.importing")
            : t("progress.finishing");

  const busy = pending || progress !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{t(`title.${target}`)}</DialogTitle>
          <DialogDescription>{t(`description.${target}`)}</DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div
            className={cn(
              "flex flex-col gap-4",
              busy && "pointer-events-none opacity-55",
            )}
          >
            <p className="text-sm text-muted-foreground">{t("guidance")}</p>
            <p className="text-xs text-muted-foreground">{quotaHint}</p>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!ensureAccess()) return;
                fileRef.current?.click();
              }}
              className={cn(
                "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline-cloud px-4 py-6 text-center transition-colors",
                "hover:border-module-home-fg/40 hover:bg-surface-muted/40",
              )}
            >
              {busy ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-ink">
                {t("dropzone")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("formats")}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf,.docx,.txt,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={busy}
              onClick={() => downloadTemplate(target)}
            >
              <Download className="size-4" />
              {t("downloadTemplate")}
            </Button>
          </div>
        ) : null}

        {step === "preview" && analysis ? (
          <div
            className={cn(
              "flex max-h-[min(70vh,32rem)] flex-col gap-4 overflow-y-auto",
              busy && "pointer-events-none opacity-55",
            )}
          >
            <div className="rounded-md border border-hairline-cloud bg-surface-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-ink">
                {t("preview.summary", {
                  ready: readyCount,
                  issues: issueCount,
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analysis.fileName} · {analysis.format.toUpperCase()}
              </p>
            </div>

            {analysis.extractKind === "tabular" &&
            analysis.mappings.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-ink">
                  {t("preview.mappingTitle")}
                </p>
                <div className="overflow-hidden rounded-md border border-hairline-cloud">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {t("preview.yourColumn")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("preview.notoriaField")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.mappings.map((mapping) => (
                        <tr
                          key={mapping.sourceIndex}
                          className="border-t border-hairline-cloud"
                        >
                          <td className="px-3 py-2 text-ink">
                            {mapping.sourceColumn}
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={mapping.field}
                              onValueChange={(value) => {
                                if (value) {
                                  updateMapping(
                                    mapping.sourceIndex,
                                    value as ImportFieldId,
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-full min-w-[9rem]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldOptions.map((option) => (
                                  <SelectItem
                                    key={option.id}
                                    value={option.id}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {analysis.missingRequired.length > 0 ? (
                  <p className="text-sm text-destructive">
                    {t("preview.missingRequired")}
                  </p>
                ) : null}
                {analysis.unmappedColumns.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("preview.unmapped", {
                      columns: analysis.unmappedColumns.join(", "),
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {issueCount > 0 ? (
              <div className="rounded-md border border-hairline-cloud px-3 py-2">
                <p className="text-sm font-medium text-ink">
                  {t("preview.issuesTitle", { count: issueCount })}
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  {analysis.issues.slice(0, 8).map((issue, index) => (
                    <li key={`${issue.rowIndex}-${issue.code}-${index}`}>
                      {t("preview.issueRow", { row: issue.rowIndex + 1 })}{" "}
                      {issue.message}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("preview.skipHint")}
                </p>
              </div>
            ) : null}

            {target === "vocabulary" && analysis.vocabItems.length > 0 ? (
              <div className="rounded-md border border-hairline-cloud px-3 py-2">
                <p className="mb-2 text-sm font-medium text-ink">
                  {t("preview.sampleTitle")}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {analysis.vocabItems
                    .filter((item) => item.status === "ready")
                    .slice(0, 6)
                    .map((item) => (
                      <li key={item.rowIndex}>
                        <span className="font-medium text-ink">{item.word}</span>
                        {" — "}
                        {item.meanings.join("; ")}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            {(target === "writing" || target === "theory") &&
            analysis.documents.length > 0 ? (
              <div className="rounded-md border border-hairline-cloud px-3 py-2">
                <p className="mb-2 text-sm font-medium text-ink">
                  {t("preview.sampleTitle")}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {analysis.documents
                    .filter((item) => item.status === "ready")
                    .slice(0, 6)
                    .map((item) => (
                      <li key={item.rowIndex}>
                        <span className="font-medium text-ink">
                          {item.title}
                        </span>
                        {" — "}
                        {item.content.slice(0, 80)}
                        {item.content.length > 80 ? "…" : ""}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "done" && importResult ? (
          <div className="flex max-h-[min(60vh,28rem)] flex-col gap-3 overflow-y-auto text-sm">
            <p className="font-medium text-ink">
              {t("done.title", { count: importResult.imported })}
            </p>

            <ul className="space-y-1.5 text-muted-foreground">
              {importResult.skippedAlreadyExists > 0 ? (
                <li>
                  {t("done.skippedExists", {
                    count: importResult.skippedAlreadyExists,
                  })}
                </li>
              ) : null}
              {importResult.skippedInvalid > 0 ? (
                <li>
                  {t("done.skippedInvalid", {
                    count: importResult.skippedInvalid,
                  })}
                </li>
              ) : null}
              {importResult.failed > 0 ? (
                <li>
                  {t("done.failed", { count: importResult.failed })}
                </li>
              ) : null}
              {importResult.skipped === 0 && importResult.failed === 0 ? (
                <li>{t("done.allGood")}</li>
              ) : null}
            </ul>

            {importResult.details.length > 0 ? (
              <div className="rounded-md border border-hairline-cloud px-3 py-2">
                <p className="mb-2 text-xs font-medium text-ink">
                  {t("done.detailsTitle")}
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {importResult.details.slice(0, 40).map((item) => (
                    <li key={`${item.kind}-${item.rowIndex}-${item.label}`}>
                      <span className="font-medium text-ink">{item.label}</span>
                      {" — "}
                      {item.kind === "already_exists"
                        ? t("done.reasonExists")
                        : item.kind === "failed"
                          ? t("done.reasonFailed")
                          : item.message}
                    </li>
                  ))}
                  {importResult.details.length > 40 ? (
                    <li>
                      {t("done.moreDetails", {
                        count: importResult.details.length - 40,
                      })}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {busy && progress ? (
          <div className={mx(formatStyles, "export-progress")}>
            <div className={mx(formatStyles, "export-progress-meta")}>
              <span>{progressLabel}</span>
              <span>
                {t("progress.count", {
                  current: Math.min(progress.current + 1, progress.total),
                  total: progress.total,
                })}
              </span>
            </div>
            <Progress value={progressPercent(progress)} />
          </div>
        ) : null}

        <DialogFooter>
          {step === "upload" ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => handleOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
          ) : null}

          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={reset}
              >
                {t("back")}
              </Button>
              <Button
                type="button"
                disabled={
                  busy ||
                  readyCount === 0 ||
                  (analysis?.missingRequired.length ?? 0) > 0
                }
                onClick={confirmImport}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("importReady", { count: readyCount })}
              </Button>
            </>
          ) : null}

          {step === "done" ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              {t("close")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
