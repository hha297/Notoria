"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CountryFlag } from "@/components/layout/country-flag";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setActiveWorkspace } from "@/lib/actions/workspaces";
import { getLanguageName, WORKPLACE_LANGUAGES } from "@/lib/languages";
import type { Workspace } from "@/db/schema";

type WorkspaceSelectorProps = {
  workspaces: Workspace[];
  activeWorkspaceId?: string;
};

export function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSelectorProps) {
  const router = useRouter();
  const t = useTranslations("header");
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];

  function handleChange(nextValue: string | null) {
    if (!nextValue || nextValue === active?.id) {
      return;
    }

    startTransition(async () => {
      try {
        await setActiveWorkspace(nextValue);
        router.refresh();
      } catch {
        toast.error(t("switchFailed"));
      }
    });
  }

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {workspaces.length === 0 ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("createWorkspace")}
          </Button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Select
              value={active?.id}
              onValueChange={handleChange}
              disabled={isPending}
            >
              <SelectTrigger size="sm" className="min-w-[200px] bg-background">
                <SelectValue>
                  {active && (
                    <WorkspaceOption
                      name={active.name}
                      languageCode={active.language}
                    />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>{t("switchWorkspace")}</SelectLabel>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <WorkspaceOption
                        name={workspace.name}
                        languageCode={workspace.language}
                      />
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              {t("createWorkspace")}
            </Button>
          </div>
        )}
      </div>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingLanguages={workspaces.map((workspace) => workspace.language)}
      />
    </>
  );
}

function WorkspaceOption({
  name,
  languageCode,
}: {
  name: string;
  languageCode: string;
}) {
  const language = WORKPLACE_LANGUAGES.find((item) => item.code === languageCode);

  return (
    <span className="flex items-center gap-2">
      {language && (
        <CountryFlag code={language.flagCode} className="h-3.5 w-5" />
      )}
      <span className="truncate">{name}</span>
      <span className="text-muted-foreground">
        · {getLanguageName(languageCode)}
      </span>
    </span>
  );
}
