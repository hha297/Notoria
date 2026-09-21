"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CountryFlag } from "@/components/layout/country-flag";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWorkspace } from "@/lib/actions/workspaces";
import styles from "@/components/style/workspace/sheet.module.css";
import { mx } from "@/lib/css-module";
import { getLanguageByCode, WORKPLACE_LANGUAGES } from "@/lib/languages";
import { requestWorkspaceOnboarding } from "@/lib/onboarding/storage";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLanguages: string[];
};

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  existingLanguages,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(
    () =>
      WORKPLACE_LANGUAGES.find((item) => !existingLanguages.includes(item.code))
        ?.code ?? "en",
  );
  const [isPending, startTransition] = useTransition();

  const availableLanguages = WORKPLACE_LANGUAGES.filter(
    (item) => !existingLanguages.includes(item.code),
  );

  const selectedCode =
    availableLanguages.find((item) => item.code === language)?.code ??
    availableLanguages[0]?.code;

  const selectedLanguage = selectedCode
    ? getLanguageByCode(selectedCode)
    : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    setLanguage((current) => {
      const available = WORKPLACE_LANGUAGES.filter(
        (item) => !existingLanguages.includes(item.code),
      );

      if (available.some((item) => item.code === current)) {
        return current;
      }

      return available[0]?.code ?? "";
    });
  }, [open, existingLanguages]);

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    onOpenChange(next);
  }

  function handleCreate() {
    if (isPending || availableLanguages.length === 0 || !selectedCode) return;

    startTransition(async () => {
      try {
        const workspace = await createWorkspace({
          name: name.trim() || undefined,
          language: selectedCode,
        });
        requestWorkspaceOnboarding(workspace.id);
        toast.success(t("created"));
        setName("");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "WORKSPACE_LANGUAGE_EXISTS"
        ) {
          toast.error(t("languageExists"));
          return;
        }

        toast.error(te("generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className={mx(styles, "workspace-sheet sm:max-w-md")}
      >
        <DialogHeader className={mx(styles, "workspace-sheet-header gap-2 space-y-0 pr-8 text-left")}>
          <p className={mx(styles, "workspace-sheet-kicker")}>{t("title")}</p>
          <DialogTitle className={mx(styles, "workspace-sheet-title")}>
            {t("createFirst")}
          </DialogTitle>
          <DialogDescription className={mx(styles, "workspace-sheet-lede")}>
            {t("languageHint")}
          </DialogDescription>
        </DialogHeader>

        <div className={mx(styles, "workspace-sheet-body")}>
          <div className={mx(styles, "workspace-sheet-field")}>
            <Label htmlFor="workspace-name" className={mx(styles, "workspace-sheet-label")}>
              {t("name")}
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isPending}
              className={mx(styles, "workspace-sheet-input")}
              autoComplete="off"
            />
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <Label className={mx(styles, "workspace-sheet-label")}>{t("language")}</Label>
            <Select
              value={selectedCode}
              onValueChange={(value) => value && setLanguage(value)}
              disabled={isPending || availableLanguages.length === 0}
            >
              <SelectTrigger className={mx(styles, "workspace-sheet-input w-full")}>
                <SelectValue>
                  {selectedLanguage ? (
                    <span className="flex items-center gap-2.5">
                      <CountryFlag
                        code={selectedLanguage.flagCode}
                        className="h-3.5 w-5 shrink-0"
                      />
                      <span className="text-ink">{selectedLanguage.name}</span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>{t("language")}</SelectLabel>
                  {availableLanguages.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      <span className="flex items-center gap-2.5">
                        <CountryFlag
                          code={item.flagCode}
                          className="h-3.5 w-5 shrink-0"
                        />
                        {item.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {selectedLanguage ? (
              <p className={mx(styles, "workspace-sheet-hint")}>
                <CountryFlag
                  code={selectedLanguage.flagCode}
                  className="h-3 w-4 shrink-0"
                />
                <span>{selectedLanguage.preview}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className={mx(styles, "workspace-sheet-footer")}>
          <Button
            type="button"
            variant="outline"
            className={mx(styles, "workspace-sheet-cancel")}
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            className={mx(styles, "workspace-sheet-cta")}
            onClick={handleCreate}
            disabled={isPending || availableLanguages.length === 0}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {tc("create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
