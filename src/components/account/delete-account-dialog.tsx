"use client";

import styles from "@/components/style/account/account.module.css";
import { mx } from "@/lib/css-module";
import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteAccount,
  exportAccountBackup,
} from "@/lib/actions/account";
import { DELETE_ACCOUNT_CONFIRMATION } from "@/lib/account/constants";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  email,
}: DeleteAccountDialogProps) {
  const t = useTranslations("account.delete");
  const tc = useTranslations("common");
  const [confirmation, setConfirmation] = useState("");
  const [isBackupPending, startBackupTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const canDelete =
    confirmation.trim() === DELETE_ACCOUNT_CONFIRMATION && !isDeletePending;

  function handleOpenChange(next: boolean) {
    if (isDeletePending) return;
    if (!next) {
      setConfirmation("");
    }
    onOpenChange(next);
  }

  function handleBackup() {
    startBackupTransition(async () => {
      try {
        const backup = await exportAccountBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().slice(0, 10);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `notoria-backup-${stamp}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success(t("backupDone"));
      } catch {
        toast.error(t("backupFailed"));
      }
    });
  }

  function handleDelete() {
    if (!canDelete) return;

    startDeleteTransition(async () => {
      try {
        await deleteAccount({ confirmation: DELETE_ACCOUNT_CONFIRMATION });
        toast.success(t("deleted"));
        await signOut({ callbackUrl: "/" });
      } catch {
        toast.error(t("failed"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isDeletePending}
        className={mx(styles, "account-delete-sheet flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg")}
      >
        <div className={mx(styles, "account-delete-hero shrink-0")}>
          <DialogHeader className="gap-2 space-y-0 pr-8 text-left">
            <p className={mx(styles, "account-delete-kicker")}>{t("kicker")}</p>
            <DialogTitle className={mx(styles, "account-delete-title")}>
              {t("title")}
            </DialogTitle>
            <DialogDescription className={mx(styles, "account-delete-lede")}>
              {t("description", { email })}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className={mx(styles, "account-delete-body min-h-0 flex-1 overflow-y-auto")}>
          <div className={mx(styles, "account-delete-warning")} role="alert">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <div>
              <p className={mx(styles, "account-delete-warning-title")}>{t("warningTitle")}</p>
              <ul className={mx(styles, "account-delete-warning-list")}>
                <li>{t("warnings.workspaces")}</li>
                <li>{t("warnings.billing")}</li>
                <li>{t("warnings.media")}</li>
                <li>{t("warnings.permanent")}</li>
              </ul>
            </div>
          </div>

          <div className={mx(styles, "account-delete-backup")}>
            <div>
              <p className={mx(styles, "account-delete-backup-title")}>{t("backupTitle")}</p>
              <p className={mx(styles, "account-delete-backup-hint")}>{t("backupHint")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="route-quiet-action shrink-0"
              data-route-action="account"
              disabled={isBackupPending || isDeletePending}
              onClick={handleBackup}
            >
              {isBackupPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("backup")}
            </Button>
          </div>

          <div className={mx(styles, "account-field")}>
            <Label htmlFor="delete-account-confirm" className={mx(styles, "account-label")}>
              {t("confirmLabel", { phrase: DELETE_ACCOUNT_CONFIRMATION })}
            </Label>
            <Input
              id="delete-account-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={DELETE_ACCOUNT_CONFIRMATION}
              autoComplete="off"
              spellCheck={false}
              disabled={isDeletePending}
              className={mx(styles, "account-input")}
            />
          </div>
        </div>

        <DialogFooter className={mx(styles, "account-delete-footer shrink-0")}>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeletePending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete}
          >
            {isDeletePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
