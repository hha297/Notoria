"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export function FormSentenceLocked() {
  const t = useTranslations("exercises");
  const tBilling = useTranslations("billing");
  const { openUpgrade } = useProAccess();

  return (
    <div className="mx-auto max-w-5xl space-y-10 pt-2">
      <div className="space-y-6">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToStudio")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={t("types.form-sentence.label")}
          highlight={t("practice")}
          description={t("types.form-sentence.description")}
        />
      </div>
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
    </div>
  );
}
