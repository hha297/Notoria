"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import navStyles from "@/components/style/layout/nav.module.css";
import { mx } from "@/lib/css-module";

type SidebarProCtaProps = {
  plan: "free" | "pro" | "premium";
  onNavigate?: () => void;
};

export function SidebarProCta({ plan, onNavigate }: SidebarProCtaProps) {
  const t = useTranslations("billing");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (plan === "premium") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={mx(navStyles, "nav-plan-cta")}
        onClick={() => {
          onNavigate?.();
          setUpgradeOpen(true);
        }}
      >
        <Sparkles className="size-3.5 shrink-0" aria-hidden />
        {plan === "pro" ? t("explorePremium") : t("upgrade")}
      </button>
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </>
  );
}
