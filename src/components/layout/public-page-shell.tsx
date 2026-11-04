import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import { SiteFooter } from "@/components/layout/site-footer";
import { BrandMark } from "@/components/ui/brand-mark";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";
import type { AppLocale } from "@/i18n/config";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export async function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  const t = await getTranslations("legal");
  const locale = (await getLocale()) as AppLocale;
  const session = await auth();
  const homeHref = session?.user ? "/dashboard" : "/";
  const homeLabel = session?.user ? t("backHome") : t("backToHome");

  return (
    <div className={mx(styles, "legal-shell")}>
      <header className={mx(styles, "legal-top-bar")}>
        <div className={mx(styles, "legal-chrome-shell legal-top-bar-inner")}>
          <BrandMark href={homeHref} />
          <div className={mx(styles, "legal-brand-controls")}>
            <LocaleThemeControls locale={locale} compact />
          </div>
        </div>
      </header>

      <div className={mx(styles, "legal-inner")}>
        <header className={mx(styles, "legal-hero")}>
          <p className={mx(styles, "legal-kicker")}>{eyebrow}</p>
          <h1 className={mx(styles, "legal-title")}>{title}</h1>
          {description ? (
            <p className={mx(styles, "legal-meta")}>{description}</p>
          ) : null}
        </header>

        <section className={mx(styles, "legal-panel")} aria-label={title}>
          <div className={mx(styles, "legal-panel-body")}>{children}</div>
        </section>

        <p className={mx(styles, "legal-footer")}>
          <Link href={homeHref} className={mx(styles, "legal-back-link")}>
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {homeLabel}
          </Link>
        </p>
      </div>

      <div className={mx(styles, "legal-site-footer")}>
        <SiteFooter variant="public" />
      </div>
    </div>
  );
}
