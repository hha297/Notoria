import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";

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
  const t = await getTranslations("auth");

  return (
    <div className={mx(styles, "auth-atelier-shell")}>
      <div className={mx(styles, "auth-atelier")}>
        <header className={mx(styles, "auth-hero")}>
          <Link
            href="/sign-in"
            className={mx(styles, "auth-brand-link")}
            aria-label="Notoria"
          >
            <Logo size="md" />
            <LogoWordmark
              tone="ink"
              className={mx(styles, "auth-brand-wordmark")}
            />
          </Link>

          <div className={mx(styles, "auth-hero-copy")}>
            <p className={mx(styles, "auth-kicker")}>{eyebrow}</p>
            <h1 className={mx(styles, "auth-title")}>{title}</h1>
            <p className={mx(styles, "auth-lede")}>{description}</p>
          </div>
        </header>

        <section className={mx(styles, "auth-panel")} aria-label={title}>
          <div className={mx(styles, "auth-panel-body")}>{children}</div>
        </section>

        <nav className={mx(styles, "auth-legal")} aria-label={t("legalPrivacy")}>
          <Link href="/privacy" className={mx(styles, "auth-legal-link")}>
            {t("legalPrivacy")}
          </Link>
          <span className={mx(styles, "auth-legal-sep")} aria-hidden>
            ·
          </span>
          <Link href="/terms" className={mx(styles, "auth-legal-link")}>
            {t("legalTerms")}
          </Link>
        </nav>
      </div>
    </div>
  );
}
