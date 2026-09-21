"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";

export function ListeningLockedPage() {
  const t = useTranslations("listening");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();

  return (
    <PageShell className="writing-atelier-shell listening-atelier-shell">
      <div className="writing-atelier listening-atelier flex flex-col gap-10">
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
        </header>
        <div className="writing-empty-desk">
          <div className="mb-4 flex size-12 items-center justify-center text-muted-foreground">
            <Lock className="size-6" />
          </div>
          <p className="writing-empty-title">{tBilling("lockedTitle")}</p>
          <p className="writing-brand-lede">{tBilling("lockedDescription")}</p>
          <Button className="mt-5" onClick={openUpgrade}>
            {tBilling("upgrade")}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
