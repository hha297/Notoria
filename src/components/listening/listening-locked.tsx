"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

export function ListeningLockedPage() {
  const t = useTranslations("listening");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        highlight={t("highlight")}
        description={t("description")}
      />
      <div className="empty-state">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40 text-muted-foreground">
          <Lock className="size-6" />
        </div>
        <p className="font-medium text-ink">{tBilling("lockedTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {tBilling("lockedDescription")}
        </p>
        <Button className="mt-5" onClick={openUpgrade}>
          {tBilling("upgrade")}
        </Button>
      </div>
    </PageShell>
  );
}
