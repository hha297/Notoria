"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { normalizeHttpUrl } from "@/lib/editor/images";

type EditorLinkDialogProps = {
  open: boolean;
  initialUrl?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (url: string) => void;
  onRemove?: () => void;
};

export function EditorLinkDialog({
  open,
  initialUrl = "",
  onOpenChange,
  onSave,
  onRemove,
}: EditorLinkDialogProps) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const hasExistingLink = Boolean(initialUrl);
  const normalized = normalizeHttpUrl(url);
  const canSubmit = Boolean(normalized);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setError(null);
  }, [open, initialUrl]);

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!normalized) {
      setError(t("linkInvalid"));
      return;
    }
    onSave(normalized);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={urlInputRef}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {hasExistingLink ? t("linkEditTitle") : t("linkTitle")}
            </DialogTitle>
            <DialogDescription>{t("linkDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label htmlFor="editor-link-url">{t("linkUrl")}</Label>
            <Input
              id="editor-link-url"
              ref={urlInputRef}
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError(null);
              }}
              placeholder={t("linkUrlPlaceholder")}
              autoFocus
              aria-invalid={error ? true : undefined}
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            {hasExistingLink && onRemove ? (
              <Button
                type="button"
                variant="outline"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
              >
                {t("linkRemove")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {hasExistingLink ? t("linkSave") : t("linkInsert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
