"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "@/components/style/admin/admin.module.css";
import type { AppLocale } from "@/i18n/config";
import { mx } from "@/lib/css-module";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;

  return (
    <div className={mx(styles, "admin-shell")}>
      <AdminSidebar />
      <div className={mx(styles, "admin-main")}>
        <div className={mx(styles, "admin-topbar")}>
          <div className={mx(styles, "admin-topbar-start")}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={mx(styles, "admin-menu-btn")}
              aria-label={t("nav.openMenu")}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            <span className={mx(styles, "admin-brand-chip", "admin-topbar-chip")}>
              {t("nav.admin")}
            </span>
          </div>
          <div className={mx(styles, "admin-locale-controls")}>
            <LocaleThemeControls locale={locale} compact />
          </div>
        </div>
        <div className={mx(styles, "admin-content")}>{children}</div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[17.5rem] p-0 sm:max-w-[17.5rem]">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("nav.admin")}</SheetTitle>
          </SheetHeader>
          <div className={mx(styles, "admin-mobile-nav")}>
            <AdminSidebar
              className="!flex w-full border-0 bg-transparent p-0"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
