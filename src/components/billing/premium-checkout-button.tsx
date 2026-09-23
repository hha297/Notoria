"use client";

import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Button } from "@/components/ui/button";

export function PremiumCheckoutButton() {
  const t = useTranslations("coach");
  const { openPremium } = useProAccess();

  return (
    <Button type="button" onClick={openPremium}>
      {t("upgrade")}
    </Button>
  );
}
