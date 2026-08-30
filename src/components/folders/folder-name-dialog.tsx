"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { MAX_FOLDER_NAME_LENGTH } from "@/lib/folders/types";

type FolderNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "rename";
  initialName?: string;
  pending?: boolean;
  onSubmit: (name: string) => void;
};

export function FolderNameDialog({
  open,
  onOpenChange,
  mode,
  initialName = "",
  pending = false,
  onSubmit,
}: FolderNameDialogProps) {
  const t = useTranslations("folders");
  const tc = useTranslations("common");
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (!open) return;
    setName(mode === "create" ? t("untitled") : initialName);
  }, [open, mode, initialName, t]);

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    onOpenChange(next);
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!pending}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? t("createTitle") : t("renameTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "create" ? t("createDescription") : t("renameDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label htmlFor="folder-name">{t("name")}</Label>
            <Input
              id="folder-name"
              value={name}
              maxLength={MAX_FOLDER_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              autoFocus
              disabled={pending}
              data-tutorial="folder-name-input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {mode === "create" ? t("create") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
