"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { renameListeningLesson } from "@/lib/actions/listening";
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
};

export function RenameListeningDialog({
  open,
  onOpenChange,
  lessonId,
  title,
  originalFilename,
  format,
}: RenameListeningDialogProps) {
  const t = useTranslations("listening");
  const tc = useTranslations("common");
  const router = useRouter();
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
        await renameListeningLesson(lessonId, nextFilename);
        toast.success(t("renamed"));
        onOpenChange(false);
        router.refresh();
      } catch (caught) {
        const message = errorMessage(caught);
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("renameFileTitle")}</DialogTitle>
          <DialogDescription>{t("renameFileDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="listening-filename">{t("fileNameLabel")}</Label>
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
            className="h-10"
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
