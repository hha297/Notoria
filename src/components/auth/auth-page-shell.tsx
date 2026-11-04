import { getLocale } from "next-intl/server";
import { AuthAmbient } from "@/components/auth/auth-ambient";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import { SiteFooter } from "@/components/layout/site-footer";
import { BrandMark } from "@/components/ui/brand-mark";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";
import type { AppLocale } from "@/i18n/config";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export async function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
}: AuthPageShellProps) {
  const locale = (await getLocale()) as AppLocale;

  return (
    <div className={mx(styles, "auth-atelier-shell auth-atelier-shell-footer")}>
      <AuthAmbient />
      <header className={mx(styles, "auth-top-bar")}>
        <div className={mx(styles, "auth-chrome-shell auth-top-bar-inner")}>
          <BrandMark href="/" />

          <div className={mx(styles, "auth-brand-controls")}>
            <LocaleThemeControls locale={locale} compact />
          </div>
        </div>
      </header>

      <div className={mx(styles, "auth-atelier")}>
        <header className={mx(styles, "auth-hero")}>
          <div className={mx(styles, "auth-hero-copy")}>
            <p className={mx(styles, "auth-kicker")}>{eyebrow}</p>
            <h1 className={mx(styles, "auth-title")}>{title}</h1>
            <p className={mx(styles, "auth-lede")}>{description}</p>
          </div>
        </header>

        <section className={mx(styles, "auth-panel")} aria-label={title}>
          <div className={mx(styles, "auth-panel-body")}>{children}</div>
        </section>
      </div>

      <div className={mx(styles, "auth-site-footer")}>
        <SiteFooter variant="public" />
      </div>
    </div>
  );
}
