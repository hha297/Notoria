"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogIn, Menu, X } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleSelector } from "@/components/layout/locale-selector";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandMark } from "@/components/ui/brand-mark";
import styles from "@/components/style/landing/landing.module.css";
import type { AppLocale } from "@/i18n/config";
import { mx } from "@/lib/css-module";


const NAV_ITEMS = [
  { href: "#how-it-works", key: "howItWorks" as const },
  { href: "#features", key: "features" as const },
  { href: "#faq", key: "faq" as const },
  { href: "/about", key: "about" as const },
  { href: "/support", key: "support" as const },
];

type PublicHeaderProps = {
  locale: AppLocale;
};

export function PublicHeader({ locale }: PublicHeaderProps) {
  const t = useTranslations("sitePages.landing.nav");
  const [open, setOpen] = useState(false);

  return (
    <header className={mx(styles, "header")} data-menu-open={open || undefined}>
      <div className={mx(styles, "landing-shell header-inner")}>
        <BrandMark href="/" onClick={() => setOpen(false)} />

        <nav className={mx(styles, "nav")} aria-label={t("aria")}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={mx(styles, "nav-link")}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className={mx(styles, "header-actions")}>
          <div className={mx(styles, "header-desktop-controls")}>
            <LocaleThemeControls locale={locale} compact />
            <LinkButton
              href="/sign-in"
              variant="ghost"
              size="sm"
              className={mx(styles, "header-sign-in")}
            >
              <LogIn className="size-3.5" aria-hidden />
              {t("signIn")}
            </LinkButton>
          </div>
          <button
            type="button"
            className={mx(styles, "mobile-toggle")}
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <div
        id="landing-mobile-nav"
        className={mx(styles, "mobile-panel")}
        data-open={open || undefined}
        aria-hidden={!open}
      >
        <div className={mx(styles, "landing-shell mobile-panel-inner")}>
          <div className={mx(styles, "mobile-panel-content")}>
            <nav className={mx(styles, "mobile-nav")} aria-label={t("aria")}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={mx(styles, "nav-link")}
                  tabIndex={open ? undefined : -1}
                  onClick={() => setOpen(false)}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            <LinkButton
              href="/sign-in"
              size="sm"
              className={mx(styles, "mobile-cta-btn")}
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
            >
              <LogIn className="size-3.5" aria-hidden />
              {t("signIn")}
            </LinkButton>

            <div className={mx(styles, "mobile-controls")}>
              <LocaleSelector value={locale} compact appearance="drawer" />
              <ThemeToggle compact />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
