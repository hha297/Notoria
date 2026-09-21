"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameListeningLesson } from "@/lib/actions/listening";
import styles from "@/components/style/workspace/sheet.module.css";
import { mx } from "@/lib/css-module";
import { isListeningErrorCode } from "@/lib/listening/errors";
import {
  applyListeningFilenameRename,
  fallbackListeningFilename,
} from "@/lib/listening/utils";

type RenameListeningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  title: string;
  originalFilename: string | null;
  format?: string | null;
  onRenamed?: (patch: { title: string; originalFilename: string }) => void;
};

export function RenameListeningDialog({
  open,
  onOpenChange,
  lessonId,
  title,
  originalFilename,
  format,
  onRenamed,
}: RenameListeningDialogProps) {
  const t = useTranslations("listening");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const currentFilename = fallbackListeningFilename(
    originalFilename,
    title,
    format,
  );
  const [value, setValue] = useState(currentFilename);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(currentFilename);
    setError(null);
  }, [open, currentFilename]);

  function errorMessage(caught: unknown) {
    const code = caught instanceof Error ? caught.message : "PROCESSING_FAILED";
    return isListeningErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    onOpenChange(next);
  }

  function handleSave() {
    const nextFilename = applyListeningFilenameRename(value, currentFilename);
    if (!nextFilename) {
      setError(t("errors.FILENAME_REQUIRED"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await renameListeningLesson(lessonId, nextFilename);
        toast.success(t("renamed"));
        onOpenChange(false);
        onRenamed?.({
          title: result.title,
          originalFilename: result.originalFilename,
        });
      } catch (caught) {
        const message = errorMessage(caught);
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className={mx(styles, "workspace-sheet sm:max-w-md")}
        data-sheet-route="listen"
      >
        <DialogHeader className={mx(styles, "workspace-sheet-header gap-2 space-y-0 pr-8 text-left")}>
          <p className={mx(styles, "workspace-sheet-kicker")}>{t("title")}</p>
          <DialogTitle className={mx(styles, "workspace-sheet-title")}>
            {t("renameFileTitle")}
          </DialogTitle>
          <DialogDescription className={mx(styles, "workspace-sheet-lede")}>
            {t("renameFileDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className={mx(styles, "workspace-sheet-body")}>
          <div className={mx(styles, "workspace-sheet-field")}>
            <Label htmlFor="listening-filename" className={mx(styles, "workspace-sheet-label")}>
              {t("fileNameLabel")}
            </Label>
            <Input
              id="listening-filename"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSave();
                }
              }}
              maxLength={200}
              disabled={isPending}
              aria-invalid={error ? true : undefined}
              className={mx(styles, "workspace-sheet-input")}
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        </div>
        <div className={mx(styles, "workspace-sheet-footer")}>
          <Button
            type="button"
            variant="outline"
            className={mx(styles, "workspace-sheet-cancel")}
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            className={mx(styles, "workspace-sheet-cta")}
            onClick={handleSave}
            disabled={
              isPending ||
              !value.trim() ||
              applyListeningFilenameRename(value, currentFilename) ===
                currentFilename
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {tc("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
