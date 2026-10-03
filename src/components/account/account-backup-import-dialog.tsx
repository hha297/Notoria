"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
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
  analyzeAccountBackupFromUpload,
  beginAccountBackupUpload,
  confirmAccountBackupFromUpload,
  type AccountBackupActionError,
} from "@/lib/actions/account-backup";
import {
  MAX_ACCOUNT_BACKUP_BYTES,
  type BackupImportResult,
  type BackupPreview,
} from "@/lib/account-backup/types";
import { isRequestTooLargeError } from "@/lib/account/prepare-avatar";
import { formatByteSize } from "@/lib/exercise-import/format-bytes";

type Step = "upload" | "preview" | "done";
type Phase = "idle" | "uploading" | "analyzing" | "importing";

type AccountBackupImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function friendlyError(
  error: AccountBackupActionError,
  t: ReturnType<typeof useTranslations<"account.backupImport">>,
) {
  switch (error.code) {
    case "FILE_TOO_LARGE":
      return t("errors.fileTooLarge");
    case "REQUEST_TOO_LARGE":
      return t("errors.requestTooLarge");
    case "CLOUDINARY_NOT_CONFIGURED":
    case "STORAGE_NOT_CONFIGURED":
      return t("errors.notConfigured");
    case "INVALID_BACKUP":
      return error.message || t("errors.invalidBackup");
    case "UNAUTHORIZED":
      return t("errors.unauthorized");
    case "INVALID_INPUT":
      return t("errors.invalidInput");
    case "IMPORT_FAILED":
      return error.message || t("errors.importFailed");
    default:
      return t("errors.importFailed");
  }
}

function CountList({
  counts,
  t,
}: {
  counts: BackupPreview["willImport"];
  t: ReturnType<typeof useTranslations<"account.backupImport">>;
}) {
  const rows: Array<{ key: keyof typeof counts; label: string }> = [
    { key: "workspaces", label: t("counts.workspaces", { count: counts.workspaces }) },
    { key: "folders", label: t("counts.folders", { count: counts.folders }) },
    { key: "tags", label: t("counts.tags", { count: counts.tags }) },
    { key: "vocabulary", label: t("counts.vocabulary", { count: counts.vocabulary }) },
    { key: "theory", label: t("counts.theory", { count: counts.theory }) },
    { key: "writing", label: t("counts.writing", { count: counts.writing }) },
    { key: "exercises", label: t("counts.exercises", { count: counts.exercises }) },
    { key: "listening", label: t("counts.listening", { count: counts.listening }) },
    { key: "speaking", label: t("counts.speaking", { count: counts.speaking }) },
  ];

  return (
    <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-foreground">
      {rows
        .filter((row) => counts[row.key] > 0)
        .map((row) => (
          <li key={row.key}>{row.label}</li>
        ))}
    </ul>
  );
}

