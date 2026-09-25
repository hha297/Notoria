"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  analyzeAccountBackup,
  confirmAccountBackupImport,
  type AccountBackupActionError,
} from "@/lib/actions/account-backup";
import {
  MAX_ACCOUNT_BACKUP_BYTES,
  type BackupImportResult,
  type BackupPreview,
} from "@/lib/account-backup/types";

type Step = "upload" | "preview" | "done";

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
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [result, setResult] = useState<BackupImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setFile(null);
      setPreview(null);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (!next) return;

    if (next.size > MAX_ACCOUNT_BACKUP_BYTES) {
      toast.error(t("errors.fileTooLarge"));
      event.target.value = "";
      return;
    }

    setFile(next);
    setPreview(null);
    setResult(null);
    setStep("upload");

    const formData = new FormData();
    formData.append("file", next);

    startTransition(async () => {
      const response = await analyzeAccountBackup(formData);
      if (!response.ok) {
        toast.error(friendlyError(response.error, t));
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setPreview(response.result.preview);
      setStep("preview");
    });
  }

  function handleConfirm() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const response = await confirmAccountBackupImport(formData);
      if (!response.ok) {
        toast.error(friendlyError(response.error, t));
        return;
      }
      setResult(response.result);
      setStep("done");
      await queryClient.invalidateQueries();
      router.refresh();
      toast.success(t("doneToast"));
    });
  }

  const willImportAnything =
    preview &&
    Object.values(preview.willImport).some((count) => count > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isPending ? t("analyzing") : t("chooseFile")}
            </Button>
          </div>
        ) : null}

        {step === "preview" && preview ? (
          <div className="space-y-4 py-2">
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
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                disabled={isPending || !willImportAnything}
                onClick={handleConfirm}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("confirm")}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)}>
              {step === "done" ? t("close") : t("cancel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
