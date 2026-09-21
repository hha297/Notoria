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
import {
  isUniqueNameTaken,
  nextAvailableName,
} from "@/lib/unique-name";

type FolderNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "rename";
  initialName?: string;
  occupiedNames?: string[];
  pending?: boolean;
  onSubmit: (name: string) => void;
};

export function FolderNameDialog({
  open,
  onOpenChange,
  mode,
  initialName = "",
  occupiedNames = [],
  pending = false,
  onSubmit,
}: FolderNameDialogProps) {
  const t = useTranslations("folders");
  const tc = useTranslations("common");
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (!open) return;
    setName(
      mode === "create"
        ? nextAvailableName(t("untitled"), occupiedNames)
        : initialName,
    );
    // Seed once when the dialog opens so occupied-list identity changes
    // do not wipe the name while the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialName, t]);

  const taken =
    Boolean(name.trim()) &&
    isUniqueNameTaken(name, occupiedNames) &&
    !(mode === "rename" && name.trim() === initialName.trim());

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    onOpenChange(next);
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || taken) return;
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
              aria-invalid={taken || undefined}
              data-tutorial="folder-name-input"
            />
            {taken ? (
              <p className="text-sm text-destructive">{t("nameTaken")}</p>
            ) : null}
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
            <Button
              type="submit"
              disabled={
                pending ||
                !name.trim() ||
                taken ||
                (mode === "rename" &&
                  name.trim() === initialName.trim())
              }
            >
              {mode === "create" ? t("create") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
