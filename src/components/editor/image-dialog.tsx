"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { isAllowedEditorImageFile, normalizeHttpUrl } from "@/lib/editor/images";
import { uploadEditorImageFile } from "@/lib/editor/upload-image";
import type { EditorImageErrorCode } from "@/lib/editor/images";

type EditorImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
};

export function EditorImageDialog({
  open,
  onOpenChange,
  onInsert,
}: EditorImageDialogProps) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setFileName(null);
    setError(null);
    setIsUploading(false);
  }, [open]);

  function errorMessage(code: EditorImageErrorCode) {
    switch (code) {
      case "FILE_TOO_LARGE":
        return t("imageTooLarge");
      case "INVALID_FILE_TYPE":
      case "INVALID_FILE":
        return t("imageInvalidType");
      case "CLOUDINARY_NOT_CONFIGURED":
        return t("imageUnavailable");
      default:
        return t("imageUploadFailed");
    }
  }

  function handleOpenChange(next: boolean) {
    if (isUploading && !next) return;
    onOpenChange(next);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const invalid = isAllowedEditorImageFile(file);
    if (invalid) {
      setError(errorMessage(invalid));
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadEditorImageFile(file);
      if ("error" in result) {
        setError(errorMessage(result.error));
        return;
      }
      onInsert(result.url);
      onOpenChange(false);
    } catch {
      setError(t("imageUploadFailed"));
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (isUploading) return;
    const normalized = normalizeHttpUrl(url);
    if (!normalized) {
      setError(t("imageInvalidUrl"));
      return;
    }
    onInsert(normalized);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isUploading}
        initialFocus={urlInputRef}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("imageTitle")}</DialogTitle>
            <DialogDescription>{t("imageDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>{t("imageUpload")}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={isUploading}
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {isUploading
                  ? t("imageUploading")
                  : fileName ?? t("imageChooseFile")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("imageUploadHint")}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-hairline-cloud" />
              {t("or")}
              <span className="h-px flex-1 bg-hairline-cloud" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editor-image-url">{t("imageUrl")}</Label>
              <Input
                id="editor-image-url"
                ref={urlInputRef}
                type="text"
                inputMode="url"
                autoComplete="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setError(null);
                }}
                placeholder={t("imageUrlPlaceholder")}
                autoFocus
                disabled={isUploading}
                aria-invalid={error ? true : undefined}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !normalizeHttpUrl(url)}
            >
              {t("imageInsert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
