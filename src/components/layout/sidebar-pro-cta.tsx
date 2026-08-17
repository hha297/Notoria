"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type SidebarProCtaProps = {
  isPro: boolean;
};

export function SidebarProCta({ isPro }: SidebarProCtaProps) {
  const t = useTranslations("billing");
  const { isMobile, setOpenMobile } = useSidebar();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (isPro) {
    return null;
  }

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={t("upgrade")}
            onClick={() => {
              closeMobileSidebar();
              setUpgradeOpen(true);
            }}
            className="bg-accent-lime/20! font-medium text-accent-lime! transition-colors hover:bg-accent-lime/30! hover:text-accent-lime!"
          >
            <Sparkles />
            <span>{t("upgrade")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <ProUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
