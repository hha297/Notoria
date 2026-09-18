"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";

type SidebarProCtaProps = {
  isPro: boolean;
  onNavigate?: () => void;
};

export function SidebarProCta({ isPro, onNavigate }: SidebarProCtaProps) {
  const t = useTranslations("billing");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (isPro) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-full justify-start gap-2 px-2 font-heading text-[13px] font-medium text-primary hover:bg-surface-active"
        onClick={() => {
          onNavigate?.();
          setUpgradeOpen(true);
        }}
      >
        <Sparkles className="size-3.5" />
        {t("upgrade")}
      </Button>
      <ProUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
