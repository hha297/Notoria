import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

type LegalPageShellProps = {
  title: string;
  updatedLabel: string;
  active: "privacy" | "terms";
  children: React.ReactNode;
};

export async function LegalPageShell({
  title,
  updatedLabel,
  active,
  children,
}: LegalPageShellProps) {
  const t = await getTranslations("legal");
  const session = await auth();
  const homeHref = session?.user ? "/" : "/sign-in";

  return (
    <div className={mx(styles, "legal-shell")}>
      <div className={mx(styles, "legal-inner")}>
        <header className={mx(styles, "legal-hero")}>
          <Link
            href={homeHref}
            className={mx(styles, "legal-brand-link")}
            aria-label="Notoria"
          >
            <Logo size="md" />
            <LogoWordmark
              tone="ink"
              className={mx(styles, "legal-brand-wordmark")}
            />
          </Link>

          <p className={mx(styles, "legal-kicker")}>{t("eyebrow")}</p>
          <h1 className={mx(styles, "legal-title")}>{title}</h1>
          <p className={mx(styles, "legal-meta")}>{updatedLabel}</p>

          <nav className={mx(styles, "legal-nav")} aria-label={t("navLabel")}>
            <Link
              href="/privacy"
              className={mx(styles, "legal-nav-link")}
              data-active={active === "privacy" ? "true" : undefined}
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              className={mx(styles, "legal-nav-link")}
              data-active={active === "terms" ? "true" : undefined}
            >
              {t("terms")}
            </Link>
          </nav>
        </header>

        <section className={mx(styles, "legal-panel")} aria-label={title}>
          <div className={mx(styles, "legal-panel-body")}>{children}</div>
        </section>

        <footer className={mx(styles, "legal-footer")}>
          <a href="mailto:contact@notoria.fi">{t("contactEmail")}</a>
          <Link href={homeHref}>
            {session?.user ? t("backHome") : t("backToSignIn")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
