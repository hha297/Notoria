"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LanguageSelect } from "@/components/shared/language-select";
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
import type { Workspace } from "@/db/schema";
import { updateWorkspace } from "@/lib/actions/workspaces";
import { getSelectableLanguages } from "@/lib/languages";

type EditWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  occupiedLanguages: string[];
};

export function EditWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
  occupiedLanguages,
}: EditWorkspaceDialogProps) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [name, setName] = useState(workspace.name);
  const [language, setLanguage] = useState(workspace.language);
  const [isPending, startTransition] = useTransition();

  const availableLanguages = getSelectableLanguages({
    includeCode: workspace.language,
  }).filter(
    (item) =>
      item.code === workspace.language || !occupiedLanguages.includes(item.code),
  );

  useEffect(() => {
    if (!open) return;
    setName(workspace.name);
    setLanguage(workspace.language);
  }, [open, workspace.id, workspace.name, workspace.language]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("nameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await updateWorkspace(workspace.id, {
          name: trimmed,
          language,
        });
        toast.success(t("updated"));
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        if (error instanceof Error && error.message === "WORKSPACE_LANGUAGE_EXISTS") {
          toast.error(t("languageExists"));
          return;
        }

        toast.error(te("generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-workspace-name">{t("name")}</Label>
            <Input
              id="edit-workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <LanguageSelect
              value={language}
              onValueChange={setLanguage}
              languages={availableLanguages}
              aria-label={t("language")}
            />
            <p className="text-xs text-muted-foreground">{t("languageHint")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isPending ||
              !name.trim() ||
              (name.trim() === workspace.name && language === workspace.language)
            }
          >
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
