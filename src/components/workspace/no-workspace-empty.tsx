"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";

export function NoWorkspaceEmpty() {
  const t = useTranslations("workspace");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="empty-state py-16">
        <FolderOpen className="mx-auto mb-4 size-10 text-muted-foreground" />
        <p className="text-lg font-medium text-ink">{t("emptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <Button className="mt-6" onClick={() => setOpen(true)}>
          {t("createFirst")}
        </Button>
      </div>

      <CreateWorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        existingLanguages={[]}
      />
    </>
  );
}