export function AccountBackupImportDialog({
  open,
  onOpenChange,
}: AccountBackupImportDialogProps) {
  const t = useTranslations("account.backupImport");
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [step, setStep] = useState<Step>("upload");
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [result, setResult] = useState<BackupImportResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [bytesDetail, setBytesDetail] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const isBusy = phase !== "idle";

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setStoragePath(null);
      setPreview(null);
      setResult(null);
      setPhase("idle");
      setPercent(0);
      setBytesDetail(null);
      setFileName(null);
      busyRef.current = false;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function resetSelection() {
    setStoragePath(null);
    setPreview(null);
    setPhase("idle");
    setPercent(0);
    setBytesDetail(null);
    setFileName(null);
    busyRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (!next) return;

    if (next.size > MAX_ACCOUNT_BACKUP_BYTES) {
      toast.error(t("errors.fileTooLarge"));
      event.target.value = "";
      return;
    }

    if (busyRef.current) {
      event.target.value = "";
      return;
    }

    busyRef.current = true;
    setPreview(null);
    setResult(null);
    setStep("upload");
    setFileName(next.name);
    setPhase("uploading");
    setPercent(0);
    setBytesDetail(
      t("uploadBytes", {
        loaded: formatByteSize(0),
        total: formatByteSize(next.size),
      }),
    );

    try {
      const begun = await beginAccountBackupUpload({
        filename: next.name,
        byteSize: next.size,
      });
      if (!begun.ok) {
        toast.error(friendlyError(begun.error, t));
        resetSelection();
        return;
      }

      const uploaded = await upload(begun.result.pathname, next, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
        multipart: next.size >= 8 * 1024 * 1024,
        clientPayload: JSON.stringify({
          purpose: "account-backup",
          uploadId: begun.result.uploadId,
        }),
        contentType: "application/json",
        onUploadProgress: (progress) => {
          const total = progress.total || next.size;
          const loaded = progress.loaded ?? 0;
          const nextPercent =
            total > 0
              ? Math.min(
                  100,
                  Math.round(progress.percentage ?? (loaded / total) * 100),
                )
              : 0;
          setPercent(nextPercent);
          setBytesDetail(
            t("uploadBytes", {
              loaded: formatByteSize(loaded),
              total: formatByteSize(total),
            }),
          );
        },
      });

      setPercent(100);
      setBytesDetail(null);
      setPhase("analyzing");

      const response = await analyzeAccountBackupFromUpload({
        storagePath: uploaded.pathname,
        byteSize: next.size,
      });

      if (!response.ok) {
        toast.error(friendlyError(response.error, t));
        resetSelection();
        return;
      }

      setStoragePath(response.result.storagePath);
      setPreview(response.result.preview);
      setPhase("idle");
      setPercent(0);
      setStep("preview");
      busyRef.current = false;
    } catch (error) {
      if (isRequestTooLargeError(error)) {
        toast.error(t("errors.requestTooLarge"));
      } else {
        toast.error(t("errors.importFailed"));
      }
      resetSelection();
    }
  }

  async function handleConfirm() {
    if (!storagePath || busyRef.current) return;

    busyRef.current = true;
    setPhase("importing");
    setPercent(15);

    // Soft progress while the server imports (no byte stream).
    const tick = window.setInterval(() => {
      setPercent((current) =>
        current >= 90 ? current : current + Math.max(1, Math.round((90 - current) * 0.08)),
      );
    }, 400);

    try {
      const response = await confirmAccountBackupFromUpload({
        storagePath,
      });
      window.clearInterval(tick);

      if (!response.ok) {
        toast.error(friendlyError(response.error, t));
        setPhase("idle");
        setPercent(0);
        busyRef.current = false;
        return;
      }

      setPercent(100);
      setResult(response.result);
      setStep("done");
      setPhase("idle");
      busyRef.current = false;
      await queryClient.invalidateQueries();
      router.refresh();
      toast.success(t("doneToast"));
    } catch (error) {
      window.clearInterval(tick);
      setPhase("idle");
      setPercent(0);
      busyRef.current = false;
      if (isRequestTooLargeError(error)) {
        toast.error(t("errors.requestTooLarge"));
        return;
      }
      toast.error(t("errors.importFailed"));
    }
  }

  const willImportAnything =
    preview &&
    Object.values(preview.willImport).some((count) => count > 0);

  const phaseLabel =
    phase === "uploading"
      ? t("uploading", { percent })
      : phase === "analyzing"
        ? t("analyzing")
        : phase === "importing"
          ? t("importing")
          : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isBusy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "done" ? t("doneTitle") : t("title")}
          </DialogTitle>
          <DialogDescription>
            {step === "done" ? t("doneDescription") : t("description")}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t("uploadHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={isBusy}
              onChange={(event) => {
                void handleFileChange(event);
              }}
            />
            {isBusy ? (
              <div
                className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4"
                role="status"
                aria-live="polite"
                aria-busy
              >
                <div className="flex items-start gap-3">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {fileName || t("chooseFile")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {phaseLabel}
                      {bytesDetail ? ` · ${bytesDetail}` : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {percent}%
                  </span>
                </div>
                <Progress value={phase === "analyzing" ? 100 : percent} />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                {t("chooseFile")}
              </Button>
            )}
          </div>
        ) : null}

        {step === "preview" && preview ? (
          <div className="space-y-4 py-2">
            {phase === "importing" ? (
              <div
                className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4"
                role="status"
                aria-live="polite"
                aria-busy
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="size-4 animate-spin" />
                    {t("importing")}
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {percent}%
                  </span>
                </div>
                <Progress value={percent} />
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">
                {t("detectedTitle")}
              </p>
              <CountList counts={preview.found} t={t} />
            </div>

            <div className="rounded-md border border-border/70 bg-muted/30 p-3">
              <p className="mb-1 text-sm font-semibold">{t("strategyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("strategyAddAsNew")}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">{t("readyTitle")}</p>
              {willImportAnything ? (
                <CountList counts={preview.willImport} t={t} />
              ) : (
                <p className="text-sm text-muted-foreground">{t("nothingToImport")}</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">{t("notImportedTitle")}</p>
              <p className="mb-2 text-sm text-muted-foreground">
                {t("notImportedHint")}
              </p>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>{t("notImportedFields.name")}</li>
                <li>{t("notImportedFields.email")}</li>
                <li>{t("notImportedFields.subscription")}</li>
                <li>{t("notImportedFields.auth")}</li>
              </ul>
            </div>

            {preview.warnings.length > 0 ? (
              <div className="space-y-1">
                {preview.warnings.map((warning) => (
                  <p key={warning} className="text-sm text-amber-700 dark:text-amber-400">
                    {t(`warnings.${warning}`)}
                  </p>
                ))}
              </div>
            ) : null}

            {preview.skipped.length > 0 ? (
              <div>
                <p className="mb-1 text-sm font-semibold">{t("skippedTitle")}</p>
                <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {preview.skipped.map((item) => (
                    <li key={item.reason}>
                      {t(`skips.${item.reason}`, { count: item.count })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "done" && result ? (
          <div className="space-y-3 py-2">
            <p className="text-sm font-semibold">{t("importedTitle")}</p>
            <CountList counts={result.imported} t={t} />
            {result.skipped.length > 0 ? (
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.skipped.map((item) => (
                  <li key={item.reason}>
                    {t(`skips.${item.reason}`, { count: item.count })}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                disabled={isBusy || !willImportAnything}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {phase === "importing" ? t("importing") : t("confirm")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={isBusy && step !== "done"}
              onClick={() => onOpenChange(false)}
            >
              {step === "done" ? t("close") : t("cancel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
