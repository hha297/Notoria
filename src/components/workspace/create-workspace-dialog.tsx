"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CountryFlag } from "@/components/layout/country-flag";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWorkspace } from "@/lib/actions/workspaces";
import { getLanguageByCode, WORKPLACE_LANGUAGES } from "@/lib/languages";

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

  function handleCreate() {
    startTransition(async () => {
      try {
        await createWorkspace({
          name: name.trim() || undefined,
          language,
        });
        toast.success(t("created"));
        setName("");
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
          <DialogTitle>{t("createFirst")}</DialogTitle>
          <DialogDescription>{t("languageHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">{t("name")}</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <Select
              value={selectedCode}
              onValueChange={(value) => value && setLanguage(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedLanguage && (
                    <span className="flex items-center gap-2">
                      <CountryFlag
                        code={selectedLanguage.flagCode}
                        className="h-3.5 w-5"
                      />
                      {selectedLanguage.name}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>{t("language")}</SelectLabel>
                  {availableLanguages.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      <span className="flex items-center gap-2">
                        <CountryFlag
                          code={item.flagCode}
                          className="h-3.5 w-5"
                        />
                        {item.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isPending || availableLanguages.length === 0}
          >
            {tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
