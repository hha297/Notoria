"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CountryFlag } from "@/components/layout/country-flag";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { WorkspaceActionsMenu } from "@/components/workspace/workspace-actions-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
  const [selectOpen, setSelectOpen] = useState(false);

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

  function openCreateFromMenu() {
    setSelectOpen(false);
    setCreateOpen(true);
  }

  return (
    <>
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:gap-2.5">
        {workspaces.length === 0 ? (
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="size-4" />
            <span className="truncate">{t("createWorkspace")}</span>
          </Button>
        ) : (
          <>
            <div className="control-surface flex min-w-0 flex-1 items-center overflow-hidden rounded-md border border-input sm:flex-initial">
              <Select
                value={active?.id}
                open={selectOpen}
                onOpenChange={setSelectOpen}
                onValueChange={handleChange}
                disabled={isPending}
              >
                <SelectTrigger
                  aria-label={active ? active.name : t("switchWorkspace")}
                  className="h-10 w-full min-w-0 max-w-none flex-1 rounded-none border-0 bg-transparent px-2.5 shadow-none focus-visible:ring-0 sm:w-auto sm:max-w-[220px] sm:min-w-[148px]"
                >
                  <SelectValue>
                    {active && (
                      <WorkspaceOption
                        name={active.name}
                        languageCode={active.language}
                      />
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="min-w-[min(100vw-2rem,18rem)] sm:min-w-[16rem]"
                >
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

                  {/* Mobile: create lives in the menu instead of a separate + button */}
                  <div className="sm:hidden">
                    <SelectSeparator />
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={openCreateFromMenu}
                        className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                          <Plus className="size-4" strokeWidth={2.5} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {t("createWorkspace")}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {t("createWorkspaceHint")}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </SelectContent>
              </Select>

              {active ? (
                <>
                  <span
                    aria-hidden
                    className="hidden h-5 w-px shrink-0 bg-hairline-cloud sm:block"
                  />
                  <WorkspaceActionsMenu
                    className="hidden sm:inline-flex"
                    workspace={active}
                    workspaces={workspaces}
                  />
                </>
              ) : null}
            </div>

            <Button
              onClick={() => setCreateOpen(true)}
              className="hidden shrink-0 sm:inline-flex"
              aria-label={t("createWorkspace")}
            >
              <Plus className="size-4" />
              <span className="hidden md:inline">{t("createWorkspace")}</span>
            </Button>
          </>
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
    <span className="flex min-w-0 items-center gap-2">
      {language && (
        <CountryFlag code={language.flagCode} className="h-3.5 w-5 shrink-0" />
      )}
      <span className="truncate">{name}</span>
      <span className="hidden truncate text-muted-foreground md:inline">
        · {getLanguageName(languageCode)}
      </span>
    </span>
  );
}
